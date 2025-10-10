# Overview

VioConcierge is an intelligent, multi-tenant SaaS platform designed to automate outbound calling for appointment reminders across various business sectors. Its primary goal is to reduce appointment no-shows through AI-powered voice calls, comprehensive contact management, and robust analytics. The platform supports multiple user roles, ensures strong tenant isolation, and integrates with external calendar systems. It aims to optimize appointment management and client engagement for businesses.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend
The frontend is a React SPA with TypeScript and Vite, using Radix UI with shadcn/ui and Tailwind CSS. It uses TanStack Query for server state, Wouter for routing, and React Hook Form with Zod for forms. Authentication is JWT-based with role-based access control.

## Backend
The backend is an Express.js application with Node.js and TypeScript, following a RESTful API design. It uses Drizzle ORM for database interactions and JWT for authentication. The architecture is layered, incorporating routes, storage, and database abstraction, with multi-tenancy enforced.

## Database
The system uses PostgreSQL, with a schema designed for multi-tenancy, user management (super_admin, client_admin, client_user roles), contact and appointment management, call session logging, and tenant-specific configurations.

## Authentication & Authorization
JWT-based with role-based middleware, enforcing multi-level access control (super admin, client admin, client user). Strict tenant boundary enforcement prevents cross-tenant data access. Password reset uses secure, time-limited tokens.

## System Design Choices
- **Multi-tenancy**: Enforced at database and API levels, with dynamic API calls and enhanced cache management for strict tenant data isolation.
- **User Roles**: Super admin (cross-tenant), client admin (tenant-wide), client user (read-only).
- **Contact Management**:
    - **CSV Import/Export**: Supports 12 essential contact fields for import (Name, Phone Number, Contact Group, Appointment Type, Contact Person, Business Name, Appointment Duration (Minutes), Appointment Date, Appointment Time, Call Before (Hours), Special Instructions, Notes) with intelligent field mapping, auto group creation, and phone-based deduplication. Exports match the template structure. Template file: `VioConcierge Contacts Template_1759573922698.csv`.
    - **Phone Normalization**: Server-side normalization using libphonenumber-js to E.164.
    - **Group Management**: Workflows for adding contacts to groups from contacts page or group viewer using bulk API endpoints.
- **Appointment Management**:
    - **Call Action Center**: Appointments page provides "Call Now" and "Cancel Call" functionality for future appointments.
    - **Call Cancellation**: Users can cancel scheduled or queued calls, updating status to 'cancelled'.
    - **Call Lifecycle Management**: Robust error handling, manual/bulk call endpoints, and an automated cleanup service prevent calls from getting stuck in incorrect states.
- **AI Voice Agent**:
    - **Unified Prompt**: Uses `vioconcierge-unified-system-prompt.txt` for both outbound (professional, calm tone) and inbound (enthusiastic, warm tone) calls.
    - **Travel & Parking Directions**: Client admins configure arrival instructions (Public Transport, Parking, Additional Notes) that the AI communicates.
    - **Company Name Resolution**: AI uses `contact.companyName || tenantConfig.companyName || 'our office'` for flexible company identification.
- **Tenant Configuration**:
    - **Admin Tenant Creation Wizard**: 7-step wizard for super admins to create tenants with template-driven setup and advanced feature control.
    - **Tenant Status Validation**: Triple-layer security prevents access by inactive/suspended tenants.
    - **Hybrid Business Hours**: Two-tier system where super admins set intelligent defaults during tenant creation and client admins customize per-day schedules through Profile Settings.
        - **Tier 1: Super Admin Wizard Defaults** (Step 3 of Tenant Creation): Super admin selects business template (Retail, Healthcare, Professional Services, Restaurant/Hospitality, Emergency Services, Custom) which determines default operating hours. System automatically creates `business_hours_config` table entry with per-day JSON configuration based on template. Templates provide sensible defaults: Retail (Mon-Sat 9-18, Sun 10-16), Healthcare (Mon-Fri 8-18), Professional (Mon-Fri 9-17), etc. Timezone defaults to Europe/London but can be customized per tenant. Initial configuration persisted to database immediately upon tenant creation via `storage.createTenantConfig()`.
        - **Tier 2: Client Admin Customization** (Profile > Business Hours Tab): Client admins access full business hours editor with weekly schedule view. Each day (Monday-Sunday) has independent configuration: enable/disable toggle, start time picker (00:00-23:45), end time picker (00:00-23:45). Timezone selector updates tenant's primary timezone for all call scheduling. "Respect Bank Holidays" toggle (future feature flag) for automatic holiday handling. Save button triggers PUT `/api/tenant/business-hours` with role validation (client_admin/super_admin only). Immediate persistence to `business_hours_config` table with success/error toast feedback.
        - **Database Persistence** (`business_hours_config` table): One row per tenant linked via `tenantId` foreign key. Per-day JSON text fields: `mondayHours`, `tuesdayHours`, `wednesdayHours`, `thursdayHours`, `fridayHours`, `saturdayHours`, `sundayHours`. Each field stores: `{ "enabled": boolean, "start": "HH:MM", "end": "HH:MM" }` (e.g., `{"enabled":true,"start":"09:00","end":"17:00"}`). Additional fields: `timezone` (string, e.g., "Europe/London"), `respectBankHolidays` (boolean), `emergencyOverride` (boolean for future use). Loaded via `storage.getBusinessHoursConfig(tenantId)` for all call validation operations.
        - **Call Validation & Enforcement** (`BusinessHoursEvaluator` utility): `validateBusinessHours(tenantId, scheduledFor)` fetches both `tenant_config` and `business_hours_config` from database. Converts UTC call time to tenant's configured timezone using `date-fns-tz` (toZonedTime/fromZonedTime). Determines day-of-week (0=Sunday, 1=Monday, etc.) and retrieves corresponding hours field (e.g., Monday → `mondayHours` JSON). If `dayHours.enabled === false`, call is immediately blocked with reason "Business is closed on [Day]". Parses start/end times (e.g., "09:00", "17:00") and checks if call time falls within window. Calls outside hours return `{ allowed: false, reason: "...", nextAllowedTime: Date }` where nextAllowedTime is the next valid business hour. Next Allowed Time Logic scans next 7 days to find first enabled day with business hours strictly in the future (prevents past-time rescheduling bug). Returns far-future date (30 days) with console warning if all days disabled (configuration error). Used by manual call endpoint (`POST /api/call-sessions/manual`), bulk call endpoint (`POST /api/call-sessions/bulk`), and automated call scheduler service.
        - **API Endpoints**: `GET /api/tenant/business-hours` retrieves current business hours configuration (requires client_admin/super_admin role, enforces tenantId from JWT). `PUT /api/tenant/business-hours` updates business hours configuration with validation (validates enabled/start/end format, persists to database, returns updated config). Both endpoints use `authenticateJWT` and `requireRole(['client_admin', 'super_admin'])` middleware for security.
        - **Edge Case Handling**: All Days Disabled - If no enabled days found in 7-day scan, returns far-future nextAllowedTime (30 days) and logs warning "⚠️ No enabled business days found within 7-day window - business hours may be misconfigured". Invalid JSON - Malformed day configuration defaults to `{ start: "09:00", end: "17:00", enabled: false }` with safe fallback. Past Time Prevention - getNextAllowedTime() strictly enforces `businessStartUTC > callTimeUTC` to prevent rescheduling into already-elapsed hours. Timezone Edge Cases - Uses date-fns-tz for DST-aware conversions, preventing hour-drift when advancing days across DST boundaries.
- **Calendar Integration**:
    - **Tenant-Specific Webhooks**: Unique webhook URLs (`/api/webhooks/cal-com/{tenantId}`, `/api/webhooks/calendly/{tenantId}`) and secrets per tenant for Cal.com and Calendly.
    - **Appointment Reschedule Detection**: Cal.com webhooks update appointment status to "rescheduled" and log changes.
- **Analytics**: Dashboard displays Call Success Rate, Appointment Confirmation, No-Show Reduction, and Daily Call Volume with trend comparisons.
- **Data Export & Compliance**: Client and super admins can export contacts, appointments, and call logs to CSV. GDPR Article 20 compliant JSON export for all data is available with rate limiting and audit logging.

# External Dependencies

- **Database**: PostgreSQL (via Neon serverless connection)
- **Voice AI**: Retell AI
- **Calendar Integration**: Cal.com and Calendly APIs
- **UI Components**: Radix UI, shadcn/ui
- **Styling**: Tailwind CSS
- **Build Tools**: Vite
- **Database Migrations**: Drizzle Kit
- **Fonts**: Inter font family (Google Fonts)
- **Icons**: Font Awesome
- **Email Service**: Resend API