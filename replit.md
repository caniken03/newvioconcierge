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
JWT-based with role-based middleware, enforcing multi-level access control (super admin, client admin, client user). Strict tenant boundary enforcement prevents cross-tenant data access.

## System Design Choices
- **Multi-tenancy**: Enforced at database and API levels, with dynamic API calls and enhanced cache management for strict tenant data isolation.
- **User Roles**: Super admin (cross-tenant), client admin (tenant-wide), client user (read-only).
- **Contact Management**: Supports CSV import/export with intelligent field mapping, auto-group creation, phone-based deduplication, and server-side phone normalization (E.164).
- **Appointment Management**: Provides functionality for "Call Now" and "Cancel Call" for future appointments. Robust error handling and automated cleanup prevent calls from getting stuck.
- **Call Status Display**: Intelligent status labeling system that prioritizes call outcomes over generic statuses. Instead of showing "Failed", the system displays specific outcomes: "No Answer" (no_answer), "Voicemail" (voicemail left), "Confirmed" (appointment confirmed), or "Busy" (line busy). Automatic cleanup service runs every 5 minutes to mark calls stuck in active/initiated/in_progress states for >10 minutes as failed with descriptive error messages. Status badges use outcome-specific colors: confirmed (green/default), voicemail (gray/secondary), no_answer (red/destructive), busy (outline).
- **AI Voice Agent**: Uses a unified prompt (`vioconcierge-unified-system-prompt.txt`) for outbound (professional, calm) and inbound (enthusiastic, warm) calls. Configurable travel/parking directions and dynamic company name resolution (`contact.companyName || tenantConfig.companyName || 'our office'`).
- **Travel & Parking Directions** (Profile > Travel & Directions): Client admins configure arrival instructions that the AI voice agent reads during appointment reminder calls. Each field has a 250-character limit with visual indicators: gray text (0-200 chars), orange text (201-250 chars), red text (over limit). Character counter displays "X/250 characters" format. Fields include: Public Transport Instructions (data-testid="textarea-public-transport"), Parking Information (data-testid="textarea-parking"), and Additional Arrival Notes (data-testid="textarea-arrival-notes"). Save button (data-testid="button-save-travel-directions") validates limits and shows error toast if exceeded.
- **Tenant Configuration**: Super admins use a 7-step wizard for tenant creation with template-driven setup. Tenant status validation prevents access by inactive/suspended tenants. Hybrid business hours system allows super admins to set defaults and client admins to customize per-day schedules.
    - **Business Hours**: Configurable per day, including start/end times and timezone. Utilizes a `BusinessHoursEvaluator` for call validation, ensuring calls are placed within business hours, with intelligent `nextAllowedTime` calculation for rescheduling.
- **Calendar Integration**: Supports Cal.com and Calendly with tenant-specific webhooks and secrets for appointment reschedule detection.
- **Analytics**: Dashboard displays Call Success Rate, Appointment Confirmation, No-Show Reduction, and Daily Call Volume with trend comparisons.
- **Data Export & Compliance**: Client and super admins can export contacts, appointments, and call logs to CSV. GDPR Article 20 compliant JSON export is available.
- **Daily Email Summaries**: Users can configure daily summary delivery times, days, and timezones. A background service sends professional HTML emails summarizing call stats, appointment statuses, and upcoming appointments, ensuring timezone-aware delivery.
- **User Account Settings**:
    - **Profile Management** (Profile > User Account Settings): All authenticated users can update their personal information (full name and email address). Email uniqueness is enforced within tenant boundaries to prevent duplicate accounts.
    - **API Endpoint**: `PUT /api/user/profile` accepts `fullName` and `email` in request body. Validates input using Zod schema (fullName: min 1 char, email: valid email format). Checks email uniqueness against other users in same tenant before updating. Returns 400 error if email already in use by another user. Uses `authenticateJWT` middleware, accessible to all authenticated users.
    - **Frontend State Management**: React hooks (`useState`, `useEffect`, `useMutation`) properly hoisted to component level to avoid React Rules of Hooks violations. State syncs with authenticated user data via `useEffect`. Form validation ensures fullName and email are not empty before API submission.
    - **UI Component** (Profile > Account Settings): Full Name input (data-testid="input-full-name") and Email input (data-testid="input-email") with real-time state tracking. Save Account Settings button (data-testid="button-save-account-settings") shows "Saving..." during mutation and is disabled while pending. Success toast ("Profile updated") appears on successful save. Error toast displays validation errors or duplicate email messages. Cache invalidation (`/api/auth/me`) ensures UI reflects updated user data immediately.
- **Call Settings & Preferences**:
    - **Appointment Reminder Time** (Profile > Call Settings): Client admins configure a single reminder time for initial appointment calls. System uses radio buttons (single selection) to choose when to send the first reminder: 1 week before (168h), 2 days before (48h), 1 day before (24h - default), 12 hours before, 3 hours before, 2 hours before, or 1 hour before appointment.
    - **Missed Call Follow-up**: If initial reminder call is not answered, system automatically retries once after configurable delay: 1 hour (60 min), 1.5 hours (90 min - default), or 2 hours (120 min). Maximum 2 attempts per appointment (1 initial + 1 retry).
    - **Call Flow**: For each appointment, system makes initial reminder call at selected time. If missed/failed, single retry occurs after configured delay. No further attempts made if retry also fails, preventing customer over-calling.
    - **Configuration Storage**: `reminderHoursBefore` stored as array with single value in tenant config. `followUpRetryMinutes` stores retry delay. Frontend uses radio group for single selection with fallback to 24h if config empty/invalid.
    - **UI Component** (Profile > Call Settings): Appointment reminder time radio buttons (data-testid="radio-reminder-{hours}h" where hours: 168, 48, 24, 12, 3, 2, 1). Missed call follow-up radio buttons (data-testid="radio-followup-{minutes}min" where minutes: 60, 90, 120). Save Call Settings button (data-testid="button-save-call-preferences") persists both settings to tenant configuration with success/error toast feedback.
- **Team Management** (Team Management page, client_admin only):
    - **User Invitation**: Client admins can invite team members via email with assigned roles (client_admin or client_user). Invitation emails include secure links with UUID-based tokens that expire after 7 days. Email service uses Resend API.
    - **Invitation Acceptance**: New users receive invitation emails with links to `/accept-invitation?token={uuid}`. Acceptance page validates token, allows password setting (min 8 chars), and auto-creates user account with assigned role and tenant association.
    - **Team Roster**: Displays all tenant users with full name, email, role, and status. Shows active/inactive badges. Lists pending invitations with email, role, and expiry date.
    - **Role Management**: Client admins can change user roles between client_admin and client_user. Role changes are immediate with UI feedback via toast notifications.
    - **Status Management**: Client admins can activate/deactivate users. Inactive users cannot log in but data is preserved. Status toggle uses confirmation dialogs.
    - **Security**: Token-based invitations are single-use, expire after 7 days, and enforce tenant boundaries. Email uniqueness validated within tenant scope. Audit trail tracks all team changes.
    - **API Endpoints**: `POST /api/team/invite` (send invitation), `GET /api/team/invitations` (list pending), `POST /api/team/accept-invitation` (accept and create user), `PATCH /api/team/users/:id/role` (change role), `PATCH /api/team/users/:id/status` (toggle status), `GET /api/team/users` (list team members).
    - **UI Components**: Invite form (data-testid="input-invite-email", "select-invite-role", "button-send-invitation"), user list (data-testid="select-role-{userId}", "button-toggle-status-{userId}"), pending invitations table (data-testid="text-invitation-{index}").
    - **Navigation**: Team Management link (data-testid="nav-team-management") visible in sidebar for client_admin role only.
- **Audit Trail** (Audit Trail page, client_admin and super_admin):
    - **Complete Activity Logging**: Displays comprehensive audit logs including all login attempts (successful and failed), user activity, data exports, security events, and system actions. Each entry includes timestamp, user details, action type, resource accessed, outcome, IP address, user agent, and sensitivity level.
    - **Tamper-Proof Verification**: Hash-chained audit logs with integrity verification system (UK GDPR Article 30 compliant). Displays verification status showing total entries, verified entries, last verification timestamp, and last verified hash. Three states: verified (green - all entries valid), unable to verify (orange - network/service error), integrity issue (red - tampering detected with break point).
    - **Advanced Filtering**: Multi-dimensional filters including date range (start/end), action type (login, logout, data export, tenant access, etc.), outcome (success, failure, denied, partial), and user selection (from team members). Apply/clear filter buttons with real-time query updates.
    - **Data Export**: Export filtered audit logs to CSV with all fields preserved. Maintains full 7-year retention per compliance requirements. Export button (data-testid="button-export-audit-trail") generates timestamped CSV files.
    - **Detailed Display**: Each audit entry shows color-coded action badges (success/green, failure/red, access/gray), outcome badges, sensitivity indicators (high/medium/low), user information, resource details, IP address, user agent, and JSON details when available. Entries are paginated (50 per page) with navigation controls.
    - **Security & Access Control**: Route protected for client_admin and super_admin roles only. Client admins see only their tenant's audit trail. All audit trail access is itself logged for complete transparency.
    - **API Endpoints**: `GET /api/compliance/audit-trail` (fetch logs with filters), `GET /api/compliance/audit-verification` (verify integrity), `GET /api/compliance/audit-trail/export` (export to CSV).
    - **UI Components**: Integrity card (data-testid="audit-integrity-card"), filters card (data-testid="audit-filters-card"), audit table (data-testid="audit-trail-table-card"), individual entries (data-testid="audit-entry-{id}"), filter inputs (data-testid="input-filter-start-date", "input-filter-end-date", "select-filter-action", "select-filter-outcome", "select-filter-user"), pagination (data-testid="button-previous-page", "button-next-page").
    - **Navigation**: Audit Trail link (data-testid="nav-audit-trail") visible in sidebar for client_admin role, located after Team Management.
    - **Compliance Features**: 7-year retention policy, hash-chained tamper detection, comprehensive action logging, IP/user agent tracking, multi-level sensitivity classification, full export capability for regulatory requirements.

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