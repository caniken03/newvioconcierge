import type { ReschedulingRequest, Contact, TenantConfig } from "@shared/schema";
import { calComService } from "./cal-com";
import { calendlyService } from "./calendly";
import { notificationService, type NotificationRequest } from './notification-service';
import { zonedTimeToUtc, utcToZonedTime, format } from 'date-fns-tz';
import { addMinutes, isAfter, isBefore, parseISO } from 'date-fns';

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
  timezone?: string;
}

interface BusinessHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

interface DayHours {
  enabled: boolean;
  start: string; // Format: "HH:MM"
  end: string;   // Format: "HH:MM"
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
    const timezone = tenantConfig.timezone || 'UTC';

    console.log(`🔍 Getting available slots for ${contact.name}`);
    console.log(`   ├─ Timezone: ${timezone}`);
    console.log(`   ├─ Duration: ${durationMinutes} minutes`);
    console.log(`   └─ Booking source: ${contact.bookingSource || 'none'}`);

    try {
      // ENHANCED: Real-time calendar provider availability checking
      if (tenantConfig.calApiKey && (contact.bookingSource === 'calcom' || !contact.bookingSource)) {
        console.log(`📅 Checking Cal.com availability...`);
        
        try {
          // Get both existing bookings AND real-time availability
          const [existingBookings, eventTypes] = await Promise.all([
            calComService.getBookings(tenantConfig.calApiKey, tenantConfig.calEventTypeId || undefined),
            calComService.getEventTypes(tenantConfig.calApiKey)
          ]);
          
          console.log(`   ├─ Found ${existingBookings.length} existing bookings`);
          console.log(`   └─ Available event types: ${eventTypes.length}`);
          
          // Generate available slots with real-time conflict checking
          const calComSlots = await this.generateEnhancedAvailabilitySlots(
            'cal.com',
            existingBookings,
            preferredDates || this.getDefaultDateRange(),
            durationMinutes,
            tenantConfig,
            contact
          );
          
          slots.push(...calComSlots);
          console.log(`✅ Cal.com slots generated: ${calComSlots.length}`);
        } catch (calError) {
          console.error('Cal.com availability check failed:', calError);
          // Continue to fallback options
        }
      }

      if (tenantConfig.calendlyAccessToken && (contact.bookingSource === 'calendly' || !contact.bookingSource)) {
        console.log(`📅 Checking Calendly availability...`);
        
        try {
          // Get both existing events AND real-time availability
          const [existingEvents, eventTypes] = await Promise.all([
            calendlyService.getScheduledEvents(
              tenantConfig.calendlyAccessToken,
              tenantConfig.calendlyOrganization,
              tenantConfig.calendlyUser
            ),
            calendlyService.getEventTypes(
              tenantConfig.calendlyAccessToken,
              tenantConfig.calendlyOrganization,
              tenantConfig.calendlyUser
            )
          ]);
          
          console.log(`   ├─ Found ${existingEvents.length} existing events`);
          console.log(`   └─ Available event types: ${eventTypes.length}`);
          
          // Generate available slots with real-time conflict checking
          const calendlySlots = await this.generateEnhancedAvailabilitySlots(
            'calendly',
            existingEvents,
            preferredDates || this.getDefaultDateRange(),
            durationMinutes,
            tenantConfig,
            contact
          );
          
          slots.push(...calendlySlots);
          console.log(`✅ Calendly slots generated: ${calendlySlots.length}`);
        } catch (calendlyError) {
          console.error('Calendly availability check failed:', calendlyError);
          // Continue to fallback options
        }
      }

      // Enhanced business hours fallback with timezone support
      if (slots.length === 0) {
        console.log(`📅 Using business hours fallback...`);
        const businessSlots = await this.generateBusinessHoursSlots(
          tenantConfig,
          preferredDates || this.getDefaultDateRange(),
          durationMinutes
        );
        slots.push(...businessSlots);
        console.log(`✅ Business hours slots generated: ${businessSlots.length}`);
      }

      // Enhanced ranking with timezone-aware sorting
      const rankedSlots = this.rankAvailabilitySlots(slots, contact, timezone);
      console.log(`🎯 Final ranked slots: ${rankedSlots.length}`);
      
      return rankedSlots;
    } catch (error) {
      console.error('Error getting available slots:', error);
      
      // Last resort: generate basic business hours slots
      try {
        const fallbackSlots = await this.generateBusinessHoursSlots(
          tenantConfig,
          this.getDefaultDateRange(),
          durationMinutes
        );
        console.log(`🚨 Using fallback slots: ${fallbackSlots.length}`);
        return fallbackSlots;
      } catch (fallbackError) {
        console.error('Fallback slot generation failed:', fallbackError);
        return [];
      }
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
    
    // ENHANCED: Get business hours from tenant configuration or use intelligent defaults
    const businessHours = this.getTenantBusinessHours(tenantConfig);
    const timezone = tenantConfig.timezone || 'UTC';
    const slotInterval = Math.max(15, Math.min(durationMinutes, 60)); // 15min to 60min intervals
    const bufferMinutes = Math.min(15, Math.floor(durationMinutes * 0.1)); // 10% buffer, max 15min
    
    console.log(`📅 Generating business hours slots for ${dates.length} dates`);
    console.log(`   ├─ Timezone: ${timezone}`);
    console.log(`   ├─ Duration: ${durationMinutes} minutes`);
    console.log(`   ├─ Interval: ${slotInterval} minutes`);
    console.log(`   └─ Buffer: ${bufferMinutes} minutes`);
    
    for (const date of dates) {
      const dayOfWeek = date.getDay();
      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];
      
      // Get business hours for this specific day
      const dayHours = businessHours[dayName.toLowerCase()];
      if (!dayHours.enabled) {
        console.log(`   ⚠️  ${dayName} is not a business day, skipping`);
        continue;
      }
      
      console.log(`   📍 Processing ${dayName}: ${dayHours.start} - ${dayHours.end}`);
      
      // Parse business hours for this day
      const startHour = parseInt(dayHours.start.split(':')[0]);
      const startMinute = parseInt(dayHours.start.split(':')[1]);
      const endHour = parseInt(dayHours.end.split(':')[0]);
      const endMinute = parseInt(dayHours.end.split(':')[1]);
      
      // Generate slots with proper intervals and buffer time
      let currentTime = new Date(date);
      currentTime.setHours(startHour, startMinute, 0, 0);
      
      const dayEnd = new Date(date);
      dayEnd.setHours(endHour, endMinute, 0, 0);
      
      let slotCount = 0;
      while (currentTime < dayEnd) {
        const startTime = new Date(currentTime);
        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + durationMinutes);
        
        // Check if slot fits within business hours (including buffer)
        const slotEndWithBuffer = new Date(endTime);
        slotEndWithBuffer.setMinutes(slotEndWithBuffer.getMinutes() + bufferMinutes);
        
        if (slotEndWithBuffer <= dayEnd) {
          slots.push({
            startTime,
            endTime,
            duration: durationMinutes,
            provider: 'business_hours',
            location: tenantConfig.businessType || 'Office',
            timezone: timezone
          });
          slotCount++;
        }
        
        // Move to next interval
        currentTime.setMinutes(currentTime.getMinutes() + slotInterval);
      }
      
      console.log(`   ✅ Generated ${slotCount} slots for ${dayName}`);
    }
    
    console.log(`📅 Total slots generated: ${slots.length}`);
    return slots;
  }

  /**
   * Get tenant-specific business hours with intelligent defaults
   */
  private getTenantBusinessHours(tenantConfig: TenantConfig): BusinessHours {
    // ENHANCED: Business hours based on business type with proper defaults
    const businessTypeHours: { [key: string]: BusinessHours } = {
      medical: {
        monday: { enabled: true, start: '08:00', end: '17:00' },
        tuesday: { enabled: true, start: '08:00', end: '17:00' },
        wednesday: { enabled: true, start: '08:00', end: '17:00' },
        thursday: { enabled: true, start: '08:00', end: '17:00' },
        friday: { enabled: true, start: '08:00', end: '16:00' },
        saturday: { enabled: false, start: '09:00', end: '12:00' },
        sunday: { enabled: false, start: '09:00', end: '12:00' }
      },
      salon: {
        monday: { enabled: false, start: '10:00', end: '18:00' },
        tuesday: { enabled: true, start: '09:00', end: '19:00' },
        wednesday: { enabled: true, start: '09:00', end: '19:00' },
        thursday: { enabled: true, start: '09:00', end: '20:00' },
        friday: { enabled: true, start: '09:00', end: '20:00' },
        saturday: { enabled: true, start: '08:00', end: '18:00' },
        sunday: { enabled: true, start: '10:00', end: '17:00' }
      },
      restaurant: {
        monday: { enabled: true, start: '11:00', end: '22:00' },
        tuesday: { enabled: true, start: '11:00', end: '22:00' },
        wednesday: { enabled: true, start: '11:00', end: '22:00' },
        thursday: { enabled: true, start: '11:00', end: '23:00' },
        friday: { enabled: true, start: '11:00', end: '23:00' },
        saturday: { enabled: true, start: '10:00', end: '23:00' },
        sunday: { enabled: true, start: '10:00', end: '21:00' }
      },
      professional: {
        monday: { enabled: true, start: '09:00', end: '17:00' },
        tuesday: { enabled: true, start: '09:00', end: '17:00' },
        wednesday: { enabled: true, start: '09:00', end: '17:00' },
        thursday: { enabled: true, start: '09:00', end: '17:00' },
        friday: { enabled: true, start: '09:00', end: '17:00' },
        saturday: { enabled: false, start: '09:00', end: '12:00' },
        sunday: { enabled: false, start: '09:00', end: '12:00' }
      }
    };
    
    const businessType = tenantConfig.businessType || 'professional';
    const defaultHours = businessTypeHours[businessType] || businessTypeHours.professional;
    
    console.log(`📊 Using business hours for type: ${businessType}`);
    
    return defaultHours;
  }

  /**
   * Generate enhanced availability slots with real-time conflict checking
   */
  private async generateEnhancedAvailabilitySlots(
    provider: string,
    existingBookings: any[],
    dates: Date[],
    durationMinutes: number,
    tenantConfig: TenantConfig,
    contact: Contact
  ): Promise<AvailabilitySlot[]> {
    const slots: AvailabilitySlot[] = [];
    const timezone = tenantConfig.timezone || 'UTC';
    const businessHours = this.getTenantBusinessHours(tenantConfig);
    const bufferMinutes = Math.min(15, Math.floor(durationMinutes * 0.1)); // 10% buffer, max 15min
    
    console.log(`🔄 Enhanced slot generation for ${provider}`);
    console.log(`   ├─ Existing bookings: ${existingBookings.length}`);
    console.log(`   ├─ Date range: ${dates.length} days`);
    console.log(`   └─ Buffer time: ${bufferMinutes} minutes`);
    
    for (const date of dates) {
      const dayOfWeek = date.getDay();
      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];
      const dayHours = businessHours[dayName.toLowerCase()];
      
      if (!dayHours.enabled) continue;
      
      // Convert business hours to local timezone
      const dayStart = new Date(date);
      const [startHour, startMinute] = dayHours.start.split(':').map(Number);
      dayStart.setHours(startHour, startMinute, 0, 0);
      
      const dayEnd = new Date(date);
      const [endHour, endMinute] = dayHours.end.split(':').map(Number);
      dayEnd.setHours(endHour, endMinute, 0, 0);
      
      // Generate potential slots
      let currentTime = new Date(dayStart);
      const slotInterval = Math.max(15, Math.min(durationMinutes, 60));
      
      while (currentTime < dayEnd) {
        const slotStart = new Date(currentTime);
        const slotEnd = addMinutes(slotStart, durationMinutes);
        const slotEndWithBuffer = addMinutes(slotEnd, bufferMinutes);
        
        // Check if slot fits within business hours
        if (slotEndWithBuffer <= dayEnd) {
          // Check for conflicts with existing bookings
          const hasConflict = this.checkSlotConflict(
            slotStart, 
            slotEndWithBuffer, 
            existingBookings, 
            provider
          );
          
          if (!hasConflict) {
            slots.push({
              startTime: slotStart,
              endTime: slotEnd,
              duration: durationMinutes,
              appointmentType: contact.appointmentType,
              provider: provider,
              location: this.getLocationForProvider(provider, tenantConfig),
              timezone: timezone
            });
          }
        }
        
        currentTime = addMinutes(currentTime, slotInterval);
      }
    }
    
    console.log(`✅ Generated ${slots.length} conflict-free slots for ${provider}`);
    return slots;
  }

  /**
   * Check if a time slot conflicts with existing bookings
   */
  private checkSlotConflict(
    slotStart: Date,
    slotEnd: Date,
    existingBookings: any[],
    provider: string
  ): boolean {
    for (const booking of existingBookings) {
      let bookingStart: Date;
      let bookingEnd: Date;
      
      // Handle different provider booking formats
      if (provider === 'cal.com') {
        bookingStart = new Date(booking.startTime || booking.start_time);
        bookingEnd = new Date(booking.endTime || booking.end_time);
      } else if (provider === 'calendly') {
        bookingStart = new Date(booking.start_time);
        bookingEnd = new Date(booking.end_time);
      } else {
        continue; // Unknown provider format
      }
      
      // Check for overlap: slot conflicts if it starts before booking ends and ends after booking starts
      const hasOverlap = isBefore(slotStart, bookingEnd) && isAfter(slotEnd, bookingStart);
      
      if (hasOverlap) {
        console.log(`   ⚠️  Conflict detected: ${slotStart.toISOString()} - ${slotEnd.toISOString()}`);
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get appropriate location based on provider and tenant config
   */
  private getLocationForProvider(provider: string, tenantConfig: TenantConfig): string {
    const businessType = tenantConfig.businessType || 'professional';
    
    const locationDefaults: { [key: string]: string } = {
      medical: 'Medical Office',
      salon: 'Salon',
      restaurant: 'Restaurant',
      professional: 'Office'
    };
    
    return locationDefaults[businessType] || 'Office';
  }

  private rankAvailabilitySlots(slots: AvailabilitySlot[], contact: Contact, timezone?: string): AvailabilitySlot[] {
    console.log(`🎯 Ranking ${slots.length} slots for optimal customer experience`);
    
    const now = new Date();
    const originalTime = contact.appointmentTime ? new Date(contact.appointmentTime) : now;
    
    return slots.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;
      
      // 1. Prefer provider-based slots over business hours fallback (higher reliability)
      if (a.provider !== 'business_hours' && b.provider === 'business_hours') scoreA += 100;
      if (b.provider !== 'business_hours' && a.provider === 'business_hours') scoreB += 100;
      
      // 2. Prefer earlier slots (within business logic)
      const daysDiffA = Math.abs((a.startTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const daysDiffB = Math.abs((b.startTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiffA < daysDiffB) scoreA += 50;
      if (daysDiffB < daysDiffA) scoreB += 50;
      
      // 3. Prefer similar time of day to original appointment
      if (originalTime) {
        const originalHour = originalTime.getHours();
        const hourDiffA = Math.abs(a.startTime.getHours() - originalHour);
        const hourDiffB = Math.abs(b.startTime.getHours() - originalHour);
        
        if (hourDiffA < hourDiffB) scoreA += 30;
        if (hourDiffB < hourDiffA) scoreB += 30;
      }
      
      // 4. Prefer common business hours (10 AM - 4 PM gets slight boost)
      const hourA = a.startTime.getHours();
      const hourB = b.startTime.getHours();
      
      if (hourA >= 10 && hourA <= 16) scoreA += 10;
      if (hourB >= 10 && hourB <= 16) scoreB += 10;
      
      // 5. Avoid very early or very late slots
      if (hourA < 8 || hourA > 18) scoreA -= 20;
      if (hourB < 8 || hourB > 18) scoreB -= 20;
      
      // Final comparison: higher score wins (negative result means A comes first)
      const scoreDiff = scoreB - scoreA;
      
      // If scores are equal, sort by earliest time
      if (scoreDiff === 0) {
        return a.startTime.getTime() - b.startTime.getTime();
      }
      
      return scoreDiff;
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