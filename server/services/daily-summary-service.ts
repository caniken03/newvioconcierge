import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { db } from '../db';
import { users, userNotificationPreferences, callSessions, contacts } from '@shared/schema';
import { generateDailySummaryEmail, shouldSendSummary } from '../utils/daily-summary-email';
import { Resend } from 'resend';
import { format, startOfDay, endOfDay, addHours } from 'date-fns';
import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz';

const resend = new Resend(process.env.RESEND_API_KEY);

interface DailySummaryService {
  start(): void;
  stop(): void;
  sendTestSummary(email: string, tenantId: string, userName?: string): Promise<void>;
}

class DailySummaryServiceImpl implements DailySummaryService {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  start(): void {
    if (this.isRunning) {
      console.log('⚠️ Daily summary service already running');
      return;
    }

    console.log('📧 Starting daily summary service...');
    this.isRunning = true;

    // Run every minute to check for scheduled summaries
    this.intervalId = setInterval(async () => {
      await this.processDailySummaries();
    }, 60000); // 1 minute

    console.log('✅ Daily summary service started - checking every 60s');
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.isRunning = false;
      console.log('🛑 Daily summary service stopped');
    }
  }

  private async processDailySummaries(): Promise<void> {
    try {
      const now = new Date();

      console.log(`📧 Checking for daily summaries to send at ${format(now, 'HH:mm')} UTC`);

      // Find all users with daily summaries enabled
      const recipients = await db
        .select({
          userId: users.id,
          userEmail: users.email,
          userName: users.fullName,
          tenantId: users.tenantId,
          dailySummaryEnabled: userNotificationPreferences.dailySummaryEnabled,
          dailySummaryTime: userNotificationPreferences.dailySummaryTime,
          dailySummaryDays: userNotificationPreferences.dailySummaryDays,
          timezone: userNotificationPreferences.timezone,
        })
        .from(users)
        .innerJoin(
          userNotificationPreferences,
          eq(users.id, userNotificationPreferences.userId)
        )
        .where(
          and(
            eq(users.isActive, true),
            eq(userNotificationPreferences.dailySummaryEnabled, true)
          )
        );

      if (recipients.length === 0) {
        return; // No summaries to send
      }

      let sentCount = 0;

      for (const recipient of recipients) {
        try {
          // Convert current UTC time to user's timezone
          const userTimezone = recipient.timezone || 'Europe/London';
          const userLocalTime = toZonedTime(now, userTimezone);
          const userLocalTimeStr = format(userLocalTime, 'HH:mm');
          const userLocalDay = userLocalTime.getDay().toString();
          
          // Parse delivery days and check if today is included
          const deliveryDays = JSON.parse(recipient.dailySummaryDays || '[]');
          
          // Normalize delivery time (PostgreSQL time type may include seconds)
          const deliveryTime = recipient.dailySummaryTime?.substring(0, 5) || '09:00';
          
          // Check if current time matches user's configured delivery time (in their timezone)
          if (userLocalTimeStr === deliveryTime && deliveryDays.includes(userLocalDay)) {
            console.log(`📧 Sending to ${recipient.userName} (${userLocalTimeStr} in ${userTimezone})`);
            await this.sendDailySummary(recipient);
            sentCount++;
          }
        } catch (error) {
          console.error(`❌ Failed to send daily summary to ${recipient.userEmail}:`, error);
        }
      }

      if (sentCount > 0) {
        console.log(`📨 Sent ${sentCount} daily summaries`);
      }
    } catch (error) {
      console.error('❌ Error processing daily summaries:', error);
    }
  }

  private async sendDailySummary(recipient: any): Promise<void> {
    const { userId, userEmail, userName, tenantId } = recipient;
    
    console.log(`📧 Sending daily summary to ${userName} (${userEmail})`);

    // Fetch stats for the past 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const today = new Date();

    // Get detailed call information with outcomes
    const recentCalls = await db
      .select({
        contactName: contacts.name,
        appointmentTime: contacts.appointmentTime,
        appointmentType: contacts.appointmentType,
        appointmentStatus: contacts.appointmentStatus,
        callStatus: callSessions.status,
        callOutcome: callSessions.callOutcome,
        createdAt: callSessions.createdAt,
      })
      .from(callSessions)
      .leftJoin(contacts, eq(callSessions.contactId, contacts.id))
      .where(
        and(
          eq(callSessions.tenantId, tenantId),
          gte(callSessions.createdAt, yesterday)
        )
      )
      .orderBy(callSessions.createdAt);

    // Get count of recent appointment status changes
    const confirmedCount = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(contacts)
      .where(
        and(
          eq(contacts.tenantId, tenantId),
          eq(contacts.appointmentStatus, 'confirmed'),
          gte(contacts.updatedAt, yesterday)
        )
      );

    const cancelledCount = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(contacts)
      .where(
        and(
          eq(contacts.tenantId, tenantId),
          eq(contacts.appointmentStatus, 'cancelled'),
          gte(contacts.updatedAt, yesterday)
        )
      );

    const rescheduledCount = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(contacts)
      .where(
        and(
          eq(contacts.tenantId, tenantId),
          eq(contacts.appointmentStatus, 'rescheduled'),
          gte(contacts.updatedAt, yesterday)
        )
      );

    // Get detailed appointment lists (limited for display)
    const confirmedAppointments = await db
      .select({
        contactName: contacts.name,
        appointmentTime: contacts.appointmentTime,
        appointmentType: contacts.appointmentType,
        updatedAt: contacts.updatedAt,
      })
      .from(contacts)
      .where(
        and(
          eq(contacts.tenantId, tenantId),
          eq(contacts.appointmentStatus, 'confirmed'),
          gte(contacts.updatedAt, yesterday)
        )
      )
      .orderBy(contacts.updatedAt)
      .limit(10);

    const cancelledAppointments = await db
      .select({
        contactName: contacts.name,
        appointmentTime: contacts.appointmentTime,
        appointmentType: contacts.appointmentType,
      })
      .from(contacts)
      .where(
        and(
          eq(contacts.tenantId, tenantId),
          eq(contacts.appointmentStatus, 'cancelled'),
          gte(contacts.updatedAt, yesterday)
        )
      )
      .orderBy(contacts.updatedAt)
      .limit(10);

    const rescheduledAppointments = await db
      .select({
        contactName: contacts.name,
        appointmentTime: contacts.appointmentTime,
        appointmentType: contacts.appointmentType,
      })
      .from(contacts)
      .where(
        and(
          eq(contacts.tenantId, tenantId),
          eq(contacts.appointmentStatus, 'rescheduled'),
          gte(contacts.updatedAt, yesterday)
        )
      )
      .orderBy(contacts.updatedAt)
      .limit(10);

    // Categorize calls by outcome
    const noAnswerCalls = recentCalls.filter(c => 
      c.callOutcome?.toLowerCase().includes('no answer') || 
      c.callOutcome?.toLowerCase().includes('no-answer')
    );
    
    const voicemailCalls = recentCalls.filter(c => 
      c.callOutcome?.toLowerCase().includes('voicemail')
    );
    
    const failedCalls = recentCalls.filter(c => 
      c.callStatus === 'failed' && 
      !c.callOutcome?.toLowerCase().includes('no answer') && 
      !c.callOutcome?.toLowerCase().includes('voicemail')
    );

    // Get upcoming appointments (next 24 hours)
    const upcomingAppointments = await db
      .select({
        contactName: contacts.name,
        appointmentDate: contacts.appointmentTime,
        appointmentType: contacts.appointmentType,
      })
      .from(contacts)
      .where(
        and(
          eq(contacts.tenantId, tenantId),
          gte(contacts.appointmentTime, today),
          lte(contacts.appointmentTime, addHours(today, 24))
        )
      )
      .orderBy(contacts.appointmentTime)
      .limit(10);

    // Process stats (using actual counts, not limited arrays)
    const stats = {
      totalCalls: recentCalls.length,
      successfulCalls: recentCalls.filter(c => c.callStatus === 'completed').length,
      failedCalls: recentCalls.filter(c => c.callStatus === 'failed').length,
      pendingCalls: recentCalls.filter(c => c.callStatus === 'queued' || c.callStatus === 'in_progress').length,
      confirmedAppointments: confirmedCount[0]?.count || 0,
      cancelledAppointments: cancelledCount[0]?.count || 0,
      rescheduledAppointments: rescheduledCount[0]?.count || 0,
    };

    const detailedData = {
      confirmedAppointments: confirmedAppointments.map(apt => ({
        contactName: apt.contactName,
        appointmentTime: apt.appointmentTime,
        appointmentType: apt.appointmentType || 'General Appointment',
      })),
      cancelledAppointments: cancelledAppointments.map(apt => ({
        contactName: apt.contactName,
        appointmentTime: apt.appointmentTime,
        appointmentType: apt.appointmentType || 'General Appointment',
      })),
      rescheduledAppointments: rescheduledAppointments.map(apt => ({
        contactName: apt.contactName,
        appointmentTime: apt.appointmentTime,
        appointmentType: apt.appointmentType || 'General Appointment',
      })),
      noAnswerCalls: noAnswerCalls.map(c => ({
        contactName: c.contactName || 'Unknown',
        appointmentTime: c.appointmentTime,
      })),
      voicemailCalls: voicemailCalls.map(c => ({
        contactName: c.contactName || 'Unknown',
        appointmentTime: c.appointmentTime,
      })),
      failedCalls: failedCalls.map(c => ({
        contactName: c.contactName || 'Unknown',
        outcome: c.callOutcome || 'Failed',
      })),
    };

    // Get tenant/company name (simplified - you may need to fetch from tenant_config)
    const companyName = 'Your Practice'; // TODO: Fetch from tenant_config

    // Generate email HTML
    const emailHtml = generateDailySummaryEmail({
      userName,
      companyName,
      date: today,
      stats,
      detailedData,
      upcomingAppointments: upcomingAppointments
        .filter(apt => apt.appointmentDate !== null)
        .map(apt => ({
          contactName: apt.contactName,
          appointmentDate: new Date(apt.appointmentDate!),
          appointmentType: apt.appointmentType || 'General Appointment',
        })),
    });

    // Send email via Resend
    try {
      const { data, error } = await resend.emails.send({
        from: 'VioConcierge <noreply@smartaisolutions.ai>',
        to: userEmail,
        subject: `Daily Summary - ${format(today, 'MMMM d, yyyy')}`,
        html: emailHtml,
      });

      if (error) {
        console.error(`❌ Failed to send daily summary email to ${userEmail}:`, error);
        // Check if it's a Resend testing restriction
        if (error.message && error.message.includes('testing emails')) {
          console.warn('⚠️ Resend testing restriction: Emails can only be sent to verified domain or account owner email');
          console.warn('ℹ️ To send to any email, verify a domain at https://resend.com/domains');
        }
        throw new Error(`Email sending failed: ${error.message}`);
      }

      console.log(`✅ Daily summary email sent to ${userEmail}:`, data?.id || 'success');
    } catch (error) {
      console.error(`❌ Failed to send email to ${userEmail}:`, error);
      throw error;
    }
  }

  async sendTestSummary(email: string, tenantId: string, userName?: string): Promise<void> {
    console.log(`📧 Sending test daily summary to ${email} for tenant ${tenantId}`);
    
    const recipient = {
      userId: 'test',
      userEmail: email,
      userName: userName || 'Test User',
      tenantId: tenantId,
    };
    
    await this.sendDailySummary(recipient);
  }
}

// Export singleton instance
export const dailySummaryService = new DailySummaryServiceImpl();
