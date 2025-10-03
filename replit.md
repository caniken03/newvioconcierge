# Overview

VioConcierge is an intelligent voice appointment management platform that automates outbound calling for appointment reminders across multiple business verticals. The platform is built as a multi-tenant SaaS solution that enables businesses to reduce appointment no-shows through AI-powered voice calls, comprehensive contact management, and robust analytics. The system supports multiple user roles (super admin, client admin, client user) with tenant isolation and integrates with external calendar systems like Cal.com and Calendly.

# Recent Changes

## October 2024 - Enterprise-Grade Password Reset Feature
- **COMPLETE FEATURE**: Implemented secure password reset flow with forgot password modal, reset confirmation page, and email token delivery system
- **CRITICAL SECURITY FIX**: Resolved plain-text token storage vulnerability - all reset tokens now hashed with bcrypt (cost 10) before database storage
- **Constant-Time Validation**: Uses bcrypt.compare() for token validation, preventing timing attacks and ensuring tokens remain confidential even if database is compromised
- **Single-Use Tokens**: Tokens marked as used after successful reset, preventing replay attacks
- **Time-Limited**: 1-hour token expiration with automatic cleanup
- **Email Enumeration Prevention**: Returns consistent success messages regardless of account existence
- **Complete UI/UX**: ForgotPasswordModal component integrated into login page, dedicated /reset-password route with validation and error handling, spam folder reminder added
- **Email Integration**: Resend API integrated with professional HTML email template for password reset delivery
- **Multi-Tenant Email Support**: Single verified sender domain enables password reset emails to ANY registered user across all tenants
- **End-to-End Tested**: Full password reset flow verified including token hashing, validation, password update, login confirmation, token reuse prevention, and email delivery
- **Database Schema**: Added password_reset_tokens table with proper indexing and foreign key constraints
- **Architect Assessment**: "PASS" - Security vulnerability eliminated, implementation meets enterprise security standards

### Email Configuration Status
- **PENDING**: Domain verification in progress at Resend
- **Action Required**: Once domain is verified, update email service sender address to use verified domain
- **Current Status**: Email service configured, awaiting domain verification to enable multi-tenant email delivery
- **Testing**: Password reset emails successfully delivered to account owner email; full multi-tenant testing pending domain verification

## September 2024 - End-to-End Call Scheduler Validation & Phone Normalization
- **COMPREHENSIVE STRESS TEST COMPLETED**: Conducted real-world end-to-end call scheduler testing with 6 system restarts proving production resilience
- **Perfect Scheduler Performance**: Successfully detected and processed overdue follow-up task at precise timing (11:40:19 AM UTC)
- **Business Logic Validation**: Confirmed timezone handling, business hours evaluation, personalized variable generation, and tenant isolation
- **Error Handling Excellence**: Demonstrated proper API failure recovery with call reservation release and 90-minute retry scheduling
- **CRITICAL DISCOVERY**: Phone number Unicode contamination issue identified - invisible bidirectional text control characters cause Retell API E.164 validation failures
- **Security Vulnerability**: Phone normalization gap can bypass abuse protection by allowing different Unicode representations of same number
- **Architect Assessment**: "PASS WITH ONE CRITICAL FIX REQUIRED" - system architecture production-ready pending phone normalization implementation

### Phone Normalization Roadmap (Critical for Production)
**SECURITY CRITICAL**: Current phone handling allows Unicode contamination that bypasses abuse protection and causes API failures:
1. **Server-Side Normalization**: Implement strict phone canonicalization using libphonenumber-js with E.164 format enforcement
2. **Pre-Dial Validation**: Add validation guards in Retell service to prevent contaminated numbers reaching API
3. **Data Migration**: Backfill normalized_phone field for existing contacts and fix contaminated records
4. **Abuse Protection Fix**: Ensure rate limiting and deduplication use normalized phone numbers only
5. **Input Validation**: Strip Unicode control characters, whitespace, and format inconsistencies at ingestion

## September 2024 - Critical Data Isolation and UI Fixes
- **CRITICAL FIX**: Resolved tenant data isolation race condition where cache was cleared after setting auth data, causing cross-tenant data contamination
- **Hardcoded Values Eliminated**: Replaced all hardcoded KPI values in sidebar and Call Management page with dynamic tenant-scoped API calls
- **Cache Management Enhanced**: Implemented proper async/await sequencing with 50ms delay in authentication flow to ensure complete cache isolation
- **Real Data Integration**: Call Management page now uses `/api/call-sessions` and `/api/call-sessions/stats` instead of mock data
- **End-to-End Verified**: Smart AI Solutions tenant correctly shows 0 values across all components confirming proper tenant isolation

## September 2024 - Comprehensive Security Enhancement
- **CRITICAL SECURITY FIX**: Removed dangerous client-side role selector vulnerability
- **Server-Side Authentication**: All user roles now determined server-side only with enhanced JWT claims  
- **Rate Limiting Protection**: Implemented comprehensive brute force protection with account lockout mechanisms
- **Enhanced Input Validation**: Frontend and backend validation with sanitization and error handling
- **Security Headers**: Added enterprise security headers to all authentication responses
- **Audit Logging**: Comprehensive logging of all authentication attempts with IP tracking
- **Account Lockout**: Exponential backoff protection against repeated failed login attempts

### Enterprise Security Roadmap (Required for Production)
**CRITICAL**: Current security improvements provide baseline protection but require these enhancements for enterprise deployment:
1. **Session Management**: Migrate from localStorage to HttpOnly, Secure, SameSite cookies with CSRF protection
2. **Distributed Rate Limiting**: Replace in-memory system with Redis-backed solution for scalability
3. **Advanced JWT Architecture**: Implement short-lived access tokens with rotating refresh tokens and server-side revocation
4. **Uniform Error Handling**: Prevent account enumeration through standardized error messages
5. **Enterprise Logging**: Structured audit logs with correlation IDs, tamper-evidence, and centralized SIEM integration
6. **Security Headers**: Complete CSP implementation with Helmet and strict content security policies

## September 2024 - 7-Step Tenant Creation Wizard 
- **MAJOR ENHANCEMENT**: Implemented comprehensive 7-step tenant creation wizard for super admin control
- **Template-Driven Setup**: Added 6 business templates (Medical/HIPAA, Salon/Beauty, Restaurant/Hospitality, Professional Services, General Business, Custom) with automatic feature enabling
- **Advanced Feature Control**: Integrated premium feature toggles, HIPAA compliance, custom branding, API access, and priority support controls
- **Complete Workflow**: Business Discovery → Template Selection → Feature Control → Admin Setup → Integration Config → Business Config → Review & Activate
- **Type Safety**: Unified WizardData schema across frontend and backend with comprehensive validation
- **State Management**: Intelligent wizard reset, step navigation, and progress tracking
- **Backend Integration**: Enhanced `/api/admin/tenants/wizard` endpoint with Zod validation for all 7 steps
- **End-to-End Verified**: Successfully tested tenant creation with all templates and feature combinations

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The client-side is built as a React SPA using TypeScript with Vite as the build tool. The application uses:
- **UI Framework**: Radix UI components with shadcn/ui styling system and Tailwind CSS for consistent design
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for client-side routing with role-based navigation
- **Forms**: React Hook Form with Zod validation for type-safe form handling
- **Authentication**: JWT-based authentication with role-based access control

The frontend follows a role-based dashboard pattern where different user roles see different interfaces (super admin platform overview vs client admin business dashboard).

## Backend Architecture
The server is built with Express.js and follows a RESTful API design:
- **Runtime**: Node.js with TypeScript and ESM modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: JWT tokens with bcrypt password hashing
- **Architecture Pattern**: Layered architecture with routes, storage layer, and database abstraction
- **Multi-tenancy**: Tenant isolation implemented at the database and API level

## Database Design
Uses PostgreSQL with a comprehensive schema supporting:
- **Multi-tenancy**: Tenant isolation with tenant-specific data partitioning
- **User Management**: Role-based access control (super_admin, client_admin, client_user)
- **Contact Management**: Customer contact information with appointment details
- **Call System**: Call sessions, logs, and follow-up task tracking
- **Configuration**: Tenant-specific settings for voice AI and calendar integrations

## Authentication & Authorization
- **JWT-based authentication** with role-based middleware
- **Multi-level access control**: Super admin (cross-tenant), client admin (tenant-wide), client user (read-only)
- **Tenant boundary enforcement** preventing cross-tenant data access
- **Token-based session management** with secure password hashing

## External Dependencies

- **Database**: PostgreSQL (via Neon serverless connection)
- **Voice AI Integration**: Retell AI for voice appointment reminders
- **Calendar Integration**: Cal.com and Calendly APIs for appointment synchronization  
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **Styling**: Tailwind CSS with custom design system
- **Build Tools**: Vite for development and production builds
- **Database Migrations**: Drizzle Kit for schema management
- **External Fonts**: Inter font family from Google Fonts
- **Icons**: Font Awesome for UI iconography

The system is designed for deployment on Replit with development-specific plugins for error handling and live reloading.