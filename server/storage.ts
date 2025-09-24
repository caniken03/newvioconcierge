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
  getPlatformAnalytics(): Promise<{
    activeTenants: number;
    totalCallsToday: number;
    platformSuccessRate: number;
    systemHealth: string;
    recentTenantActivity: any[];
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

    const groupPerformance = groupPerformanceData.map(item => ({
      groupName: item.groupName,
      memberCount: item.memberCount || 0,
      confirmedRate: item.memberCount > 0 ? Math.round(((item.confirmedCount || 0) / item.memberCount) * 100) : 0,
      color: item.color
    }));

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
