/**
 * HYBRID Retell Call Polling Service
 * 
 * Production-ready polling worker that:
 * 1. Polls Retell API for call outcomes when webhooks fail/are unverified
 * 2. Implements exponential backoff (15s → 30s → 60s → 120s → 600s cap)
 * 3. Uses precedence-based idempotent updates
 * 4. Dead-letter queue for calls stuck >30min without outcome
 */

import { DatabaseStorage } from '../storage';
import { RetellService } from './retell';

interface PollResult {
  callId: string;
  success: boolean;
  terminal: boolean;
  outcome?: string;
  error?: string;
}

class CallPollingService {
  private isRunning = false;
  private pollIntervalSeconds = 30; // Check every 30 seconds
  private intervalHandle?: NodeJS.Timeout;
  private storage: DatabaseStorage;
  private retellService: RetellService;

  constructor(storage: DatabaseStorage) {
    this.storage = storage;
    this.retellService = new RetellService();
  }

  /**
   * Calculate next poll time using exponential backoff
   * 0 attempts → 15s
   * 1 attempts → 30s
   * 2 attempts → 60s
   * 3 attempts → 120s
   * 4+ attempts → 600s (10min cap)
   */
  private calculateBackoff(attempts: number): number {
    const base = 15;
    const backoffSeconds = Math.min(base * Math.pow(2, attempts), 600);
    return backoffSeconds;
  }

  /**
   * Poll a single call session from Retell API
   */
  private async pollCallSession(session: any, tenantConfig: any): Promise<PollResult> {
    const { id, retellCallId, tenantId, pollAttempts = 0 } = session;

    try {
      console.log(`🔄 Polling Retell for call ${retellCallId} (attempt ${pollAttempts + 1})`);

      // Fetch call details from Retell API
      const callDetails = await this.retellService.getCall(tenantConfig.retellApiKey, retellCallId);
      
      if (!callDetails) {
        return {
          callId: retellCallId,
          success: false,
          terminal: false,
          error: 'No call details returned from Retell'
        };
      }

      // Map RetellCallResponse to webhook-like payload for outcome determination
      // Note: Retell's getCall() API returns "call_status", not "status"
      const callStatus = (callDetails as any).call_status || callDetails.status || 'in_progress';
      const webhookLikePayload: any = {
        call_id: callDetails.call_id,
        event: 'call_polled',
        call_status: callStatus,
        direction: 'outbound', // Poll is always for outbound calls
        call_analysis: (callDetails as any).call_analysis || (callDetails as any).analysis // Try both field names
      };

      // Determine outcome from call details
      const outcome = this.retellService.determineCallOutcome(webhookLikePayload);
      const isTerminal = this.isTerminalState(callStatus, outcome);

      console.log(`📊 Poll result for ${retellCallId}: status=${callStatus}, outcome=${outcome}, terminal=${isTerminal}`);

      // Update call session with polled data using precedence logic
      await this.updateSessionFromPoll(id, callDetails, outcome, pollAttempts, isTerminal);

      return {
        callId: retellCallId,
        success: true,
        terminal: isTerminal,
        outcome
      };

    } catch (error) {
      console.error(`❌ Poll error for call ${retellCallId}:`, error);
      return {
        callId: retellCallId,
        success: false,
        terminal: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if call is in terminal state (no more polling needed)
   */
  private isTerminalState(callStatus?: string, outcome?: string): boolean {
    const terminalStatuses = ['completed', 'ended', 'failed'];
    const terminalOutcomes = ['confirmed', 'voicemail', 'no_answer', 'busy', 'failed', 'cancelled'];
    
    return (
      (callStatus && terminalStatuses.includes(callStatus.toLowerCase())) ||
      (outcome && terminalOutcomes.includes(outcome.toLowerCase()))
    );
  }

  /**
   * Update call session from polled data with precedence logic
   */
  private async updateSessionFromPoll(
    sessionId: string,
    callDetails: any,
    outcome: string | undefined,
    currentAttempts: number,
    isTerminal: boolean // Pass pre-computed terminal state to avoid recalculation with wrong field
  ): Promise<void> {
    const now = new Date();

    // Build update object
    const updateData: any = {
      pollAttempts: currentAttempts + 1,
      payloadPollLast: JSON.stringify(callDetails),
      // Only update sourceOfTruth if not already set by webhook
    };

    if (isTerminal) {
      // Terminal state - stop polling
      updateData.nextPollAt = null;
      // Determine status based on outcome - if we have a successful outcome, mark as completed
      // Only mark as failed if outcome is explicitly "failed" or if there's an error
      const callStatus = (callDetails as any).call_status || (callDetails as any).status;
      if (outcome && outcome !== 'failed' && outcome !== 'unknown') {
        updateData.status = 'completed';
      } else if (callStatus === 'completed' || callStatus === 'ended') {
        updateData.status = 'completed';
      } else {
        updateData.status = 'failed';
      }
      updateData.endTime = now;
      
      // Set source if not webhook-verified
      const session = await this.storage.getCallSessionById(sessionId);
      const webhookVerified = session?.webhookVerified ?? false; // Default to false if undefined
      if (!webhookVerified) {
        updateData.sourceOfTruth = 'poll';
      }
    } else {
      // Not terminal - schedule next poll with backoff
      const backoffSeconds = this.calculateBackoff(currentAttempts + 1);
      updateData.nextPollAt = new Date(now.getTime() + backoffSeconds * 1000);
      console.log(`⏰ Next poll scheduled in ${backoffSeconds}s for session ${sessionId}`);
    }

    // Use mergeCallSessionState for precedence-based outcome updates
    if (outcome) {
      await this.storage.mergeCallSessionState(
        callDetails.call_id,
        outcome,
        'call_polled',
        callDetails.call_analysis ? JSON.stringify(callDetails.call_analysis) : undefined
      );
    }

    // Update polling metadata
    await this.storage.updateCallSession(sessionId, updateData);

    // Update contact appointment status if outcome affects appointment
    if (isTerminal && outcome) {
      const session = await this.storage.getCallSessionById(sessionId);
      if (session?.contactId) {
        if (outcome === 'confirmed') {
          await this.storage.updateContact(session.contactId, { appointmentStatus: 'confirmed' });
          console.log(`✅ Updated appointment status to 'confirmed' for contact ${session.contactId}`);
        } else if (outcome === 'cancelled') {
          await this.storage.updateContact(session.contactId, { appointmentStatus: 'cancelled' });
          console.log(`❌ Updated appointment status to 'cancelled' for contact ${session.contactId}`);
        } else if (outcome === 'rescheduled') {
          await this.storage.updateContact(session.contactId, { appointmentStatus: 'rescheduled' });
          console.log(`📅 Updated appointment status to 'rescheduled' for contact ${session.contactId}`);
        }
      }
    }
  }

  /**
   * Process dead-letter queue - calls stuck >30min without outcome
   */
  private async processDeadLetterQueue(): Promise<void> {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    
    // Find sessions started >30min ago with no outcome
    const stuckSessions = await this.storage.getStuckCallSessions(thirtyMinutesAgo);
    
    for (const session of stuckSessions) {
      console.warn(`⚠️ Dead-letter: Call ${session.retellCallId} stuck for >30min without outcome`);
      
      // Mark as failed with reason
      await this.storage.updateCallSession(session.id, {
        status: 'failed',
        callOutcome: 'failed',
        outcome: 'failed',
        endTime: new Date(),
        errorMessage: 'No outcome reported after 30 minutes - marked as failed',
        nextPollAt: null, // Stop polling
        sourceOfTruth: 'poll'
      });
    }
  }

  /**
   * Main polling worker loop
   */
  private async runPollCycle(): Promise<void> {
    try {
      const now = new Date();
      
      // Get all sessions due for polling (where nextPollAt <= now AND outcome is null)
      const dueSessions = await this.storage.getSessionsDueForPolling(now);
      
      if (dueSessions.length === 0) {
        return; // No sessions to poll
      }

      console.log(`🔄 Polling ${dueSessions.length} call session(s)...`);

      // Process sessions with concurrency limit (5 concurrent polls)
      const concurrency = 5;
      for (let i = 0; i < dueSessions.length; i += concurrency) {
        const batch = dueSessions.slice(i, i + concurrency);
        
        await Promise.allSettled(
          batch.map(async (session) => {
            // Get tenant config for API key
            const tenantConfig = await this.storage.getTenantConfig(session.tenantId);
            if (!tenantConfig?.retellApiKey) {
              console.warn(`⚠️ No Retell API key for tenant ${session.tenantId}`);
              return;
            }

            await this.pollCallSession(session, tenantConfig);
          })
        );
      }

      // Process dead-letter queue every poll cycle
      await this.processDeadLetterQueue();

    } catch (error) {
      console.error('❌ Poll cycle error:', error);
    }
  }

  /**
   * Start the polling service
   */
  public start(): void {
    if (this.isRunning) {
      console.warn('⚠️ Call polling service already running');
      return;
    }

    console.log('🚀 Starting HYBRID call polling service...');
    this.isRunning = true;

    // Run poll cycle every N seconds
    this.intervalHandle = setInterval(() => {
      this.runPollCycle().catch(error => {
        console.error('Poll cycle failed:', error);
      });
    }, this.pollIntervalSeconds * 1000);

    console.log(`✅ Call polling service started - polling every ${this.pollIntervalSeconds}s`);
  }

  /**
   * Stop the polling service
   */
  public stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = undefined;
    }
    this.isRunning = false;
    console.log('🛑 Call polling service stopped');
  }
}

// Export singleton instance
let pollingServiceInstance: CallPollingService | null = null;

export function getPollingService(storage: DatabaseStorage): CallPollingService {
  if (!pollingServiceInstance) {
    pollingServiceInstance = new CallPollingService(storage);
  }
  return pollingServiceInstance;
}

export { CallPollingService };
