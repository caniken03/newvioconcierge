import {
  users,
  tenants,
  contacts,
  callSessions,
  followUpTasks,
  tenantConfig,
  callLogs,
  systemSettings,
  contactGroups,
  groupMembership,
  locations,
  type User,
  type InsertUser,
  type Tenant,
  type InsertTenant,
  type Contact,
  type InsertContact,
  type CallSession,
  type InsertCallSession,
  type FollowUpTask,
  type InsertFollowUpTask,
  type TenantConfig,
  type InsertTenantConfig,
  type CallLog,
  type InsertCallLog,
  type SystemSetting,
  type InsertSystemSetting,
  type ContactGroup,
  type InsertContactGroup,
  type GroupMembership,
  type InsertGroupMembership,
  type Location,
  type InsertLocation,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, count, sql, gt, lt, like, inArray } from "drizzle-orm";
import { getTableColumns } from "drizzle-orm";
import bcrypt from "bcrypt";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User>;
  deleteUser(id: string): Promise<void>;
  getUsersByTenant(tenantId: string): Promise<User[]>;

  // Tenant operations
  getTenant(id: string): Promise<Tenant | undefined>;
  getTenantByName(name: string): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  updateTenant(id: string, updates: Partial<InsertTenant>): Promise<Tenant>;
  deleteTenant(id: string): Promise<void>;
  getAllTenants(): Promise<Tenant[]>;
  searchTenants(query: string): Promise<Tenant[]>;

  // Contact operations
  getContact(id: string): Promise<Contact | undefined>;
  getContactsByTenant(tenantId: string, limit?: number, offset?: number): Promise<Contact[]>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: string, updates: Partial<InsertContact>): Promise<Contact>;
  deleteContact(id: string): Promise<void>;
  searchContacts(tenantId: string, query: string): Promise<Contact[]>;
  getContactStats(tenantId: string): Promise<{ total: number; pending: number; confirmed: number; }>;
  getAppointments(tenantId: string): Promise<Contact[]>;

  // Contact groups operations
  getContactGroup(id: string): Promise<ContactGroup | undefined>;
  getContactGroupsByTenant(tenantId: string): Promise<ContactGroup[]>;
  createContactGroup(group: InsertContactGroup): Promise<ContactGroup>;
  updateContactGroup(id: string, tenantId: string, updates: Partial<InsertContactGroup>): Promise<ContactGroup>;
  deleteContactGroup(id: string, tenantId: string): Promise<void>;
  addContactToGroup(contactId: string, groupId: string, tenantId: string, addedBy: string): Promise<GroupMembership>;
  removeContactFromGroup(contactId: string, groupId: string, tenantId: string): Promise<void>;
  getContactsInGroup(groupId: string, tenantId: string): Promise<Contact[]>;
  getGroupsForContact(contactId: string, tenantId: string): Promise<ContactGroup[]>;

  // Location operations
  getLocation(id: string): Promise<Location | undefined>;
  getLocationsByTenant(tenantId: string): Promise<Location[]>;
  createLocation(location: InsertLocation): Promise<Location>;
  updateLocation(id: string, tenantId: string, updates: Partial<InsertLocation>): Promise<Location>;
  deleteLocation(id: string, tenantId: string): Promise<void>;

  // Analytics operations
  getClientAnalytics(tenantId: string): Promise<{
    totalContacts: number;
    callsToday: number;
    successRate: number;
    appointmentsConfirmed: number;
    noShowRate: number;
    recentActivity: any[];
  }>;
  getContactTimeline(contactId: string, tenantId: string): Promise<{
    contactId: string;
    totalEvents: number;
    events: Array<{
      id: string;
      type: string;
      timestamp: Date;
      title: string;
      description: string;
      status: string;
      outcome?: string;
      duration?: number;
      metadata?: any;
    }>;
  }>;
  getPlatformAnalytics(): Promise<{
    activeTenants: number;
    totalCallsToday: number;
    platformSuccessRate: number;
    systemHealth: string;
    recentTenantActivity: any[];
  }>;

  // Comprehensive Analytics per PRD
  getPerformanceOverview(tenantId: string, timePeriod?: number): Promise<{
    callSuccessRate: number;
    appointmentConfirmationRate: number;
    noShowReduction: number;
    dailyCallVolume: number;
    revenueProtection: number;
    previousPeriodComparison: {
      callSuccessRate: number;
      appointmentConfirmationRate: number;
      dailyCallVolume: number;
    };
  }>;
  
  getCallActivity(tenantId: string): Promise<{
    activeCalls: number;
    todaysSummary: {
      callsAttemptedToday: number;
      callsCompletedToday: number;
      appointmentsConfirmedToday: number;
      pendingCalls: number;
    };
    outcomeBreakdown: Array<{
      outcome: string;
      count: number;
      percentage: number;
    }>;
    recentCallActivity: Array<{
      id: string;
      contactName: string;
      status: string;
      outcome: string;
      timestamp: Date;
      duration?: number;
    }>;
  }>;
  
  getAppointmentInsights(tenantId: string, timePeriod?: number): Promise<{
    confirmationTrends: Array<{
      date: string;
      confirmationRate: number;
      totalAppointments: number;
      confirmed: number;
    }>;
    noShowPatterns: Array<{
      timeSlot: string;
      noShowRate: number;
      totalAppointments: number;
    }>;
    appointmentTypeAnalysis: Array<{
      type: string;
      count: number;
      confirmationRate: number;
      averageDuration: number;
    }>;
    leadTimeAnalysis: Array<{
      leadTimeDays: number;
      confirmationRate: number;
      count: number;
    }>;
  }>;
  
  getSystemHealth(tenantId: string): Promise<{
    callSystemHealth: {
      averageCallDuration: number;
      errorRate: number;
      responseTime: number;
      uptime: number;
    };
    databasePerformance: {
      queryResponseTime: number;
      connectionCount: number;
      dataGrowthRate: number;
    };
    apiPerformance: {
      successRate: number;
      averageResponseTime: number;
      errorsByType: Array<{ type: string; count: number }>;
    };
  }>;

  // CSV import/export operations
  bulkCreateContacts(tenantId: string, contacts: Omit<InsertContact, 'tenantId'>[]): Promise<{ created: number; errors: any[] }>;
  exportContactsToCSV(tenantId: string): Promise<Contact[]>;

  // Call session operations
  getCallSession(id: string): Promise<CallSession | undefined>;
  getCallSessionsByTenant(tenantId: string): Promise<CallSession[]>;
  createCallSession(session: InsertCallSession): Promise<CallSession>;
  updateCallSession(id: string, updates: Partial<InsertCallSession>): Promise<CallSession>;
  getCallSessionsByContact(contactId: string): Promise<CallSession[]>;
  getCallSessionByRetellId(retellCallId: string): Promise<CallSession | undefined>;

  // Follow-up task operations
  getFollowUpTask(id: string): Promise<FollowUpTask | undefined>;
  getFollowUpTasksByTenant(tenantId: string): Promise<FollowUpTask[]>;
  createFollowUpTask(task: InsertFollowUpTask): Promise<FollowUpTask>;
  updateFollowUpTask(id: string, updates: Partial<InsertFollowUpTask>): Promise<FollowUpTask>;
  getOverdueFollowUpTasks(): Promise<FollowUpTask[]>;

  // Tenant configuration operations
  getTenantConfig(tenantId: string): Promise<TenantConfig | undefined>;
  createTenantConfig(config: InsertTenantConfig): Promise<TenantConfig>;
  updateTenantConfig(tenantId: string, updates: Partial<InsertTenantConfig>): Promise<TenantConfig>;

  // Call log operations
  createCallLog(log: InsertCallLog): Promise<CallLog>;
  getCallLogsBySession(sessionId: string): Promise<CallLog[]>;

  // System settings operations
  getSystemSetting(key: string): Promise<SystemSetting | undefined>;
  createSystemSetting(setting: InsertSystemSetting): Promise<SystemSetting>;
  updateSystemSetting(key: string, value: string): Promise<SystemSetting>;

  // Authentication
  authenticateUser(email: string, password: string): Promise<User | null>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(user.hashedPassword, 10);
    const [newUser] = await db
      .insert(users)
      .values({
        ...user,
        hashedPassword,
      })
      .returning();
    return newUser;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User> {
    const updateData = { ...updates, updatedAt: new Date() };
    if (updateData.hashedPassword) {
      updateData.hashedPassword = await bcrypt.hash(updateData.hashedPassword, 10);
    }
    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getUsersByTenant(tenantId: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.tenantId, tenantId));
  }

  // Tenant operations
  async getTenant(id: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant;
  }

  async getTenantByName(name: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.name, name));
    return tenant;
  }

  async createTenant(tenant: InsertTenant): Promise<Tenant> {
    const [newTenant] = await db.insert(tenants).values(tenant).returning();
    return newTenant;
  }

  async updateTenant(id: string, updates: Partial<InsertTenant>): Promise<Tenant> {
    const [updatedTenant] = await db
      .update(tenants)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
    return updatedTenant;
  }

  async deleteTenant(id: string): Promise<void> {
    await db.delete(tenants).where(eq(tenants.id, id));
  }

  async getAllTenants(): Promise<Tenant[]> {
    return await db.select().from(tenants).orderBy(desc(tenants.createdAt));
  }

  async searchTenants(query: string): Promise<Tenant[]> {
    return await db
      .select()
      .from(tenants)
      .where(
        sql`${tenants.name} ILIKE ${`%${query}%`} OR ${tenants.companyName} ILIKE ${`%${query}%`} OR ${tenants.contactEmail} ILIKE ${`%${query}%`}`
      )
      .orderBy(desc(tenants.createdAt));
  }

  // Contact operations
  async getContact(id: string): Promise<Contact | undefined> {
    const [contact] = await db.select().from(contacts).where(eq(contacts.id, id));
    return contact;
  }

  async getContactsByTenant(tenantId: string, limit = 50, offset = 0): Promise<Contact[]> {
    return await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.tenantId, tenantId), eq(contacts.isActive, true)))
      .orderBy(desc(contacts.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    const [newContact] = await db.insert(contacts).values(contact).returning();
    return newContact;
  }

  async updateContact(id: string, updates: Partial<InsertContact>): Promise<Contact> {
    const [updatedContact] = await db
      .update(contacts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(contacts.id, id))
      .returning();
    return updatedContact;
  }

  async deleteContact(id: string): Promise<void> {
    await db
      .update(contacts)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(contacts.id, id));
  }

  async searchContacts(tenantId: string, query: string): Promise<Contact[]> {
    return await db
      .select()
      .from(contacts)
      .where(
        and(
          eq(contacts.tenantId, tenantId),
          eq(contacts.isActive, true),
          sql`${contacts.name} ILIKE ${`%${query}%`} OR ${contacts.phone} ILIKE ${`%${query}%`} OR ${contacts.email} ILIKE ${`%${query}%`}`
        )
      )
      .orderBy(desc(contacts.createdAt));
  }

  async getContactStats(tenantId: string): Promise<{ total: number; pending: number; confirmed: number; }> {
    const [stats] = await db
      .select({
        total: count(),
        pending: sql<number>`COUNT(CASE WHEN ${contacts.appointmentStatus} = 'pending' THEN 1 END)`,
        confirmed: sql<number>`COUNT(CASE WHEN ${contacts.appointmentStatus} = 'confirmed' THEN 1 END)`,
      })
      .from(contacts)
      .where(and(eq(contacts.tenantId, tenantId), eq(contacts.isActive, true)));
    
    return {
      total: stats.total,
      pending: Number(stats.pending),
      confirmed: Number(stats.confirmed),
    };
  }

  async getAppointments(tenantId: string): Promise<Contact[]> {
    return await db
      .select()
      .from(contacts)
      .where(and(
        eq(contacts.tenantId, tenantId),
        eq(contacts.isActive, true),
        sql`${contacts.appointmentTime} IS NOT NULL`
      ))
      .orderBy(asc(contacts.appointmentTime));
  }

  async getClientAnalytics(tenantId: string): Promise<{
    totalContacts: number;
    callsToday: number;
    successRate: number;
    appointmentsConfirmed: number;
    noShowRate: number;
    recentActivity: any[];
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get total contacts
    const [contactStats] = await db
      .select({ count: count() })
      .from(contacts)
      .where(and(eq(contacts.tenantId, tenantId), eq(contacts.isActive, true)));

    // Get calls today
    const [callsToday] = await db
      .select({ count: count() })
      .from(callSessions)
      .where(and(
        eq(callSessions.tenantId, tenantId),
        sql`${callSessions.createdAt} >= ${today}`,
        sql`${callSessions.createdAt} < ${tomorrow}`
      ));

    // Get success rate (completed calls vs total calls)
    const [successStats] = await db
      .select({
        total: count(),
        successful: sql<number>`COUNT(CASE WHEN ${callSessions.callOutcome} = 'confirmed' THEN 1 END)`,
      })
      .from(callSessions)
      .where(eq(callSessions.tenantId, tenantId));

    // Get confirmed appointments
    const [confirmedStats] = await db
      .select({ count: count() })
      .from(contacts)
      .where(and(
        eq(contacts.tenantId, tenantId),
        eq(contacts.appointmentStatus, 'confirmed'),
        eq(contacts.isActive, true)
      ));

    // Get no-show rate
    const [completedStats] = await db
      .select({ count: count() })
      .from(contacts)
      .where(and(
        eq(contacts.tenantId, tenantId),
        eq(contacts.appointmentStatus, 'completed'),
        eq(contacts.isActive, true)
      ));

    // Get recent activity (last 10 call sessions)
    const recentActivity = await db
      .select({
        id: callSessions.id,
        contactName: contacts.name,
        outcome: callSessions.callOutcome,
        createdAt: callSessions.createdAt,
      })
      .from(callSessions)
      .leftJoin(contacts, eq(callSessions.contactId, contacts.id))
      .where(eq(callSessions.tenantId, tenantId))
      .orderBy(desc(callSessions.createdAt))
      .limit(10);

    const totalContacts = contactStats.count || 0;
    const totalCalls = successStats.total || 0;
    const successfulCalls = successStats.successful || 0;
    const confirmedAppointments = confirmedStats.count || 0;
    const completedAppointments = completedStats.count || 0;

    const successRate = totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0;
    const noShowRate = confirmedAppointments > 0 ? 
      ((confirmedAppointments - completedAppointments) / confirmedAppointments) * 100 : 0;

    return {
      totalContacts,
      callsToday: callsToday.count || 0,
      successRate: Math.round(successRate * 10) / 10,
      appointmentsConfirmed: confirmedAppointments,
      noShowRate: Math.round(noShowRate * 10) / 10,
      recentActivity,
    };
  }

  async getPlatformAnalytics(): Promise<{
    activeTenants: number;
    totalCallsToday: number;
    platformSuccessRate: number;
    systemHealth: string;
    recentTenantActivity: any[];
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get active tenants
    const [activeTenants] = await db
      .select({ count: count() })
      .from(tenants)
      .where(eq(tenants.status, 'active'));

    // Get total calls today across all tenants
    const [callsToday] = await db
      .select({ count: count() })
      .from(callSessions)
      .where(and(
        sql`${callSessions.createdAt} >= ${today}`,
        sql`${callSessions.createdAt} < ${tomorrow}`
      ));

    // Get platform success rate
    const [successStats] = await db
      .select({
        total: count(),
        successful: sql<number>`COUNT(CASE WHEN ${callSessions.callOutcome} = 'confirmed' THEN 1 END)`,
      })
      .from(callSessions);

    // Get recent tenant activity
    const recentActivity = await db
      .select({
        tenantName: tenants.name,
        contactName: contacts.name,
        outcome: callSessions.callOutcome,
        createdAt: callSessions.createdAt,
      })
      .from(callSessions)
      .leftJoin(contacts, eq(callSessions.contactId, contacts.id))
      .leftJoin(tenants, eq(callSessions.tenantId, tenants.id))
      .orderBy(desc(callSessions.createdAt))
      .limit(15);

    const totalCalls = successStats.total || 0;
    const successfulCalls = successStats.successful || 0;
    const platformSuccessRate = totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0;

    // Simple system health based on calls today and success rate
    let systemHealth = 'excellent';
    if (platformSuccessRate < 50) {
      systemHealth = 'poor';
    } else if (platformSuccessRate < 75) {
      systemHealth = 'fair';
    } else if (platformSuccessRate < 90) {
      systemHealth = 'good';
    }

    return {
      activeTenants: activeTenants.count || 0,
      totalCallsToday: callsToday.count || 0,
      platformSuccessRate: Math.round(platformSuccessRate * 10) / 10,
      systemHealth,
      recentTenantActivity: recentActivity,
    };
  }

  async bulkCreateContacts(tenantId: string, contactsData: Omit<InsertContact, 'tenantId'>[]): Promise<{ created: number; errors: any[] }> {
    const errors: any[] = [];
    let created = 0;

    for (const contactData of contactsData) {
      try {
        await db.insert(contacts).values({
          ...contactData,
          tenantId,
        });
        created++;
      } catch (error) {
        errors.push({
          contact: contactData,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { created, errors };
  }

  async exportContactsToCSV(tenantId: string): Promise<Contact[]> {
    return await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.tenantId, tenantId), eq(contacts.isActive, true)))
      .orderBy(desc(contacts.createdAt));
  }

  // Bulk update contact appointment status
  async bulkUpdateContactStatus(
    tenantId: string, 
    contactIds: string[], 
    appointmentStatus: 'pending' | 'confirmed' | 'cancelled' | 'rescheduled'
  ): Promise<{ updatedCount: number; errors: any[] }> {
    const errors: any[] = [];
    let updatedCount = 0;

    // Use transaction for data consistency
    await db.transaction(async (tx) => {
      for (const contactId of contactIds) {
        try {
          // Verify contact exists and belongs to tenant
          const [contact] = await tx
            .select({ id: contacts.id })
            .from(contacts)
            .where(and(
              eq(contacts.id, contactId),
              eq(contacts.tenantId, tenantId),
              eq(contacts.isActive, true)
            ));

          if (!contact) {
            errors.push({
              contactId,
              error: 'Contact not found or access denied'
            });
            continue;
          }

          // Update appointment status
          const result = await tx
            .update(contacts)
            .set({ 
              appointmentStatus,
              updatedAt: new Date()
            })
            .where(and(
              eq(contacts.id, contactId),
              eq(contacts.tenantId, tenantId)
            ))
            .returning({ id: contacts.id });

          if (result.length > 0) {
            updatedCount++;
          } else {
            errors.push({
              contactId,
              error: 'Update failed - contact not found'
            });
          }
        } catch (error) {
          errors.push({
            contactId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    });

    return { updatedCount, errors };
  }

  // Bulk update contact priority
  async bulkUpdateContactPriority(
    tenantId: string, 
    contactIds: string[], 
    priorityLevel: 'low' | 'normal' | 'high' | 'urgent'
  ): Promise<{ updatedCount: number; errors: any[] }> {
    const errors: any[] = [];
    let updatedCount = 0;

    await db.transaction(async (tx) => {
      for (const contactId of contactIds) {
        try {
          const [contact] = await tx
            .select({ id: contacts.id })
            .from(contacts)
            .where(and(
              eq(contacts.id, contactId),
              eq(contacts.tenantId, tenantId),
              eq(contacts.isActive, true)
            ));

          if (!contact) {
            errors.push({
              contactId,
              error: 'Contact not found or access denied'
            });
            continue;
          }

          const result = await tx
            .update(contacts)
            .set({ 
              priorityLevel,
              updatedAt: new Date()
            })
            .where(and(
              eq(contacts.id, contactId),
              eq(contacts.tenantId, tenantId)
            ))
            .returning({ id: contacts.id });

          if (result.length > 0) {
            updatedCount++;
          } else {
            errors.push({
              contactId,
              error: 'Update failed - contact not found'
            });
          }
        } catch (error) {
          errors.push({
            contactId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    });

    return { updatedCount, errors };
  }

  // Bulk update contact method
  async bulkUpdateContactMethod(
    tenantId: string, 
    contactIds: string[], 
    preferredContactMethod: 'phone' | 'email' | 'sms' | 'any'
  ): Promise<{ updatedCount: number; errors: any[] }> {
    const errors: any[] = [];
    let updatedCount = 0;

    await db.transaction(async (tx) => {
      for (const contactId of contactIds) {
        try {
          const [contact] = await tx
            .select({ id: contacts.id })
            .from(contacts)
            .where(and(
              eq(contacts.id, contactId),
              eq(contacts.tenantId, tenantId),
              eq(contacts.isActive, true)
            ));

          if (!contact) {
            errors.push({
              contactId,
              error: 'Contact not found or access denied'
            });
            continue;
          }

          const result = await tx
            .update(contacts)
            .set({ 
              preferredContactMethod,
              updatedAt: new Date()
            })
            .where(and(
              eq(contacts.id, contactId),
              eq(contacts.tenantId, tenantId)
            ))
            .returning({ id: contacts.id });

          if (result.length > 0) {
            updatedCount++;
          } else {
            errors.push({
              contactId,
              error: 'Update failed - contact not found'
            });
          }
        } catch (error) {
          errors.push({
            contactId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    });

    return { updatedCount, errors };
  }

  // Bulk update contact notes
  async bulkUpdateContactNotes(
    tenantId: string, 
    contactIds: string[], 
    notes: string,
    action: 'add' | 'replace'
  ): Promise<{ updatedCount: number; errors: any[] }> {
    const errors: any[] = [];
    let updatedCount = 0;

    await db.transaction(async (tx) => {
      for (const contactId of contactIds) {
        try {
          const [contact] = await tx
            .select({ id: contacts.id, notes: contacts.notes })
            .from(contacts)
            .where(and(
              eq(contacts.id, contactId),
              eq(contacts.tenantId, tenantId),
              eq(contacts.isActive, true)
            ));

          if (!contact) {
            errors.push({
              contactId,
              error: 'Contact not found or access denied'
            });
            continue;
          }

          let updatedNotes = notes;
          if (action === 'add' && contact.notes) {
            updatedNotes = `${contact.notes}\n\n${notes}`;
          }

          const result = await tx
            .update(contacts)
            .set({ 
              notes: updatedNotes,
              updatedAt: new Date()
            })
            .where(and(
              eq(contacts.id, contactId),
              eq(contacts.tenantId, tenantId)
            ))
            .returning({ id: contacts.id });

          if (result.length > 0) {
            updatedCount++;
          } else {
            errors.push({
              contactId,
              error: 'Update failed - contact not found'
            });
          }
        } catch (error) {
          errors.push({
            contactId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    });

    return { updatedCount, errors };
  }

  // Bulk update contact timezone
  async bulkUpdateContactTimezone(
    tenantId: string, 
    contactIds: string[], 
    timezone: string
  ): Promise<{ updatedCount: number; errors: any[] }> {
    const errors: any[] = [];
    let updatedCount = 0;

    await db.transaction(async (tx) => {
      for (const contactId of contactIds) {
        try {
          const [contact] = await tx
            .select({ id: contacts.id })
            .from(contacts)
            .where(and(
              eq(contacts.id, contactId),
              eq(contacts.tenantId, tenantId),
              eq(contacts.isActive, true)
            ));

          if (!contact) {
            errors.push({
              contactId,
              error: 'Contact not found or access denied'
            });
            continue;
          }

          const result = await tx
            .update(contacts)
            .set({ 
              timezone,
              updatedAt: new Date()
            })
            .where(and(
              eq(contacts.id, contactId),
              eq(contacts.tenantId, tenantId)
            ))
            .returning({ id: contacts.id });

          if (result.length > 0) {
            updatedCount++;
          } else {
            errors.push({
              contactId,
              error: 'Update failed - contact not found'
            });
          }
        } catch (error) {
          errors.push({
            contactId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    });

    return { updatedCount, errors };
  }

  // Bulk delete contacts
  async bulkDeleteContacts(
    tenantId: string, 
    contactIds: string[], 
    preserveHistory: boolean = false
  ): Promise<{ deletedCount: number; errors: any[] }> {
    const errors: any[] = [];
    let deletedCount = 0;

    await db.transaction(async (tx) => {
      for (const contactId of contactIds) {
        try {
          const [contact] = await tx
            .select({ id: contacts.id })
            .from(contacts)
            .where(and(
              eq(contacts.id, contactId),
              eq(contacts.tenantId, tenantId),
              eq(contacts.isActive, true)
            ));

          if (!contact) {
            errors.push({
              contactId,
              error: 'Contact not found or access denied'
            });
            continue;
          }

          if (preserveHistory) {
            // Soft delete - mark as inactive and anonymize personal data
            const result = await tx
              .update(contacts)
              .set({ 
                isActive: false,
                name: `[DELETED-${contactId.slice(-6)}]`,
                phone: '',
                email: '',
                notes: '[Personal data removed]',
                updatedAt: new Date()
              })
              .where(and(
                eq(contacts.id, contactId),
                eq(contacts.tenantId, tenantId)
              ))
              .returning({ id: contacts.id });

            if (result.length > 0) {
              deletedCount++;
            }
          } else {
            // Hard delete - remove completely
            const result = await tx
              .delete(contacts)
              .where(and(
                eq(contacts.id, contactId),
                eq(contacts.tenantId, tenantId)
              ))
              .returning({ id: contacts.id });

            if (result.length > 0) {
              deletedCount++;
            }
          }
        } catch (error) {
          errors.push({
            contactId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    });

    return { deletedCount, errors };
  }

  // Contact Timeline method
  async getContactTimeline(contactId: string, tenantId: string): Promise<{
    contactId: string;
    totalEvents: number;
    events: Array<{
      id: string;
      type: string;
      timestamp: Date;
      title: string;
      description: string;
      status: string;
      outcome?: string;
      duration?: number;
      metadata?: any;
    }>;
  }> {
    // Get call sessions for this contact
    const callSessionsData = await db
      .select({
        id: callSessions.id,
        type: sql<string>`'call_session'`,
        timestamp: callSessions.createdAt,
        status: callSessions.status,
        outcome: callSessions.callOutcome,
        duration: callSessions.durationSeconds,
        startTime: callSessions.startTime,
        endTime: callSessions.endTime,
        details: sql<string>`CASE 
          WHEN ${callSessions.callOutcome} IS NOT NULL 
          THEN CONCAT('Call outcome: ', ${callSessions.callOutcome})
          ELSE CONCAT('Call status: ', ${callSessions.status})
        END`
      })
      .from(callSessions)
      .where(and(
        eq(callSessions.contactId, contactId),
        eq(callSessions.tenantId, tenantId)
      ));

    // Get follow-up tasks for this contact
    const followUpTasksData = await db
      .select({
        id: followUpTasks.id,
        type: sql<string>`'follow_up_task'`,
        timestamp: followUpTasks.createdAt,
        status: followUpTasks.status,
        taskType: followUpTasks.taskType,
        scheduledTime: followUpTasks.scheduledTime,
        attempts: followUpTasks.attempts,
        details: sql<string>`CONCAT('Task type: ', ${followUpTasks.taskType}, ' - ', ${followUpTasks.status})`
      })
      .from(followUpTasks)
      .where(and(
        eq(followUpTasks.contactId, contactId),
        eq(followUpTasks.tenantId, tenantId)
      ));

    // Get group membership changes
    const groupMembershipData = await db
      .select({
        id: groupMembership.groupId,
        type: sql<string>`'group_membership'`,
        timestamp: groupMembership.addedAt,
        groupName: contactGroups.name,
        groupColor: contactGroups.color,
        details: sql<string>`CONCAT('Added to group: ', ${contactGroups.name})`
      })
      .from(groupMembership)
      .leftJoin(contactGroups, eq(groupMembership.groupId, contactGroups.id))
      .where(and(
        eq(groupMembership.contactId, contactId),
        eq(contactGroups.tenantId, tenantId)
      ));

    // Get contact creation/update info
    const contactData = await db
      .select({
        id: contacts.id,
        createdAt: contacts.createdAt,
        updatedAt: contacts.updatedAt,
        appointmentStatus: contacts.appointmentStatus
      })
      .from(contacts)
      .where(and(
        eq(contacts.id, contactId),
        eq(contacts.tenantId, tenantId)
      ))
      .limit(1);

    // Combine all timeline events
    const timelineEvents = [];

    // Add call sessions
    timelineEvents.push(...callSessionsData.map(item => ({
      id: item.id,
      type: 'call_session',
      timestamp: item.timestamp,
      title: `Voice Call - ${item.outcome || item.status}`,
      description: item.details,
      status: item.status,
      outcome: item.outcome,
      duration: item.duration,
      metadata: {
        startTime: item.startTime,
        endTime: item.endTime,
        durationFormatted: item.duration ? `${Math.floor(item.duration / 60)}m ${item.duration % 60}s` : null
      }
    })));

    // Add follow-up tasks
    timelineEvents.push(...followUpTasksData.map(item => ({
      id: item.id,
      type: 'follow_up_task',
      timestamp: item.timestamp,
      title: `Follow-up Task - ${item.taskType}`,
      description: item.details,
      status: item.status,
      metadata: {
        scheduledTime: item.scheduledTime,
        attempts: item.attempts,
        taskType: item.taskType
      }
    })));

    // Add group memberships
    timelineEvents.push(...groupMembershipData.map(item => ({
      id: item.id,
      type: 'group_membership',
      timestamp: item.timestamp,
      title: `Added to Group`,
      description: item.details,
      status: 'completed',
      metadata: {
        groupName: item.groupName,
        groupColor: item.groupColor
      }
    })));

    // Add contact lifecycle events
    if (contactData.length > 0) {
      const contact = contactData[0];
      
      // Contact creation
      timelineEvents.push({
        id: `${contact.id}-created`,
        type: 'contact_lifecycle',
        timestamp: contact.createdAt,
        title: 'Contact Created',
        description: 'Contact was added to the system',
        status: 'completed',
        metadata: {
          appointmentStatus: contact.appointmentStatus
        }
      });

      // Contact updates (if different from creation)
      if (contact.updatedAt && contact.updatedAt.getTime() !== contact.createdAt?.getTime()) {
        timelineEvents.push({
          id: `${contact.id}-updated`,
          type: 'contact_lifecycle',
          timestamp: contact.updatedAt,
          title: 'Contact Updated',
          description: 'Contact information was modified',
          status: 'completed',
          metadata: {
            appointmentStatus: contact.appointmentStatus
          }
        });
      }
    }

    // Sort by timestamp (newest first), handling null timestamps
    timelineEvents.sort((a, b) => {
      const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return bTime - aTime;
    });

    // Filter out events with null timestamps and ensure proper typing
    const validEvents = timelineEvents
      .filter(event => event.timestamp !== null)
      .map(event => ({
        id: event.id,
        type: event.type,
        timestamp: event.timestamp!,
        title: event.title,
        description: event.description,
        status: event.status || 'unknown',
        outcome: 'outcome' in event ? event.outcome || undefined : undefined,
        duration: 'duration' in event ? event.duration || undefined : undefined,
        metadata: event.metadata
      }));

    return {
      contactId,
      totalEvents: validEvents.length,
      events: validEvents
    };
  }

  // Enhanced contact analytics
  async getContactAnalytics(tenantId: string): Promise<{
    overview: {
      totalContacts: number;
      activeContacts: number;
      totalGroups: number;
      averageGroupSize: number;
    };
    statusDistribution: Array<{ status: string; count: number; percentage: number }>;
    priorityBreakdown: Array<{ priority: string; count: number; percentage: number }>;
    contactMethodAnalysis: Array<{ method: string; count: number; percentage: number }>;
    groupPerformance: Array<{ 
      groupName: string; 
      memberCount: number; 
      confirmedRate: number;
      color: string;
    }>;
    temporalTrends: Array<{
      date: string;
      contactsAdded: number;
      appointmentsConfirmed: number;
      callsSuccessful: number;
    }>;
    bookingSourceAnalysis: Array<{ source: string; count: number; percentage: number }>;
  }> {
    // Overview metrics
    const [contactStats] = await db
      .select({ 
        total: count(),
        active: sql<number>`COUNT(CASE WHEN ${contacts.isActive} = true THEN 1 END)`
      })
      .from(contacts)
      .where(eq(contacts.tenantId, tenantId));

    const [groupStats] = await db
      .select({ 
        count: count(),
        avgSize: sql<number>`AVG(${contactGroups.contactCount})`
      })
      .from(contactGroups)
      .where(eq(contactGroups.tenantId, tenantId));

    // Status distribution
    const statusData = await db
      .select({
        status: contacts.appointmentStatus,
        count: count()
      })
      .from(contacts)
      .where(and(eq(contacts.tenantId, tenantId), eq(contacts.isActive, true)))
      .groupBy(contacts.appointmentStatus);

    const totalActive = contactStats.active || 0;
    const statusDistribution = statusData.map(item => ({
      status: item.status || 'unknown',
      count: item.count,
      percentage: totalActive > 0 ? Math.round((item.count / totalActive) * 100) : 0
    }));

    // Priority breakdown
    const priorityData = await db
      .select({
        priority: contacts.priorityLevel,
        count: count()
      })
      .from(contacts)
      .where(and(eq(contacts.tenantId, tenantId), eq(contacts.isActive, true)))
      .groupBy(contacts.priorityLevel);

    const priorityBreakdown = priorityData.map(item => ({
      priority: item.priority || 'normal',
      count: item.count,
      percentage: totalActive > 0 ? Math.round((item.count / totalActive) * 100) : 0
    }));

    // Contact method analysis
    const methodData = await db
      .select({
        method: contacts.preferredContactMethod,
        count: count()
      })
      .from(contacts)
      .where(and(eq(contacts.tenantId, tenantId), eq(contacts.isActive, true)))
      .groupBy(contacts.preferredContactMethod);

    const contactMethodAnalysis = methodData.map(item => ({
      method: item.method || 'voice',
      count: item.count,
      percentage: totalActive > 0 ? Math.round((item.count / totalActive) * 100) : 0
    }));

    // Group performance
    const groupPerformanceData = await db
      .select({
        groupName: contactGroups.name,
        memberCount: contactGroups.contactCount,
        color: contactGroups.color,
        confirmedCount: sql<number>`COUNT(CASE WHEN ${contacts.appointmentStatus} = 'confirmed' THEN 1 END)`
      })
      .from(contactGroups)
      .leftJoin(groupMembership, eq(contactGroups.id, groupMembership.groupId))
      .leftJoin(contacts, and(
        eq(groupMembership.contactId, contacts.id),
        eq(contacts.tenantId, tenantId), // Critical: tenant isolation
        eq(contacts.isActive, true)
      ))
      .where(eq(contactGroups.tenantId, tenantId))
      .groupBy(contactGroups.id, contactGroups.name, contactGroups.contactCount, contactGroups.color);

    const groupPerformance = groupPerformanceData.map(item => {
      const memberCount = item.memberCount || 0;
      const confirmedCount = item.confirmedCount || 0;
      return {
        groupName: item.groupName,
        memberCount: memberCount,
        confirmedRate: memberCount > 0 ? Math.round((confirmedCount / memberCount) * 100) : 0,
        color: item.color || '#6b7280'
      };
    });

    // Temporal trends (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const temporalData = await db
      .select({
        date: sql<string>`DATE(${contacts.createdAt})`,
        contactsAdded: count(),
        confirmedCount: sql<number>`COUNT(CASE WHEN ${contacts.appointmentStatus} = 'confirmed' THEN 1 END)`
      })
      .from(contacts)
      .where(and(
        eq(contacts.tenantId, tenantId),
        sql`${contacts.createdAt} >= ${sevenDaysAgo}`
      ))
      .groupBy(sql`DATE(${contacts.createdAt})`)
      .orderBy(sql`DATE(${contacts.createdAt})`);

    // Get call success data for the same period
    const callData = await db
      .select({
        date: sql<string>`DATE(${callSessions.createdAt})`,
        successfulCalls: sql<number>`COUNT(CASE WHEN ${callSessions.callOutcome} = 'confirmed' THEN 1 END)`
      })
      .from(callSessions)
      .where(and(
        eq(callSessions.tenantId, tenantId),
        sql`${callSessions.createdAt} >= ${sevenDaysAgo}`
      ))
      .groupBy(sql`DATE(${callSessions.createdAt})`)
      .orderBy(sql`DATE(${callSessions.createdAt})`);

    // Merge temporal data
    const callMap = new Map(callData.map(item => [item.date, item.successfulCalls]));
    const temporalTrends = temporalData.map(item => ({
      date: item.date,
      contactsAdded: item.contactsAdded,
      appointmentsConfirmed: item.confirmedCount || 0,
      callsSuccessful: callMap.get(item.date) || 0
    }));

    // Booking source analysis
    const sourceData = await db
      .select({
        source: contacts.bookingSource,
        count: count()
      })
      .from(contacts)
      .where(and(eq(contacts.tenantId, tenantId), eq(contacts.isActive, true)))
      .groupBy(contacts.bookingSource);

    const bookingSourceAnalysis = sourceData.map(item => ({
      source: item.source || 'manual',
      count: item.count,
      percentage: totalActive > 0 ? Math.round((item.count / totalActive) * 100) : 0
    }));

    return {
      overview: {
        totalContacts: contactStats.total || 0,
        activeContacts: totalActive,
        totalGroups: groupStats.count || 0,
        averageGroupSize: Math.round(groupStats.avgSize || 0)
      },
      statusDistribution,
      priorityBreakdown,
      contactMethodAnalysis,
      groupPerformance,
      temporalTrends,
      bookingSourceAnalysis
    };
  }

  // Comprehensive Analytics per PRD
  async getPerformanceOverview(tenantId: string, timePeriod: number = 30): Promise<{
    callSuccessRate: number;
    appointmentConfirmationRate: number;
    noShowReduction: number;
    dailyCallVolume: number;
    revenueProtection: number;
    previousPeriodComparison: {
      callSuccessRate: number;
      appointmentConfirmationRate: number;
      dailyCallVolume: number;
    };
  }> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (timePeriod * 24 * 60 * 60 * 1000));
    const previousStartDate = new Date(startDate.getTime() - (timePeriod * 24 * 60 * 60 * 1000));

    // Current period call performance
    const [currentCallStats] = await db
      .select({
        totalCalls: count(),
        answeredCalls: sql<number>`COUNT(CASE WHEN ${callSessions.callOutcome} IN ('confirmed', 'answered', 'completed') THEN 1 END)`,
        confirmedCalls: sql<number>`COUNT(CASE WHEN ${callSessions.callOutcome} = 'confirmed' THEN 1 END)`
      })
      .from(callSessions)
      .where(and(
        eq(callSessions.tenantId, tenantId),
        sql`${callSessions.triggerTime} >= ${startDate}`,
        sql`${callSessions.triggerTime} <= ${endDate}`
      ));

    // Previous period for comparison
    const [previousCallStats] = await db
      .select({
        totalCalls: count(),
        answeredCalls: sql<number>`COUNT(CASE WHEN ${callSessions.callOutcome} IN ('confirmed', 'answered', 'completed') THEN 1 END)`,
        confirmedCalls: sql<number>`COUNT(CASE WHEN ${callSessions.callOutcome} = 'confirmed' THEN 1 END)`
      })
      .from(callSessions)
      .where(and(
        eq(callSessions.tenantId, tenantId),
        sql`${callSessions.triggerTime} >= ${previousStartDate}`,
        sql`${callSessions.triggerTime} < ${startDate}`
      ));

    // Daily call volume (today)
    const [todayCallStats] = await db
      .select({
        callsToday: count()
      })
      .from(callSessions)
      .where(and(
        eq(callSessions.tenantId, tenantId),
        sql`DATE(${callSessions.triggerTime}) = CURRENT_DATE`
      ));

    // Calculate metrics
    const currentTotal = currentCallStats.totalCalls || 0;
    const currentAnswered = currentCallStats.answeredCalls || 0;
    const currentConfirmed = currentCallStats.confirmedCalls || 0;
    
    const previousTotal = previousCallStats.totalCalls || 0;
    const previousAnswered = previousCallStats.answeredCalls || 0;
    const previousConfirmed = previousCallStats.confirmedCalls || 0;

    const callSuccessRate = currentTotal > 0 ? Math.round((currentAnswered / currentTotal) * 100) : 0;
    const appointmentConfirmationRate = currentAnswered > 0 ? Math.round((currentConfirmed / currentAnswered) * 100) : 0;
    const dailyCallVolume = todayCallStats.callsToday || 0;

    const previousCallSuccessRate = previousTotal > 0 ? Math.round((previousAnswered / previousTotal) * 100) : 0;
    const previousConfirmationRate = previousAnswered > 0 ? Math.round((previousConfirmed / previousAnswered) * 100) : 0;

    // No-show reduction calculation (simplified - could be enhanced with baseline data)
    const noShowReduction = Math.max(0, appointmentConfirmationRate - 20); // Assuming 20% baseline

    // Revenue protection (simplified calculation)
    const averageAppointmentValue = 100; // Could be configurable per tenant
    const revenueProtection = Math.round(currentConfirmed * averageAppointmentValue);

    return {
      callSuccessRate,
      appointmentConfirmationRate,
      noShowReduction,
      dailyCallVolume,
      revenueProtection,
      previousPeriodComparison: {
        callSuccessRate: previousCallSuccessRate,
        appointmentConfirmationRate: previousConfirmationRate,
        dailyCallVolume: Math.round((previousTotal || 0) / timePeriod)
      }
    };
  }

  async getCallActivity(tenantId: string): Promise<{
    activeCalls: number;
    todaysSummary: {
      callsAttemptedToday: number;
      callsCompletedToday: number;
      appointmentsConfirmedToday: number;
      pendingCalls: number;
    };
    outcomeBreakdown: Array<{
      outcome: string;
      count: number;
      percentage: number;
    }>;
    recentCallActivity: Array<{
      id: string;
      contactName: string;
      status: string;
      outcome: string;
      timestamp: Date;
      duration?: number;
    }>;
  }> {
    // Active calls (in progress in last 10 minutes)
    const [activeCallsCount] = await db
      .select({ count: count() })
      .from(callSessions)
      .where(and(
        eq(callSessions.tenantId, tenantId),
        sql`${callSessions.status} IN ('ringing', 'answered', 'in_progress')`,
        sql`${callSessions.triggerTime} >= NOW() - INTERVAL '10 minutes'`
      ));

    // Today's summary
    const [todayStats] = await db
      .select({
        attempted: count(),
        completed: sql<number>`COUNT(CASE WHEN ${callSessions.status} = 'completed' THEN 1 END)`,
        confirmed: sql<number>`COUNT(CASE WHEN ${callSessions.callOutcome} = 'confirmed' THEN 1 END)`
      })
      .from(callSessions)
      .where(and(
        eq(callSessions.tenantId, tenantId),
        sql`DATE(${callSessions.triggerTime}) = CURRENT_DATE`
      ));

    // Pending calls
    const [pendingCount] = await db
      .select({ count: count() })
      .from(followUpTasks)
      .where(and(
        eq(followUpTasks.tenantId, tenantId),
        eq(followUpTasks.status, 'pending'),
        sql`${followUpTasks.scheduledTime} <= NOW() + INTERVAL '24 hours'`
      ));

    // Outcome breakdown (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const outcomeData = await db
      .select({
        outcome: callSessions.callOutcome,
        count: count()
      })
      .from(callSessions)
      .where(and(
        eq(callSessions.tenantId, tenantId),
        sql`${callSessions.triggerTime} >= ${thirtyDaysAgo}`
      ))
      .groupBy(callSessions.callOutcome);

    const totalOutcomes = outcomeData.reduce((sum, item) => sum + item.count, 0);
    const outcomeBreakdown = outcomeData.map(item => ({
      outcome: item.outcome || 'unknown',
      count: item.count,
      percentage: totalOutcomes > 0 ? Math.round((item.count / totalOutcomes) * 100) : 0
    }));

    // Recent call activity (last 20 calls)
    const recentCalls = await db
      .select({
        id: callSessions.id,
        contactId: callSessions.contactId,
        status: callSessions.status,
        outcome: callSessions.callOutcome,
        triggerTime: callSessions.triggerTime,
        duration: callSessions.durationSeconds,
        contactName: contacts.name
      })
      .from(callSessions)
      .leftJoin(contacts, eq(callSessions.contactId, contacts.id))
      .where(eq(callSessions.tenantId, tenantId))
      .orderBy(desc(callSessions.triggerTime))
      .limit(20);

    const recentCallActivity = recentCalls.map(call => ({
      id: call.id,
      contactName: call.contactName || 'Unknown Contact',
      status: call.status || 'unknown',
      outcome: call.outcome || 'pending',
      timestamp: call.triggerTime || new Date(),
      duration: call.duration || undefined
    }));

    return {
      activeCalls: activeCallsCount.count || 0,
      todaysSummary: {
        callsAttemptedToday: todayStats.attempted || 0,
        callsCompletedToday: todayStats.completed || 0,
        appointmentsConfirmedToday: todayStats.confirmed || 0,
        pendingCalls: pendingCount.count || 0
      },
      outcomeBreakdown,
      recentCallActivity
    };
  }

  async getAppointmentInsights(tenantId: string, timePeriod: number = 30): Promise<{
    confirmationTrends: Array<{
      date: string;
      confirmationRate: number;
      totalAppointments: number;
      confirmed: number;
    }>;
    noShowPatterns: Array<{
      timeSlot: string;
      noShowRate: number;
      totalAppointments: number;
    }>;
    appointmentTypeAnalysis: Array<{
      type: string;
      count: number;
      confirmationRate: number;
      averageDuration: number;
    }>;
    leadTimeAnalysis: Array<{
      leadTimeDays: number;
      confirmationRate: number;
      count: number;
    }>;
  }> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (timePeriod * 24 * 60 * 60 * 1000));

    // Confirmation trends by day
    const trendData = await db
      .select({
        date: sql<string>`DATE(${contacts.appointmentTime})`,
        total: count(),
        confirmed: sql<number>`COUNT(CASE WHEN ${contacts.appointmentStatus} = 'confirmed' THEN 1 END)`
      })
      .from(contacts)
      .where(and(
        eq(contacts.tenantId, tenantId),
        sql`${contacts.appointmentTime} >= ${startDate}`,
        sql`${contacts.appointmentTime} <= ${endDate}`,
        sql`${contacts.appointmentTime} IS NOT NULL`
      ))
      .groupBy(sql`DATE(${contacts.appointmentTime})`)
      .orderBy(sql`DATE(${contacts.appointmentTime})`);

    const confirmationTrends = trendData.map(item => ({
      date: item.date,
      confirmationRate: item.total > 0 ? Math.round((item.confirmed / item.total) * 100) : 0,
      totalAppointments: item.total,
      confirmed: item.confirmed
    }));

    // No-show patterns by time slot
    const timeSlotData = await db
      .select({
        timeSlot: sql<string>`EXTRACT(HOUR FROM ${contacts.appointmentTime})`,
        total: count(),
        noShows: sql<number>`COUNT(CASE WHEN ${contacts.appointmentStatus} = 'no_show' THEN 1 END)`
      })
      .from(contacts)
      .where(and(
        eq(contacts.tenantId, tenantId),
        sql`${contacts.appointmentTime} >= ${startDate}`,
        sql`${contacts.appointmentTime} IS NOT NULL`
      ))
      .groupBy(sql`EXTRACT(HOUR FROM ${contacts.appointmentTime})`)
      .orderBy(sql`EXTRACT(HOUR FROM ${contacts.appointmentTime})`);

    const noShowPatterns = timeSlotData.map(item => ({
      timeSlot: `${item.timeSlot}:00`,
      noShowRate: item.total > 0 ? Math.round((item.noShows / item.total) * 100) : 0,
      totalAppointments: item.total
    }));

    // Appointment type analysis
    const typeData = await db
      .select({
        type: contacts.appointmentType,
        count: count(),
        confirmed: sql<number>`COUNT(CASE WHEN ${contacts.appointmentStatus} = 'confirmed' THEN 1 END)`,
        avgDuration: sql<number>`AVG(${contacts.appointmentDuration})`
      })
      .from(contacts)
      .where(and(
        eq(contacts.tenantId, tenantId),
        sql`${contacts.appointmentTime} >= ${startDate}`,
        sql`${contacts.appointmentTime} IS NOT NULL`
      ))
      .groupBy(contacts.appointmentType);

    const appointmentTypeAnalysis = typeData.map(item => ({
      type: item.type || 'Standard',
      count: item.count,
      confirmationRate: item.count > 0 ? Math.round((item.confirmed / item.count) * 100) : 0,
      averageDuration: Math.round(item.avgDuration || 30)
    }));

    // Lead time analysis (days between creation and appointment)
    const leadTimeData = await db
      .select({
        leadDays: sql<number>`EXTRACT(DAY FROM ${contacts.appointmentTime} - ${contacts.createdAt})`,
        total: count(),
        confirmed: sql<number>`COUNT(CASE WHEN ${contacts.appointmentStatus} = 'confirmed' THEN 1 END)`
      })
      .from(contacts)
      .where(and(
        eq(contacts.tenantId, tenantId),
        sql`${contacts.appointmentTime} >= ${startDate}`,
        sql`${contacts.appointmentTime} IS NOT NULL`,
        sql`${contacts.createdAt} IS NOT NULL`
      ))
      .groupBy(sql`EXTRACT(DAY FROM ${contacts.appointmentTime} - ${contacts.createdAt})`)
      .orderBy(sql`EXTRACT(DAY FROM ${contacts.appointmentTime} - ${contacts.createdAt})`);

    const leadTimeAnalysis = leadTimeData.map(item => ({
      leadTimeDays: Math.max(0, Math.round(item.leadDays || 0)),
      confirmationRate: item.total > 0 ? Math.round((item.confirmed / item.total) * 100) : 0,
      count: item.total
    }));

    return {
      confirmationTrends,
      noShowPatterns,
      appointmentTypeAnalysis,
      leadTimeAnalysis
    };
  }

  async getSystemHealth(tenantId: string): Promise<{
    callSystemHealth: {
      averageCallDuration: number;
      errorRate: number;
      responseTime: number;
      uptime: number;
    };
    databasePerformance: {
      queryResponseTime: number;
      connectionCount: number;
      dataGrowthRate: number;
    };
    apiPerformance: {
      successRate: number;
      averageResponseTime: number;
      errorsByType: Array<{ type: string; count: number }>;
    };
  }> {
    const last24Hours = new Date();
    last24Hours.setHours(last24Hours.getHours() - 24);

    // Call system health metrics
    const [callHealth] = await db
      .select({
        totalCalls: count(),
        avgDuration: sql<number>`AVG(${callSessions.durationSeconds})`,
        errorCount: sql<number>`COUNT(CASE WHEN ${callSessions.status} = 'failed' THEN 1 END)`
      })
      .from(callSessions)
      .where(and(
        eq(callSessions.tenantId, tenantId),
        sql`${callSessions.triggerTime} >= ${last24Hours}`
      ));

    const totalCalls = callHealth.totalCalls || 0;
    const errorCount = callHealth.errorCount || 0;
    const averageCallDuration = Math.round(callHealth.avgDuration || 0);
    const errorRate = totalCalls > 0 ? Math.round((errorCount / totalCalls) * 100) : 0;

    // Database performance (simplified metrics)
    const queryStart = Date.now();
    await db.select({ count: count() }).from(contacts).where(eq(contacts.tenantId, tenantId));
    const queryResponseTime = Date.now() - queryStart;

    // Data growth rate (contacts added in last 30 days vs previous 30 days)
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    const last60Days = new Date();
    last60Days.setDate(last60Days.getDate() - 60);

    const [currentGrowth] = await db
      .select({ count: count() })
      .from(contacts)
      .where(and(
        eq(contacts.tenantId, tenantId),
        sql`${contacts.createdAt} >= ${last30Days}`
      ));

    const [previousGrowth] = await db
      .select({ count: count() })
      .from(contacts)
      .where(and(
        eq(contacts.tenantId, tenantId),
        sql`${contacts.createdAt} >= ${last60Days}`,
        sql`${contacts.createdAt} < ${last30Days}`
      ));

    const dataGrowthRate = previousGrowth.count > 0 
      ? Math.round(((currentGrowth.count - previousGrowth.count) / previousGrowth.count) * 100)
      : 100;

    // API performance (simplified - based on call sessions success)
    const [apiHealth] = await db
      .select({
        total: count(),
        successful: sql<number>`COUNT(CASE WHEN ${callSessions.status} = 'completed' THEN 1 END)`
      })
      .from(callSessions)
      .where(and(
        eq(callSessions.tenantId, tenantId),
        sql`${callSessions.triggerTime} >= ${last24Hours}`
      ));

    const apiSuccessRate = apiHealth.total > 0 ? Math.round((apiHealth.successful / apiHealth.total) * 100) : 100;

    // Error types from call logs
    const errorTypes = await db
      .select({
        errorType: sql<string>`CASE 
          WHEN ${callLogs.logLevel} = 'error' THEN 'system_error'
          WHEN ${callSessions.callOutcome} = 'failed' THEN 'call_failed'
          WHEN ${callSessions.callOutcome} = 'no_answer' THEN 'no_answer'
          ELSE 'other'
        END`,
        count: count()
      })
      .from(callLogs)
      .leftJoin(callSessions, eq(callLogs.callSessionId, callSessions.id))
      .where(and(
        eq(callLogs.tenantId, tenantId),
        sql`${callLogs.createdAt} >= ${last24Hours}`
      ))
      .groupBy(sql`CASE 
        WHEN ${callLogs.logLevel} = 'error' THEN 'system_error'
        WHEN ${callSessions.callOutcome} = 'failed' THEN 'call_failed'
        WHEN ${callSessions.callOutcome} = 'no_answer' THEN 'no_answer'
        ELSE 'other'
      END`);

    const errorsByType = errorTypes.map(item => ({
      type: item.errorType,
      count: item.count
    }));

    return {
      callSystemHealth: {
        averageCallDuration,
        errorRate,
        responseTime: Math.round(averageCallDuration / 1000), // Convert to seconds
        uptime: Math.max(0, 100 - errorRate) // Simplified uptime calculation
      },
      databasePerformance: {
        queryResponseTime,
        connectionCount: 1, // Simplified - would need actual connection pool monitoring
        dataGrowthRate
      },
      apiPerformance: {
        successRate: apiSuccessRate,
        averageResponseTime: queryResponseTime,
        errorsByType
      }
    };
  }

  // Call session operations
  async getCallSession(id: string): Promise<CallSession | undefined> {
    const [session] = await db.select().from(callSessions).where(eq(callSessions.id, id));
    return session;
  }

  async getCallSessionsByTenant(tenantId: string): Promise<CallSession[]> {
    return await db
      .select()
      .from(callSessions)
      .where(eq(callSessions.tenantId, tenantId))
      .orderBy(desc(callSessions.createdAt));
  }

  async createCallSession(session: InsertCallSession): Promise<CallSession> {
    const [newSession] = await db.insert(callSessions).values(session).returning();
    return newSession;
  }

  async updateCallSession(id: string, updates: Partial<InsertCallSession>): Promise<CallSession> {
    const [updatedSession] = await db
      .update(callSessions)
      .set(updates)
      .where(eq(callSessions.id, id))
      .returning();
    return updatedSession;
  }

  async getCallSessionsByContact(contactId: string): Promise<CallSession[]> {
    return await db
      .select()
      .from(callSessions)
      .where(eq(callSessions.contactId, contactId))
      .orderBy(desc(callSessions.createdAt));
  }

  async getCallSessionByRetellId(retellCallId: string): Promise<CallSession | undefined> {
    const [session] = await db
      .select()
      .from(callSessions)
      .where(eq(callSessions.retellCallId, retellCallId));
    return session;
  }

  // Follow-up task operations
  async getFollowUpTask(id: string): Promise<FollowUpTask | undefined> {
    const [task] = await db.select().from(followUpTasks).where(eq(followUpTasks.id, id));
    return task;
  }

  async getFollowUpTasksByTenant(tenantId: string): Promise<FollowUpTask[]> {
    return await db
      .select()
      .from(followUpTasks)
      .where(eq(followUpTasks.tenantId, tenantId))
      .orderBy(asc(followUpTasks.scheduledTime));
  }

  async createFollowUpTask(task: InsertFollowUpTask): Promise<FollowUpTask> {
    const [newTask] = await db.insert(followUpTasks).values(task).returning();
    return newTask;
  }

  async updateFollowUpTask(id: string, updates: Partial<InsertFollowUpTask>): Promise<FollowUpTask> {
    const [updatedTask] = await db
      .update(followUpTasks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(followUpTasks.id, id))
      .returning();
    return updatedTask;
  }

  async getOverdueFollowUpTasks(): Promise<FollowUpTask[]> {
    return await db
      .select()
      .from(followUpTasks)
      .where(
        and(
          eq(followUpTasks.status, "pending"),
          lt(followUpTasks.scheduledTime, new Date())
        )
      )
      .orderBy(asc(followUpTasks.scheduledTime));
  }

  // Tenant configuration operations
  async getTenantConfig(tenantId: string): Promise<TenantConfig | undefined> {
    const [config] = await db.select().from(tenantConfig).where(eq(tenantConfig.tenantId, tenantId));
    return config;
  }

  async createTenantConfig(config: InsertTenantConfig): Promise<TenantConfig> {
    const [newConfig] = await db.insert(tenantConfig).values(config).returning();
    return newConfig;
  }

  async updateTenantConfig(tenantId: string, updates: Partial<InsertTenantConfig>): Promise<TenantConfig> {
    const [updatedConfig] = await db
      .update(tenantConfig)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tenantConfig.tenantId, tenantId))
      .returning();
    return updatedConfig;
  }

  // Call log operations
  async createCallLog(log: InsertCallLog): Promise<CallLog> {
    const [newLog] = await db.insert(callLogs).values(log).returning();
    return newLog;
  }

  async getCallLogsBySession(sessionId: string): Promise<CallLog[]> {
    return await db
      .select()
      .from(callLogs)
      .where(eq(callLogs.callSessionId, sessionId))
      .orderBy(asc(callLogs.createdAt));
  }

  // System settings operations
  async getSystemSetting(key: string): Promise<SystemSetting | undefined> {
    const [setting] = await db
      .select()
      .from(systemSettings)
      .where(and(eq(systemSettings.key, key), eq(systemSettings.isActive, true)));
    return setting;
  }

  async createSystemSetting(setting: InsertSystemSetting): Promise<SystemSetting> {
    const [newSetting] = await db.insert(systemSettings).values(setting).returning();
    return newSetting;
  }

  async updateSystemSetting(key: string, value: string): Promise<SystemSetting> {
    const [updatedSetting] = await db
      .update(systemSettings)
      .set({ value, updatedAt: new Date() })
      .where(eq(systemSettings.key, key))
      .returning();
    return updatedSetting;
  }

  // Contact groups operations
  async getContactGroup(id: string): Promise<ContactGroup | undefined> {
    const [group] = await db.select().from(contactGroups).where(eq(contactGroups.id, id));
    return group;
  }

  async getContactGroupsByTenant(tenantId: string): Promise<ContactGroup[]> {
    return await db
      .select()
      .from(contactGroups)
      .where(eq(contactGroups.tenantId, tenantId))
      .orderBy(asc(contactGroups.name));
  }

  async createContactGroup(group: InsertContactGroup): Promise<ContactGroup> {
    const [newGroup] = await db.insert(contactGroups).values(group).returning();
    return newGroup;
  }

  async updateContactGroup(id: string, tenantId: string, updates: Partial<InsertContactGroup>): Promise<ContactGroup> {
    const [updatedGroup] = await db
      .update(contactGroups)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(contactGroups.id, id), eq(contactGroups.tenantId, tenantId)))
      .returning();
    
    if (!updatedGroup) {
      throw new Error('Contact group not found or access denied');
    }
    return updatedGroup;
  }

  async deleteContactGroup(id: string, tenantId: string): Promise<void> {
    // Use transaction for atomic multi-step deletion
    await db.transaction(async (tx) => {
      // First verify the group exists and belongs to the tenant
      const [group] = await tx
        .select()
        .from(contactGroups)
        .where(and(eq(contactGroups.id, id), eq(contactGroups.tenantId, tenantId)));
      
      if (!group) {
        throw new Error('Contact group not found or access denied');
      }

      // First, remove all memberships for this group
      await tx.delete(groupMembership).where(eq(groupMembership.groupId, id));
      
      // Then delete the group
      await tx.delete(contactGroups).where(eq(contactGroups.id, id));
    });
  }

  async addContactToGroup(contactId: string, groupId: string, tenantId: string, addedBy: string): Promise<GroupMembership> {
    try {
      const [membership] = await db.transaction(async (tx) => {
        // Verify both contact and group belong to the tenant within transaction
        const [contact] = await tx
          .select()
          .from(contacts)
          .where(and(eq(contacts.id, contactId), eq(contacts.tenantId, tenantId)));
        
        const [group] = await tx
          .select()
          .from(contactGroups)
          .where(and(eq(contactGroups.id, groupId), eq(contactGroups.tenantId, tenantId)));

        if (!contact || !group) {
          throw new Error('Contact or group not found or access denied');
        }

        try {
          // Insert membership - will throw constraint error if already exists
          const [newMembership] = await tx
            .insert(groupMembership)
            .values({ contactId, groupId, addedBy })
            .returning();
          
          // Atomically recompute the group's contact count to ensure integrity
          await tx
            .update(contactGroups)
            .set({ 
              contactCount: sql`(SELECT COUNT(*) FROM ${groupMembership} WHERE ${groupMembership.groupId} = ${groupId})` 
            })
            .where(and(eq(contactGroups.id, groupId), eq(contactGroups.tenantId, tenantId)));
          
          return [newMembership];
        } catch (insertError) {
          // Handle Postgres unique constraint violation (23505) within transaction
          if ((insertError as any).code === '23505' || 
              (insertError instanceof Error && insertError.message.includes('duplicate key'))) {
            throw new Error('Contact is already in this group');
          }
          throw insertError;
        }
      });
      
      return membership;
    } catch (error) {
      if (error instanceof Error && error.message === 'Contact is already in this group') {
        throw error; // Re-throw the specific error
      }
      throw error;
    }
  }

  async removeContactFromGroup(contactId: string, groupId: string, tenantId: string): Promise<void> {
    await db.transaction(async (tx) => {
      // Verify both contact and group belong to the tenant within transaction
      const [contact] = await tx
        .select()
        .from(contacts)
        .where(and(eq(contacts.id, contactId), eq(contacts.tenantId, tenantId)));
      
      const [group] = await tx
        .select()
        .from(contactGroups)
        .where(and(eq(contactGroups.id, groupId), eq(contactGroups.tenantId, tenantId)));

      if (!contact || !group) {
        throw new Error('Contact or group not found or access denied');
      }

      // Delete membership and get the result to check if any rows were affected
      const deletionResult = await tx
        .delete(groupMembership)
        .where(and(
          eq(groupMembership.contactId, contactId),
          eq(groupMembership.groupId, groupId)
        ))
        .returning();

      if (deletionResult.length === 0) {
        throw new Error('Contact is not in this group');
      }

      // Only update count if a row was actually deleted - recompute for integrity
      await tx
        .update(contactGroups)
        .set({ 
          contactCount: sql`(SELECT COUNT(*) FROM ${groupMembership} WHERE ${groupMembership.groupId} = ${groupId})` 
        })
        .where(and(eq(contactGroups.id, groupId), eq(contactGroups.tenantId, tenantId)));
    });
  }

  async getContactsInGroup(groupId: string, tenantId: string): Promise<Contact[]> {
    // First verify the group belongs to the tenant
    const [group] = await db
      .select()
      .from(contactGroups)
      .where(and(eq(contactGroups.id, groupId), eq(contactGroups.tenantId, tenantId)));

    if (!group) {
      throw new Error('Group not found or access denied');
    }

    return await db
      .select(getTableColumns(contacts))
      .from(contacts)
      .innerJoin(groupMembership, eq(contacts.id, groupMembership.contactId))
      .where(and(
        eq(groupMembership.groupId, groupId),
        eq(contacts.tenantId, tenantId)
      ))
      .orderBy(asc(contacts.name));
  }

  async getGroupsForContact(contactId: string, tenantId: string): Promise<ContactGroup[]> {
    // First verify the contact belongs to the tenant
    const [contact] = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.id, contactId), eq(contacts.tenantId, tenantId)));

    if (!contact) {
      throw new Error('Contact not found or access denied');
    }

    return await db
      .select(getTableColumns(contactGroups))
      .from(contactGroups)
      .innerJoin(groupMembership, eq(contactGroups.id, groupMembership.groupId))
      .where(and(
        eq(groupMembership.contactId, contactId),
        eq(contactGroups.tenantId, tenantId)
      ))
      .orderBy(asc(contactGroups.name));
  }

  // Location operations
  async getLocation(id: string): Promise<Location | undefined> {
    const [location] = await db.select().from(locations).where(eq(locations.id, id));
    return location;
  }

  async getLocationsByTenant(tenantId: string): Promise<Location[]> {
    return await db
      .select()
      .from(locations)
      .where(and(eq(locations.tenantId, tenantId), eq(locations.isActive, true)))
      .orderBy(asc(locations.name));
  }

  async createLocation(location: InsertLocation): Promise<Location> {
    const [newLocation] = await db.insert(locations).values(location).returning();
    return newLocation;
  }

  async updateLocation(id: string, tenantId: string, updates: Partial<InsertLocation>): Promise<Location> {
    const [updatedLocation] = await db
      .update(locations)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(locations.id, id), eq(locations.tenantId, tenantId)))
      .returning();
    
    if (!updatedLocation) {
      throw new Error('Location not found or access denied');
    }
    return updatedLocation;
  }

  async deleteLocation(id: string, tenantId: string): Promise<void> {
    const result = await db
      .update(locations)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(locations.id, id), eq(locations.tenantId, tenantId)))
      .returning();
    
    if (!result.length) {
      throw new Error('Location not found or access denied');
    }
  }

  // Authentication
  async authenticateUser(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user || !user.isActive) {
      return null;
    }

    const isValidPassword = await bcrypt.compare(password, user.hashedPassword);
    if (!isValidPassword) {
      return null;
    }

    return user;
  }
}

export const storage = new DatabaseStorage();
