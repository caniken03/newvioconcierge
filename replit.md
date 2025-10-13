# Overview

VioConcierge is an intelligent, multi-tenant SaaS platform designed to automate outbound calling for appointment reminders across various business sectors. Its primary goal is to reduce appointment no-shows through AI-powered voice calls, comprehensive contact management, and robust analytics. The platform supports multiple user roles, ensures strong tenant isolation, and integrates with external calendar systems. It aims to optimize appointment management and client engagement for businesses.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## UI/UX Decisions
The frontend is a React SPA using TypeScript and Vite, styled with Radix UI, shadcn/ui, and Tailwind CSS. It uses Wouter for routing and React Hook Form with Zod for form management.

## Technical Implementations
The backend is an Express.js application with Node.js and TypeScript, following a RESTful API design. Drizzle ORM is used for database interactions. Authentication is JWT-based with role-based access control. The system features multi-tenancy enforced at both database and API levels, with dynamic API calls and enhanced cache management for strict tenant data isolation.

## Feature Specifications
- **Multi-tenancy**: Strict isolation with super admin, client admin, and client user roles.
- **Contact Management**: CSV import/export, deduplication, and E.164 phone normalization.
- **Appointment Management**: "Call Now" and "Cancel Call" features, robust error handling, and automated cleanup.
- **Call Status Display**: Intelligent, outcome-based status labeling (e.g., "No Answer", "Voicemail", "Confirmed").
- **AI Voice Agent**: Uses a unified prompt for professional outbound and enthusiastic inbound calls, with configurable travel/parking directions and dynamic company name resolution.
- **Travel & Parking Directions**: Client admins configure arrival instructions for the AI voice agent, with character limits and validation.
- **Tenant Configuration**: Super admins use a 7-step wizard for tenant creation with template-driven setup. Hybrid business hours system (super admin defaults, client admin customization) with `BusinessHoursEvaluator` for call validation.
- **Calendar Integration**: Supports Cal.com and Calendly for appointment reschedule detection.
- **Analytics**: Dashboard for Call Success Rate, Appointment Confirmation, No-Show Reduction, and Daily Call Volume.
- **Data Export & Compliance**: CSV export for contacts, appointments, and call logs; GDPR Article 20 compliant JSON export.
- **Daily Email Summaries**: Configurable daily summaries with detailed contact information (names, appointment times, outcomes) instead of just aggregate numbers. Shows actionable breakdowns: Recently Confirmed, Rescheduled, Cancelled, No Answer (needs follow-up), Voicemail Left, and Failed Calls. Delivered timezone-aware with up to 10 contacts per section.
- **User Account Settings**: Users can update personal information (full name, email) with email uniqueness enforced within tenant boundaries.
- **Call Settings & Preferences**: Client admins configure initial appointment reminder times (default: 24h before appointment). System makes ONE initial reminder call. If missed/not answered, ONE follow-up call is automatically scheduled (default: 90 minutes after missed call). If appointment is confirmed, NO additional calls are made. This prevents duplicate calls to customers who have already confirmed their appointments. **BUG FIX (Oct 2025)**: Fixed critical issue where follow-up calls were not being scheduled when initial calls failed. Webhook handlers now automatically create follow-up tasks when call outcomes are no_answer/voicemail/busy/failed, with duplicate prevention via pending task checks.
- **Team Management**: Client admins can invite team members (client_admin or client_user), manage roles, and activate/deactivate users via a secure, token-based invitation system.
- **Audit Trail**: Comprehensive, tamper-proof audit logs with hash-chained integrity verification, advanced filtering, and CSV export. Includes all login attempts, user activity, data exports, and system actions, with a 7-year retention policy.
- **Privacy Policy**: Comprehensive, publicly accessible privacy policy page (UK GDPR compliant) detailing data collection, processing, retention, and user rights. Accessible from login page without authentication.
- **Dark Mode**: Full dark mode support with Tailwind class-based theming. Theme toggle available on login page (unauthenticated users) and in header (authenticated users). Theme preference persists via localStorage across sessions.
- **In-App Notifications**: Real-time notification system with bell icon in header displaying unread count badge. Notifications are created automatically for key events (login, tenant creation, call outcomes). Users can mark individual notifications as read or mark all as read. Categories include: security_event, tenant_update, call_status, appointment, user_action. Notifications refresh every 30 seconds and support filtering by type, priority (low/normal/high/urgent), and read status. Multi-user broadcast uses Promise.allSettled for reliable delivery.
- **Comprehensive User Guides**: Client Admin and Super Admin guides provide practical, step-by-step instructions for platform success. Guides include: 30-day onboarding roadmap, industry-specific optimization strategies (Healthcare, Beauty/Wellness, Professional Services), voice AI configuration best practices, no-show reduction strategies targeting 40-60% improvement, ROI calculation examples with clear assumptions, calendar integration setup, team management workflows, troubleshooting guidance, and advanced feature utilization. All content uses aspirational language with realistic, achievable metrics and properly qualified performance claims.
- **Client Onboarding Checklist**: Comprehensive, printable checklist for super admins covering all aspects of client onboarding. Includes: Platform API keys & services (required/optional), client information gathering (business details, contact data, branding), system configuration (tenant creation, voice AI setup, call settings, email notifications), data setup (contact import, appointment sync), user access setup (admin accounts, team invitations), testing & validation (test workflows, feature verification), training & handoff (documentation, support), post-launch monitoring (30-day monitoring plan), and quick reference for environment variables. Accessible via sidebar navigation with print functionality for offline use.
- **Configurable Abuse Protection**: Super admins can adjust rate limiting and protection thresholds via Settings dialog on Abuse Protection page. Configurable parameters: max login attempts per email (1-20, default: 5), max attempts per IP (1-50, default: 10), time window in minutes (5-60, default: 15), and lockout duration in minutes (5-1440, default: 30). Settings stored in database with 1-minute in-memory cache for performance. System uses last-known-good configuration as fallback when database unavailable. Changes apply immediately to all login attempts and rate limiting.

# External Dependencies

- **Database**: PostgreSQL (via Neon serverless connection)
- **Voice AI**: Retell AI
- **Calendar Integration**: Cal.com and Calendly APIs
- **Email Service**: Resend API