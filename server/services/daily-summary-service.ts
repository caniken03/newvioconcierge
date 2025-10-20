import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { db } from '../db';
import { users, callSessions, contacts, tenants } from '@shared/schema';
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

      // Find all tenants with daily summaries enabled
      const tenantsQuery = await db
        .select({
          tenantId: tenants.id,
          tenantName: tenants.name,
          dailySummaryEnabled: tenants.dailySummaryEnabled,
          dailySummaryRecipientName: tenants.dailySummaryRecipientName,
          dailySummaryRecipientEmail: tenants.dailySummaryRecipientEmail,
          dailySummaryTime: tenants.dailySummaryTime,
          dailySummaryDays: tenants.dailySummaryDays,
          dailySummaryTimezone: tenants.dailySummaryTimezone,
          lastDailySummarySentAt: tenants.lastDailySummarySentAt,
        })
        .from(tenants)
        .where(
          and(
            eq(tenants.status, 'active'),
            eq(tenants.dailySummaryEnabled, true)
          )
        );

      if (tenantsQuery.length === 0) {
        return; // No summaries to send
      }

      console.log(`📧 Found ${tenantsQuery.length} tenant(s) with daily summaries enabled`);

      let sentCount = 0;

      for (const tenant of tenantsQuery) {
        try {
          // Skip if recipient email is not configured
          if (!tenant.dailySummaryRecipientEmail) {
            console.log(`📧 Skipping ${tenant.tenantName}: No recipient email configured`);
            continue;
          }

          // Convert current UTC time to tenant's timezone
          const tenantTimezone = tenant.dailySummaryTimezone || 'Europe/London';
          const tenantLocalTime = toZonedTime(now, tenantTimezone);
          const tenantLocalTimeStr = format(tenantLocalTime, 'HH:mm');
          const tenantLocalDay = tenantLocalTime.getDay().toString();
          
          // Parse delivery days and check if today is included
          const deliveryDays = JSON.parse(tenant.dailySummaryDays || '["1","2","3","4","5"]');
          
          // Check if today is a delivery day
          if (!deliveryDays.includes(tenantLocalDay)) {
            continue; // Skip if today is not a delivery day
          }
          
          // Normalize delivery time (PostgreSQL time type may include seconds)
          const deliveryTime = tenant.dailySummaryTime?.substring(0, 5) || '09:00';
          const [targetHour, targetMinute] = deliveryTime.split(':').map(Number);
          const targetTimeToday = new Date(tenantLocalTime);
          targetTimeToday.setHours(targetHour, targetMinute, 0, 0);
          
          // Check if we've already sent a summary today
          const lastSentAt = tenant.lastDailySummarySentAt;
          const lastSentLocalTime = lastSentAt ? toZonedTime(lastSentAt, tenantTimezone) : null;
          const alreadySentToday = lastSentLocalTime && 
            format(lastSentLocalTime, 'yyyy-MM-dd') === format(tenantLocalTime, 'yyyy-MM-dd');
          
          console.log(`📧 ${tenant.tenantName}: Local time=${tenantLocalTimeStr}, Target=${deliveryTime}, Day=${tenantLocalDay}, Already sent=${alreadySentToday}`);
          
          // Send if: current time >= target time AND we haven't sent today yet
          if (tenantLocalTime >= targetTimeToday && !alreadySentToday) {
            console.log(`📧 ✅ Sending to ${tenant.dailySummaryRecipientName} at ${tenant.dailySummaryRecipientEmail} (${tenantLocalTimeStr} in ${tenantTimezone})`);
            
            await this.sendDailySummaryToTenant({
              tenantId: tenant.tenantId,
              tenantName: tenant.tenantName,
              recipientName: tenant.dailySummaryRecipientName || tenant.tenantName,
              recipientEmail: tenant.dailySummaryRecipientEmail,
            });
            
            // Update the last sent timestamp for the tenant
            await db
              .update(tenants)
              .set({ lastDailySummarySentAt: now })
              .where(eq(tenants.id, tenant.tenantId));
            
            sentCount++;
          }
        } catch (error) {
          console.error(`❌ Failed to send daily summary for ${tenant.tenantName}:`, error);
        }
      }

      if (sentCount > 0) {
        console.log(`📨 Sent ${sentCount} daily summaries`);
      }
    } catch (error) {
      console.error('❌ Error processing daily summaries:', error);
    }
  }

  private async sendDailySummaryToTenant(params: {
    tenantId: string;
    tenantName: string;
    recipientName: string;
    recipientEmail: string;
  }): Promise<void> {
    const { tenantId, tenantName, recipientName, recipientEmail } = params;
    
    console.log(`📧 Sending daily summary to ${recipientName} (${recipientEmail}) for ${tenantName}`);

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
        callOutcome: callSessions.outcome,
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

    // Generate email HTML
    const emailHtml = generateDailySummaryEmail({
      userName: recipientName,
      companyName: tenantName,
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
        to: recipientEmail,
        subject: `Daily Summary - ${format(today, 'MMMM d, yyyy')}`,
        html: emailHtml,
      });

      if (error) {
        console.error(`❌ Failed to send daily summary email to ${recipientEmail}:`, error);
        // Check if it's a Resend testing restriction
        if (error.message && error.message.includes('testing emails')) {
          console.warn('⚠️ Resend testing restriction: Emails can only be sent to verified domain or account owner email');
          console.warn('ℹ️ To send to any email, verify a domain at https://resend.com/domains');
        }
        throw new Error(`Email sending failed: ${error.message}`);
      }

      console.log(`✅ Daily summary email sent to ${recipientEmail}:`, data?.id || 'success');
    } catch (error) {
      console.error(`❌ Failed to send email to ${recipientEmail}:`, error);
      throw error;
    }
  }

  async sendTestSummary(email: string, tenantId: string, recipientName?: string): Promise<void> {
    console.log(`📧 Sending test daily summary to ${email} for tenant ${tenantId}`);
    
    // Fetch tenant info
    const tenant = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
    if (!tenant || tenant.length === 0) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }
    
    await this.sendDailySummaryToTenant({
      tenantId: tenantId,
      tenantName: tenant[0].name,
      recipientName: recipientName || 'Test User',
      recipientEmail: email,
    });
  }
}

// Export singleton instance
export const dailySummaryService = new DailySummaryServiceImpl();
