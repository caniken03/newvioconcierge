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
- **Streamlined CSV Import/Export (12-Field SMS-Focused System)**: 
  - **Import**: Simplified to 12 essential fields for SMS-based communication (email removed completely). Fields include: Client Name, Phone Number, Contact Group, Appointment Type, Contact Person, Business Name, Appointment Duration, Special Instructions, Appointment Date, Appointment Time, Call Before Hours, Notes. Features intelligent field mapping, automatic group creation, and contact-to-group assignments. Uses multer with diskStorage for reliable file uploads up to 10MB.
  - **Export**: Generates CSV files with 12 fields matching the import structure, including group memberships (comma-separated). Includes CSV injection protection through value escaping.
  - **Template Download**: Provides blank CSV template with headers only (no sample data rows) for easy import preparation.
  - **Sample Data Guide**: In-app UI guide showing proper CSV structure, format requirements (date/time/phone), and privacy warning about appointment_type field to encourage professional discretion.
  - **Phone-Based Deduplication**: Uses normalized phone numbers for duplicate detection (email-based deduplication removed).
  - **Route Optimization**: Template and export routes positioned before parameterized `:id` route to prevent Express routing conflicts.
- **Tenant Status Validation**: Implemented triple-layer security at login, JWT middleware, and auth/me endpoint to prevent access by inactive/suspended tenants, with super admin bypass.
- **Business Hours Configuration**: Allows client administrators to configure per-day business hours with timezone support.
- **Phone Normalization**: Server-side normalization using libphonenumber-js with E.164 enforcement and Unicode control character stripping.
- **Tenant Isolation**: Enhanced cache management and dynamic API calls ensure strict tenant data isolation, eliminating hardcoded values.
- **Admin Tenant Creation Wizard**: A 7-step wizard for super admins to create tenants with template-driven setup, advanced feature control, and robust validation.

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