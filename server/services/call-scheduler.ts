import { storage } from "../storage";
import { retellService } from "./retell";
import { businessTemplateService } from "./business-templates";
import type { FollowUpTask, Contact, TenantConfig } from "@shared/schema";

/**
 * Call Scheduler Service - Handles automated execution of scheduled follow-up tasks
 * Runs background jobs to process pending calls at the right timing
 */
export class CallSchedulerService {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 30 * 1000; // Check every 30 seconds

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
    this.isRunning = false;
    console.log("⏹️ Call scheduler stopped");
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

      // Get tenant configuration for Retell AI settings
      const tenantConfig = await storage.getTenantConfig(task.tenantId);
      if (!tenantConfig || !tenantConfig.retellApiKey) {
        console.error(`❌ Tenant config or Retell API key not found for task ${task.id}`);
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

      // Execute the call using Retell AI
      const callResponse = await retellService.createBusinessCall(
        tenantConfig.retellApiKey,
        contact,
        tenantConfig,
        callSession.id,
        businessTemplateService
      );

      // Update call session with Retell call ID
      await storage.updateCallSession(callSession.id, {
        retellCallId: callResponse.call_id,
        status: 'active'
      });

      // Mark task as completed (webhook will handle retry logic if call fails)
      await storage.updateFollowUpTask(task.id, {
        status: 'completed'
      });

      console.log(`✅ Successfully initiated call for task ${task.id}, Retell ID: ${callResponse.call_id}`);

    } catch (error) {
      console.error(`❌ Error executing follow-up task ${task.id}:`, error);
      
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

      // Get tenant configuration for reminder timing
      const tenantConfig = await storage.getTenantConfig(tenantId);
      const reminderHours = tenantConfig?.reminderHoursBefore || [24, 1]; // Default to 24h and 1h
      
      // Create reminder intervals from configurable hours
      const reminderIntervals = reminderHours.map((hours, index) => ({
        hours,
        type: index === 0 ? 'initial_call' as const : 'follow_up' as const,
        description: `${hours} hour${hours !== 1 ? 's' : ''} before`
      }));

      let scheduledCount = 0;

      for (const interval of reminderIntervals) {
        const reminderTime = new Date(appointmentTime.getTime() - (interval.hours * 60 * 60 * 1000));

        // Only schedule if reminder time is in the future
        if (reminderTime > new Date()) {
          const reminderTask = await storage.createFollowUpTask({
            tenantId,
            contactId,
            scheduledTime: reminderTime,
            taskType: interval.type,
            autoExecution: true,
            attempts: 0,
            maxAttempts: 2 // Original call + 1 follow-up only
          });

          console.log(`📅 Scheduled ${interval.description} reminder for ${contact.name} at ${reminderTime.toISOString()}`);
          scheduledCount++;
        }
      }

      if (scheduledCount === 0) {
        console.log(`⏰ Appointment too soon, no reminders scheduled for ${contact.name} (appointment: ${appointmentTime.toISOString()})`);
      } else {
        console.log(`✅ Scheduled ${scheduledCount} reminders for ${contact.name} (appointment: ${appointmentTime.toISOString()})`);
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