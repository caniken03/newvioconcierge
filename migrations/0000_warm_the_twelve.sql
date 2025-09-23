CREATE TABLE "call_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"call_session_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"contact_id" uuid,
	"log_level" varchar(20) DEFAULT 'info',
	"message" text NOT NULL,
	"metadata" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "call_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar(255),
	"contact_id" uuid,
	"tenant_id" uuid NOT NULL,
	"status" varchar(50) DEFAULT 'queued',
	"trigger_time" timestamp,
	"start_time" timestamp,
	"end_time" timestamp,
	"duration_seconds" integer,
	"call_outcome" varchar(50),
	"retell_call_id" varchar(255),
	"error_message" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "call_sessions_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"phone" varchar(50) NOT NULL,
	"email" varchar(255),
	"appointment_time" timestamp,
	"appointment_type" varchar(100),
	"appointment_duration" integer,
	"appointment_status" varchar(50) DEFAULT 'pending',
	"call_attempts" integer DEFAULT 0,
	"last_call_outcome" varchar(50),
	"notes" text,
	"special_instructions" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "follow_up_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"contact_id" uuid,
	"scheduled_time" timestamp NOT NULL,
	"status" varchar(50) DEFAULT 'pending',
	"task_type" varchar(50) DEFAULT 'initial_call',
	"auto_execution" boolean DEFAULT false,
	"attempts" integer DEFAULT 0,
	"max_attempts" integer DEFAULT 2,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(255) NOT NULL,
	"value" text,
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "system_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "tenant_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"retell_agent_id" varchar(255),
	"retell_agent_number" varchar(50),
	"retell_api_key" text,
	"cal_api_key" text,
	"cal_event_type_id" integer,
	"calendly_api_key" text,
	"calendly_organizer_email" varchar(255),
	"timezone" varchar(100) DEFAULT 'Europe/London',
	"follow_up_hours" integer DEFAULT 24,
	"business_type" varchar(100) DEFAULT 'professional',
	"is_paused" boolean DEFAULT false,
	"max_calls_per_day" integer DEFAULT 300,
	"max_calls_per_15m" integer DEFAULT 25,
	"quiet_start" time DEFAULT '20:00',
	"quiet_end" time DEFAULT '08:00',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "tenant_config_tenant_id_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"company_name" varchar(255),
	"tenant_number" varchar(50),
	"status" varchar(50) DEFAULT 'active',
	"contact_email" varchar(255),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "tenants_name_unique" UNIQUE("name"),
	CONSTRAINT "tenants_tenant_number_unique" UNIQUE("tenant_number")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"hashed_password" text NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"tenant_id" uuid NOT NULL,
	"role" varchar(50) DEFAULT 'client_user' NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
