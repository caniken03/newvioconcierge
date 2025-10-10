# Overview

VioConcierge is an intelligent, multi-tenant SaaS platform designed to automate outbound calling for appointment reminders across various business sectors. It aims to reduce appointment no-shows through AI-powered voice calls, comprehensive contact management, and robust analytics. The platform supports multiple user roles (super admin, client admin, client user) with strong tenant isolation and integrates with external calendar systems like Cal.com and Calendly. Its ambition is to provide an indispensable tool for businesses to optimize their appointment management and client engagement.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The frontend is a React single-page application built with TypeScript and Vite. It utilizes Radix UI components with shadcn/ui and Tailwind CSS for styling, TanStack Query for server state management, Wouter for routing, and React Hook Form with Zod for form handling. Authentication is JWT-based with role-based access control, supporting distinct dashboard views for different user roles.

## Backend Architecture
The backend is an Express.js application built with Node.js and TypeScript, following a RESTful API design. It uses Drizzle ORM for type-safe database interactions and JWT for authentication with bcrypt for password hashing. The architecture is layered, incorporating routes, a storage layer, and a database abstraction, with multi-tenancy enforced at both the database and API levels.

## Database Design
The system uses PostgreSQL, with a schema designed for multi-tenancy, user management (super_admin, client_admin, client_user roles), comprehensive contact and appointment management, call session logging, and tenant-specific configuration for AI and calendar integrations.

## Authentication & Authorization
Authentication is JWT-based with role-based middleware. The system enforces multi-level access control, distinguishing between super admin (cross-tenant), client admin (tenant-wide), and client user (read-only) roles. Strict tenant boundary enforcement prevents cross-tenant data access, and token-based session management is secured with robust password hashing and rate-limiting. Password reset functionality incorporates secure token handling, including bcrypt hashing and time-limited, single-use tokens.

## System Design Choices
- **Streamlined CSV Import/Export (12 Essential Fields)**: 
  - **Import**: Supports 12 essential contact fields for SMS-focused communication. Fields include (in exact order): Name, Phone Number, Contact Group, Appointment Type, Contact Person, Business Name, Appointment Duration (Minutes), Appointment Date, Appointment Time, Call Before (Hours), Special Instructions, Notes. Features intelligent field mapping with auto-detection, automatic group creation, and contact-to-group assignments. Uses multer with diskStorage for reliable file uploads up to 10MB.
  - **Smart Duration Parser**: Accepts flexible duration formats: hours (e.g., "1", "1.5"), minutes with units (e.g., "30 mins", "45 minutes"), or abbreviations (e.g., "1h", "30m"). Values <15 without units are treated as hours; values ≥15 are treated as minutes. Automatically converts all inputs to minutes for database storage (15-480 minute range).
  - **Export**: Generates CSV files with exact 12 fields matching template structure, including group memberships (comma-separated). Includes CSV injection protection through value escaping. Splits appointment timestamp into separate date/time columns for ease of editing.
  - **Template Download**: Serves the exact user-provided CSV template file (server/VioConcierge Contacts Template_1759573922698.csv) with 12 field headers matching the required structure. Template filename: `VioConcierge Contacts Template_1759573922698.csv`
  - **Sample Data Guide**: In-app UI guide showing the 12 fields in order with format requirements and privacy warning about sensitive data in Appointment Type field.
  - **Phone-Based Deduplication**: Uses normalized phone numbers for duplicate detection (email-based deduplication removed).
  - **Route Optimization**: Template and export routes positioned before parameterized `:id` route to prevent Express routing conflicts.
- **Tenant Status Validation**: Implemented triple-layer security at login, JWT middleware, and auth/me endpoint to prevent access by inactive/suspended tenants, with super admin bypass.
- **Business Hours Configuration**: Allows client administrators to configure per-day business hours with timezone support.
- **Phone Normalization**: Server-side normalization using libphonenumber-js with E.164 enforcement and Unicode control character stripping.
- **Tenant Isolation**: Enhanced cache management and dynamic API calls ensure strict tenant data isolation, eliminating hardcoded values.
- **Admin Tenant Creation Wizard**: A 7-step wizard for super admins to create tenants with template-driven setup, advanced feature control, and robust validation.
- **Group Member Management**: Contact groups support two workflows for adding members: (1) From Contacts page: use the UserPlus button in the contacts table to add individual contacts to any group via SimpleGroupAssignment dropdown. (2) From Group Viewer: click "Add Members" button in the GroupMemberViewer toolbar to open a modal showing all contacts not in the group, with search/filter capabilities and multi-select checkboxes for bulk additions. Both workflows use the `/api/contact-group-memberships` bulk endpoint for consistent handling, automatic cache invalidation, and comprehensive error feedback via toast notifications.
- **Call Now Functionality**: Implemented consistent "Call Now" functionality across all GroupMemberViewer view modes (grid, list, detailed). Grid and detailed views use dropdown menu items, while list view uses a direct Phone button. All implementations properly handle event propagation to prevent unintended contact selection toggles and share the same CallNowModal component with proper state management.
- **Call Cancellation**: Users can cancel scheduled or queued calls directly from the Calls page. A red "Cancel" button appears next to the "Start" button for calls with 'scheduled' or 'queued' status. Cancellation updates the call status to 'cancelled' and immediately refreshes the UI. Cancelled calls can be filtered and viewed using the status filter dropdown.
- **Appointments Page Enhancements**: 
  - **Call Action Center**: Appointments page serves as the primary action center for call management, with "Call Now" and "Cancel Call" buttons that only appear for future appointments and persist even after failed call attempts.
  - **Edit Functionality**: Edit button opens ContactModal for updating appointment details, fetching full contact data via `/api/contacts/:id` endpoint.
  - **Call Reminder Display**: Shows scheduled call reminder time calculated from tenant's `reminderHoursBefore` configuration, displaying when the contact will receive their automated reminder call before the appointment.
  - **Removed Reschedule Button**: Streamlined UI by removing unused reschedule functionality in favor of direct editing.
- **Analytics Dashboard Metrics**: The Analytics dashboard displays four key performance metrics: Call Success Rate (answered calls/total calls), Appointment Confirmation (confirmed/answered calls), No-Show Reduction (improvement over 20% baseline), and Daily Call Volume (calls processed today). Each metric includes comparison to previous periods for tracking performance trends.
- **Call Lifecycle Management**: Comprehensive error handling and cleanup system ensures calls never remain stuck in incorrect states. Manual and bulk call endpoints mark failed calls with proper status/outcome when errors occur. Automated cleanup service runs every 5 minutes to mark stale in_progress calls (>10 minutes old) as failed, preventing abandoned sessions from persisting indefinitely. Recent Call Activity displays accurate real-time statuses (failed/cancelled/active) instead of defaulting to "pending".
- **Tenant-Specific Calendar Webhooks**: Fully isolated multi-tenant webhook system for Cal.com and Calendly integrations. Each tenant receives unique webhook URLs (`/api/webhooks/cal-com/{tenantId}` and `/api/webhooks/calendly/{tenantId}`) configured during tenant setup in Step 5 of the Super Admin Wizard. Webhook secrets are stored per-tenant in the `tenant_config` table for secure signature verification. After tenant creation, the wizard displays the actual webhook URL in a success toast (10-second duration) for the super admin to configure in the calendar provider. This ensures complete tenant isolation, independent calendar configurations, and eliminates cross-tenant webhook conflicts.
- **Travel & Parking Directions**: Client admins can configure arrival instructions that the AI voice agent communicates to appointment attendees during reminder calls. Accessible via the Profile page under the "Travel & Directions" tab, this feature includes three configurable text fields: Public Transport Instructions (bus routes, train/metro lines, stations), Parking Information (locations, restrictions, fees), and Additional Arrival Notes (walking directions, landmarks, entrance details). All directions are stored in the `tenant_config` table (`publicTransportInstructions`, `parkingInstructions`, `arrivalNotes`) and managed through the `/api/tenant/config` endpoint with proper validation and persistence. The UI includes character count displays and informational guidance about voice agent communication best practices.

# External Dependencies

- **Database**: PostgreSQL (via Neon serverless connection)
- **Voice AI Integration**: Retell AI
- **Calendar Integration**: Cal.com and Calendly APIs
- **UI Components**: Radix UI, shadcn/ui
- **Styling**: Tailwind CSS
- **Build Tools**: Vite
- **Database Migrations**: Drizzle Kit
- **Fonts**: Inter font family (Google Fonts)
- **Icons**: Font Awesome
- **Email Service**: Resend API (for password reset emails)