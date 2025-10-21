import { storage } from "../storage";
import { retellService } from "./retell";
import { retailService } from "./retail";
import { businessTemplateService } from "./business-templates";
import type { FollowUpTask, Contact, TenantConfig } from "@shared/schema";

/**
 * Call Scheduler Service - Handles automated execution of scheduled follow-up tasks
 * Runs background jobs to process pending calls at the right timing
 */
export class CallSchedulerService {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private cleanupIntervalId: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 30 * 1000; // Check every 30 seconds
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // Cleanup every 5 minutes

  /**
   * Start the background scheduler
   */
  start(): void {
    if (this.isRunning) {
      console.log("📅 Call scheduler is already running");
      return;
    }

    console.log("🚀 Starting call scheduler service...");
    this.isRunning = true;
    
    // Run immediately on start
    this.processScheduledTasks();
    
    // Then run on interval
    this.intervalId = setInterval(() => {
      this.processScheduledTasks();
    }, this.CHECK_INTERVAL);

    // Start TTL cleanup service (CRITICAL for production)
    this.startCleanupService();

    console.log(`✅ Call scheduler started - checking every ${this.CHECK_INTERVAL/1000}s`);
  }

  /**
   * Stop the background scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
    
    this.isRunning = false;
    console.log("⏹️ Call scheduler and cleanup service stopped");
  }

  /**
   * Main processing loop - finds and executes overdue tasks
   */
  private async processScheduledTasks(): Promise<void> {
    try {
      // Get all tasks that are due for execution
      const overdueTasks = await storage.getOverdueFollowUpTasks();
      
      if (overdueTasks.length === 0) {
        return; // No tasks to process
      }

      console.log(`📞 Processing ${overdueTasks.length} overdue follow-up tasks`);

      // Process each task
      for (const task of overdueTasks) {
        await this.executeFollowUpTask(task);
      }

    } catch (error) {
      console.error("❌ Error processing scheduled tasks:", error);
    }
  }

  /**
   * Execute a specific follow-up task
   */
  private async executeFollowUpTask(task: FollowUpTask): Promise<void> {
    let protectionCheck: any = null;
    
    try {
      console.log(`🎯 Executing follow-up task: ${task.id} (${task.taskType})`);

      // Atomic update to processing status (prevents double execution)
      const updatedTask = await storage.updateFollowUpTask(task.id, {
        status: 'processing',
        attempts: (task.attempts || 0) + 1
      });

      // Update our local task object with new attempts count
      task.attempts = updatedTask.attempts;

      // Skip if no contact ID (system tasks)
      if (!task.contactId) {
        await storage.updateFollowUpTask(task.id, {
          status: 'completed'
        });
        return;
      }

      // Get contact details
      const contact = await storage.getContact(task.contactId);
      if (!contact) {
        console.error(`❌ Contact not found for task ${task.id}`);
        await storage.updateFollowUpTask(task.id, {
          status: 'failed'
        });
        return;
      }

      // CRITICAL: Skip call if appointment already confirmed
      // This prevents calling customers who already confirmed via a previous call
      if (contact.appointmentStatus === 'confirmed') {
        console.log(`✅ Skipping task ${task.id} - appointment already confirmed for ${contact.name}`);
        await storage.updateFollowUpTask(task.id, {
          status: 'completed'
        });
        return;
      }

      // Get tenant configuration for AI service settings
      const tenantConfig = await storage.getTenantConfig(task.tenantId);
      
      // Check for either Retell or Retail AI configuration
      const hasRetellConfig = tenantConfig?.retellApiKey && tenantConfig?.retellAgentId;
      const hasRetailConfig = tenantConfig?.retailApiKey && tenantConfig?.retailAgentId;
      
      if (!tenantConfig || (!hasRetellConfig && !hasRetailConfig)) {
        console.error(`❌ Tenant config or AI service API key not found for task ${task.id}`);
        await storage.updateFollowUpTask(task.id, {
          status: 'failed'
        });
        return;
      }

      // ABUSE PROTECTION: Atomic check and reserve call (race condition safe)
      protectionCheck = await storage.checkAndReserveCall(
        task.tenantId,
        contact.phone,
        new Date()
      );

      if (!protectionCheck.allowed) {
        console.warn(`🛡️ Call blocked by abuse protection for task ${task.id}: ${protectionCheck.violations.join(', ')}`);
        
        // Log abuse detection event
        await storage.createAbuseDetectionEvent({
          tenantId: task.tenantId,
          eventType: 'rate_limit_exceeded',
          severity: 'medium',
          description: `Call blocked by scheduler: ${protectionCheck.violations.join(', ')}`,
          metadata: JSON.stringify({
            taskId: task.id,
            contactId: contact.id,
            phone: contact.phone,
            violations: protectionCheck.violations,
            protectionStatus: protectionCheck.protectionStatus,
            triggeredBy: 'call_scheduler'
          })
        });

        // Mark task as failed with reason
        await storage.updateFollowUpTask(task.id, {
          status: 'failed'
        });
        return;
      }

      // Create call session to track this call
      const callSession = await storage.createCallSession({
        tenantId: task.tenantId,
        contactId: contact.id,
        startTime: new Date(),
        status: 'initiated'
      });

      // Execute the call using available AI service (prefer Retail if configured)
      let callResponse;
      
      if (hasRetailConfig) {
        console.log(`🛍️ Using Retail AI service for scheduled task ${task.id}`);
        callResponse = await retailService.createBusinessCall(
          tenantConfig.retailApiKey!,
          contact,
          tenantConfig,
          callSession.id,
          businessTemplateService
        );
      } else {
        console.log(`📞 Using Retell AI service for scheduled task ${task.id}`);
        callResponse = await retellService.createBusinessCall(
          tenantConfig.retellApiKey!,
          contact,
          tenantConfig,
          callSession.id,
          businessTemplateService
        );
      }

      // Update call session with AI service call ID and HYBRID polling setup
      const now = new Date();
      // CRITICAL FIX: Poll after 90 seconds - gives call time to complete (most finish within 60-90s)
      // Polling too early (15s) causes "ongoing" calls to be marked as failed
      const firstPollAt = new Date(now.getTime() + 90000);
      await storage.updateCallSession(callSession.id, {
        retellCallId: callResponse.call_id, // Both services use same field for compatibility
        status: 'active',
        // HYBRID: Set up polling fallback for scheduled calls
        nextPollAt: firstPollAt,
        pollAttempts: 0,
        sourceOfTruth: 'poll', // Default to poll until webhook confirms
      });

      // CRITICAL: Confirm reservation to finalize quota usage
      if (protectionCheck.reservationId) {
        await storage.confirmCallReservation(protectionCheck.reservationId);
        console.log(`🔒 Confirmed call reservation: ${protectionCheck.reservationId}`);
      }

      // Mark task as completed (webhook will handle retry logic if call fails)
      await storage.updateFollowUpTask(task.id, {
        status: 'completed'
      });

      console.log(`✅ Successfully initiated call for task ${task.id}, Retell ID: ${callResponse.call_id}`);

    } catch (error) {
      console.error(`❌ Error executing follow-up task ${task.id}:`, error);
      
      // CRITICAL: Release reservation on failure to prevent quota leak
      if (protectionCheck?.reservationId) {
        await storage.releaseCallReservation(protectionCheck.reservationId);
        console.log(`🔓 Released call reservation due to error: ${protectionCheck.reservationId}`);
      }
      
      // Update task with error status
      await storage.updateFollowUpTask(task.id, {
        status: 'failed'
      });

      // Create retry task if under max attempts (task.attempts already incremented)
      const currentAttempts = task.attempts || 0; // Use already incremented attempts
      if (currentAttempts < (task.maxAttempts || 2)) {
        await this.createRetryTask(task, currentAttempts);
      }
    }
  }

  /**
   * Start TTL cleanup service for expired reservations (CRITICAL for production)
   */
  private startCleanupService(): void {
    // Run cleanup immediately on start
    this.performCleanup();
    
    // Then run cleanup on interval
    this.cleanupIntervalId = setInterval(() => {
      this.performCleanup();
    }, this.CLEANUP_INTERVAL);
    
    console.log(`🧹 TTL cleanup service started - cleaning every ${this.CLEANUP_INTERVAL/1000}s`);
  }

  /**
   * Perform cleanup of expired reservations and stale calls
   */
  private async performCleanup(): Promise<void> {
    try {
      const result = await storage.cleanupExpiredReservations();
      
      if (result.cleaned > 0) {
        console.log(`🧹 Cleaned up ${result.cleaned} expired reservations`);
      }
      
      if (result.errors.length > 0) {
        console.error('⚠️ Cleanup errors:', result.errors);
      }
      
      // Clean up stale in_progress calls (older than 10 minutes)
      const staleCallsResult = await storage.cleanupStaleCallSessions();
      
      if (staleCallsResult.cleaned > 0) {
        console.log(`🧹 Cleaned up ${staleCallsResult.cleaned} stale call sessions`);
      }
    } catch (error) {
      console.error('❌ TTL cleanup service error:', error);
    }
  }

  /**
   * Create a single follow-up task for failed calls
   */
  private async createRetryTask(originalTask: FollowUpTask, currentAttempts: number): Promise<void> {
    // Get tenant configuration for follow-up delay
    const tenantConfig = await storage.getTenantConfig(originalTask.tenantId);
    const delayMinutes = tenantConfig?.followUpRetryMinutes || 90; // Default to 90 minutes
    const retryTime = new Date(Date.now() + delayMinutes * 60 * 1000);

    const retryTask = await storage.createFollowUpTask({
      tenantId: originalTask.tenantId,
      contactId: originalTask.contactId,
      scheduledTime: retryTime,
      taskType: 'follow_up_call',
      autoExecution: true,
      attempts: currentAttempts, // This will be 1 (original failed, this is the single follow-up)
      maxAttempts: originalTask.maxAttempts // Will be 2 (original + 1 follow-up)
    });

    console.log(`🔄 Scheduled single follow-up call for ${retryTime.toISOString()} (${delayMinutes} minutes after failed attempt)`);
  }

  /**
   * Schedule appointment reminder calls
   * Called when appointments are created or updated
   */
  async scheduleAppointmentReminders(contactId: string, appointmentTime: Date, tenantId: string): Promise<void> {
    try {
      const contact = await storage.getContact(contactId);
      if (!contact) {
        console.error(`❌ Contact not found: ${contactId}`);
        return;
      }

      // Determine reminder hours: Contact preference takes priority over tenant config
      let initialReminderHours: number;
      
      if (contact.callBeforeHours && contact.callBeforeHours > 0) {
        // Use contact's individual preference if set
        initialReminderHours = contact.callBeforeHours;
        console.log(`📋 Using contact's preference: ${initialReminderHours}h before appointment`);
      } else {
        // Fall back to tenant configuration
        const tenantConfig = await storage.getTenantConfig(tenantId);
        const reminderHoursArray = tenantConfig?.reminderHoursBefore || [24];
        initialReminderHours = Array.isArray(reminderHoursArray) ? reminderHoursArray[0] : reminderHoursArray;
        console.log(`🏢 Using tenant default: ${initialReminderHours}h before appointment`);
      }
      
      const reminderTime = new Date(appointmentTime.getTime() - (initialReminderHours * 60 * 60 * 1000));

      // Only schedule if reminder time is in the future
      if (reminderTime > new Date()) {
        // Check for existing tasks to prevent duplicates
        // Look for ANY initial_call task (pending or completed) created in the last hour
        // or any pending initial_call task for this contact
        const existingTasks = await storage.getFollowUpTasksByTenant(tenantId);
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        
        const hasDuplicateTask = existingTasks.some((task: FollowUpTask) => 
          task.contactId === contactId &&
          task.taskType === 'initial_call' &&
          (
            // Any pending initial call for this contact
            task.status === 'pending' ||
            // Or any initial call created in the last hour (prevents rapid duplicates)
            (task.createdAt && new Date(task.createdAt) > oneHourAgo)
          )
        );

        if (hasDuplicateTask) {
          console.log(`⏭️ Skipping - initial call already exists for ${contact.name} (prevents duplicates)`);
          return;
        }

        const reminderTask = await storage.createFollowUpTask({
          tenantId,
          contactId,
          scheduledTime: reminderTime,
          taskType: 'initial_call',
          autoExecution: true,
          attempts: 0,
          maxAttempts: 2 // Original call + 1 follow-up only (if missed)
        });

        console.log(`📅 Scheduled initial reminder ${initialReminderHours}h before appointment for ${contact.name} at ${reminderTime.toISOString()}`);
        console.log(`   📞 Follow-up call will ONLY be scheduled if this call is missed/not answered`);
      } else {
        console.log(`⏰ Appointment too soon, no reminders scheduled for ${contact.name} (appointment: ${appointmentTime.toISOString()})`);
      }

    } catch (error) {
      console.error(`❌ Error scheduling appointment reminders for contact ${contactId}:`, error);
    }
  }

  /**
   * Get scheduler status and statistics
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      checkInterval: this.CHECK_INTERVAL,
      nextCheck: this.intervalId ? new Date(Date.now() + this.CHECK_INTERVAL) : null
    };
  }
}

// Export singleton instance
export const callScheduler = new CallSchedulerService();