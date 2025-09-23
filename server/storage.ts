import {
  users,
  tenants,
  contacts,
  callSessions,
  followUpTasks,
  tenantConfig,
  callLogs,
  systemSettings,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, count, sql, gt, lt, like, inArray } from "drizzle-orm";
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

  // Call session operations
  getCallSession(id: string): Promise<CallSession | undefined>;
  getCallSessionsByTenant(tenantId: string): Promise<CallSession[]>;
  createCallSession(session: InsertCallSession): Promise<CallSession>;
  updateCallSession(id: string, updates: Partial<InsertCallSession>): Promise<CallSession>;
  getCallSessionsByContact(contactId: string): Promise<CallSession[]>;

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
