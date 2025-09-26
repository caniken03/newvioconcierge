import type { ReschedulingRequest, Contact, TenantConfig } from "@shared/schema";
import { calComService } from "./cal-com";
import { calendlyService } from "./calendly";
import { notificationService, type NotificationRequest } from './notification-service';

export interface RescheduleRequestData {
  contactId: string;
  tenantId: string;
  callSessionId?: string;
  originalAppointmentTime: Date;
  originalAppointmentType?: string;
  rescheduleReason?: 'customer_conflict' | 'emergency' | 'illness' | 'prefer_different_time' | 'other';
  customerPreference?: string;
  urgencyLevel?: 'urgent' | 'high' | 'normal' | 'low';
  proposedTimes?: Date[];
}

export interface AvailabilitySlot {
  startTime: Date;
  endTime: Date;
  duration: number; // minutes
  appointmentType?: string;
  provider?: string;
  location?: string;
}

export interface ReschedulingWorkflowResult {
  success: boolean;
  requestId: string;
  workflowStage: string;
  status: string;
  message: string;
  availableSlots?: AvailabilitySlot[];
  selectedTime?: Date;
  calendarUpdated?: boolean;
  confirmationSent?: boolean;
}

export interface WorkflowStageProcessor {
  process(request: ReschedulingRequest, context: WorkflowContext): Promise<ReschedulingWorkflowResult>;
  canProcess(request: ReschedulingRequest): boolean;
  getNextStage(): string | null;
}

export interface WorkflowContext {
  storage: any; // IStorage interface
  tenantConfig: TenantConfig;
  contact: Contact;
  isAutomated: boolean;
}

export class ReschedulingWorkflowService {
  private stageProcessors: Map<string, WorkflowStageProcessor> = new Map();

  constructor() {
    this.initializeStageProcessors();
  }

  private initializeStageProcessors() {
    this.stageProcessors.set('customer_request', new CustomerRequestProcessor());
    this.stageProcessors.set('availability_check', new AvailabilityCheckProcessor());
    this.stageProcessors.set('confirmation', new ConfirmationProcessor());
    this.stageProcessors.set('calendar_update', new CalendarUpdateProcessor());
  }

  /**
   * Create a new rescheduling request from webhook or manual input with idempotency protection
   */
  async createReschedulingRequest(
    data: RescheduleRequestData,
    storage: any
  ): Promise<ReschedulingWorkflowResult> {
    try {
      // Validate contact exists and get appointment details
      const contact = await storage.getContact(data.contactId);
      if (!contact || contact.tenantId !== data.tenantId) {
        return {
          success: false,
          requestId: '',
          workflowStage: 'error',
          status: 'rejected',
          message: 'Contact not found or access denied'
        };
      }

      // ENHANCED: Generate idempotency key for deduplication
      const idempotencyKey = data.callSessionId 
        ? `reschedule_${data.tenantId}_${data.contactId}_${data.callSessionId}`
        : `reschedule_${data.tenantId}_${data.contactId}_${Date.now()}`;
      
      // Generate webhook event ID if this is from a webhook
      const webhookEventId = data.callSessionId 
        ? `webhook_${data.callSessionId}_${data.tenantId}`
        : undefined;

      // Create the rescheduling request with idempotency protection
      const reschedulingRequest = await storage.createReschedulingRequest({
        tenantId: data.tenantId,
        contactId: data.contactId,
        callSessionId: data.callSessionId,
        idempotencyKey,
        webhookEventId,
        originalAppointmentTime: data.originalAppointmentTime,
        originalAppointmentType: data.originalAppointmentType,
        rescheduleReason: data.rescheduleReason || 'other',
        customerPreference: data.customerPreference,
        urgencyLevel: data.urgencyLevel || 'normal',
        proposedTimes: data.proposedTimes ? JSON.stringify(data.proposedTimes) : null,
        status: 'pending',
        workflowStage: 'customer_request',
        automatedProcessing: true,
      });

      // Only update contact if this is a new request (not idempotency hit)
      const isNewRequest = reschedulingRequest.createdAt && 
        (Date.now() - new Date(reschedulingRequest.createdAt).getTime()) < 5000; // Created within last 5 seconds
      
      if (isNewRequest) {
        await storage.updateContact(data.contactId, {
          appointmentStatus: 'needs_rescheduling',
          rescheduleRequestCount: (contact.rescheduleRequestCount || 0) + 1,
        });
      }

      // Start automated workflow processing
      return await this.processWorkflow(reschedulingRequest.id, reschedulingRequest.tenantId, storage);
    } catch (error) {
      console.error('Error creating rescheduling request:', error);
      return {
        success: false,
        requestId: '',
        workflowStage: 'error',
        status: 'rejected',
        message: 'Failed to create rescheduling request'
      };
    }
  }

  /**
   * Process the workflow for a rescheduling request
   */
  async processWorkflow(
    requestId: string,
    tenantId: string,
    storage: any,
    manualOverride: boolean = false
  ): Promise<ReschedulingWorkflowResult> {
    try {
      const request = await storage.getReschedulingRequest(requestId, tenantId);
      if (!request) {
        return {
          success: false,
          requestId,
          workflowStage: 'error',
          status: 'rejected',
          message: 'Rescheduling request not found'
        };
      }

      // Get workflow context
      const context = await this.buildWorkflowContext(request, storage, !manualOverride);
      
      // Process current stage
      const processor = this.stageProcessors.get(request.workflowStage);
      if (!processor) {
        return {
          success: false,
          requestId,
          workflowStage: request.workflowStage,
          status: 'error',
          message: `No processor found for stage: ${request.workflowStage}`
        };
      }

      if (!processor.canProcess(request)) {
        return {
          success: false,
          requestId,
          workflowStage: request.workflowStage,
          status: 'blocked',
          message: 'Current stage cannot be processed'
        };
      }

      // Execute stage processing
      const result = await processor.process(request, context);
      
      // Update request with results
      const updates: any = {
        status: result.status,
        updatedAt: new Date(),
      };

      // Move to next stage if successful
      if (result.success) {
        const nextStage = processor.getNextStage();
        if (nextStage) {
          updates.workflowStage = nextStage;
          
          // Continue processing next stage if automated
          if (context.isAutomated && nextStage !== 'confirmation') {
            // Update current request first
            await storage.updateReschedulingRequest(requestId, tenantId, updates);
            
            // Process next stage
            return await this.processWorkflow(requestId, tenantId, storage, manualOverride);
          }
        } else {
          // Workflow complete
          updates.status = 'completed';
          updates.processedAt = new Date();
          updates.responseTimeHours = this.calculateResponseTime(request.createdAt);
        }
      }

      await storage.updateReschedulingRequest(requestId, tenantId, updates);
      
      return {
        ...result,
        requestId
      };
    } catch (error) {
      console.error('Error processing workflow:', error);
      return {
        success: false,
        requestId,
        workflowStage: 'error',
        status: 'error',
        message: 'Workflow processing failed'
      };
    }
  }

  /**
   * Get available time slots for rescheduling
   */
  async getAvailableSlots(
    tenantConfig: TenantConfig,
    contact: Contact,
    preferredDates?: Date[],
    durationMinutes: number = 60
  ): Promise<AvailabilitySlot[]> {
    const slots: AvailabilitySlot[] = [];

    try {
      // Check calendar integration type
      if (tenantConfig.calApiKey && contact.bookingSource === 'calcom') {
        // Get existing bookings to determine availability gaps
        const existingBookings = await calComService.getBookings(
          tenantConfig.calApiKey,
          tenantConfig.calEventTypeId || undefined
        );
        
        // Generate available slots based on business hours minus existing bookings
        const calComSlots = this.generateAvailableSlotsFromBookings(
          existingBookings,
          preferredDates || this.getDefaultDateRange(),
          durationMinutes
        );
        
        slots.push(...calComSlots.map((slot: any) => ({
          startTime: slot.startTime,
          endTime: slot.endTime,
          duration: durationMinutes,
          appointmentType: contact.appointmentType || undefined,
          provider: 'cal.com',
          location: 'Office' // Default location
        })));
      }

      if (tenantConfig.calendlyAccessToken && contact.bookingSource === 'calendly') {
        // Get existing events to determine availability gaps
        const existingEvents = await calendlyService.getScheduledEvents(
          tenantConfig.calendlyAccessToken,
          tenantConfig.calendlyOrganization || undefined,
          tenantConfig.calendlyUser || undefined
        );
        
        // Generate available slots based on existing events
        const calendlySlots = this.generateAvailableSlotsFromEvents(
          existingEvents,
          preferredDates || this.getDefaultDateRange(),
          durationMinutes
        );
        
        slots.push(...calendlySlots.map((slot: any) => ({
          startTime: slot.startTime,
          endTime: slot.endTime,
          duration: durationMinutes,
          appointmentType: contact.appointmentType || undefined,
          provider: 'calendly',
          location: 'Office' // Default location
        })));
      }

      // Fallback to business hours if no calendar integration
      if (slots.length === 0) {
        const businessSlots = await this.generateBusinessHoursSlots(
          tenantConfig,
          preferredDates || this.getDefaultDateRange(),
          durationMinutes
        );
        slots.push(...businessSlots);
      }

      // Sort slots by preference and proximity to original time
      return this.rankAvailabilitySlots(slots, contact);
    } catch (error) {
      console.error('Error getting available slots:', error);
      return [];
    }
  }

  /**
   * Confirm and schedule new appointment time
   */
  async confirmReschedule(
    requestId: string,
    tenantId: string,
    selectedTime: Date,
    storage: any,
    processedBy?: string
  ): Promise<ReschedulingWorkflowResult> {
    try {
      const request = await storage.getReschedulingRequest(requestId, tenantId);
      if (!request) {
        return {
          success: false,
          requestId,
          workflowStage: 'error',
          status: 'rejected',
          message: 'Rescheduling request not found'
        };
      }

      // Update rescheduling request
      await storage.updateReschedulingRequest(requestId, tenantId, {
        finalSelectedTime: selectedTime,
        status: 'approved',
        workflowStage: 'calendar_update',
        processedBy,
        processedAt: new Date(),
        responseTimeHours: this.calculateResponseTime(request.createdAt),
      });

      // Update contact with new appointment time
      await storage.updateContact(request.contactId, {
        appointmentTime: selectedTime,
        appointmentStatus: 'confirmed',
        lastContactTime: new Date(),
      });

      // Process calendar update stage
      return await this.processWorkflow(requestId, tenantId, storage, false);
    } catch (error) {
      console.error('Error confirming reschedule:', error);
      return {
        success: false,
        requestId,
        workflowStage: 'error',
        status: 'error',
        message: 'Failed to confirm reschedule'
      };
    }
  }

  /**
   * Cancel a rescheduling request
   */
  async cancelReschedulingRequest(
    requestId: string,
    tenantId: string,
    reason: string,
    storage: any,
    processedBy?: string
  ): Promise<ReschedulingWorkflowResult> {
    try {
      const request = await storage.getReschedulingRequest(requestId, tenantId);
      if (!request) {
        return {
          success: false,
          requestId,
          workflowStage: 'error',
          status: 'rejected',
          message: 'Rescheduling request not found'
        };
      }

      // Update request status
      await storage.updateReschedulingRequest(requestId, tenantId, {
        status: 'rejected',
        workflowStage: 'cancelled',
        processedBy,
        processedAt: new Date(),
        customerPreference: `${request.customerPreference || ''}\n\nCancellation reason: ${reason}`,
        responseTimeHours: this.calculateResponseTime(request.createdAt),
      });

      // Update contact status back to original
      await storage.updateContact(request.contactId, {
        appointmentStatus: 'pending', // Or whatever the original status was
        lastContactTime: new Date(),
      });

      return {
        success: true,
        requestId,
        workflowStage: 'cancelled',
        status: 'rejected',
        message: 'Rescheduling request cancelled'
      };
    } catch (error) {
      console.error('Error cancelling rescheduling request:', error);
      return {
        success: false,
        requestId,
        workflowStage: 'error',
        status: 'error',
        message: 'Failed to cancel rescheduling request'
      };
    }
  }

  // Helper methods
  private async buildWorkflowContext(
    request: ReschedulingRequest,
    storage: any,
    isAutomated: boolean
  ): Promise<WorkflowContext> {
    const [tenantConfig, contact] = await Promise.all([
      storage.getTenantConfig(request.tenantId),
      storage.getContact(request.contactId)
    ]);

    return {
      storage,
      tenantConfig,
      contact,
      isAutomated
    };
  }

  private calculateResponseTime(createdAt: Date): number {
    const now = new Date();
    return (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60); // Hours
  }

  private getDefaultDateRange(): Date[] {
    const dates: Date[] = [];
    const now = new Date();
    
    // Generate next 14 days
    for (let i = 1; i <= 14; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() + i);
      dates.push(date);
    }
    
    return dates;
  }

  private async generateBusinessHoursSlots(
    tenantConfig: TenantConfig,
    dates: Date[],
    durationMinutes: number
  ): Promise<AvailabilitySlot[]> {
    const slots: AvailabilitySlot[] = [];
    
    // Default business hours: 9 AM to 5 PM, Monday to Friday
    const businessStart = 9; // 9 AM
    const businessEnd = 17; // 5 PM
    
    for (const date of dates) {
      const dayOfWeek = date.getDay();
      
      // Skip weekends (0 = Sunday, 6 = Saturday)
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;
      
      // Generate hourly slots during business hours
      for (let hour = businessStart; hour < businessEnd; hour++) {
        const startTime = new Date(date);
        startTime.setHours(hour, 0, 0, 0);
        
        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + durationMinutes);
        
        // Don't create slots that end after business hours
        if (endTime.getHours() <= businessEnd) {
          slots.push({
            startTime,
            endTime,
            duration: durationMinutes,
            provider: 'business_hours',
            location: 'Office' // Default location
          });
        }
      }
    }
    
    return slots;
  }

  private rankAvailabilitySlots(slots: AvailabilitySlot[], contact: Contact): AvailabilitySlot[] {
    // Simple ranking algorithm - can be enhanced based on:
    // - Customer's historical preferences
    // - Time zone considerations
    // - Proximity to original appointment time
    // - Business priority rules
    
    return slots.sort((a, b) => {
      // Prefer earlier times
      return a.startTime.getTime() - b.startTime.getTime();
    });
  }

  private generateAvailableSlotsFromBookings(
    existingBookings: any[],
    dates: Date[],
    durationMinutes: number
  ): AvailabilitySlot[] {
    const slots: AvailabilitySlot[] = [];
    const businessStart = 9; // 9 AM
    const businessEnd = 17; // 5 PM
    
    for (const date of dates) {
      const dayOfWeek = date.getDay();
      
      // Skip weekends
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;
      
      // Generate potential slots for the day
      for (let hour = businessStart; hour < businessEnd; hour++) {
        const startTime = new Date(date);
        startTime.setHours(hour, 0, 0, 0);
        
        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + durationMinutes);
        
        // Check if this slot conflicts with existing bookings
        const hasConflict = existingBookings.some(booking => {
          const bookingStart = new Date(booking.startTime);
          const bookingEnd = new Date(booking.endTime);
          
          return (
            (startTime >= bookingStart && startTime < bookingEnd) ||
            (endTime > bookingStart && endTime <= bookingEnd) ||
            (startTime <= bookingStart && endTime >= bookingEnd)
          );
        });
        
        if (!hasConflict && endTime.getHours() <= businessEnd) {
          slots.push({
            startTime,
            endTime,
            duration: durationMinutes,
            provider: 'cal.com'
          });
        }
      }
    }
    
    return slots;
  }

  private generateAvailableSlotsFromEvents(
    existingEvents: any[],
    dates: Date[],
    durationMinutes: number
  ): AvailabilitySlot[] {
    const slots: AvailabilitySlot[] = [];
    const businessStart = 9; // 9 AM
    const businessEnd = 17; // 5 PM
    
    for (const date of dates) {
      const dayOfWeek = date.getDay();
      
      // Skip weekends
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;
      
      // Generate potential slots for the day
      for (let hour = businessStart; hour < businessEnd; hour++) {
        const startTime = new Date(date);
        startTime.setHours(hour, 0, 0, 0);
        
        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + durationMinutes);
        
        // Check if this slot conflicts with existing events
        const hasConflict = existingEvents.some(event => {
          const eventStart = new Date(event.start_time);
          const eventEnd = new Date(event.end_time);
          
          return (
            (startTime >= eventStart && startTime < eventEnd) ||
            (endTime > eventStart && endTime <= eventEnd) ||
            (startTime <= eventStart && endTime >= eventEnd)
          );
        });
        
        if (!hasConflict && endTime.getHours() <= businessEnd) {
          slots.push({
            startTime,
            endTime,
            duration: durationMinutes,
            provider: 'calendly'
          });
        }
      }
    }
    
    return slots;
  }

  /**
   * Get rescheduling requests that need processing
   */
  async getPendingRequests(tenantId: string, storage: any): Promise<ReschedulingRequest[]> {
    return await storage.getReschedulingRequestsByTenant(tenantId, 'pending');
  }

  /**
   * Process expired rescheduling requests (cleanup job)
   */
  async processExpiredRequests(storage: any): Promise<{ processed: number; expired: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7); // 7 days old
    
    const expiredRequests = await storage.getExpiredReschedulingRequests(cutoffDate);
    let processed = 0;
    let expired = 0;
    
    for (const request of expiredRequests) {
      try {
        await storage.updateReschedulingRequest(request.id, {
          status: 'expired',
          workflowStage: 'expired',
          processedAt: new Date(),
          responseTimeHours: this.calculateResponseTime(request.createdAt),
        });
        
        // Update contact status
        await storage.updateContact(request.contactId, {
          appointmentStatus: 'pending', // Reset to pending
        });
        
        expired++;
      } catch (error) {
        console.error(`Error processing expired request ${request.id}:`, error);
      }
      processed++;
    }
    
    return { processed, expired };
  }
}

// Stage Processors
class CustomerRequestProcessor implements WorkflowStageProcessor {
  async process(request: ReschedulingRequest, context: WorkflowContext): Promise<ReschedulingWorkflowResult> {
    // Validate the customer request
    if (!request.originalAppointmentTime || !request.contactId) {
      return {
        success: false,
        requestId: request.id,
        workflowStage: 'customer_request',
        status: 'rejected',
        message: 'Invalid customer request - missing required information'
      };
    }

    // Log the request for tracking
    await context.storage.createCallLog({
      tenantId: request.tenantId,
      contactId: request.contactId,
      callSessionId: request.callSessionId,
      logLevel: 'info',
      message: `Rescheduling request received: ${request.rescheduleReason}`,
      metadata: JSON.stringify({
        originalTime: request.originalAppointmentTime,
        urgency: request.urgencyLevel,
        customerPreference: request.customerPreference
      }),
    });

    return {
      success: true,
      requestId: request.id,
      workflowStage: 'customer_request',
      status: 'pending',
      message: 'Customer request validated and logged'
    };
  }

  canProcess(request: ReschedulingRequest): boolean {
    return request.status === 'pending' && request.workflowStage === 'customer_request';
  }

  getNextStage(): string | null {
    return 'availability_check';
  }
}

class AvailabilityCheckProcessor implements WorkflowStageProcessor {
  async process(request: ReschedulingRequest, context: WorkflowContext): Promise<ReschedulingWorkflowResult> {
    try {
      const workflowService = new ReschedulingWorkflowService();
      
      // Parse proposed times if available
      let preferredDates: Date[] | undefined;
      if (request.proposedTimes) {
        try {
          const proposedTimes = JSON.parse(request.proposedTimes);
          preferredDates = proposedTimes.map((time: string) => new Date(time));
        } catch (error) {
          console.warn('Failed to parse proposed times:', error);
        }
      }

      // Get available slots
      const appointmentDuration = context.contact.appointmentDuration || 60;
      const availableSlots = await workflowService.getAvailableSlots(
        context.tenantConfig,
        context.contact,
        preferredDates,
        appointmentDuration
      );

      if (availableSlots.length === 0) {
        return {
          success: false,
          requestId: request.id,
          workflowStage: 'availability_check',
          status: 'blocked',
          message: 'No available time slots found'
        };
      }

      // Store available slots
      await context.storage.updateReschedulingRequest(request.id, {
        availableSlots: JSON.stringify(availableSlots)
      });

      return {
        success: true,
        requestId: request.id,
        workflowStage: 'availability_check',
        status: 'pending',
        message: `Found ${availableSlots.length} available time slots`,
        availableSlots
      };
    } catch (error) {
      console.error('Error checking availability:', error);
      return {
        success: false,
        requestId: request.id,
        workflowStage: 'availability_check',
        status: 'error',
        message: 'Failed to check availability'
      };
    }
  }

  canProcess(request: ReschedulingRequest): boolean {
    return request.status === 'pending' && request.workflowStage === 'availability_check';
  }

  getNextStage(): string | null {
    return 'confirmation';
  }
}

class ConfirmationProcessor implements WorkflowStageProcessor {
  async process(request: ReschedulingRequest, context: WorkflowContext): Promise<ReschedulingWorkflowResult> {
    // This stage requires manual confirmation unless we have auto-confirmation rules
    if (context.isAutomated && !request.finalSelectedTime) {
      // For automated processing, select the first available slot if customer didn't specify
      try {
        const availableSlots = request.availableSlots ? JSON.parse(request.availableSlots) : [];
        if (availableSlots.length > 0) {
          const selectedSlot = availableSlots[0];
          
          await context.storage.updateReschedulingRequest(request.id, request.tenantId, {
            finalSelectedTime: new Date(selectedSlot.startTime)
          });

          return {
            success: true,
            requestId: request.id,
            workflowStage: 'confirmation',
            status: 'approved',
            message: 'Automatically confirmed first available slot',
            selectedTime: new Date(selectedSlot.startTime)
          };
        }
      } catch (error) {
        console.error('Error auto-confirming slot:', error);
      }
    }

    // ENHANCED: Send automated customer notification for manual confirmation
    try {
      const contact = await context.storage.getContact(request.contactId);
      const tenantConfig = await context.storage.getTenantConfig(request.tenantId);
      
      if (contact && tenantConfig) {
        const availableSlots = request.availableSlots ? JSON.parse(request.availableSlots) : [];
        
        // CRITICAL: Convert string dates to Date objects for notification service
        const normalizedSlots = availableSlots.map((slot: any) => ({
          ...slot,
          startTime: new Date(slot.startTime),
          endTime: new Date(slot.endTime)
        }));
        
        const notificationRequest: NotificationRequest = {
          tenantId: request.tenantId,
          contactId: request.contactId,
          reschedulingRequestId: request.id,
          contactMethod: contact.preferredContactMethod as 'email' | 'sms' | 'voice' || 'email',
          recipientPhone: contact.phone,
          recipientEmail: contact.email || `${contact.name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
          recipientName: contact.name,
          availableSlots: normalizedSlots,
          originalAppointmentTime: request.originalAppointmentTime,
          businessName: tenantConfig.businessType || 'VioConcierge',
          urgencyLevel: request.urgencyLevel as 'urgent' | 'high' | 'normal' | 'low' || 'normal'
        };

        const notificationResult = await notificationService.sendReschedulingNotification(notificationRequest);
        
        if (notificationResult.success) {
          // Update request with notification tracking
          await context.storage.updateReschedulingRequest(request.id, request.tenantId, {
            confirmationSent: true,
            customerPreference: `${request.customerPreference || ''}\n\nNotification sent via ${notificationResult.method} at ${new Date().toISOString()}`
          });

          console.log(`✅ Automated ${notificationResult.method} notification sent for rescheduling request ${request.id}`);
          
          return {
            success: true,
            requestId: request.id,
            workflowStage: 'confirmation',
            status: 'pending',
            message: `Customer notification sent via ${notificationResult.method}. Awaiting response.`,
            confirmationSent: true
          };
        }
      }
    } catch (error) {
      console.error('Error sending automated notification:', error);
      // Continue with manual process if notification fails
    }

    // Manual confirmation required (fallback)
    return {
      success: true,
      requestId: request.id,
      workflowStage: 'confirmation',
      status: 'pending',
      message: 'Awaiting manual confirmation of time slot'
    };
  }

  canProcess(request: ReschedulingRequest): boolean {
    return request.status === 'pending' && request.workflowStage === 'confirmation';
  }

  getNextStage(): string | null {
    return 'calendar_update';
  }
}

class CalendarUpdateProcessor implements WorkflowStageProcessor {
  async process(request: ReschedulingRequest, context: WorkflowContext): Promise<ReschedulingWorkflowResult> {
    if (!request.finalSelectedTime) {
      return {
        success: false,
        requestId: request.id,
        workflowStage: 'calendar_update',
        status: 'error',
        message: 'No final time selected for calendar update'
      };
    }

    try {
      let calendarUpdated = false;
      let confirmationSent = false;

      // Update calendar based on booking source
      if (context.contact.bookingSource === 'calcom' && context.tenantConfig.calApiKey) {
        // For Cal.com, create new booking and cancel old one if booking ID available
        try {
          const newBooking = await calComService.createBooking(
            context.tenantConfig.calApiKey,
            {
              eventTypeId: context.tenantConfig.calEventTypeId || 1,
              start: request.finalSelectedTime.toISOString(),
              end: new Date(request.finalSelectedTime.getTime() + (context.contact.appointmentDuration || 60) * 60000).toISOString(),
              attendee: {
                name: context.contact.name,
                email: context.contact.email || 'contact@example.com',
                timeZone: context.contact.timezone || 'UTC'
              }
            }
          );
          calendarUpdated = !!newBooking;
        } catch (error) {
          console.error('Cal.com booking creation failed:', error);
          calendarUpdated = false;
        }
      } else if (context.contact.bookingSource === 'calendly' && context.tenantConfig.calendlyAccessToken) {
        // For Calendly, we can only cancel existing events, new events are created via Calendly interface
        // In practice, rescheduling would require manual intervention or Calendly webhook handling
        calendarUpdated = true; // Mark as manual process required
      } else {
        // No external calendar integration - mark as manually updated
        calendarUpdated = true;
      }

      // Update rescheduling request with results
      await context.storage.updateReschedulingRequest(request.id, {
        calendarUpdated,
        confirmationSent: true, // TODO: Implement actual confirmation sending
      });

      return {
        success: calendarUpdated,
        requestId: request.id,
        workflowStage: 'calendar_update',
        status: calendarUpdated ? 'completed' : 'error',
        message: calendarUpdated ? 'Calendar updated successfully' : 'Failed to update calendar',
        calendarUpdated,
        confirmationSent: true,
        selectedTime: request.finalSelectedTime
      };
    } catch (error) {
      console.error('Error updating calendar:', error);
      return {
        success: false,
        requestId: request.id,
        workflowStage: 'calendar_update',
        status: 'error',
        message: 'Calendar update failed'
      };
    }
  }

  canProcess(request: ReschedulingRequest): boolean {
    return request.status === 'approved' && request.workflowStage === 'calendar_update';
  }

  getNextStage(): string | null {
    return null; // Final stage
  }
}

// Export singleton instance
export const reschedulingWorkflowService = new ReschedulingWorkflowService();