/**
 * NotificationService - Automated customer notifications for rescheduling confirmations
 * Supports SMS, email, and voice call notifications with customer response tracking
 */

import crypto from 'crypto';

export interface NotificationRequest {
  tenantId: string;
  contactId: string;
  reschedulingRequestId: string;
  contactMethod: 'email' | 'sms' | 'voice';
  recipientPhone?: string;
  recipientEmail?: string;
  recipientName: string;
  availableSlots: AvailableSlot[];
  originalAppointmentTime: Date;
  businessName: string;
  urgencyLevel: 'urgent' | 'high' | 'normal' | 'low';
}

export interface AvailableSlot {
  startTime: Date;
  endTime: Date;
  duration: number;
  provider: string;
  location?: string;
  appointmentType?: string;
}

export interface NotificationResponse {
  success: boolean;
  notificationId: string;
  method: string;
  status: 'sent' | 'failed' | 'pending';
  responseToken: string; // For customer responses
  expiresAt: Date;
  trackingUrl?: string;
  message?: string;
}

export interface CustomerResponse {
  responseToken: string;
  selectedSlotIndex: number | null; // null for decline
  customerComments?: string;
  responseTime: Date;
}

export class NotificationService {
  private responseTokens: Map<string, { 
    reschedulingRequestId: string; 
    tenantId: string; 
    contactId: string; 
    expiresAt: Date;
    availableSlots: AvailableSlot[];
  }> = new Map();

  /**
   * Send rescheduling confirmation notification to customer
   */
  async sendReschedulingNotification(
    request: NotificationRequest
  ): Promise<NotificationResponse> {
    try {
      // Generate secure response token for customer replies
      const responseToken = this.generateResponseToken(request.reschedulingRequestId);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      // Store response token mapping
      this.responseTokens.set(responseToken, {
        reschedulingRequestId: request.reschedulingRequestId,
        tenantId: request.tenantId,
        contactId: request.contactId,
        expiresAt,
        availableSlots: request.availableSlots
      });

      // Generate notification content
      const content = this.generateNotificationContent(request, responseToken);
      
      // Send notification based on preferred method
      let result: NotificationResponse;
      
      switch (request.contactMethod) {
        case 'email':
          result = await this.sendEmailNotification(request, content, responseToken, expiresAt);
          break;
        case 'sms':
          result = await this.sendSMSNotification(request, content, responseToken, expiresAt);
          break;
        case 'voice':
          result = await this.sendVoiceNotification(request, content, responseToken, expiresAt);
          break;
        default:
          throw new Error(`Unsupported contact method: ${request.contactMethod}`);
      }

      return result;
    } catch (error) {
      console.error('Error sending rescheduling notification:', error);
      return {
        success: false,
        notificationId: '',
        method: request.contactMethod,
        status: 'failed',
        responseToken: '',
        expiresAt: new Date(),
        message: error instanceof Error ? error.message : 'Failed to send notification'
      };
    }
  }

  /**
   * Process customer response to rescheduling notification
   */
  async processCustomerResponse(
    responseToken: string,
    response: Omit<CustomerResponse, 'responseTime'>
  ): Promise<{ success: boolean; reschedulingRequestId: string; tenantId: string; message: string }> {
    const tokenData = this.responseTokens.get(responseToken);
    
    if (!tokenData) {
      return {
        success: false,
        reschedulingRequestId: '',
        tenantId: '',
        message: 'Invalid or expired response token'
      };
    }

    if (new Date() > tokenData.expiresAt) {
      this.responseTokens.delete(responseToken);
      return {
        success: false,
        reschedulingRequestId: tokenData.reschedulingRequestId,
        tenantId: tokenData.tenantId,
        message: 'Response window has expired'
      };
    }

    // Validate slot selection
    if (response.selectedSlotIndex !== null) {
      if (response.selectedSlotIndex < 0 || response.selectedSlotIndex >= tokenData.availableSlots.length) {
        return {
          success: false,
          reschedulingRequestId: tokenData.reschedulingRequestId,
          tenantId: tokenData.tenantId,
          message: 'Invalid slot selection'
        };
      }
    }

    // Clean up token after successful response
    this.responseTokens.delete(responseToken);

    return {
      success: true,
      reschedulingRequestId: tokenData.reschedulingRequestId,
      tenantId: tokenData.tenantId,
      message: response.selectedSlotIndex !== null ? 'Slot confirmed' : 'Rescheduling declined'
    };
  }

  /**
   * Send follow-up reminder for pending responses
   */
  async sendFollowupReminder(
    originalRequest: NotificationRequest,
    reminderAttempt: number
  ): Promise<NotificationResponse> {
    // CRITICAL: Generate responseToken FIRST before content generation
    const responseToken = this.generateResponseToken(originalRequest.reschedulingRequestId);
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours

    // Store reminder token in responseTokens map BEFORE generating content
    this.responseTokens.set(responseToken, {
      reschedulingRequestId: originalRequest.reschedulingRequestId,
      tenantId: originalRequest.tenantId,
      contactId: originalRequest.contactId,
      expiresAt,
      availableSlots: originalRequest.availableSlots
    });

    // Modify urgency and content for reminder
    const reminderRequest: NotificationRequest = {
      ...originalRequest,
      urgencyLevel: reminderAttempt > 1 ? 'high' : 'normal'
    };

    const content = this.generateReminderContent(reminderRequest, reminderAttempt, responseToken);

    try {
      switch (originalRequest.contactMethod) {
        case 'email':
          return await this.sendEmailNotification(reminderRequest, content, responseToken, expiresAt);
        case 'sms':
          return await this.sendSMSNotification(reminderRequest, content, responseToken, expiresAt);
        default:
          return await this.sendVoiceNotification(reminderRequest, content, responseToken, expiresAt);
      }
    } catch (error) {
      console.error('Error sending follow-up reminder:', error);
      return {
        success: false,
        notificationId: '',
        method: originalRequest.contactMethod,
        status: 'failed',
        responseToken,
        expiresAt,
        message: 'Failed to send reminder'
      };
    }
  }

  private generateResponseToken(reschedulingRequestId: string): string {
    return crypto.randomBytes(32).toString('hex') + '_' + reschedulingRequestId.slice(0, 8);
  }

  private generateNotificationContent(
    request: NotificationRequest,
    responseToken: string
  ): { subject: string; body: string; smsText: string } {
    const urgencyPrefix = request.urgencyLevel === 'urgent' ? '🚨 URGENT: ' : 
                         request.urgencyLevel === 'high' ? '⚡ High Priority: ' : '';
    
    const formatTime = (date: Date) => {
      return date.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    };

    const slotOptions = request.availableSlots
      .map((slot, index) => 
        `${index + 1}. ${formatTime(slot.startTime)} (${slot.duration} minutes)`
      )
      .join('\n');

    const responseUrl = `${process.env.PUBLIC_URL || 'https://app.vioconcierge.com'}/api/rescheduling/respond/${responseToken}`;

    const subject = `${urgencyPrefix}Reschedule Request - ${request.businessName}`;
    
    const body = `
Dear ${request.recipientName},

${urgencyPrefix.replace(/:/g, '')}We need to reschedule your appointment originally scheduled for ${formatTime(request.originalAppointmentTime)}.

Please choose from these available time slots:

${slotOptions}

To confirm your selection, please visit: ${responseUrl}

Or reply to this message with the number of your preferred slot (1, 2, 3, etc.).

If none of these times work, please reply with "DECLINE" and we'll find alternative options.

This request expires in 24 hours.

Best regards,
${request.businessName}
    `.trim();

    const smsText = `
${urgencyPrefix}${request.businessName}: Reschedule needed for ${formatTime(request.originalAppointmentTime).split(',')[0]}. 

Options:
${request.availableSlots.slice(0, 3).map((slot, index) => 
  `${index + 1}. ${slot.startTime.toLocaleDateString()} ${slot.startTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`
).join('\n')}

Reply with number (1,2,3) or visit: ${responseUrl}

Expires in 24hrs.
    `.trim();

    return { subject, body, smsText };
  }

  private generateReminderContent(
    request: NotificationRequest,
    reminderAttempt: number,
    responseToken: string
  ): { subject: string; body: string; smsText: string } {
    const urgencyText = reminderAttempt > 1 ? '🚨 FINAL REMINDER' : '⏰ REMINDER';
    
    const baseContent = this.generateNotificationContent(request, responseToken);
    
    return {
      subject: `${urgencyText}: ${baseContent.subject}`,
      body: `${urgencyText}: This is reminder #${reminderAttempt} about your pending rescheduling request.\n\n${baseContent.body}`,
      smsText: `${urgencyText} #${reminderAttempt}: ${baseContent.smsText}`
    };
  }

  private async sendEmailNotification(
    request: NotificationRequest,
    content: { subject: string; body: string; smsText: string },
    responseToken: string,
    expiresAt: Date
  ): Promise<NotificationResponse> {
    // TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
    console.log(`📧 Email notification sent to ${request.recipientEmail}:`);
    console.log(`Subject: ${content.subject}`);
    console.log(`Body: ${content.body.substring(0, 200)}...`);
    
    const notificationId = crypto.randomUUID();
    
    return {
      success: true,
      notificationId,
      method: 'email',
      status: 'sent',
      responseToken,
      expiresAt,
      message: `Email sent to ${request.recipientEmail}`
    };
  }

  private async sendSMSNotification(
    request: NotificationRequest,
    content: { subject: string; body: string; smsText: string },
    responseToken: string,
    expiresAt: Date
  ): Promise<NotificationResponse> {
    // TODO: Integrate with actual SMS service (Twilio, AWS SNS, etc.)
    console.log(`📱 SMS notification sent to ${request.recipientPhone}:`);
    console.log(`Message: ${content.smsText}`);
    
    const notificationId = crypto.randomUUID();
    
    return {
      success: true,
      notificationId,
      method: 'sms',
      status: 'sent',
      responseToken,
      expiresAt,
      message: `SMS sent to ${request.recipientPhone}`
    };
  }

  private async sendVoiceNotification(
    request: NotificationRequest,
    content: { subject: string; body: string; smsText: string },
    responseToken: string,
    expiresAt: Date
  ): Promise<NotificationResponse> {
    // TODO: Integrate with Retell AI for voice notifications
    console.log(`📞 Voice notification initiated for ${request.recipientPhone}:`);
    console.log(`Script: Reschedule request for ${request.businessName}...`);
    
    const notificationId = crypto.randomUUID();
    
    return {
      success: true,
      notificationId,
      method: 'voice',
      status: 'sent',
      responseToken,
      expiresAt,
      message: `Voice call initiated to ${request.recipientPhone}`
    };
  }

  /**
   * Clean up expired response tokens
   */
  cleanupExpiredTokens(): void {
    const now = new Date();
    const entries = Array.from(this.responseTokens.entries());
    for (const [token, data] of entries) {
      if (now > data.expiresAt) {
        this.responseTokens.delete(token);
      }
    }
  }

  /**
   * Get response data for a specific token (used by routes)
   */
  getResponseData(responseToken: string): { 
    reschedulingRequestId: string; 
    tenantId: string; 
    contactId: string; 
    expiresAt: Date;
    availableSlots: AvailableSlot[];
  } | null {
    const data = this.responseTokens.get(responseToken);
    if (!data || new Date() > data.expiresAt) {
      if (data) this.responseTokens.delete(responseToken);
      return null;
    }
    return data;
  }

  /**
   * Get all pending responses for monitoring
   */
  getPendingResponses(tenantId?: string): Array<{
    responseToken: string;
    reschedulingRequestId: string;
    tenantId: string;
    contactId: string;
    expiresAt: Date;
    timeRemaining: number;
  }> {
    const now = new Date();
    const results = [];
    const entries = Array.from(this.responseTokens.entries());
    
    for (const [token, data] of entries) {
      if (!tenantId || data.tenantId === tenantId) {
        results.push({
          responseToken: token,
          reschedulingRequestId: data.reschedulingRequestId,
          tenantId: data.tenantId,
          contactId: data.contactId,
          expiresAt: data.expiresAt,
          timeRemaining: Math.max(0, data.expiresAt.getTime() - now.getTime())
        });
      }
    }
    
    return results.sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime());
  }
}

// Export singleton instance
export const notificationService = new NotificationService();

// Auto-cleanup expired tokens every hour
setInterval(() => {
  notificationService.cleanupExpiredTokens();
}, 60 * 60 * 1000);