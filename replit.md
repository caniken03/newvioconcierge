# Overview

VioConcierge is an intelligent voice appointment management platform that automates outbound calling for appointment reminders across multiple business verticals. The platform is built as a multi-tenant SaaS solution that enables businesses to reduce appointment no-shows through AI-powered voice calls, comprehensive contact management, and robust analytics. The system supports multiple user roles (super admin, client admin, client user) with tenant isolation and integrates with external calendar systems like Cal.com and Calendly.

# Recent Changes

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