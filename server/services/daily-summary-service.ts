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

    // Get call stats
    const callStats = await db
      .select({
        status: callSessions.status,
        count: sql<number>`count(*)::int`,
      })
      .from(callSessions)
      .where(
        and(
          eq(callSessions.tenantId, tenantId),
          gte(callSessions.createdAt, yesterday)
        )
      )
      .groupBy(callSessions.status);

    // Get appointment stats from contacts
    const appointmentStats = await db
      .select({
        status: contacts.appointmentStatus,
        count: sql<number>`count(*)::int`,
      })
      .from(contacts)
      .where(
        and(
          eq(contacts.tenantId, tenantId),
          gte(contacts.createdAt, yesterday)
        )
      )
      .groupBy(contacts.appointmentStatus);

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
      .limit(5);

    // Process stats
    const stats = {
      totalCalls: callStats.reduce((sum, stat) => sum + stat.count, 0),
      successfulCalls: callStats.find(s => s.status === 'completed')?.count || 0,
      failedCalls: callStats.find(s => s.status === 'failed')?.count || 0,
      pendingCalls: callStats.find(s => s.status === 'scheduled')?.count || 0,
      confirmedAppointments: appointmentStats.find(s => s.status === 'confirmed')?.count || 0,
      cancelledAppointments: appointmentStats.find(s => s.status === 'cancelled')?.count || 0,
      rescheduledAppointments: appointmentStats.find(s => s.status === 'rescheduled')?.count || 0,
    };

    // Get tenant/company name (simplified - you may need to fetch from tenant_config)
    const companyName = 'Your Practice'; // TODO: Fetch from tenant_config

    // Generate email HTML
    const emailHtml = generateDailySummaryEmail({
      userName,
      companyName,
      date: today,
      stats,
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
