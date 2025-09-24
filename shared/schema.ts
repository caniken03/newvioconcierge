import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, uuid, time, decimal, primaryKey } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table for authentication and role management
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  hashedPassword: text("hashed_password").notNull(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  tenantId: uuid("tenant_id").notNull(),
  role: varchar("role", { length: 50 }).notNull().default("client_user"), // super_admin, client_admin, client_user
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tenants table for multi-tenancy
export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  companyName: varchar("company_name", { length: 255 }),
  tenantNumber: varchar("tenant_number", { length: 50 }).unique(),
  status: varchar("status", { length: 50 }).default("active"), // active, suspended, inactive
  contactEmail: varchar("contact_email", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Contacts table for managing customer contacts with comprehensive PRD fields
export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(), // E.164 format
  email: varchar("email", { length: 255 }),
  appointmentTime: timestamp("appointment_time"),
  appointmentType: varchar("appointment_type", { length: 100 }), // HIPAA: Optional for medical practices
  appointmentDuration: integer("appointment_duration"), // in minutes (15, 30, 45, 60, 90, 120)
  appointmentStatus: varchar("appointment_status", { length: 50 }).default("pending"), // pending, confirmed, cancelled, rescheduled
  
  // Enhanced PRD fields
  timezone: varchar("timezone", { length: 100 }).default("Europe/London"),
  callBeforeHours: integer("call_before_hours").default(24), // Hours before appointment to call
  lastContactTime: timestamp("last_contact_time"), // Last successful contact
  ownerName: varchar("owner_name", { length: 255 }), // Who they're meeting with
  companyName: varchar("company_name", { length: 255 }), // Which company (for multi-client agencies)
  bookingSource: varchar("booking_source", { length: 50 }).default("manual"), // 'manual' | 'calcom' | 'calendly'
  locationId: uuid("location_id"), // For multi-location businesses
  priorityLevel: varchar("priority_level", { length: 50 }).default("normal"), // 'normal' | 'high' | 'urgent'
  preferredContactMethod: varchar("preferred_contact_method", { length: 50 }).default("voice"), // 'voice' | 'email' | 'sms'
  
  // Existing fields
  callAttempts: integer("call_attempts").default(0),
  lastCallOutcome: varchar("last_call_outcome", { length: 50 }),
  notes: text("notes"), // Staff-only notes (not read during calls)
  specialInstructions: text("special_instructions"), // Up to 300 chars for voice delivery
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Contact groups for organizing contacts
export const contactGroups = pgTable("contact_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  name: varchar("name", { length: 50 }).notNull(), // e.g., "VIP Patients", "First Time Clients"
  description: text("description"), // Group purpose and criteria
  color: varchar("color", { length: 7 }).notNull().default("#3B82F6"), // Hex color code for visual identification
  contactCount: integer("contact_count").default(0), // Auto-calculated member count
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Junction table for contact-group many-to-many relationship
export const groupMembership = pgTable("group_membership", {
  contactId: uuid("contact_id").notNull(),
  groupId: uuid("group_id").notNull(),
  addedAt: timestamp("added_at").defaultNow(),
  addedBy: uuid("added_by").notNull(), // User who added contact to group
}, (table) => ({
  pk: primaryKey({ columns: [table.contactId, table.groupId] })
}));

// Locations for multi-location businesses
export const locations = pgTable("locations", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(), // e.g., "Main Office", "Downtown Clinic"
  address: text("address"),
  phone: varchar("phone", { length: 50 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Call sessions for tracking voice interactions
export const callSessions = pgTable("call_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: varchar("session_id", { length: 255 }).unique(),
  contactId: uuid("contact_id"),
  tenantId: uuid("tenant_id").notNull(),
  status: varchar("status", { length: 50 }).default("queued"), // queued, in_progress, completed, failed
  triggerTime: timestamp("trigger_time"),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  durationSeconds: integer("duration_seconds"),
  callOutcome: varchar("call_outcome", { length: 50 }), // confirmed, voicemail, no_answer, busy, failed
  retellCallId: varchar("retell_call_id", { length: 255 }),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Follow-up tasks for automation
export const followUpTasks = pgTable("follow_up_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  contactId: uuid("contact_id"),
  scheduledTime: timestamp("scheduled_time").notNull(),
  status: varchar("status", { length: 50 }).default("pending"), // pending, processing, completed, failed
  taskType: varchar("task_type", { length: 50 }).default("initial_call"), // initial_call, retry_call, follow_up
  autoExecution: boolean("auto_execution").default(false),
  attempts: integer("attempts").default(0),
  maxAttempts: integer("max_attempts").default(2),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tenant configuration for business settings
export const tenantConfig = pgTable("tenant_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().unique(),
  // Retell AI configuration
  retellAgentId: varchar("retell_agent_id", { length: 255 }),
  retellAgentNumber: varchar("retell_agent_number", { length: 50 }),
  retellApiKey: text("retell_api_key"),
  retellWebhookSecret: text("retell_webhook_secret"),
  // Calendar integration
  calApiKey: text("cal_api_key"),
  calEventTypeId: integer("cal_event_type_id"),
  calWebhookSecret: text("cal_webhook_secret"),
  calendlyApiKey: text("calendly_api_key"),
  calendlyAccessToken: text("calendly_access_token"),
  calendlyOrganization: varchar("calendly_organization", { length: 255 }),
  calendlyUser: varchar("calendly_user", { length: 255 }),
  calendlyWebhookSecret: text("calendly_webhook_secret"),
  // Business settings
  timezone: varchar("timezone", { length: 100 }).default("Europe/London"),
  followUpHours: integer("follow_up_hours").default(24),
  businessType: varchar("business_type", { length: 100 }).default("professional"),
  // Rate limiting and protection
  isPaused: boolean("is_paused").default(false),
  maxCallsPerDay: integer("max_calls_per_day").default(300),
  maxCallsPer15Min: integer("max_calls_per_15m").default(25),
  quietStart: time("quiet_start").default("20:00"),
  quietEnd: time("quiet_end").default("08:00"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Call logs for detailed tracking
export const callLogs = pgTable("call_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  callSessionId: uuid("call_session_id").notNull(),
  tenantId: uuid("tenant_id").notNull(),
  contactId: uuid("contact_id"),
  logLevel: varchar("log_level", { length: 20 }).default("info"), // info, warning, error
  message: text("message").notNull(),
  metadata: text("metadata"), // JSON string for additional data
  createdAt: timestamp("created_at").defaultNow(),
});

// System settings for platform-wide configuration
export const systemSettings = pgTable("system_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: varchar("key", { length: 255 }).notNull().unique(),
  value: text("value"),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
  }),
}));

export const tenantsRelations = relations(tenants, ({ many, one }) => ({
  users: many(users),
  contacts: many(contacts),
  callSessions: many(callSessions),
  followUpTasks: many(followUpTasks),
  contactGroups: many(contactGroups),
  locations: many(locations),
  config: one(tenantConfig, {
    fields: [tenants.id],
    references: [tenantConfig.tenantId],
  }),
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [contacts.tenantId],
    references: [tenants.id],
  }),
  location: one(locations, {
    fields: [contacts.locationId],
    references: [locations.id],
  }),
  callSessions: many(callSessions),
  followUpTasks: many(followUpTasks),
  groupMemberships: many(groupMembership),
}));

export const contactGroupsRelations = relations(contactGroups, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [contactGroups.tenantId],
    references: [tenants.id],
  }),
  groupMemberships: many(groupMembership),
}));

export const groupMembershipRelations = relations(groupMembership, ({ one }) => ({
  contact: one(contacts, {
    fields: [groupMembership.contactId],
    references: [contacts.id],
  }),
  group: one(contactGroups, {
    fields: [groupMembership.groupId],
    references: [contactGroups.id],
  }),
  addedByUser: one(users, {
    fields: [groupMembership.addedBy],
    references: [users.id],
  }),
}));

export const locationsRelations = relations(locations, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [locations.tenantId],
    references: [tenants.id],
  }),
  contacts: many(contacts),
}));

export const callSessionsRelations = relations(callSessions, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [callSessions.tenantId],
    references: [tenants.id],
  }),
  contact: one(contacts, {
    fields: [callSessions.contactId],
    references: [contacts.id],
  }),
  logs: many(callLogs),
}));

export const followUpTasksRelations = relations(followUpTasks, ({ one }) => ({
  tenant: one(tenants, {
    fields: [followUpTasks.tenantId],
    references: [tenants.id],
  }),
  contact: one(contacts, {
    fields: [followUpTasks.contactId],
    references: [contacts.id],
  }),
}));

export const tenantConfigRelations = relations(tenantConfig, ({ one }) => ({
  tenant: one(tenants, {
    fields: [tenantConfig.tenantId],
    references: [tenants.id],
  }),
}));

export const callLogsRelations = relations(callLogs, ({ one }) => ({
  callSession: one(callSessions, {
    fields: [callLogs.callSessionId],
    references: [callSessions.id],
  }),
  tenant: one(tenants, {
    fields: [callLogs.tenantId],
    references: [tenants.id],
  }),
  contact: one(contacts, {
    fields: [callLogs.contactId],
    references: [contacts.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCallSessionSchema = createInsertSchema(callSessions).omit({
  id: true,
  createdAt: true,
});

export const insertFollowUpTaskSchema = createInsertSchema(followUpTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTenantConfigSchema = createInsertSchema(tenantConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCallLogSchema = createInsertSchema(callLogs).omit({
  id: true,
  createdAt: true,
});

export const insertSystemSettingSchema = createInsertSchema(systemSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContactGroupSchema = createInsertSchema(contactGroups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  contactCount: true, // Auto-calculated field
});

export const insertGroupMembershipSchema = createInsertSchema(groupMembership).omit({
  addedAt: true,
});

export const insertLocationSchema = createInsertSchema(locations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;

export type CallSession = typeof callSessions.$inferSelect;
export type InsertCallSession = z.infer<typeof insertCallSessionSchema>;

export type FollowUpTask = typeof followUpTasks.$inferSelect;
export type InsertFollowUpTask = z.infer<typeof insertFollowUpTaskSchema>;

export type TenantConfig = typeof tenantConfig.$inferSelect;
export type InsertTenantConfig = z.infer<typeof insertTenantConfigSchema>;

export type CallLog = typeof callLogs.$inferSelect;
export type InsertCallLog = z.infer<typeof insertCallLogSchema>;

export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;

export type ContactGroup = typeof contactGroups.$inferSelect;
export type InsertContactGroup = z.infer<typeof insertContactGroupSchema>;

export type GroupMembership = typeof groupMembership.$inferSelect;
export type InsertGroupMembership = z.infer<typeof insertGroupMembershipSchema>;

export type Location = typeof locations.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;
