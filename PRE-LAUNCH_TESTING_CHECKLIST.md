# VioConcierge Pre-Launch Testing Checklist

**Version:** 1.0  
**Last Updated:** September 29, 2025  
**Purpose:** Comprehensive manual testing plan to validate all platform features before production launch

---

## Table of Contents
1. [Authentication & Authorization](#1-authentication--authorization)
2. [Multi-Tenancy & Tenant Management](#2-multi-tenancy--tenant-management)
3. [Contact Management](#3-contact-management)
4. [Call Scheduling & Execution](#4-call-scheduling--execution)
5. [Retell AI Voice Integration](#5-retell-ai-voice-integration)
6. [Calendar Integration](#6-calendar-integration)
7. [Security & Phone Normalization](#7-security--phone-normalization)
8. [GDPR Compliance](#8-gdpr-compliance)
9. [Business Configuration](#9-business-configuration)
10. [Observability & Monitoring](#10-observability--monitoring)
11. [User Interface & Experience](#11-user-interface--experience)
12. [Data Integrity & Isolation](#12-data-integrity--isolation)

---

## 1. Authentication & Authorization

### Test 1.1: User Login - Super Admin
**Test Steps:**
1. Navigate to login page
2. Enter super admin credentials
3. Submit login form

**Success Criteria:**
- ✅ Login successful with valid credentials
- ✅ Redirected to Super Admin dashboard
- ✅ JWT token stored securely
- ✅ User role displayed correctly as "Super Admin"

### Test 1.2: User Login - Client Admin
**Test Steps:**
1. Navigate to login page
2. Enter client admin credentials
3. Submit login form

**Success Criteria:**
- ✅ Login successful with valid credentials
- ✅ Redirected to Client Admin dashboard (business view)
- ✅ Can only see own tenant's data
- ✅ User role displayed correctly as "Client Admin"

### Test 1.3: User Login - Client User (Read-Only)
**Test Steps:**
1. Navigate to login page
2. Enter client user credentials
3. Submit login form

**Success Criteria:**
- ✅ Login successful with valid credentials
- ✅ Redirected to read-only dashboard
- ✅ No create/edit/delete buttons visible
- ✅ User role displayed correctly as "Client User"

### Test 1.4: Failed Login - Invalid Credentials
**Test Steps:**
1. Navigate to login page
2. Enter incorrect password
3. Submit login form
4. Repeat 5 times

**Success Criteria:**
- ✅ Error message displayed: "Invalid credentials"
- ✅ No specific indication whether username or password is wrong
- ✅ Account locked after 5 failed attempts
- ✅ Lockout message displayed clearly

### Test 1.5: Rate Limiting Protection
**Test Steps:**
1. Attempt rapid login attempts (10+ within 1 minute)
2. Observe system response

**Success Criteria:**
- ✅ Rate limiting triggered after threshold
- ✅ Error message: "Too many requests. Please try again later"
- ✅ IP-based rate limiting working
- ✅ Normal access restored after cooldown period

### Test 1.6: Session Management
**Test Steps:**
1. Login successfully
2. Close browser
3. Reopen browser and navigate to app
4. Leave session idle for extended period

**Success Criteria:**
- ✅ Session persists after browser close
- ✅ Session expires after configured timeout
- ✅ Redirected to login after session expiry
- ✅ No sensitive data visible after logout

### Test 1.7: Logout Functionality
**Test Steps:**
1. Login as any user
2. Click logout button
3. Try to access protected routes

**Success Criteria:**
- ✅ Successfully logged out
- ✅ Redirected to login page
- ✅ Cannot access protected routes
- ✅ JWT token cleared from storage

---

## 2. Multi-Tenancy & Tenant Management

### Test 2.1: Tenant Creation - 7-Step Wizard (Super Admin Only)
**Test Steps:**
1. Login as Super Admin
2. Navigate to "Create New Tenant"
3. Complete all 7 steps:
   - Step 1: Business Discovery
   - Step 2: Template Selection (try "Medical/HIPAA")
   - Step 3: Feature Control
   - Step 4: Admin User Setup
   - Step 5: Integration Configuration
   - Step 6: Business Configuration
   - Step 7: Review & Activate

**Success Criteria:**
- ✅ All 7 steps accessible and functional
- ✅ Template features auto-populate correctly
- ✅ HIPAA compliance options available for Medical template
- ✅ Admin user created successfully
- ✅ Tenant activated and visible in tenant list
- ✅ New admin can login immediately

### Test 2.2: Tenant Isolation - Data Separation
**Test Steps:**
1. Create Tenant A with 5 contacts
2. Create Tenant B with 5 different contacts
3. Login as Tenant A admin
4. View contacts list
5. Login as Tenant B admin
6. View contacts list

**Success Criteria:**
- ✅ Tenant A admin sees only Tenant A contacts (5 contacts)
- ✅ Tenant B admin sees only Tenant B contacts (5 contacts)
- ✅ No cross-tenant data leakage
- ✅ API responses filtered by tenant ID
- ✅ Database queries enforce tenant isolation

### Test 2.3: Tenant Configuration - Business Hours
**Test Steps:**
1. Login as Client Admin
2. Navigate to Business Settings
3. Configure business hours (e.g., Mon-Fri 9AM-5PM)
4. Save configuration

**Success Criteria:**
- ✅ Business hours saved successfully
- ✅ Configuration persists after logout/login
- ✅ Timezone correctly displayed
- ✅ Hours apply to call scheduling validation

### Test 2.4: Tenant Deactivation
**Test Steps:**
1. Login as Super Admin
2. Deactivate a test tenant
3. Try to login as that tenant's admin

**Success Criteria:**
- ✅ Tenant marked as inactive
- ✅ Login blocked for deactivated tenant users
- ✅ Clear error message displayed
- ✅ Data preserved but inaccessible

---

## 3. Contact Management

### Test 3.1: Create Contact - Standard Phone Number
**Test Steps:**
1. Login as Client Admin
2. Click "Add Contact"
3. Fill form with:
   - Name: "John Smith"
   - Phone: "+1-555-0123"
   - Email: "john@example.com"
   - Appointment details
4. Submit form

**Success Criteria:**
- ✅ Contact created successfully
- ✅ Phone number normalized to E.164 format (+15550123)
- ✅ Contact appears in contacts list
- ✅ All fields saved correctly
- ✅ Success message displayed

### Test 3.2: Create Contact - Phone with Unicode/Special Characters
**Test Steps:**
1. Click "Add Contact"
2. Enter phone with spaces: "+1 555 0124"
3. Enter phone with dashes: "+1-555-0125"
4. Try phone with Unicode characters (copy/paste from external source)
5. Submit each

**Success Criteria:**
- ✅ All phone formats accepted
- ✅ All normalized to clean E.164 format
- ✅ Unicode characters stripped automatically
- ✅ Warning shown if Unicode detected
- ✅ normalized_phone field populated correctly

### Test 3.3: Create Contact - Invalid Phone Number
**Test Steps:**
1. Click "Add Contact"
2. Enter invalid phone: "123"
3. Submit form

**Success Criteria:**
- ✅ Validation error displayed
- ✅ Form submission blocked
- ✅ Clear error message: "Invalid phone number format"
- ✅ Contact not created

### Test 3.4: Edit Contact
**Test Steps:**
1. Select existing contact
2. Click "Edit"
3. Update phone number and appointment details
4. Save changes

**Success Criteria:**
- ✅ Edit modal opens with current data
- ✅ Changes saved successfully
- ✅ Phone re-normalized if changed
- ✅ Updated contact reflects changes immediately
- ✅ Audit trail recorded (if enabled)

### Test 3.5: Delete Contact
**Test Steps:**
1. Select contact
2. Click "Delete"
3. Confirm deletion

**Success Criteria:**
- ✅ Confirmation dialog displayed
- ✅ Contact deleted after confirmation
- ✅ Contact removed from list
- ✅ Associated call history preserved (for audit)
- ✅ Future scheduled calls cancelled

### Test 3.6: Bulk Contact Import (if available)
**Test Steps:**
1. Prepare CSV file with 10 contacts
2. Navigate to "Import Contacts"
3. Upload CSV file
4. Map fields
5. Confirm import

**Success Criteria:**
- ✅ CSV file accepted
- ✅ Field mapping interface works
- ✅ All contacts imported successfully
- ✅ Phone numbers normalized automatically
- ✅ Import summary displayed with success/failure counts

### Test 3.7: Contact Search & Filtering
**Test Steps:**
1. Create 20+ contacts
2. Search by name
3. Filter by contact group
4. Filter by appointment date

**Success Criteria:**
- ✅ Search returns correct results
- ✅ Filters apply correctly
- ✅ Results update in real-time
- ✅ Can combine multiple filters
- ✅ Clear filters button works

### Test 3.8: Contact Groups
**Test Steps:**
1. Create contact group: "VIP Clients"
2. Assign 5 contacts to group
3. View contacts by group

**Success Criteria:**
- ✅ Group created successfully
- ✅ Contacts assigned to group
- ✅ Can filter contacts by group
- ✅ Can remove contacts from group
- ✅ Group deletion removes associations only

---

## 4. Call Scheduling & Execution

### Test 4.1: Manual Call Initiation - Immediate
**Test Steps:**
1. Select contact with valid phone
2. Click "Call Now"
3. Confirm call details
4. Initiate call

**Success Criteria:**
- ✅ Call initiated immediately
- ✅ Retell API receives request
- ✅ Call ID generated and stored
- ✅ Call status tracked in system
- ✅ Contact call history updated

### Test 4.2: Schedule Future Call - Within Business Hours
**Test Steps:**
1. Select contact
2. Schedule call for tomorrow 10:00 AM (within business hours)
3. Confirm scheduling

**Success Criteria:**
- ✅ Call scheduled successfully
- ✅ Follow-up task created
- ✅ Scheduled time respects timezone
- ✅ Call appears in scheduled calls list
- ✅ Confirmation message displayed

### Test 4.3: Schedule Call - Outside Business Hours
**Test Steps:**
1. Configure business hours: 9AM-5PM
2. Try to schedule call for 8:00 AM (before hours)
3. Try to schedule call for 6:00 PM (after hours)

**Success Criteria:**
- ✅ Validation warning displayed
- ✅ Call still schedulable (with warning)
- ✅ OR call automatically adjusted to next business hour
- ✅ Clear explanation provided to user

### Test 4.4: Automated Call Execution - Scheduler Service
**Test Steps:**
1. Schedule call for 2 minutes from now
2. Wait for scheduled time
3. Monitor system logs and database

**Success Criteria:**
- ✅ Scheduler detects overdue task within 30 seconds
- ✅ Call initiated automatically at scheduled time
- ✅ Business hours validated before call
- ✅ Call reservation created and released properly
- ✅ Follow-up task marked as completed

### Test 4.5: Call Execution - Timezone Handling
**Test Steps:**
1. Set tenant timezone to "Europe/London"
2. Schedule call for 2:00 PM local time
3. Verify call triggers at correct UTC time

**Success Criteria:**
- ✅ Timezone conversion accurate
- ✅ Call triggers at correct local time
- ✅ Daylight saving time handled correctly
- ✅ Logs show both UTC and local time

### Test 4.6: Follow-up Call Automation
**Test Steps:**
1. Configure contact with "no-answer" follow-up rule
2. Initiate call that goes unanswered
3. Wait for follow-up trigger

**Success Criteria:**
- ✅ Follow-up task created automatically
- ✅ Follow-up scheduled per business rules (e.g., 90 minutes later)
- ✅ Follow-up respects business hours
- ✅ Maximum retry limit enforced
- ✅ Contact notified appropriately

### Test 4.7: Call Cancellation
**Test Steps:**
1. Schedule future call
2. Cancel the scheduled call before execution

**Success Criteria:**
- ✅ Call cancelled successfully
- ✅ Follow-up task deleted/marked cancelled
- ✅ Call reservation released
- ✅ No call attempt made at scheduled time

### Test 4.8: Concurrent Call Handling
**Test Steps:**
1. Schedule 5 calls for the same exact time
2. Wait for execution time

**Success Criteria:**
- ✅ All calls initiated successfully
- ✅ No race conditions or conflicts
- ✅ Each call gets unique reservation
- ✅ System performance remains stable
- ✅ All calls tracked separately

---

## 5. Retell AI Voice Integration

### Test 5.1: Retell Call Creation - Basic
**Test Steps:**
1. Initiate call to valid phone number
2. Monitor Retell API request
3. Verify call created in Retell dashboard

**Success Criteria:**
- ✅ API request successful (201 or 200 response)
- ✅ Call ID returned from Retell
- ✅ Phone number in E.164 format
- ✅ Agent ID correctly configured
- ✅ Call appears in Retell dashboard

### Test 5.2: Retell Call - Personalization Variables
**Test Steps:**
1. Create contact with appointment details
2. Initiate call
3. Check variables sent to Retell

**Success Criteria:**
- ✅ All required variables included (first_name, last_name, etc.)
- ✅ Business-specific variables populated (appointment_type, location)
- ✅ Special instructions included if present
- ✅ Variables match contact data exactly
- ✅ Clara-compatible format used

### Test 5.3: Retell Call - HIPAA Compliance (Medical Tenants)
**Test Steps:**
1. Login to Medical/HIPAA tenant
2. Initiate call
3. Verify metadata sent to Retell

**Success Criteria:**
- ✅ HIPAA-compliant metadata only
- ✅ No PII in logs or metadata
- ✅ Proper consent verification
- ✅ Audit trail created
- ✅ Data handling per HIPAA requirements

### Test 5.4: Retell Webhook - Call Started
**Test Steps:**
1. Initiate call
2. Monitor webhook endpoint
3. Verify "call_started" webhook received

**Success Criteria:**
- ✅ Webhook received within seconds
- ✅ HMAC signature verified
- ✅ Tenant context extracted from metadata
- ✅ Call status updated to "in_progress"
- ✅ Webhook logged for audit

### Test 5.5: Retell Webhook - Call Ended
**Test Steps:**
1. Complete a call
2. Monitor webhook endpoint
3. Verify "call_ended" webhook received

**Success Criteria:**
- ✅ Webhook received with call results
- ✅ Call status updated to "completed"
- ✅ Call duration recorded
- ✅ Transcript saved (if enabled)
- ✅ Call analytics updated

### Test 5.6: Retell Webhook - Call Failed
**Test Steps:**
1. Initiate call to invalid number
2. Monitor webhook endpoint
3. Verify error handling

**Success Criteria:**
- ✅ Error webhook received
- ✅ Call status updated to "failed"
- ✅ Error reason logged
- ✅ Call reservation released
- ✅ Follow-up scheduled per error rules

### Test 5.7: Pre-Dial Phone Validation
**Test Steps:**
1. Modify contact phone to add Unicode characters
2. Try to initiate call
3. Observe validation

**Success Criteria:**
- ✅ Phone re-normalized before Retell API call
- ✅ Unicode stripped automatically
- ✅ E.164 validation passed
- ✅ Call proceeds with clean number
- ✅ No API rejection due to format

---

## 6. Calendar Integration

### Test 6.1: Cal.com Integration - Connection
**Test Steps:**
1. Login as Client Admin
2. Navigate to Integrations
3. Connect Cal.com account
4. Enter API key

**Success Criteria:**
- ✅ Connection established successfully
- ✅ API key validated
- ✅ Connection status shows "Connected"
- ✅ Available calendars listed
- ✅ Integration settings saved

### Test 6.2: Cal.com - Appointment Sync
**Test Steps:**
1. Create appointment in Cal.com
2. Wait for sync (or trigger manually)
3. Check VioConcierge contacts

**Success Criteria:**
- ✅ Appointment synced to VioConcierge
- ✅ Contact created/updated with appointment details
- ✅ Appointment time correctly converted to tenant timezone
- ✅ Reminder call automatically scheduled
- ✅ Sync status shows "Success"

### Test 6.3: Calendly Integration - Connection
**Test Steps:**
1. Navigate to Integrations
2. Connect Calendly account
3. Authorize OAuth connection

**Success Criteria:**
- ✅ OAuth flow completes successfully
- ✅ Calendly account linked
- ✅ Event types visible
- ✅ Connection status shows "Connected"
- ✅ Webhook configured automatically

### Test 6.4: Calendly - Appointment Sync
**Test Steps:**
1. Book appointment via Calendly
2. Wait for webhook trigger
3. Check VioConcierge contacts

**Success Criteria:**
- ✅ Webhook received from Calendly
- ✅ Appointment data parsed correctly
- ✅ Contact created with appointment details
- ✅ Reminder call scheduled automatically
- ✅ Timezone handling accurate

### Test 6.5: Calendar Sync - Cancellation Handling
**Test Steps:**
1. Create appointment in connected calendar
2. Wait for sync to VioConcierge
3. Cancel appointment in calendar
4. Wait for cancellation sync

**Success Criteria:**
- ✅ Cancellation detected
- ✅ Scheduled call cancelled in VioConcierge
- ✅ Contact status updated
- ✅ No call attempt made for cancelled appointment
- ✅ Audit trail shows cancellation

### Test 6.6: Calendar Sync - Rescheduling
**Test Steps:**
1. Create appointment in calendar
2. Reschedule to different time
3. Wait for sync

**Success Criteria:**
- ✅ Reschedule detected
- ✅ Old call cancelled
- ✅ New call scheduled at new time
- ✅ Contact appointment details updated
- ✅ Only one active call scheduled

---

## 7. Security & Phone Normalization

### Test 7.1: Phone Normalization - Unicode Attack Prevention
**Test Steps:**
1. Copy this phone with hidden Unicode: "‪+447432223007‬"
2. Create contact with this phone
3. Verify normalization
4. Initiate call

**Success Criteria:**
- ✅ Unicode bidirectional controls stripped
- ✅ Phone normalized to: +447432223007
- ✅ normalized_phone field populated correctly
- ✅ Call succeeds without API error
- ✅ Warning logged about Unicode removal

### Test 7.2: Phone Normalization - Format Variations
**Test Steps:**
1. Test these phone formats:
   - "+1 555 0100" (spaces)
   - "+1-555-0101" (dashes)
   - "(555) 555-0102" (parentheses)
   - "+1.555.0103" (periods)

**Success Criteria:**
- ✅ All formats accepted
- ✅ All normalized to E.164: +15550100, +15550101, etc.
- ✅ normalized_phone consistent
- ✅ Original phone preserved
- ✅ All callable via Retell

### Test 7.3: Abuse Protection - Rate Limiting by Phone
**Test Steps:**
1. Select same contact
2. Initiate 10 calls within 1 minute
3. Observe system response

**Success Criteria:**
- ✅ Rate limit enforced after threshold (e.g., 3 calls/hour)
- ✅ Error message: "Rate limit exceeded for this phone number"
- ✅ Rate limit uses normalized_phone (not original)
- ✅ Different Unicode variants of same number blocked
- ✅ Rate limit resets after cooldown

### Test 7.4: Abuse Protection - Duplicate Call Prevention
**Test Steps:**
1. Schedule call for specific time
2. Try to schedule another call for same contact at same time

**Success Criteria:**
- ✅ Duplicate detection works
- ✅ Warning or error displayed
- ✅ Detection uses normalized phone number
- ✅ Same phone in different formats detected as duplicate
- ✅ User can override if needed (with confirmation)

### Test 7.5: Input Validation - XSS Prevention
**Test Steps:**
1. Create contact with name: `<script>alert('XSS')</script>`
2. Create contact with notes: `<img src=x onerror=alert(1)>`
3. View contact details

**Success Criteria:**
- ✅ Script tags escaped/sanitized
- ✅ No JavaScript execution
- ✅ Content displayed safely as text
- ✅ HTML entities encoded properly
- ✅ No XSS vulnerability

### Test 7.6: Input Validation - SQL Injection Prevention
**Test Steps:**
1. Create contact with name: `'; DROP TABLE contacts; --`
2. Search contacts with: `' OR '1'='1`

**Success Criteria:**
- ✅ Input properly escaped
- ✅ No SQL injection possible
- ✅ Parameterized queries used
- ✅ Database tables intact
- ✅ Error logged (if malicious pattern detected)

### Test 7.7: Session Security
**Test Steps:**
1. Login and get session token
2. Try to reuse old/expired token
3. Try to modify token
4. Test token on different IP

**Success Criteria:**
- ✅ Expired tokens rejected
- ✅ Modified tokens invalid
- ✅ JWT signature verification works
- ✅ Session tied to user correctly
- ✅ Secure token storage (HttpOnly if using cookies)

---

## 8. GDPR Compliance

### Test 8.1: Data Export - User Request
**Test Steps:**
1. Login as Client Admin
2. Navigate to GDPR Tools
3. Request data export for specific contact
4. Download export file

**Success Criteria:**
- ✅ Export initiated successfully
- ✅ All contact data included (PII, call history, etc.)
- ✅ Export in machine-readable format (JSON/CSV)
- ✅ Download completes successfully
- ✅ Audit trail logged with timestamp and requester

### Test 8.2: Data Deletion - Right to be Forgotten
**Test Steps:**
1. Navigate to GDPR Tools
2. Request deletion for specific contact
3. Confirm deletion request
4. Verify data removal

**Success Criteria:**
- ✅ Deletion request confirmed with warning
- ✅ Contact PII removed/anonymized
- ✅ Call history preserved (anonymized)
- ✅ Audit trail shows deletion request
- ✅ Cannot recover deleted data
- ✅ Deletion completes within required timeframe

### Test 8.3: Consent Management
**Test Steps:**
1. Create contact without consent
2. Attempt to initiate call
3. Mark consent as given
4. Retry call

**Success Criteria:**
- ✅ Call blocked without consent
- ✅ Clear error: "Consent required"
- ✅ Consent status clearly displayed
- ✅ Call proceeds after consent marked
- ✅ Consent timestamp recorded

### Test 8.4: Data Access Audit Trail
**Test Steps:**
1. View contact details
2. Edit contact
3. Export contact data
4. View audit trail for that contact

**Success Criteria:**
- ✅ All actions logged with timestamp
- ✅ User who performed action recorded
- ✅ IP address logged
- ✅ Action type clear (view, edit, export, delete)
- ✅ Audit trail immutable
- ✅ Audit trail retained per legal requirements

### Test 8.5: Data Retention Policy
**Test Steps:**
1. Check system for contacts older than retention period
2. Verify automated cleanup process

**Success Criteria:**
- ✅ Retention policy configured
- ✅ Old data flagged for review/deletion
- ✅ Automated cleanup runs on schedule
- ✅ Legal hold prevents deletion when needed
- ✅ Deletion notifications sent to admins

### Test 8.6: Privacy Policy Display
**Test Steps:**
1. Navigate to privacy policy link
2. Verify content
3. Check for updates notification

**Success Criteria:**
- ✅ Privacy policy accessible
- ✅ Current version displayed
- ✅ Last updated date shown
- ✅ Users notified of policy changes
- ✅ Acceptance tracked for compliance

---

## 9. Business Configuration

### Test 9.1: Business Hours - Standard Setup
**Test Steps:**
1. Navigate to Business Settings
2. Set hours: Mon-Fri 9:00 AM - 5:00 PM
3. Set timezone: "America/New_York"
4. Save configuration

**Success Criteria:**
- ✅ Hours saved successfully
- ✅ Timezone saved correctly
- ✅ Configuration persists after logout
- ✅ Hours display correctly in UI
- ✅ Call scheduling respects these hours

### Test 9.2: Business Hours - Custom Schedule
**Test Steps:**
1. Set different hours per day:
   - Monday: 8AM-6PM
   - Tuesday: 9AM-5PM
   - Wednesday: CLOSED
   - Thursday: 10AM-8PM
   - Friday: 9AM-3PM
   - Weekend: CLOSED

**Success Criteria:**
- ✅ Custom schedule saved
- ✅ Each day configurable independently
- ✅ Closed days marked clearly
- ✅ Call scheduling validates against correct day
- ✅ No calls scheduled on closed days

### Test 9.3: Location Management - Multiple Locations
**Test Steps:**
1. Add Location 1: "Main Office" with address and hours
2. Add Location 2: "Branch Office" with different hours
3. Assign contacts to different locations

**Success Criteria:**
- ✅ Multiple locations supported
- ✅ Each location has own hours
- ✅ Contacts assigned to locations
- ✅ Call scheduling uses location-specific hours
- ✅ Location info included in call variables

### Test 9.4: Custom Branding - Logo & Colors
**Test Steps:**
1. Navigate to Branding Settings
2. Upload company logo
3. Set custom colors
4. Preview changes

**Success Criteria:**
- ✅ Logo uploaded successfully
- ✅ Logo displays in UI
- ✅ Custom colors applied throughout app
- ✅ Branding consistent across all pages
- ✅ Settings saved per tenant

### Test 9.5: Feature Toggles - Premium Features
**Test Steps:**
1. Login as Super Admin
2. View tenant feature settings
3. Enable/disable premium features (e.g., API access, priority support)
4. Login as Client Admin and verify access

**Success Criteria:**
- ✅ Features can be toggled on/off
- ✅ UI updates based on enabled features
- ✅ Disabled features not accessible
- ✅ Premium features require proper tier
- ✅ Feature changes apply immediately

### Test 9.6: Notification Settings
**Test Steps:**
1. Navigate to Notification Settings
2. Configure email notifications for:
   - Call completed
   - Call failed
   - Daily summary
3. Set notification preferences

**Success Criteria:**
- ✅ Notification preferences saved
- ✅ Emails sent per configuration
- ✅ Email content includes relevant details
- ✅ Can disable specific notification types
- ✅ Notification frequency respected

---

## 10. Observability & Monitoring

### Test 10.1: Call Logs - View History
**Test Steps:**
1. Navigate to Call Logs
2. View recent calls
3. Filter by date range
4. Search by contact name

**Success Criteria:**
- ✅ All calls displayed with details
- ✅ Call status shown (completed, failed, in-progress)
- ✅ Filters work correctly
- ✅ Search returns accurate results
- ✅ Pagination works for large datasets

### Test 10.2: Call Analytics - Dashboard Metrics
**Test Steps:**
1. Navigate to Analytics Dashboard
2. View call statistics
3. Check success rate metrics
4. Review trends over time

**Success Criteria:**
- ✅ Total calls count accurate
- ✅ Success rate calculated correctly
- ✅ Failed calls clearly identified
- ✅ Charts/graphs display trends
- ✅ Data updates in real-time (or near real-time)

### Test 10.3: System Health - SLA Monitoring
**Test Steps:**
1. Navigate to System Health dashboard
2. View SLA thresholds
3. Check current performance against SLAs

**Success Criteria:**
- ✅ SLA thresholds configured
- ✅ Current performance displayed
- ✅ Alerts triggered when SLA breached
- ✅ Historical SLA performance tracked
- ✅ Color-coded status indicators (green/yellow/red)

### Test 10.4: Error Logging & Alerts
**Test Steps:**
1. Trigger an error (e.g., call to invalid number)
2. Check error logs
3. Verify alert notification

**Success Criteria:**
- ✅ Error logged with full details
- ✅ Stack trace captured (if applicable)
- ✅ Alert sent to configured recipients
- ✅ Error categorized correctly
- ✅ Error count tracked in metrics

### Test 10.5: Call Reservation Monitoring
**Test Steps:**
1. Initiate call
2. Check active reservations
3. Complete call
4. Verify reservation released

**Success Criteria:**
- ✅ Reservation created on call start
- ✅ Reservation shows in active list
- ✅ Reservation released after call ends
- ✅ TTL cleanup removes expired reservations
- ✅ No reservation leaks

### Test 10.6: Performance Monitoring
**Test Steps:**
1. Monitor system during peak usage
2. Check response times
3. Review database query performance

**Success Criteria:**
- ✅ API response times under threshold (<500ms)
- ✅ Database queries optimized
- ✅ No memory leaks
- ✅ CPU usage reasonable
- ✅ System stable under load

---

## 11. User Interface & Experience

### Test 11.1: Dashboard - Super Admin View
**Test Steps:**
1. Login as Super Admin
2. View dashboard
3. Navigate through all sections

**Success Criteria:**
- ✅ All tenants visible in list
- ✅ Platform-wide metrics displayed
- ✅ Tenant management tools accessible
- ✅ System health overview shown
- ✅ Navigation smooth and intuitive

### Test 11.2: Dashboard - Client Admin View
**Test Steps:**
1. Login as Client Admin
2. View business dashboard
3. Check KPIs and metrics

**Success Criteria:**
- ✅ Only own tenant data visible
- ✅ Call stats displayed (total, success rate, etc.)
- ✅ Contact count shown
- ✅ Recent activity listed
- ✅ Quick actions accessible

### Test 11.3: Dashboard - Client User (Read-Only) View
**Test Steps:**
1. Login as Client User
2. View read-only dashboard
3. Attempt to access edit functions

**Success Criteria:**
- ✅ Dashboard displays data correctly
- ✅ No create/edit/delete buttons visible
- ✅ Attempting direct URL access blocked
- ✅ Clear indication of read-only status
- ✅ Can view but not modify data

### Test 11.4: Responsive Design - Mobile View
**Test Steps:**
1. Access app on mobile device or resize browser
2. Test all main features on small screen

**Success Criteria:**
- ✅ Layout adapts to small screen
- ✅ All features accessible on mobile
- ✅ Touch targets appropriately sized
- ✅ Navigation menu works on mobile
- ✅ Forms usable on mobile

### Test 11.5: Dark Mode (if implemented)
**Test Steps:**
1. Toggle dark mode
2. Navigate through app
3. Verify all components

**Success Criteria:**
- ✅ Dark mode applies to all pages
- ✅ Text readable in dark mode
- ✅ Colors appropriately adjusted
- ✅ Preference persists after logout
- ✅ No visual glitches

### Test 11.6: Loading States & Error Handling
**Test Steps:**
1. Navigate to page with slow data load
2. Trigger various errors
3. Observe loading and error states

**Success Criteria:**
- ✅ Loading indicators shown during data fetch
- ✅ Skeleton screens or spinners displayed
- ✅ Error messages clear and helpful
- ✅ Retry options available on errors
- ✅ No blank screens or hangs

### Test 11.7: Form Validation - User Feedback
**Test Steps:**
1. Fill form with invalid data
2. Submit form
3. Observe validation messages

**Success Criteria:**
- ✅ Inline validation on field blur
- ✅ Clear error messages
- ✅ Error messages next to relevant fields
- ✅ Form highlights invalid fields
- ✅ Success confirmation after valid submission

---

## 12. Data Integrity & Isolation

### Test 12.1: Cross-Tenant Data Isolation - API Level
**Test Steps:**
1. Login as Tenant A admin (capture JWT token)
2. Try to access Tenant B contact via API using Tenant A token
3. Attempt direct API call with modified tenant_id

**Success Criteria:**
- ✅ Access denied with 403 Forbidden
- ✅ No data from other tenants returned
- ✅ Security error logged
- ✅ Token validation enforces tenant boundary
- ✅ Database queries always filter by tenant_id

### Test 12.2: Data Migration Validation - Phone Normalization
**Test Steps:**
1. Check all existing contacts
2. Verify normalized_phone field populated
3. Confirm no Unicode contamination remains

**Success Criteria:**
- ✅ All contacts have normalized_phone
- ✅ All normalized phones in E.164 format
- ✅ Original phone preserved for reference
- ✅ Unicode issues fixed in existing data
- ✅ Migration script completed successfully

### Test 12.3: Database Integrity - Foreign Keys
**Test Steps:**
1. Try to delete tenant with active contacts
2. Try to delete contact with scheduled calls
3. Verify referential integrity

**Success Criteria:**
- ✅ Cannot delete tenant with active data (or cascade properly)
- ✅ Foreign key constraints enforced
- ✅ Orphaned records prevented
- ✅ Clear error messages on constraint violations
- ✅ Data consistency maintained

### Test 12.4: Concurrent Updates - Race Conditions
**Test Steps:**
1. Open same contact in two browser tabs
2. Edit in both tabs simultaneously
3. Save both updates

**Success Criteria:**
- ✅ Last write wins or conflict detected
- ✅ No data corruption
- ✅ User notified of concurrent edit
- ✅ Optimistic locking works (if implemented)
- ✅ Data integrity maintained

### Test 12.5: Backup & Recovery (if applicable)
**Test Steps:**
1. Trigger database backup
2. Simulate data loss
3. Restore from backup

**Success Criteria:**
- ✅ Backup completes successfully
- ✅ Backup includes all tenant data
- ✅ Restore process works correctly
- ✅ No data loss during restore
- ✅ Point-in-time recovery available

---

## Final Pre-Launch Checklist

### Critical Production Readiness

- [ ] All test sections completed with passing results
- [ ] No critical or high-severity bugs remain
- [ ] Security vulnerabilities addressed
- [ ] Phone normalization working correctly (no Unicode issues)
- [ ] Multi-tenant isolation verified
- [ ] GDPR compliance confirmed
- [ ] Retell AI integration stable
- [ ] Calendar sync working reliably
- [ ] Performance acceptable under expected load
- [ ] Monitoring and alerts configured
- [ ] Backup and recovery tested
- [ ] Documentation up to date
- [ ] Support team trained
- [ ] Incident response plan in place

### Environment Configuration

- [ ] Production environment provisioned
- [ ] Environment variables configured
- [ ] Secrets properly managed (not hardcoded)
- [ ] Database migrations tested
- [ ] SSL/TLS certificates valid
- [ ] Domain configured correctly
- [ ] CDN/caching configured (if applicable)

### Third-Party Integrations

- [ ] Retell API key valid and tested
- [ ] Cal.com integration tested in production
- [ ] Calendly integration tested in production
- [ ] Email service configured (SendGrid, etc.)
- [ ] SMS service configured (if applicable)
- [ ] Payment gateway tested (if applicable)

### Legal & Compliance

- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] GDPR compliance verified
- [ ] Data retention policy implemented
- [ ] Cookie consent implemented (if EU users)
- [ ] HIPAA compliance verified (for medical tenants)

### Operational Readiness

- [ ] Monitoring dashboards configured
- [ ] Alerting rules defined and tested
- [ ] On-call rotation established
- [ ] Runbooks created for common issues
- [ ] Customer support processes defined
- [ ] Escalation procedures documented

---

## Notes for Testing

**Testing Tips:**
1. **Use Fresh Data**: Create new test tenants/contacts for each major test scenario
2. **Document Issues**: Keep detailed notes of any failures or unexpected behavior
3. **Test Edge Cases**: Don't just test the happy path - try to break things
4. **Performance Testing**: Test with realistic data volumes (hundreds/thousands of contacts)
5. **Browser Testing**: Test on Chrome, Firefox, Safari, and Edge
6. **Mobile Testing**: Test on both iOS and Android devices

**Priority Levels:**
- **P0 (Critical)**: Must be fixed before launch - blocks core functionality
- **P1 (High)**: Should be fixed before launch - impacts user experience
- **P2 (Medium)**: Can be fixed post-launch - minor issues
- **P3 (Low)**: Nice to have - cosmetic or edge cases

**Issue Tracking:**
- Record all failed tests with screenshots
- Note exact steps to reproduce
- Document expected vs. actual behavior
- Assign priority level
- Track fix verification

---

**Document Version:** 1.0  
**Last Updated:** September 29, 2025  
**Next Review:** Before production launch