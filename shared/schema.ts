import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, uuid, time, decimal, primaryKey, unique, index, uniqueIndex, foreignKey } from "drizzle-orm/pg-core";
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
}, (table) => ({
  // Performance indexes
  tenantIdIdx: index("users_tenant_id_idx").on(table.tenantId),
  emailIdx: index("users_email_idx").on(table.email),
  // Database-level foreign key constraint
  tenantFk: foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.id], name: "users_tenant_fk" }).onDelete("cascade"),
}));

// Password reset tokens for secure password recovery
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Performance indexes
  tokenIdx: uniqueIndex("password_reset_tokens_token_idx").on(table.token),
  userIdIdx: index("password_reset_tokens_user_id_idx").on(table.userId),
  // Database-level foreign key constraint
  userFk: foreignKey({ columns: [table.userId], foreignColumns: [users.id], name: "password_reset_tokens_user_fk" }).onDelete("cascade"),
}));

// Tenants table for multi-tenancy
export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  companyName: varchar("company_name", { length: 255 }),
  tenantNumber: varchar("tenant_number", { length: 50 }).unique(),
  status: varchar("status", { length: 50 }).default("active"), // active, suspended, inactive
  contactEmail: varchar("contact_email", { length: 255 }),
  
  // Wizard and Template Support
  businessTemplate: varchar("business_template", { length: 50 }).default("general"), // medical, salon, restaurant, consultant, general, custom
  wizardCompleted: boolean("wizard_completed").default(false),
  setupProgress: integer("setup_progress").default(0), // 0-7 wizard steps completed
  
  // Feature Access Control
  featuresEnabled: text("features_enabled").default("[]"), // JSON array of enabled features
  premiumAccess: boolean("premium_access").default(false),
  hipaaCompliant: boolean("hipaa_compliant").default(false),
  customBranding: boolean("custom_branding").default(false),
  apiAccess: boolean("api_access").default(false),
  
  // Integration Status  
  retellConfigured: boolean("retell_configured").default(false),
  calendarConfigured: boolean("calendar_configured").default(false),
  
  // Daily Email Summary Configuration
  dailySummaryEnabled: boolean("daily_summary_enabled").default(true),
  dailySummaryRecipientName: varchar("daily_summary_recipient_name", { length: 255 }),
  dailySummaryRecipientEmail: varchar("daily_summary_recipient_email", { length: 255 }),
  dailySummaryTime: time("daily_summary_time").default("09:00"),
  dailySummaryDays: text("daily_summary_days").default('["1","2","3","4","5"]'), // JSON array: 0=Sunday, 1=Monday, etc.
  dailySummaryTimezone: varchar("daily_summary_timezone", { length: 100 }).default("Europe/London"),
  lastDailySummarySentAt: timestamp("last_daily_summary_sent_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Contacts table for managing customer contacts with comprehensive PRD fields
export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(), // E.164 format (original input)
  email: varchar("email", { length: 255 }), // Email address (optional)
  normalizedPhone: varchar("normalized_phone", { length: 50 }), // Sanitized E.164 format for API calls and deduplication
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
  preferredContactMethod: varchar("preferred_contact_method", { length: 50 }).default("voice"), // 'voice' | 'sms'
  
  // Existing fields
  callAttempts: integer("call_attempts").default(0),
  lastCallOutcome: varchar("last_call_outcome", { length: 50 }),
  
  // Enhanced Responsiveness Pattern Tracking
  customerResponsiveness: varchar("customer_responsiveness", { length: 50 }).default("unknown"), // responsive, unresponsive, variable, new_customer
  responsivenessScore: decimal("responsiveness_score", { precision: 3, scale: 2 }).default("0.50"), // 0.00 to 1.00
  consecutiveNoAnswers: integer("consecutive_no_answers").default(0),
  totalSuccessfulContacts: integer("total_successful_contacts").default(0),
  averageResponseTime: integer("average_response_time"), // Average time in seconds to pickup
  bestContactTime: varchar("best_contact_time", { length: 20 }), // Time of day they typically answer (e.g., "14:30")
  contactPatternData: text("contact_pattern_data"), // JSON data of contact patterns and preferences
  
  // Customer Sentiment History
  overallSentiment: varchar("overall_sentiment", { length: 50 }).default("neutral"), // positive, neutral, negative, mixed
  lastSentimentScore: decimal("last_sentiment_score", { precision: 3, scale: 2 }),
  sentimentTrend: varchar("sentiment_trend", { length: 20 }), // improving, declining, stable
  
  notes: text("notes"), // Staff-only notes (not read during calls)
  specialInstructions: text("special_instructions"), // Up to 300 chars for voice delivery
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Performance indexes
  tenantIdIdx: index("contacts_tenant_id_idx").on(table.tenantId),
  appointmentTimeIdx: index("contacts_appointment_time_idx").on(table.appointmentTime),
  appointmentStatusIdx: index("contacts_appointment_status_idx").on(table.appointmentStatus),
  normalizedPhoneIdx: index("contacts_normalized_phone_idx").on(table.normalizedPhone),
  // Database-level foreign key constraint for tenant data integrity
  tenantFk: foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.id], name: "contacts_tenant_fk" }).onDelete("cascade"),
}));

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
}, (table) => ({
  // Performance indexes
  tenantIdIdx: index("contact_groups_tenant_id_idx").on(table.tenantId),
  // Database-level foreign key constraint
  tenantFk: foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.id], name: "contact_groups_tenant_fk" }).onDelete("cascade"),
}));

// Junction table for contact-group many-to-many relationship
export const groupMembership = pgTable("group_membership", {
  contactId: uuid("contact_id").notNull(),
  groupId: uuid("group_id").notNull(),
  addedAt: timestamp("added_at").defaultNow(),
  addedBy: uuid("added_by").notNull(), // User who added contact to group
}, (table) => ({
  pk: primaryKey({ columns: [table.contactId, table.groupId] }),
  // Database-level foreign key constraints
  contactFk: foreignKey({ columns: [table.contactId], foreignColumns: [contacts.id], name: "group_membership_contact_fk" }).onDelete("cascade"),
  groupFk: foreignKey({ columns: [table.groupId], foreignColumns: [contactGroups.id], name: "group_membership_group_fk" }).onDelete("cascade"),
  addedByFk: foreignKey({ columns: [table.addedBy], foreignColumns: [users.id], name: "group_membership_added_by_fk" }).onDelete("cascade"),
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
}, (table) => ({
  // Performance indexes
  tenantIdIdx: index("locations_tenant_id_idx").on(table.tenantId),
  // Database-level foreign key constraint
  tenantFk: foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.id], name: "locations_tenant_fk" }).onDelete("cascade"),
}));

// Call sessions for tracking voice interactions with enhanced analytics
export const callSessions = pgTable("call_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: varchar("session_id", { length: 255 }).unique(),
  contactId: uuid("contact_id"),
  tenantId: uuid("tenant_id").notNull(),
  status: varchar("status", { length: 50 }).default("queued"), // queued, in_progress, completed, failed, cancelled
  triggerTime: timestamp("trigger_time"),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  durationSeconds: integer("duration_seconds"),
  
  // Enhanced Call Outcome Tracking
  callOutcome: varchar("call_outcome", { length: 50 }), // confirmed, voicemail, no_answer, busy, failed
  appointmentAction: varchar("appointment_action", { length: 50 }), // confirmed, cancelled, rescheduled, no_action, transfer_requested
  customerResponse: varchar("customer_response", { length: 100 }), // positive, neutral, negative, confused, interested, uninterested
  
  // Customer Sentiment Analysis
  customerSentiment: varchar("customer_sentiment", { length: 50 }), // positive, neutral, negative, mixed
  sentimentScore: decimal("sentiment_score", { precision: 3, scale: 2 }), // -1.00 to 1.00
  emotionalTone: varchar("emotional_tone", { length: 50 }), // calm, excited, frustrated, anxious, friendly, hostile
  engagementLevel: varchar("engagement_level", { length: 50 }), // high, medium, low, disengaged
  
  // Enhanced Call Quality Metrics
  callQualityScore: decimal("call_quality_score", { precision: 3, scale: 2 }), // 0.00 to 1.00
  voiceClarity: decimal("voice_clarity", { precision: 3, scale: 2 }), // 0.00 to 1.00
  connectionQuality: varchar("connection_quality", { length: 50 }), // excellent, good, fair, poor
  interruptionsCount: integer("interruptions_count").default(0),
  ringDurationSeconds: integer("ring_duration_seconds"),
  responseTimeMs: integer("response_time_ms"), // Time to customer pickup
  
  // Customer Interaction Details
  questionsAsked: text("questions_asked"), // JSON array of customer questions
  concernsExpressed: text("concerns_expressed"), // JSON array of concerns
  callbackRequested: boolean("callback_requested").default(false),
  followUpNeeded: boolean("follow_up_needed").default(false),
  transferRequested: boolean("transfer_requested").default(false),
  
  // Technical Integration Data
  retellCallId: varchar("retell_call_id", { length: 255 }),
  retellMetadata: text("retell_metadata"), // JSON metadata from Retell AI
  errorMessage: text("error_message"),
  
  // Order-Independent Webhook Processing (Expert Recommendation)
  latestEvent: varchar("latest_event", { length: 50 }), // call_started, call_ended, call_analyzed
  analysisJson: text("analysis_json"), // Full analysis data for recomputation
  outcome: varchar("outcome", { length: 50 }), // Derived outcome using precedence hierarchy
  lastTransitionSource: text("last_transition_source"), // JSON: {call_id, event_type, timestamp}
  analyzedAt: timestamp("analyzed_at"), // When call_analyzed event arrived
  
  // Hybrid Webhook + Polling System (Production-Ready)
  webhookVerified: boolean("webhook_verified").default(false), // True if webhook signature verified
  pollAttempts: integer("poll_attempts").default(0), // Count of polling attempts
  nextPollAt: timestamp("next_poll_at"), // When to next poll Retell API (null = stop polling)
  sourceOfTruth: varchar("source_of_truth", { length: 20 }).default("poll"), // webhook, poll, manual
  payloadWebhookLast: text("payload_webhook_last"), // Last webhook payload (JSON) for audit
  payloadPollLast: text("payload_poll_last"), // Last poll response (JSON) for audit
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Critical performance indexes
  tenantIdIdx: index("call_sessions_tenant_id_idx").on(table.tenantId),
  tenantContactIdx: index("call_sessions_tenant_contact_idx").on(table.tenantId, table.contactId),
  tenantStatusIdx: index("call_sessions_tenant_status_idx").on(table.tenantId, table.status),
  startTimeIdx: index("call_sessions_start_time_idx").on(table.startTime),
  // Quality and sentiment analytics indexes
  tenantQualityScoreIdx: index("call_sessions_tenant_quality_score_idx").on(table.tenantId, table.callQualityScore),
  tenantSentimentScoreIdx: index("call_sessions_tenant_sentiment_score_idx").on(table.tenantId, table.sentimentScore),
  customerSentimentIdx: index("call_sessions_customer_sentiment_idx").on(table.customerSentiment),
  appointmentActionIdx: index("call_sessions_appointment_action_idx").on(table.appointmentAction),
  // Partial unique constraint for Retell AI call deduplication (only for non-null values)
  retellCallIdIdx: index("call_sessions_retell_call_id_idx").on(table.retellCallId),
  retellCallIdUnique: uniqueIndex("call_sessions_retell_call_id_unique").on(table.retellCallId).where(sql`${table.retellCallId} IS NOT NULL`),
  // Database-level foreign key constraints for data integrity
  tenantFk: foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.id], name: "call_sessions_tenant_fk" }).onDelete("cascade"),
  contactFk: foreignKey({ columns: [table.contactId], foreignColumns: [contacts.id], name: "call_sessions_contact_fk" }).onDelete("cascade"),
}));

// Retell webhook events for idempotent processing (Expert Recommendation)
export const retellEvents = pgTable("retell_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  callId: varchar("call_id", { length: 255 }).notNull(), // Retell's call_id
  eventType: varchar("event_type", { length: 50 }).notNull(), // call_started, call_ended, call_analyzed, call_failed
  rawJson: text("raw_json").notNull(), // Complete webhook payload
  digest: varchar("digest", { length: 64 }).notNull(), // SHA-256 of raw payload for deduplication
  receivedAt: timestamp("received_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
  processingStatus: varchar("processing_status", { length: 50 }).default("pending"), // pending, processed, failed
  errorMessage: text("error_message"),
}, (table) => ({
  // Idempotency: prevent duplicate webhook processing
  uniqueEventDigest: uniqueIndex("retell_events_unique_digest").on(table.callId, table.eventType, table.digest),
  // Performance indexes
  tenantIdIdx: index("retell_events_tenant_id_idx").on(table.tenantId),
  callIdIdx: index("retell_events_call_id_idx").on(table.callId),
  receivedAtIdx: index("retell_events_received_at_idx").on(table.receivedAt),
  processingStatusIdx: index("retell_events_processing_status_idx").on(table.processingStatus),
  // Database-level foreign key constraint
  tenantFk: foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.id], name: "retell_events_tenant_fk" }).onDelete("cascade"),
}));

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
}, (table) => ({
  // Performance indexes
  tenantIdIdx: index("follow_up_tasks_tenant_id_idx").on(table.tenantId),
  scheduledTimeIdx: index("follow_up_tasks_scheduled_time_idx").on(table.scheduledTime),
  statusIdx: index("follow_up_tasks_status_idx").on(table.status),
  // Database-level foreign key constraints
  tenantFk: foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.id], name: "follow_up_tasks_tenant_fk" }).onDelete("cascade"),
  contactFk: foreignKey({ columns: [table.contactId], foreignColumns: [contacts.id], name: "follow_up_tasks_contact_fk" }).onDelete("cascade"),
}));

// Tenant configuration for business settings
export const tenantConfig = pgTable("tenant_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().unique(),
  // Retell AI configuration
  retellAgentId: varchar("retell_agent_id", { length: 255 }),
  retellAgentNumber: varchar("retell_agent_number", { length: 50 }),
  retellApiKey: text("retell_api_key"),
  retellWebhookSecret: text("retell_webhook_secret"),
  // Retail AI configuration
  retailAgentId: varchar("retail_agent_id", { length: 255 }),
  retailAgentNumber: varchar("retail_agent_number", { length: 50 }),
  retailApiKey: text("retail_api_key"),
  retailWebhookSecret: text("retail_webhook_secret"),
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
  // Configurable call timing settings
  reminderHoursBefore: integer("reminder_hours_before").array().default([24, 1]),
  followUpRetryMinutes: integer("follow_up_retry_minutes").default(90),
  // Rate limiting and protection
  isPaused: boolean("is_paused").default(false),
  maxCallsPerDay: integer("max_calls_per_day").default(300),
  maxCallsPer15Min: integer("max_calls_per_15m").default(75),
  quietStart: time("quiet_start").default("20:00"),
  quietEnd: time("quiet_end").default("08:00"),
  // Travel & Parking Directions (for voice agent to communicate)
  publicTransportInstructions: text("public_transport_instructions"),
  parkingInstructions: text("parking_instructions"),
  arrivalNotes: text("arrival_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Performance indexes
  tenantIdIdx: index("tenant_config_tenant_id_idx").on(table.tenantId),
  // Database-level foreign key constraint
  tenantFk: foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.id], name: "tenant_config_tenant_fk" }).onDelete("cascade"),
}));

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
}, (table) => ({
  // Performance indexes
  callSessionIdx: index("call_logs_call_session_idx").on(table.callSessionId),
  tenantIdx: index("call_logs_tenant_idx").on(table.tenantId),
  createdAtIdx: index("call_logs_created_at_idx").on(table.createdAt),
  // Database-level foreign key constraints for data integrity
  callSessionFk: foreignKey({ columns: [table.callSessionId], foreignColumns: [callSessions.id], name: "call_logs_call_session_fk" }).onDelete("cascade"),
  tenantFk: foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.id], name: "call_logs_tenant_fk" }).onDelete("cascade"),
  contactFk: foreignKey({ columns: [table.contactId], foreignColumns: [contacts.id], name: "call_logs_contact_fk" }).onDelete("set null"),
}));

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

// Abuse protection settings for configurable rate limiting
export const abuseProtectionSettings = pgTable("abuse_protection_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  maxAttemptsEmail: integer("max_attempts_email").notNull().default(5),
  maxAttemptsIP: integer("max_attempts_ip").notNull().default(10),
  timeWindowMinutes: integer("time_window_minutes").notNull().default(15),
  lockoutDurationMinutes: integer("lockout_duration_minutes").notNull().default(30),
  updatedBy: uuid("updated_by"), // Super admin who last updated
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Database-level foreign key constraint
  updatedByFk: foreignKey({ columns: [table.updatedBy], foreignColumns: [users.id], name: "abuse_protection_settings_updated_by_fk" }).onDelete("set null"),
}));

// Rate limiting tracking for abuse protection
export const rateLimitTracking = pgTable("rate_limit_tracking", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  timeWindow: varchar("time_window", { length: 20 }).notNull(), // "15_minutes", "1_hour", "24_hours"
  windowStart: timestamp("window_start").notNull(),
  callCount: integer("call_count").default(0),
  lastCallTime: timestamp("last_call_time"),
  isBlocked: boolean("is_blocked").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Performance indexes
  tenantIdIdx: index("rate_limit_tracking_tenant_id_idx").on(table.tenantId),
  windowStartIdx: index("rate_limit_tracking_window_start_idx").on(table.windowStart),
  // Database-level foreign key constraint
  tenantFk: foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.id], name: "rate_limit_tracking_tenant_fk" }).onDelete("cascade"),
}));

// Abuse detection events and violations
export const abuseDetectionEvents = pgTable("abuse_detection_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  eventType: varchar("event_type", { length: 50 }).notNull(), // rate_limit_violation, business_hours_violation, suspicious_pattern, etc.
  severity: varchar("severity", { length: 20 }).notNull(), // low, medium, high, critical
  description: text("description").notNull(),
  metadata: text("metadata"), // JSON string with additional details
  isResolved: boolean("is_resolved").default(false),
  resolvedBy: uuid("resolved_by"), // User ID who resolved the issue
  resolvedAt: timestamp("resolved_at"),
  autoBlocked: boolean("auto_blocked").default(false), // Whether tenant was automatically paused
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Performance indexes
  tenantIdIdx: index("abuse_detection_events_tenant_id_idx").on(table.tenantId),
  eventTypeIdx: index("abuse_detection_events_event_type_idx").on(table.eventType),
  severityIdx: index("abuse_detection_events_severity_idx").on(table.severity),
  // Database-level foreign key constraints
  tenantFk: foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.id], name: "abuse_detection_events_tenant_fk" }).onDelete("cascade"),
  resolvedByFk: foreignKey({ columns: [table.resolvedBy], foreignColumns: [users.id], name: "abuse_detection_events_resolved_by_fk" }).onDelete("set null"),
}));

// Tenant suspension records for audit trail
export const tenantSuspensions = pgTable("tenant_suspensions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  suspensionType: varchar("suspension_type", { length: 50 }).notNull(), // automatic, manual, scheduled
  reason: text("reason").notNull(),
  triggeredBy: varchar("triggered_by", { length: 50 }), // abuse_detection, admin_action, system_maintenance
  suspendedBy: uuid("suspended_by"), // User ID who suspended (for manual suspensions)
  suspendedAt: timestamp("suspended_at").defaultNow(),
  reactivatedAt: timestamp("reactivated_at"),
  reactivatedBy: uuid("reactivated_by"), // User ID who reactivated
  isActive: boolean("is_active").default(true), // Current suspension status
  metadata: text("metadata"), // JSON string with suspension details
}, (table) => ({
  // Performance indexes
  tenantIdIdx: index("tenant_suspensions_tenant_id_idx").on(table.tenantId),
  suspendedAtIdx: index("tenant_suspensions_suspended_at_idx").on(table.suspendedAt),
  isActiveIdx: index("tenant_suspensions_is_active_idx").on(table.isActive),
  // Database-level foreign key constraints
  tenantFk: foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.id], name: "tenant_suspensions_tenant_fk" }).onDelete("cascade"),
  suspendedByFk: foreignKey({ columns: [table.suspendedBy], foreignColumns: [users.id], name: "tenant_suspensions_suspended_by_fk" }).onDelete("set null"),
  reactivatedByFk: foreignKey({ columns: [table.reactivatedBy], foreignColumns: [users.id], name: "tenant_suspensions_reactivated_by_fk" }).onDelete("set null"),
}));

// Business hours configuration for enhanced time-based protection
export const businessHoursConfig = pgTable("business_hours_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().unique(),
  timezone: varchar("timezone", { length: 100 }).default("Europe/London"),
  
  // Daily business hours (JSON arrays for each day)
  mondayHours: text("monday_hours").default('{"start": "08:00", "end": "20:00", "enabled": true}'),
  tuesdayHours: text("tuesday_hours").default('{"start": "08:00", "end": "20:00", "enabled": true}'),
  wednesdayHours: text("wednesday_hours").default('{"start": "08:00", "end": "20:00", "enabled": true}'),
  thursdayHours: text("thursday_hours").default('{"start": "08:00", "end": "20:00", "enabled": true}'),
  fridayHours: text("friday_hours").default('{"start": "08:00", "end": "20:00", "enabled": true}'),
  saturdayHours: text("saturday_hours").default('{"start": "08:00", "end": "20:00", "enabled": false}'),
  sundayHours: text("sunday_hours").default('{"start": "08:00", "end": "20:00", "enabled": false}'),
  
  // Holiday and exception handling
  respectBankHolidays: boolean("respect_bank_holidays").default(true),
  customHolidays: text("custom_holidays").default("[]"), // JSON array of holiday dates
  emergencyOverride: boolean("emergency_override").default(false), // Allow calls outside hours with admin approval
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Performance indexes
  tenantIdIdx: index("business_hours_config_tenant_id_idx").on(table.tenantId),
  // Database-level foreign key constraint
  tenantFk: foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.id], name: "business_hours_config_tenant_fk" }).onDelete("cascade"),
}));

// Contact call history for harassment prevention
export const contactCallHistory = pgTable("contact_call_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  phoneNumber: varchar("phone_number", { length: 50 }).notNull(), // E.164 format (original)
  normalizedPhoneNumber: varchar("normalized_phone_number", { length: 50 }), // Sanitized E.164 for abuse protection
  tenantId: uuid("tenant_id").notNull(),
  contactId: uuid("contact_id"),
  lastCallTime: timestamp("last_call_time"),
  callCount24h: integer("call_count_24h").default(0),
  callCountTotal: integer("call_count_total").default(0),
  lastCallOutcome: varchar("last_call_outcome", { length: 50 }),
  isBlocked: boolean("is_blocked").default(false), // Blocked for harassment prevention
  blockedUntil: timestamp("blocked_until"), // Temporary block expiry
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Performance indexes
  tenantIdIdx: index("contact_call_history_tenant_id_idx").on(table.tenantId),
  phoneNumberIdx: index("contact_call_history_phone_number_idx").on(table.phoneNumber),
  normalizedPhoneIdx: index("contact_call_history_normalized_phone_idx").on(table.normalizedPhoneNumber),
  lastCallTimeIdx: index("contact_call_history_last_call_time_idx").on(table.lastCallTime),
  // Database-level foreign key constraints
  tenantFk: foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.id], name: "contact_call_history_tenant_fk" }).onDelete("cascade"),
  contactFk: foreignKey({ columns: [table.contactId], foreignColumns: [contacts.id], name: "contact_call_history_contact_fk" }).onDelete("set null"),
}));

// Call Reservations for Atomic Protection (CRITICAL for production)
export const callReservations = pgTable("call_reservations", {
  id: uuid("id").primaryKey().defaultRandom(),
  reservationId: varchar("reservation_id", { length: 100 }).notNull().unique(), // External reservation ID
  tenantId: uuid("tenant_id").notNull(),
  phoneNumber: varchar("phone_number", { length: 50 }), // Optional - for contact-specific reservations (original)
  normalizedPhoneNumber: varchar("normalized_phone_number", { length: 50 }), // Sanitized for deduplication and abuse protection
  idempotencyKey: varchar("idempotency_key", { length: 100 }), // Prevent duplicate reservations
  state: varchar("state", { length: 20 }).notNull().default("active"), // active, confirmed, released, expired
  reservationType: varchar("reservation_type", { length: 30 }).notNull(), // tenant_rate_limit, contact_limit, bulk_operation
  expiresAt: timestamp("expires_at").notNull(), // TTL for auto-cleanup
  reservedQuota: integer("reserved_quota").default(1), // How much quota was reserved
  metadata: text("metadata"), // JSON with reservation details
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Unique constraint for active reservations per tenant/phone to prevent duplicates (using normalized phone for security)
  uniqueActiveReservation: uniqueIndex("unique_active_reservation").on(table.tenantId, table.normalizedPhoneNumber, table.state).where(sql`${table.state} = 'active'`),
  // Index for efficient TTL cleanup
  expiresAtIdx: index("call_reservations_expires_at_idx").on(table.expiresAt),
  // Index for idempotency checks
  idempotencyIdx: index("call_reservations_idempotency_idx").on(table.idempotencyKey),
  // Database-level foreign key constraint
  tenantFk: foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.id], name: "call_reservations_tenant_fk" }).onDelete("cascade"),
}));

// Rescheduling Requests for sophisticated appointment management
export const reschedulingRequests = pgTable("rescheduling_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  contactId: uuid("contact_id").notNull(),
  callSessionId: uuid("call_session_id"), // Which call triggered the reschedule
  
  // Idempotency and deduplication protection
  idempotencyKey: varchar("idempotency_key", { length: 100 }), // Prevent duplicate webhook requests
  webhookEventId: varchar("webhook_event_id", { length: 100 }), // Track webhook source for deduplication
  
  // Original appointment details
  originalAppointmentTime: timestamp("original_appointment_time").notNull(),
  originalAppointmentType: varchar("original_appointment_type", { length: 100 }),
  
  // Reschedule request details
  rescheduleReason: varchar("reschedule_reason", { length: 100 }), // customer_conflict, emergency, illness, prefer_different_time
  customerPreference: text("customer_preference"), // Customer's stated preferences
  urgencyLevel: varchar("urgency_level", { length: 20 }).default("normal"), // urgent, high, normal, low
  
  // Proposed new times
  proposedTimes: text("proposed_times"), // JSON array of suggested times from customer
  availableSlots: text("available_slots"), // JSON array of available business slots
  finalSelectedTime: timestamp("final_selected_time"),
  
  // Workflow status
  status: varchar("status", { length: 50 }).default("pending"), // pending, approved, rejected, expired, completed
  workflowStage: varchar("workflow_stage", { length: 50 }).default("customer_request"), // customer_request, availability_check, confirmation, calendar_update
  
  // Processing details
  processedBy: uuid("processed_by"), // User who handled the request
  processedAt: timestamp("processed_at"),
  automatedProcessing: boolean("automated_processing").default(false),
  calendarUpdated: boolean("calendar_updated").default(false),
  confirmationSent: boolean("confirmation_sent").default(false),
  
  // Tracking and metrics
  responseTimeHours: decimal("response_time_hours", { precision: 5, scale: 2 }), // How long to process
  customerSatisfaction: varchar("customer_satisfaction", { length: 20 }), // satisfied, neutral, dissatisfied
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // CRITICAL: Idempotency protection to prevent duplicate requests
  uniqueIdempotencyKey: uniqueIndex("rescheduling_requests_idempotency_unique").on(table.idempotencyKey).where(sql`${table.idempotencyKey} IS NOT NULL`),
  uniqueWebhookEvent: uniqueIndex("rescheduling_requests_webhook_event_unique").on(table.webhookEventId).where(sql`${table.webhookEventId} IS NOT NULL`),
  // Prevent multiple pending requests for same contact (one active reschedule at a time)
  uniquePendingContact: uniqueIndex("rescheduling_requests_pending_contact_unique").on(table.tenantId, table.contactId).where(sql`${table.status} IN ('pending', 'approved')`),
  
  // Performance indexes for rescheduling workflow
  tenantStatusIdx: index("rescheduling_requests_tenant_status_idx").on(table.tenantId, table.status),
  tenantContactIdx: index("rescheduling_requests_tenant_contact_idx").on(table.tenantId, table.contactId),
  workflowStageIdx: index("rescheduling_requests_workflow_stage_idx").on(table.workflowStage),
  originalAppointmentTimeIdx: index("rescheduling_requests_original_time_idx").on(table.originalAppointmentTime),
  // Idempotency lookup indexes for fast deduplication checks
  idempotencyKeyIdx: index("rescheduling_requests_idempotency_key_idx").on(table.idempotencyKey),
  webhookEventIdIdx: index("rescheduling_requests_webhook_event_id_idx").on(table.webhookEventId),
  
  // Database-level foreign key constraints for data integrity
  tenantFk: foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.id], name: "rescheduling_requests_tenant_fk" }).onDelete("cascade"),
  contactFk: foreignKey({ columns: [table.contactId], foreignColumns: [contacts.id], name: "rescheduling_requests_contact_fk" }).onDelete("cascade"),
  callSessionFk: foreignKey({ columns: [table.callSessionId], foreignColumns: [callSessions.id], name: "rescheduling_requests_call_session_fk" }).onDelete("set null"),
}));

// Customer Analytics for comprehensive tracking
export const customerAnalytics = pgTable("customer_analytics", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  contactId: uuid("contact_id").notNull(), // One record per contact
  
  // Call behavior analytics
  totalCallsMade: integer("total_calls_made").default(0),
  totalCallsAnswered: integer("total_calls_answered").default(0),
  averageCallDuration: decimal("average_call_duration", { precision: 8, scale: 2 }), // seconds
  answerRate: decimal("answer_rate", { precision: 5, scale: 4 }), // 0.0000 to 1.0000
  
  // Responsiveness patterns
  bestContactDayOfWeek: integer("best_contact_day_of_week"), // 0-6 (Sunday-Saturday)
  bestContactTimeOfDay: varchar("best_contact_time_of_day", { length: 20 }), // "09:00-12:00"
  responseTimePatterns: text("response_time_patterns"), // JSON of historical response times
  
  // Sentiment evolution
  sentimentHistory: text("sentiment_history"), // JSON array of sentiment scores over time
  currentSentimentTrend: varchar("current_sentiment_trend", { length: 20 }), // improving, stable, declining
  averageSentimentScore: decimal("average_sentiment_score", { precision: 3, scale: 2 }),
  
  // Appointment behavior
  appointmentConfirmationRate: decimal("appointment_confirmation_rate", { precision: 5, scale: 4 }),
  appointmentCancellationRate: decimal("appointment_cancellation_rate", { precision: 5, scale: 4 }),
  rescheduleRequestCount: integer("reschedule_request_count").default(0),
  noShowCount: integer("no_show_count").default(0),
  
  // Engagement metrics
  questionsAskedCount: integer("questions_asked_count").default(0),
  concernsRaisedCount: integer("concerns_raised_count").default(0),
  transferRequestCount: integer("transfer_request_count").default(0),
  callbackRequestCount: integer("callback_request_count").default(0),
  
  // Quality scores
  overallEngagementScore: decimal("overall_engagement_score", { precision: 3, scale: 2 }), // 0.00 to 1.00
  communicationQualityScore: decimal("communication_quality_score", { precision: 3, scale: 2 }),
  riskScore: decimal("risk_score", { precision: 3, scale: 2 }), // Risk of no-show or cancellation
  
  // Calculated insights
  customerSegment: varchar("customer_segment", { length: 50 }), // vip, regular, at_risk, new_customer
  predictedBehavior: varchar("predicted_behavior", { length: 50 }), // likely_to_confirm, likely_to_reschedule, high_risk
  
  // Tracking metadata
  lastAnalysisUpdate: timestamp("last_analysis_update").defaultNow(),
  analysisVersion: varchar("analysis_version", { length: 20 }).default("1.0"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Performance indexes for analytics queries
  tenantIdIdx: index("customer_analytics_tenant_id_idx").on(table.tenantId),
  contactIdUnique: unique("customer_analytics_contact_unique").on(table.contactId),
  customerSegmentIdx: index("customer_analytics_customer_segment_idx").on(table.customerSegment),
  riskScoreIdx: index("customer_analytics_risk_score_idx").on(table.riskScore),
  // Database-level foreign key constraints for data integrity
  tenantFk: foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.id], name: "customer_analytics_tenant_fk" }).onDelete("cascade"),
  contactFk: foreignKey({ columns: [table.contactId], foreignColumns: [contacts.id], name: "customer_analytics_contact_fk" }).onDelete("cascade"),
}));

// Call Quality Metrics for technical analysis
export const callQualityMetrics = pgTable("call_quality_metrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  callSessionId: uuid("call_session_id").notNull().unique(), // One record per call
  tenantId: uuid("tenant_id").notNull(),
  
  // Technical quality measurements
  overallQualityScore: decimal("overall_quality_score", { precision: 3, scale: 2 }), // 0.00 to 1.00
  audioQualityScore: decimal("audio_quality_score", { precision: 3, scale: 2 }),
  connectionStabilityScore: decimal("connection_stability_score", { precision: 3, scale: 2 }),
  
  // Network and connection metrics
  jitter: decimal("jitter", { precision: 8, scale: 2 }), // ms
  latency: decimal("latency", { precision: 8, scale: 2 }), // ms
  packetLoss: decimal("packet_loss", { precision: 5, scale: 4 }), // percentage
  
  // Voice analysis metrics
  speechClarityScore: decimal("speech_clarity_score", { precision: 3, scale: 2 }),
  backgroundNoiseLevel: decimal("background_noise_level", { precision: 3, scale: 2 }),
  echoDetected: boolean("echo_detected").default(false),
  volumeLevels: text("volume_levels"), // JSON array of volume measurements throughout call
  
  // Call flow metrics
  pauseCount: integer("pause_count").default(0), // Number of significant pauses
  averagePauseDuration: decimal("average_pause_duration", { precision: 6, scale: 2 }), // seconds
  speechToSilenceRatio: decimal("speech_to_silence_ratio", { precision: 3, scale: 2 }),
  
  // Technical issues
  disconnectionCount: integer("disconnection_count").default(0),
  reconnectionCount: integer("reconnection_count").default(0),
  technicalIssuesReported: text("technical_issues_reported"), // JSON array of issues
  
  // Retell AI specific metrics
  retellProcessingMetrics: text("retell_processing_metrics"), // JSON from Retell AI
  retellConfidenceScore: decimal("retell_confidence_score", { precision: 3, scale: 2 }),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Performance indexes for quality analytics
  tenantIdIdx: index("call_quality_metrics_tenant_id_idx").on(table.tenantId),
  callSessionIdUnique: unique("call_quality_call_session_unique").on(table.callSessionId),
  overallQualityScoreIdx: index("call_quality_metrics_quality_score_idx").on(table.overallQualityScore),
  createdAtIdx: index("call_quality_metrics_created_at_idx").on(table.createdAt),
  // Database-level foreign key constraints for data integrity
  tenantFk: foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.id], name: "call_quality_metrics_tenant_fk" }).onDelete("cascade"),
  callSessionFk: foreignKey({ columns: [table.callSessionId], foreignColumns: [callSessions.id], name: "call_quality_metrics_call_session_fk" }).onDelete("cascade"),
}));

// UK GDPR Compliance: Audit Trail System for Article 30 & 15 Requirements
export const auditTrail = pgTable("audit_trail", {
  id: uuid("id").primaryKey().defaultRandom(),
  correlationId: uuid("correlation_id").notNull(), // For tracking related events
  tenantId: uuid("tenant_id"), // Null for super admin activities
  userId: uuid("user_id"), // User who performed the action
  sessionId: varchar("session_id", { length: 255 }), // Session identifier
  
  // Core audit fields
  action: varchar("action", { length: 100 }).notNull(), // login, logout, data_access, data_export, etc.
  resource: varchar("resource", { length: 100 }), // contacts, settings, calls, etc.
  resourceId: varchar("resource_id", { length: 100 }), // Specific resource ID accessed
  
  // Access context
  ipAddress: varchar("ip_address", { length: 45 }).notNull(), // IPv4/IPv6
  userAgent: text("user_agent"), // Browser/client info
  purpose: text("purpose"), // Business justification for access
  
  // Temporal data
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  duration: integer("duration_ms"), // How long the access lasted
  
  // Data classification
  dataTypes: text("data_types"), // JSON array of data types accessed ['pii', 'phi', 'contact_info']
  sensitivity: varchar("sensitivity", { length: 20 }).default("normal"), // normal, sensitive, confidential, restricted
  
  // Compliance metadata
  legalBasis: varchar("legal_basis", { length: 50 }), // legitimate_interest, consent, contract, etc.
  consentId: uuid("consent_id"), // Reference to consent record if applicable
  
  // Outcome and integrity
  outcome: varchar("outcome", { length: 50 }).notNull(), // success, failure, partial, blocked
  errorCode: varchar("error_code", { length: 50 }), // If outcome was failure/blocked
  hashSignature: varchar("hash_signature", { length: 255 }), // HMAC integrity signature
  
  // Tamper-resistant protection (UK GDPR Article 30 compliance)
  sequenceNumber: integer("sequence_number").notNull(), // For ordering and integrity verification
  previousHash: varchar("previous_hash", { length: 255 }).notNull(), // Hash chaining for tamper resistance
  keyVersion: integer("key_version").default(1), // For HMAC key rotation support
  algorithmVersion: integer("algorithm_version"), // Hash algorithm version (NULL=legacy, 2=canonical)
  
  // Administrative
  isAutomated: boolean("is_automated").default(false), // System vs human action
  reviewedBy: uuid("reviewed_by"), // For sensitive access review
  reviewedAt: timestamp("reviewed_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Performance indexes
  tenantIdIdx: index("audit_trail_tenant_id_idx").on(table.tenantId),
  userIdIdx: index("audit_trail_user_id_idx").on(table.userId),
  actionIdx: index("audit_trail_action_idx").on(table.action),
  timestampIdx: index("audit_trail_timestamp_idx").on(table.timestamp),
  correlationIdIdx: index("audit_trail_correlation_id_idx").on(table.correlationId),
  outcomeIdx: index("audit_trail_outcome_idx").on(table.outcome),
  // Foreign key constraints
  tenantFk: foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.id], name: "audit_trail_tenant_fk" }).onDelete("cascade"),
  userFk: foreignKey({ columns: [table.userId], foreignColumns: [users.id], name: "audit_trail_user_fk" }).onDelete("set null"),
  reviewedByFk: foreignKey({ columns: [table.reviewedBy], foreignColumns: [users.id], name: "audit_trail_reviewed_by_fk" }).onDelete("set null"),
}));

// Client consent tracking for GDPR Article 7
export const clientConsent = pgTable("client_consent", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  userId: uuid("user_id"), // User who requested consent (admin/support)
  
  consentType: varchar("consent_type", { length: 50 }).notNull(), // data_access, data_export, support_access, etc.
  purpose: text("purpose").notNull(), // Detailed reason for consent request
  dataTypes: text("data_types"), // JSON array of data types requiring consent
  
  // Consent workflow
  status: varchar("status", { length: 20 }).default("pending"), // pending, granted, denied, expired, revoked
  requestedAt: timestamp("requested_at").defaultNow(),
  decidedAt: timestamp("decided_at"),
  expiresAt: timestamp("expires_at"), // Optional expiry for temporary consent
  
  // Client response
  clientResponse: text("client_response"), // Client's reason/comments
  consentMethod: varchar("consent_method", { length: 50 }), // email, portal, phone, etc.
  
  // Audit trail
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  tenantIdIdx: index("client_consent_tenant_id_idx").on(table.tenantId),
  statusIdx: index("client_consent_status_idx").on(table.status),
  userIdIdx: index("client_consent_user_id_idx").on(table.userId),
  tenantFk: foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.id], name: "client_consent_tenant_fk" }).onDelete("cascade"),
  userFk: foreignKey({ columns: [table.userId], foreignColumns: [users.id], name: "client_consent_user_fk" }).onDelete("set null"),
}));

// Just-in-time access for temporary support/admin access
export const temporaryAccess = pgTable("temporary_access", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  grantedTo: uuid("granted_to").notNull(), // User ID receiving temporary access
  grantedBy: uuid("granted_by").notNull(), // User ID who granted access
  
  accessType: varchar("access_type", { length: 50 }).notNull(), // support, emergency, audit, etc.
  accessLevel: varchar("access_level", { length: 50 }).notNull(), // read_only, full_access, limited
  purpose: text("purpose").notNull(), // Business justification
  
  // Temporal controls
  startTime: timestamp("start_time").defaultNow(),
  endTime: timestamp("end_time").notNull(),
  autoRevoke: boolean("auto_revoke").default(true),
  
  // Status tracking
  status: varchar("status", { length: 20 }).default("active"), // active, expired, revoked, used
  lastUsed: timestamp("last_used"),
  usageCount: integer("usage_count").default(0),
  
  // Constraints and notifications
  maxUsages: integer("max_usages"), // Optional usage limit
  notifyOnUse: boolean("notify_on_use").default(true),
  consentRequired: boolean("consent_required").default(true),
  consentId: uuid("consent_id"), // Reference to client consent
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  tenantIdIdx: index("temporary_access_tenant_id_idx").on(table.tenantId),
  grantedToIdx: index("temporary_access_granted_to_idx").on(table.grantedTo),
  statusIdx: index("temporary_access_status_idx").on(table.status),
  endTimeIdx: index("temporary_access_end_time_idx").on(table.endTime),
  tenantFk: foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.id], name: "temporary_access_tenant_fk" }).onDelete("cascade"),
  grantedToFk: foreignKey({ columns: [table.grantedTo], foreignColumns: [users.id], name: "temporary_access_granted_to_fk" }).onDelete("cascade"),
  grantedByFk: foreignKey({ columns: [table.grantedBy], foreignColumns: [users.id], name: "temporary_access_granted_by_fk" }).onDelete("cascade"),
  consentFk: foreignKey({ columns: [table.consentId], foreignColumns: [clientConsent.id], name: "temporary_access_consent_fk" }).onDelete("set null"),
}));


// User invitations for team management
export const userInvitations = pgTable("user_invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull(), // client_admin or client_user
  invitedBy: uuid("invited_by").notNull(), // User ID who sent the invitation
  
  // Invitation token and status
  token: varchar("token", { length: 255 }).notNull().unique(),
  status: varchar("status", { length: 20 }).default("pending"), // pending, accepted, expired, cancelled
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  tenantIdIdx: index("user_invitations_tenant_id_idx").on(table.tenantId),
  emailIdx: index("user_invitations_email_idx").on(table.email),
  tokenIdx: uniqueIndex("user_invitations_token_idx").on(table.token),
  statusIdx: index("user_invitations_status_idx").on(table.status),
  tenantFk: foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.id], name: "user_invitations_tenant_fk" }).onDelete("cascade"),
  invitedByFk: foreignKey({ columns: [table.invitedBy], foreignColumns: [users.id], name: "user_invitations_invited_by_fk" }).onDelete("cascade"),
}));

// Notifications for in-app alerts and system events
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(), // Who should see this notification
  tenantId: uuid("tenant_id").notNull(), // Tenant isolation
  
  // Notification content
  type: varchar("type", { length: 50 }).notNull(), // system_alert, tenant_activity, call_event, security_event, appointment_update, user_action
  category: varchar("category", { length: 50 }).notNull(), // info, warning, error, success
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  
  // Notification metadata
  priority: varchar("priority", { length: 20 }).default("normal"), // low, normal, high, urgent
  actionUrl: varchar("action_url", { length: 500 }), // Optional link to related page
  actionLabel: varchar("action_label", { length: 100 }), // Optional button text
  metadata: text("metadata"), // JSON data for additional context
  
  // Status tracking
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  isDismissed: boolean("is_dismissed").default(false),
  dismissedAt: timestamp("dismissed_at"),
  
  // Related entities
  relatedContactId: uuid("related_contact_id"), // Optional: link to contact
  relatedCallSessionId: uuid("related_call_session_id"), // Optional: link to call
  relatedTenantId: uuid("related_tenant_id"), // Optional: for super admin notifications
  
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"), // Optional: auto-delete old notifications
}, (table) => ({
  userIdIdx: index("notifications_user_id_idx").on(table.userId),
  tenantIdIdx: index("notifications_tenant_id_idx").on(table.tenantId),
  isReadIdx: index("notifications_is_read_idx").on(table.isRead),
  typeIdx: index("notifications_type_idx").on(table.type),
  createdAtIdx: index("notifications_created_at_idx").on(table.createdAt),
  userFk: foreignKey({ columns: [table.userId], foreignColumns: [users.id], name: "notifications_user_fk" }).onDelete("cascade"),
  tenantFk: foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.id], name: "notifications_tenant_fk" }).onDelete("cascade"),
}));

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

export const retellEventsRelations = relations(retellEvents, ({ one }) => ({
  tenant: one(tenants, {
    fields: [retellEvents.tenantId],
    references: [tenants.id],
  }),
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

// Abuse protection table relations
export const rateLimitTrackingRelations = relations(rateLimitTracking, ({ one }) => ({
  tenant: one(tenants, {
    fields: [rateLimitTracking.tenantId],
    references: [tenants.id],
  }),
}));

export const abuseDetectionEventsRelations = relations(abuseDetectionEvents, ({ one }) => ({
  tenant: one(tenants, {
    fields: [abuseDetectionEvents.tenantId],
    references: [tenants.id],
  }),
  resolvedByUser: one(users, {
    fields: [abuseDetectionEvents.resolvedBy],
    references: [users.id],
  }),
}));

export const tenantSuspensionsRelations = relations(tenantSuspensions, ({ one }) => ({
  tenant: one(tenants, {
    fields: [tenantSuspensions.tenantId],
    references: [tenants.id],
  }),
  suspendedByUser: one(users, {
    fields: [tenantSuspensions.suspendedBy],
    references: [users.id],
  }),
  reactivatedByUser: one(users, {
    fields: [tenantSuspensions.reactivatedBy],
    references: [users.id],
  }),
}));

export const businessHoursConfigRelations = relations(businessHoursConfig, ({ one }) => ({
  tenant: one(tenants, {
    fields: [businessHoursConfig.tenantId],
    references: [tenants.id],
  }),
}));

export const contactCallHistoryRelations = relations(contactCallHistory, ({ one }) => ({
  tenant: one(tenants, {
    fields: [contactCallHistory.tenantId],
    references: [tenants.id],
  }),
  contact: one(contacts, {
    fields: [contactCallHistory.contactId],
    references: [contacts.id],
  }),
}));

// Enhanced feature table relations
export const reschedulingRequestsRelations = relations(reschedulingRequests, ({ one }) => ({
  tenant: one(tenants, {
    fields: [reschedulingRequests.tenantId],
    references: [tenants.id],
  }),
  contact: one(contacts, {
    fields: [reschedulingRequests.contactId],
    references: [contacts.id],
  }),
  callSession: one(callSessions, {
    fields: [reschedulingRequests.callSessionId],
    references: [callSessions.id],
  }),
  processedByUser: one(users, {
    fields: [reschedulingRequests.processedBy],
    references: [users.id],
  }),
}));

export const customerAnalyticsRelations = relations(customerAnalytics, ({ one }) => ({
  tenant: one(tenants, {
    fields: [customerAnalytics.tenantId],
    references: [tenants.id],
  }),
  contact: one(contacts, {
    fields: [customerAnalytics.contactId],
    references: [contacts.id],
  }),
}));

export const callQualityMetricsRelations = relations(callQualityMetrics, ({ one }) => ({
  callSession: one(callSessions, {
    fields: [callQualityMetrics.callSessionId],
    references: [callSessions.id],
  }),
  tenant: one(tenants, {
    fields: [callQualityMetrics.tenantId],
    references: [tenants.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
  used: true,
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

export const insertRetellEventSchema = createInsertSchema(retellEvents).omit({
  id: true,
  receivedAt: true,
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

export const insertAbuseProtectionSettingsSchema = createInsertSchema(abuseProtectionSettings).omit({
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

// Abuse protection insert schemas
export const insertRateLimitTrackingSchema = createInsertSchema(rateLimitTracking).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAbuseDetectionEventSchema = createInsertSchema(abuseDetectionEvents).omit({
  id: true,
  createdAt: true,
});

export const insertTenantSuspensionSchema = createInsertSchema(tenantSuspensions).omit({
  id: true,
  suspendedAt: true,
});

export const insertBusinessHoursConfigSchema = createInsertSchema(businessHoursConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContactCallHistorySchema = createInsertSchema(contactCallHistory).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Enhanced feature insert schemas
export const insertReschedulingRequestSchema = createInsertSchema(reschedulingRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCustomerAnalyticsSchema = createInsertSchema(customerAnalytics).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastAnalysisUpdate: true, // Auto-generated field
});

export const insertCallQualityMetricsSchema = createInsertSchema(callQualityMetrics).omit({
  id: true,
  createdAt: true,
});

// UK GDPR Compliance Insert Schemas
export const insertAuditTrailSchema = createInsertSchema(auditTrail).omit({
  id: true,
  createdAt: true,
}).extend({
  // Make timestamp optional since it defaults to now
  timestamp: z.date().optional(),
  // Auto-generated fields for tamper-resistant protection (optional for type compatibility)
  sequenceNumber: z.number().optional(),
  previousHash: z.string().optional(), 
  hashSignature: z.string().optional(),
  keyVersion: z.number().optional(),
});

export const insertClientConsentSchema = createInsertSchema(clientConsent).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTemporaryAccessSchema = createInsertSchema(temporaryAccess).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserInvitationSchema = createInsertSchema(userInvitations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
  readAt: true,
  dismissedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;

export type CallSession = typeof callSessions.$inferSelect;
export type InsertCallSession = z.infer<typeof insertCallSessionSchema>;

export type RetellEvent = typeof retellEvents.$inferSelect;
export type InsertRetellEvent = z.infer<typeof insertRetellEventSchema>;

export type FollowUpTask = typeof followUpTasks.$inferSelect;
export type InsertFollowUpTask = z.infer<typeof insertFollowUpTaskSchema>;

export type TenantConfig = typeof tenantConfig.$inferSelect;
export type InsertTenantConfig = z.infer<typeof insertTenantConfigSchema>;

export type CallLog = typeof callLogs.$inferSelect;
export type InsertCallLog = z.infer<typeof insertCallLogSchema>;

export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;

export type AbuseProtectionSettings = typeof abuseProtectionSettings.$inferSelect;
export type InsertAbuseProtectionSettings = z.infer<typeof insertAbuseProtectionSettingsSchema>;

export type ContactGroup = typeof contactGroups.$inferSelect;
export type InsertContactGroup = z.infer<typeof insertContactGroupSchema>;

export type GroupMembership = typeof groupMembership.$inferSelect;
export type InsertGroupMembership = z.infer<typeof insertGroupMembershipSchema>;

export type Location = typeof locations.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;

// Abuse protection types
export type RateLimitTracking = typeof rateLimitTracking.$inferSelect;
export type InsertRateLimitTracking = z.infer<typeof insertRateLimitTrackingSchema>;

export type AbuseDetectionEvent = typeof abuseDetectionEvents.$inferSelect;
export type InsertAbuseDetectionEvent = z.infer<typeof insertAbuseDetectionEventSchema>;

export type TenantSuspension = typeof tenantSuspensions.$inferSelect;
export type InsertTenantSuspension = z.infer<typeof insertTenantSuspensionSchema>;

export type BusinessHoursConfig = typeof businessHoursConfig.$inferSelect;
export type InsertBusinessHoursConfig = z.infer<typeof insertBusinessHoursConfigSchema>;

export type ContactCallHistory = typeof contactCallHistory.$inferSelect;
export type InsertContactCallHistory = z.infer<typeof insertContactCallHistorySchema>;

// Enhanced feature types
export type ReschedulingRequest = typeof reschedulingRequests.$inferSelect;
export type InsertReschedulingRequest = z.infer<typeof insertReschedulingRequestSchema>;

export type CustomerAnalytics = typeof customerAnalytics.$inferSelect;
export type InsertCustomerAnalytics = z.infer<typeof insertCustomerAnalyticsSchema>;

export type CallQualityMetrics = typeof callQualityMetrics.$inferSelect;
export type InsertCallQualityMetrics = z.infer<typeof insertCallQualityMetricsSchema>;

// UK GDPR Compliance Types
export type AuditTrail = typeof auditTrail.$inferSelect;
export type InsertAuditTrail = z.infer<typeof insertAuditTrailSchema>;

export type ClientConsent = typeof clientConsent.$inferSelect;
export type InsertClientConsent = z.infer<typeof insertClientConsentSchema>;

export type TemporaryAccess = typeof temporaryAccess.$inferSelect;
export type InsertTemporaryAccess = z.infer<typeof insertTemporaryAccessSchema>;

export type UserInvitation = typeof userInvitations.$inferSelect;
export type InsertUserInvitation = z.infer<typeof insertUserInvitationSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
