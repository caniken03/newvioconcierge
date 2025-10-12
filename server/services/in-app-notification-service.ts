import { db } from "../db";
import { notifications, users } from "@shared/schema";
import type { InsertNotification, Notification } from "@shared/schema";
import { eq, and, desc, isNull, or } from "drizzle-orm";

export class InAppNotificationService {
  /**
   * Create a notification for a specific user
   */
  async createNotification(data: InsertNotification): Promise<Notification> {
    const [notification] = await db
      .insert(notifications)
      .values(data)
      .returning();
    
    console.log(`📬 Notification created: ${notification.type} for user ${notification.userId}`);
    return notification;
  }

  /**
   * Create notifications for all users in a tenant
   */
  async createTenantNotification(
    tenantId: string,
    notificationData: Omit<InsertNotification, 'userId' | 'tenantId'>
  ): Promise<Notification[]> {
    // Get all active users in the tenant
    const tenantUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(and(
        eq(users.tenantId, tenantId),
        eq(users.isActive, true)
      ));

    if (tenantUsers.length === 0) {
      console.log(`⚠️ No active users found in tenant ${tenantId} for notification`);
      return [];
    }

    // Create notification for each user
    const createdNotifications: Notification[] = [];
    for (const user of tenantUsers) {
      const [notification] = await db
        .insert(notifications)
        .values({
          ...notificationData,
          userId: user.id,
          tenantId,
        })
        .returning();
      createdNotifications.push(notification);
    }

    console.log(`📬 Created ${createdNotifications.length} notifications for tenant ${tenantId}`);
    return createdNotifications;
  }

  /**
   * Get notifications for a specific user
   */
  async getUserNotifications(
    userId: string,
    tenantId: string,
    options: {
      limit?: number;
      unreadOnly?: boolean;
    } = {}
  ): Promise<Notification[]> {
    const { limit = 50, unreadOnly = false } = options;

    const conditions = [
      eq(notifications.userId, userId),
      eq(notifications.tenantId, tenantId),
      eq(notifications.isDismissed, false), // Don't show dismissed notifications
    ];

    if (unreadOnly) {
      conditions.push(eq(notifications.isRead, false));
    }

    const userNotifications = await db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);

    return userNotifications;
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: string, tenantId: string): Promise<number> {
    const unreadNotifications = await db
      .select()
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.tenantId, tenantId),
        eq(notifications.isRead, false),
        eq(notifications.isDismissed, false)
      ));

    return unreadNotifications.length;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<Notification | null> {
    const [notification] = await db
      .update(notifications)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId)
      ))
      .returning();

    return notification || null;
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string, tenantId: string): Promise<number> {
    const updated = await db
      .update(notifications)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.tenantId, tenantId),
        eq(notifications.isRead, false)
      ))
      .returning();

    console.log(`✅ Marked ${updated.length} notifications as read for user ${userId}`);
    return updated.length;
  }

  /**
   * Dismiss a notification
   */
  async dismissNotification(notificationId: string, userId: string): Promise<Notification | null> {
    const [notification] = await db
      .update(notifications)
      .set({
        isDismissed: true,
        dismissedAt: new Date(),
      })
      .where(and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId)
      ))
      .returning();

    return notification || null;
  }

  /**
   * Delete old notifications (cleanup)
   */
  async cleanupOldNotifications(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const deleted = await db
      .delete(notifications)
      .where(
        or(
          eq(notifications.isDismissed, true)
        )
      )
      .returning();

    console.log(`🧹 Cleaned up ${deleted.length} old notifications`);
    return deleted.length;
  }

  /**
   * Helper: Create system alert notification
   */
  async createSystemAlert(
    userId: string,
    tenantId: string,
    title: string,
    message: string,
    priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal'
  ): Promise<Notification> {
    return this.createNotification({
      userId,
      tenantId,
      type: 'system_alert',
      category: priority === 'urgent' ? 'error' : priority === 'high' ? 'warning' : 'info',
      title,
      message,
      priority,
    });
  }

  /**
   * Helper: Create call event notification
   */
  async createCallEventNotification(
    userId: string,
    tenantId: string,
    callSessionId: string,
    contactId: string,
    title: string,
    message: string,
    category: 'info' | 'warning' | 'error' | 'success' = 'info'
  ): Promise<Notification> {
    return this.createNotification({
      userId,
      tenantId,
      type: 'call_event',
      category,
      title,
      message,
      relatedCallSessionId: callSessionId,
      relatedContactId: contactId,
      actionUrl: `/calls/${callSessionId}`,
      actionLabel: 'View Details',
    });
  }

  /**
   * Helper: Create appointment update notification
   */
  async createAppointmentNotification(
    userId: string,
    tenantId: string,
    contactId: string,
    title: string,
    message: string,
    category: 'info' | 'warning' | 'error' | 'success' = 'info'
  ): Promise<Notification> {
    return this.createNotification({
      userId,
      tenantId,
      type: 'appointment_update',
      category,
      title,
      message,
      relatedContactId: contactId,
      actionUrl: `/contacts`,
      actionLabel: 'View Contact',
    });
  }

  /**
   * Helper: Create tenant activity notification (for super admins)
   */
  async createTenantActivityNotification(
    userId: string,
    tenantId: string,
    relatedTenantId: string,
    title: string,
    message: string
  ): Promise<Notification> {
    return this.createNotification({
      userId,
      tenantId,
      type: 'tenant_activity',
      category: 'info',
      title,
      message,
      relatedTenantId,
      actionUrl: `/tenants`,
      actionLabel: 'View Tenants',
    });
  }
}

export const inAppNotificationService = new InAppNotificationService();
