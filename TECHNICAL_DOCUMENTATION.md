# VioConcierge - Technical Documentation for Developers

**Last Updated:** October 20, 2025  
**Version:** 1.0  
**Purpose:** Complete technical reference for developers maintaining and debugging the VioConcierge platform

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Database Schema Deep Dive](#2-database-schema-deep-dive)
3. [Call Workflow System (CRITICAL)](#3-call-workflow-system-critical)
4. [Hybrid Webhook + Polling System (CRITICAL)](#4-hybrid-webhook--polling-system-critical)
5. [API Architecture](#5-api-architecture)
6. [Frontend Data Flow](#6-frontend-data-flow)
7. [Multi-Tenancy Implementation](#7-multi-tenancy-implementation)
8. [Authentication & Authorization](#8-authentication--authorization)
9. [Daily Email Summary System](#9-daily-email-summary-system)
10. [Calendar Integration](#10-calendar-integration)
11. [Common Debugging Scenarios](#11-common-debugging-scenarios)
12. [Critical Configuration](#12-critical-configuration)
13. [Code Conventions](#13-code-conventions)

---

## 1. System Architecture Overview

### Tech Stack

**Frontend:**
- React 18 with TypeScript
- Vite (dev server + build tool)
- Wouter (routing)
- TanStack Query v5 (data fetching, caching, auto-refresh)
- shadcn/ui + Radix UI (component library)
- Tailwind CSS (styling)
- React Hook Form + Zod (forms & validation)

**Backend:**
- Node.js with TypeScript
- Express.js (REST API)
- Drizzle ORM (database interactions)
- PostgreSQL (Neon serverless)
- JWT (authentication)
- Background workers (call polling, follow-up scheduling)

**External Services:**
- Retell AI (voice agent calls)
- Resend (email delivery)
- Cal.com & Calendly (calendar integrations)

### Directory Structure

```
vioconcierge/
├── client/src/                 # Frontend React application
│   ├── components/             # Reusable UI components
│   │   ├── modals/            # Modal dialogs
│   │   └── ui/                # shadcn UI components
│   ├── pages/                 # Route pages
│   ├── hooks/                 # React hooks
│   └── lib/                   # Utilities
├── server/                    # Backend Express application
│   ├── index.ts              # Server entry point
│   ├── routes.ts             # API route definitions
│   ├── storage.ts            # Database abstraction layer
│   └── services/             # Business logic services
│       ├── retell.ts         # Retell AI integration
│       ├── call-scheduler.ts # Follow-up call scheduling
│       ├── call-polling-service.ts # Webhook fallback polling
│       ├── daily-summary-service.ts # Email summaries
│       ├── cal-com.ts        # Cal.com integration
│       └── calendly.ts       # Calendly integration
├── shared/                   # Code shared between frontend/backend
│   └── schema.ts            # Database schema (Drizzle)
└── drizzle.config.ts        # Database configuration
```

### Key Design Patterns

1. **Schema-First Development**: All data models defined in `shared/schema.ts` with Zod schemas derived from Drizzle tables
2. **Storage Abstraction**: All database operations go through `server/storage.ts` interface
3. **Service Layer**: Business logic isolated in `server/services/` for maintainability
4. **React Query Caching**: Frontend uses aggressive caching with auto-refresh intervals (5-10 seconds)
5. **Multi-Tenancy**: Every query filtered by `tenantId` at storage layer

---

## 2. Database Schema Deep Dive

### Core Tables

#### `users`
**Purpose**: Store user accounts with role-based access control

| Column | Type | Description | Notes |
|--------|------|-------------|-------|
| `id` | serial | Primary key | Auto-increment |
| `email` | varchar | User email | Unique within tenant |
| `password` | varchar | Bcrypt hashed password | Never return to frontend |
| `fullName` | varchar | Display name | Used in UI |
| `role` | varchar | Access level | `super_admin`, `client_admin`, `client_user` |
| `tenantId` | integer | Tenant association | Foreign key to `tenants.id` |
| `isActive` | boolean | Account status | Deactivated users can't login |
| `createdAt` | timestamp | Account creation | For audit trails |

**Indexes**: `(email, tenantId)` for login queries

**Debugging**: If user can't login, check `isActive` and `tenantId` match

---

#### `tenants`
**Purpose**: Multi-tenant isolation - each client organization

| Column | Type | Description | Notes |
|--------|------|-------------|-------|
| `id` | serial | Primary key | Auto-increment |
| `name` | varchar | Organization name | Display in UI |
| `retellApiKey` | varchar | Retell AI API key | **CRITICAL for webhooks** |
| `retellAgentId` | varchar | AI agent config | Must exist in Retell dashboard |
| `retellWebhookSecret` | varchar | HMAC signature key | Used for webhook verification |
| `calendarType` | varchar | Integration type | `cal_com`, `calendly`, or null |
| `calComApiKey` | varchar | Cal.com auth | Optional |
| `calendlyToken` | varchar | Calendly auth | Optional |
| `businessTemplate` | varchar | Business category | `medical`, `salon`, etc. |
| `dailySummaryEnabled` | boolean | Email feature flag | Default: false |
| `dailySummaryRecipientEmail` | varchar | Who receives emails | **Tenant-level config** |
| `dailySummaryRecipientName` | varchar | Display name | For email personalization |
| `dailySummaryTime` | varchar | Delivery time (HH:MM) | Timezone-aware |
| `dailySummaryTimezone` | varchar | User's timezone | IANA format |
| `dailySummaryDays` | text[] | Delivery days | Array: `['Mon', 'Tue', ...]` |
| `lastDailySummarySentAt` | timestamp | Duplicate prevention | Prevents multiple sends |

**Critical Fields for Debugging:**
- `retellApiKey`: If calls fail, verify this matches Retell dashboard
- `retellWebhookSecret`: If webhook signature fails, check this
- `dailySummaryDays`: If emails not sending, check this isn't empty array

---

#### `contacts`
**Purpose**: Customer appointment records with call tracking

| Column | Type | Description | Notes |
|--------|------|-------------|-------|
| `id` | serial | Primary key | Auto-increment |
| `tenantId` | integer | Tenant isolation | **Always filter by this** |
| `name` | varchar | Contact name | Required |
| `phone` | varchar | E.164 format | `+14155551234` |
| `appointmentDate` | date | Appointment day | YYYY-MM-DD |
| `appointmentTime` | timestamp | Full datetime | **Used for call scheduling** |
| `appointmentStatus` | varchar | Confirmed/pending/etc | Updated by call outcomes |
| `appointmentType` | varchar | Service type | Optional metadata |
| `lastCallOutcome` | varchar | Most recent result | `voicemail`, `no_answer`, `confirmed`, etc. |
| `callAttempts` | integer | Total call count | Increments on each call |
| `specialInstructions` | text | Custom notes | Passed to AI agent |

**Status Flow:**
1. Initial: `appointmentStatus = 'pending'`, `lastCallOutcome = null`
2. After call: `lastCallOutcome` updates (e.g., `'voicemail'`)
3. On confirmation: `appointmentStatus = 'confirmed'`

**Debugging**: If status not updating, check `call_sessions` table for matching `contactId`

---

#### `call_sessions`
**Purpose**: Track individual call attempts and outcomes

| Column | Type | Description | Notes |
|--------|------|-------------|-------|
| `id` | varchar | Primary key | UUID or Retell call ID |
| `tenantId` | integer | Tenant isolation | **Always filter** |
| `contactId` | integer | Contact reference | Foreign key to `contacts.id` |
| `retellCallId` | varchar | Retell platform ID | **Used for webhook matching** |
| `status` | varchar | Call state | `queued`, `ongoing`, `completed`, `failed` |
| `outcome` | varchar | Call result | **CRITICAL** - see outcome types below |
| `callType` | varchar | Trigger type | `manual`, `scheduled`, `follow_up` |
| `createdAt` | timestamp | Call initiated | For timeline tracking |
| `endedAt` | timestamp | Call finished | For duration calculation |
| `duration` | integer | Call length (seconds) | From Retell |
| `recordingUrl` | varchar | Audio file | Optional |
| `transcript` | text | Call transcript | From Retell analysis |
| `pollAttempts` | integer | Polling retries | For fallback system |
| `nextPollAt` | timestamp | Next poll time | Exponential backoff |
| `webhookVerified` | boolean | Webhook received | Tracks dual delivery |
| `sourceOfTruth` | varchar | Data origin | `webhook` or `poll` |
| `payloadWebhookLast` | jsonb | Raw webhook data | For debugging |
| `payloadPollLast` | jsonb | Raw poll data | For debugging |

**Outcome Types** (in precedence order, strongest first):
1. `rescheduled` - Customer changed appointment
2. `cancelled` - Customer cancelled
3. `confirmed` - **PRIMARY SUCCESS** - Appointment confirmed
4. `voicemail` - Message left
5. `no_answer` - Contact didn't pick up
6. `busy` - Line was busy
7. `answered` - Call connected but no clear action
8. `failed` - Call failed to connect
9. `unknown` - No data available

**Precedence Logic**: A `confirmed` outcome can never be downgraded to `voicemail` even if webhook arrives late

**Debugging**:
- If outcome not updating: Check `retellCallId` matches webhook payload
- If duplicate calls: Check `call_tasks` for pending duplicates
- If status stuck in `ongoing`: Check polling service logs

---

#### `call_tasks`
**Purpose**: Schedule future calls (initial reminders and follow-ups)

| Column | Type | Description | Notes |
|--------|------|-------------|-------|
| `id` | varchar | Primary key | UUID |
| `tenantId` | integer | Tenant isolation | **Always filter** |
| `contactId` | integer | Contact reference | Foreign key |
| `taskType` | varchar | Call reason | `initial_reminder`, `follow_up` |
| `status` | varchar | Execution state | `pending`, `processing`, `completed`, `failed` |
| `scheduledFor` | timestamp | When to execute | **Used by scheduler** |
| `retellCallId` | varchar | Result call ID | Set after execution |
| `lastAttemptAt` | timestamp | Last execution try | For retry logic |
| `attempts` | integer | Retry count | Max 3 usually |
| `createdAt` | timestamp | Task created | For audit |

**Task Lifecycle:**
1. Created: `status = 'pending'`, `scheduledFor` = appointment time - 24h
2. Scheduler picks up: `status = 'processing'`
3. Call made: `status = 'completed'`, `retellCallId` populated
4. If failed: `status = 'failed'`, can retry

**Follow-up Logic**:
- When initial call has outcome `no_answer`, `voicemail`, `busy`, or `failed`
- System creates new task: `taskType = 'follow_up'`, `scheduledFor` = now + 90 minutes
- Prevents duplicates: Checks for existing `pending` follow-up tasks first

**Debugging**:
- If calls not happening: Query `WHERE status = 'pending' AND scheduledFor <= NOW()`
- If duplicate follow-ups: Check unique constraint on `(contactId, taskType, status)`

---

#### `retell_events`
**Purpose**: Idempotent webhook event storage with deduplication

| Column | Type | Description | Notes |
|--------|------|-------------|-------|
| `id` | serial | Primary key | Auto-increment |
| `tenantId` | integer | Tenant isolation | **From call session lookup** |
| `callId` | varchar | Retell call ID | Groups events |
| `eventType` | varchar | Event name | `call_started`, `call_ended`, `call_analyzed` |
| `digest` | varchar | SHA256 hash | **Deduplication key** |
| `payload` | jsonb | Raw event data | Full webhook body |
| `processedAt` | timestamp | When handled | For audit |
| `createdAt` | timestamp | Event received | For ordering |

**Unique Constraint**: `(callId, eventType, digest)` prevents duplicate processing

**Event Types:**
- `call_started`: Call initiated
- `call_ended`: Call finished (terminal state)
- `call_analyzed`: AI analysis complete (has outcome data)

**Deduplication**:
- Digest = SHA256(JSON.stringify(payload))
- If same event arrives twice, INSERT fails gracefully
- Prevents race conditions from duplicate webhooks

**Debugging**:
- If events missing: Check webhook signature verification
- If duplicates processed: Check unique constraint exists
- If outcomes wrong: Compare `payload` to `call_sessions.outcome`

---

#### `tenant_config`
**Purpose**: Extended tenant settings (business hours, features, prompts)

| Column | Type | Description | Notes |
|--------|------|-------------|-------|
| `id` | serial | Primary key | Auto-increment |
| `tenantId` | integer | One-to-one with tenant | Foreign key |
| `businessType` | varchar | Same as template | Synced with `tenants.businessTemplate` |
| `businessHours` | jsonb | Operating hours | `{Mon: {open: "09:00", close: "17:00"}}` |
| `publicTransportInstructions` | text | Travel directions | For AI voice agent |
| `parkingInstructions` | text | Parking info | For AI voice agent |
| `arrivalNotes` | text | General instructions | For AI voice agent |
| `voiceAgentPrompt` | text | Custom prompt | Overrides default |
| `features` | jsonb | Feature flags | Premium, HIPAA, etc. |

**Critical for Calls**:
- `publicTransportInstructions`, `parkingInstructions`, `arrivalNotes`: Passed to AI agent during calls
- If agent not mentioning directions, check these fields

---

### Relationships

```
tenants (1) ─────< (many) users
tenants (1) ─────< (many) contacts
tenants (1) ─────< (many) call_sessions
tenants (1) ─────< (many) call_tasks
tenants (1) ───── (1) tenant_config

contacts (1) ─────< (many) call_sessions
contacts (1) ─────< (many) call_tasks
```

### Indexes for Performance

```sql
CREATE INDEX idx_contacts_tenant ON contacts(tenant_id);
CREATE INDEX idx_call_sessions_tenant_contact ON call_sessions(tenant_id, contact_id);
CREATE INDEX idx_call_tasks_scheduled ON call_tasks(scheduled_for, status);
CREATE INDEX idx_retell_events_call ON retell_events(call_id, event_type);
```

---

## 3. Call Workflow System (CRITICAL)

### Overview

VioConcierge supports **3 types of calls**:

1. **Initial Reminder Calls**: Automatically scheduled 24 hours before appointment (default)
2. **Follow-up Calls**: Automatically scheduled 90 minutes after missed calls
3. **Manual "Call Now" Calls**: Client-initiated immediate calls

All calls go through the same execution pipeline but are triggered differently.

---

### Manual "Call Now" Flow (Step-by-Step)

**User Action**: Client clicks "Call Now" button on contact

**Frontend** (`client/src/pages/contacts.tsx`):
```typescript
// 1. User clicks "Call Now" button
<button onClick={() => handleCallNow(contact)}>
  <Phone />
</button>

// 2. Opens CallNowModal
const handleCallNow = (contact) => {
  setSelectedContact(contact);
  setIsCallModalOpen(true);
};

// 3. Modal confirms and triggers API call
// In CallNowModal component:
const mutation = useMutation({
  mutationFn: () => apiRequest('/api/calls/manual', {
    method: 'POST',
    body: { contactId: contact.id }
  }),
  onSuccess: () => {
    toast({ title: "Call initiated" });
    queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
  }
});
```

**Backend** (`server/routes.ts`):
```typescript
// 4. POST /api/calls/manual endpoint receives request
app.post('/api/calls/manual', authenticateJWT, async (req: any, res) => {
  const { contactId } = req.body;
  const tenantId = req.user.tenantId;
  
  // 5. Validate contact exists and belongs to tenant
  const contact = await storage.getContactById(contactId, tenantId);
  if (!contact) return res.status(404).json({ message: 'Contact not found' });
  
  // 6. Check daily call limit (max 3 calls per contact per day)
  const todayCalls = await storage.getCallSessionsToday(contactId);
  if (todayCalls.length >= 3) {
    return res.status(400).json({ message: 'Daily call limit reached' });
  }
  
  // 7. Create call session record
  const callSession = await storage.createCallSession({
    tenantId,
    contactId,
    callType: 'manual',
    status: 'queued'
  });
  
  // 8. Initiate Retell AI call
  const retellService = new RetellService();
  const retellResult = await retellService.createBusinessCall({
    tenantId,
    contactId,
    callSessionId: callSession.id,
    contact: {
      name: contact.name,
      phone: contact.phone,
      appointmentTime: contact.appointmentTime,
      specialInstructions: contact.specialInstructions
    }
  });
  
  // 9. Update call session with Retell call ID
  await storage.updateCallSession(callSession.id, {
    retellCallId: retellResult.callId,
    status: 'ongoing'
  });
  
  // 10. Return success to frontend
  res.json({ 
    callSessionId: callSession.id,
    retellCallId: retellResult.callId 
  });
});
```

**Retell Service** (`server/services/retell.ts`):
```typescript
// 11. RetellService.createBusinessCall()
async createBusinessCall({ tenantId, contactId, callSessionId, contact }) {
  // 12. Fetch tenant config
  const tenant = await storage.getTenantById(tenantId);
  const config = await storage.getTenantConfig(tenantId);
  
  // 13. Build AI agent prompt with dynamic data
  const prompt = this.buildPrompt({
    companyName: tenant.name,
    contactName: contact.name.split(' ')[0], // First name only
    appointmentTime: formatDateTime(contact.appointmentTime),
    travelDirections: {
      publicTransport: config.publicTransportInstructions,
      parking: config.parkingInstructions,
      arrival: config.arrivalNotes
    }
  });
  
  // 14. Call Retell AI API
  const response = await fetch('https://api.retellai.com/v2/create-phone-call', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tenant.retellApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      agent_id: tenant.retellAgentId,
      from_number: tenant.retellPhoneNumber,
      to_number: contact.phone,
      override_agent_id: null,
      metadata: {
        callSessionId,
        contactId,
        tenantId
      },
      dynamic_variables: [
        { name: "name", value: contact.name.split(' ')[0] },
        { name: "appointment_time", value: formatDateTime(contact.appointmentTime) },
        { name: "company_name", value: tenant.name }
      ]
    })
  });
  
  const result = await response.json();
  
  // 15. Return Retell call ID to routes
  return { callId: result.call_id };
}
```

**After Call Executes**: Two parallel systems track the outcome...

---

### Scheduled Call Flow (Initial Reminders)

**Trigger**: System automatically creates tasks 24 hours before appointments

**Creation** (`server/services/call-scheduler.ts`):
```typescript
// Runs every 5 minutes via cron job
async scheduleInitialReminders() {
  // 1. Find contacts with appointments in next 24 hours
  const upcomingContacts = await storage.getContactsWithUpcomingAppointments({
    timeWindow: 24 * 60 * 60 * 1000, // 24 hours
    status: 'pending' // Only unconfirmed
  });
  
  // 2. For each contact, create call task
  for (const contact of upcomingContacts) {
    // Check if task already exists
    const existingTask = await storage.getCallTask({
      contactId: contact.id,
      taskType: 'initial_reminder',
      status: 'pending'
    });
    
    if (!existingTask) {
      // 3. Create new task
      await storage.createCallTask({
        tenantId: contact.tenantId,
        contactId: contact.id,
        taskType: 'initial_reminder',
        scheduledFor: new Date(contact.appointmentTime.getTime() - 24 * 60 * 60 * 1000),
        status: 'pending'
      });
    }
  }
}
```

**Execution** (`server/services/call-scheduler.ts`):
```typescript
// Runs every minute via cron job
async executeOverdueTasks() {
  // 1. Get tasks ready to execute
  const overdueTasks = await storage.getOverdueFollowUpTasks();
  
  for (const task of overdueTasks) {
    // 2. Mark as processing (prevent duplicate execution)
    await storage.updateCallTask(task.id, { 
      status: 'processing',
      lastAttemptAt: new Date()
    });
    
    try {
      // 3. Get contact details
      const contact = await storage.getContactById(task.contactId, task.tenantId);
      
      // 4. Create call session
      const callSession = await storage.createCallSession({
        tenantId: task.tenantId,
        contactId: task.contactId,
        callType: task.taskType,
        status: 'queued'
      });
      
      // 5. Initiate Retell call (same as manual flow)
      const retellService = new RetellService();
      const result = await retellService.createBusinessCall({
        tenantId: task.tenantId,
        contactId: task.contactId,
        callSessionId: callSession.id,
        contact
      });
      
      // 6. Update session with Retell ID
      await storage.updateCallSession(callSession.id, {
        retellCallId: result.callId,
        status: 'ongoing'
      });
      
      // 7. Mark task complete
      await storage.updateCallTask(task.id, {
        status: 'completed',
        retellCallId: result.callId
      });
      
    } catch (error) {
      // 8. Mark task failed for retry
      await storage.updateCallTask(task.id, {
        status: 'failed',
        attempts: task.attempts + 1
      });
    }
  }
}
```

---

### Follow-up Call Scheduling

**Trigger**: Automatically created when initial call fails

**Creation** (in webhook handler, see Section 4):
```typescript
// When call outcome is no_answer, voicemail, busy, or failed
if (['no_answer', 'voicemail', 'busy', 'failed'].includes(outcome)) {
  // 1. Check if follow-up already exists
  const existingFollowUp = await storage.getCallTask({
    contactId: callSession.contactId,
    taskType: 'follow_up',
    status: 'pending'
  });
  
  if (!existingFollowUp) {
    // 2. Create follow-up task 90 minutes later
    await storage.createCallTask({
      tenantId: callSession.tenantId,
      contactId: callSession.contactId,
      taskType: 'follow_up',
      scheduledFor: new Date(Date.now() + 90 * 60 * 1000), // +90 minutes
      status: 'pending'
    });
  }
}
```

**Execution**: Same as scheduled call flow above

---

### Call Outcome Update Flow

**After call completes**, the system updates contact status:

**In Webhook/Poll Handler**:
```typescript
// 1. Update call session with outcome
await storage.updateCallSession(callSessionId, {
  status: 'completed',
  outcome: 'confirmed', // or voicemail, no_answer, etc.
  endedAt: new Date(),
  duration: callDuration,
  transcript: analysisData.transcript
});

// 2. Update contact record
const contact = await storage.getContactById(contactId, tenantId);

// 3. Determine new appointment status
let newStatus = contact.appointmentStatus;
if (outcome === 'confirmed') {
  newStatus = 'confirmed';
} else if (outcome === 'cancelled') {
  newStatus = 'cancelled';
} else if (outcome === 'rescheduled') {
  newStatus = 'rescheduled';
}

// 4. Update contact
await storage.updateContact(contactId, {
  appointmentStatus: newStatus,
  lastCallOutcome: outcome,
  callAttempts: contact.callAttempts + 1
});

// 5. Create follow-up if needed (see above)
```

---

## 4. Hybrid Webhook + Polling System (CRITICAL)

### Why Hybrid?

**Problem**: Webhooks can fail (network issues, server downtime, signature errors)  
**Solution**: Dual-track system with guaranteed delivery

1. **Primary Path**: Retell webhook delivers call outcome immediately
2. **Fallback Path**: Background poller checks Retell API every 15-600 seconds
3. **Idempotency**: State merge logic prevents conflicts and duplicates

### Architecture Diagram

```
Retell AI Call Completes
         |
         ├── Webhook Delivery (Primary)
         |   └─> POST /api/retell/webhook
         |       └─> Signature Verification (HMAC-SHA256)
         |           └─> Store in retell_events (idempotent)
         |               └─> Update call_sessions & contacts
         |
         └── Polling Fallback (Guaranteed)
             └─> Background Service (every 15-600s)
                 └─> GET retellai.com/v2/get-call/:id
                     └─> Merge with existing state
                         └─> Update call_sessions & contacts
```

---

### Webhook Signature Verification

**Critical Security Feature**: Prevents fake webhook attacks

**Location**: `server/routes.ts` - `/api/retell/webhook` endpoint

**How It Works**:

1. Retell sends webhook with `X-Retell-Signature` header
2. Signature = HMAC-SHA256(request_body, retellApiKey)
3. We verify by computing same signature and comparing

**Code**:
```typescript
app.post('/api/retell/webhook', 
  express.raw({ type: 'application/json' }), // Keep raw body for signature
  async (req, res) => {
    // 1. Get signature from header
    const signature = req.headers['x-retell-signature'] as string;
    if (!signature) {
      console.error('Missing signature');
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // 2. Parse event data
    const rawBody = req.body.toString('utf8');
    const event = JSON.parse(rawBody);
    const callId = event.data.call_id;
    
    // 3. Lookup tenant by call ID
    const callSession = await storage.getCallSessionByRetellId(callId);
    if (!callSession) {
      console.error('Call session not found:', callId);
      return res.status(404).json({ message: 'Call not found' });
    }
    
    const tenant = await storage.getTenantById(callSession.tenantId);
    
    // 4. Compute expected signature
    const expectedSignature = crypto
      .createHmac('sha256', tenant.retellApiKey)
      .update(rawBody)
      .digest('hex');
    
    // 5. Compare signatures (timing-safe)
    if (!crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )) {
      console.error('Signature mismatch!');
      return res.status(401).json({ message: 'Invalid signature' });
    }
    
    // 6. Signature valid - process event
    await handleWebhookEvent(event, callSession, tenant);
    res.json({ received: true });
  }
);
```

**Debugging Signature Failures**:
- Check `tenant.retellApiKey` matches Retell dashboard
- Verify webhook is using `express.raw()` middleware (not `express.json()`)
- Confirm signature header name is `x-retell-signature`
- Log both `signature` and `expectedSignature` for comparison

---

### Idempotent Event Storage

**Purpose**: Prevent duplicate webhook processing

**Table**: `retell_events`

**Deduplication Strategy**:
```typescript
// 1. Compute digest of event payload
const digest = crypto
  .createHash('sha256')
  .update(JSON.stringify(event.data))
  .digest('hex');

// 2. Try to insert with unique constraint
try {
  await storage.createRetellEvent({
    tenantId: callSession.tenantId,
    callId: event.data.call_id,
    eventType: event.event, // 'call_started', 'call_ended', 'call_analyzed'
    digest: digest,
    payload: event.data
  });
} catch (error) {
  if (error.code === '23505') { // Unique constraint violation
    console.log('Duplicate event, skipping:', event.event, digest);
    return; // Already processed
  }
  throw error;
}

// 3. Event is new - process it
await processCallEvent(event);
```

**Unique Constraint**: `(callId, eventType, digest)`

**Why It Works**:
- Same event data = same digest
- Database prevents duplicate inserts
- Race conditions handled at DB level
- Order-independent (digest doesn't care about arrival time)

---

### Outcome Precedence Logic

**Problem**: Webhooks can arrive out of order or polling might find stale data

**Solution**: Precedence hierarchy prevents downgrades

**Hierarchy** (strongest to weakest):
1. `rescheduled` - Customer changed appointment
2. `cancelled` - Customer cancelled
3. `confirmed` - **Strongest success state**
4. `voicemail` - Message left
5. `no_answer` - Didn't pick up
6. `busy` - Line busy
7. `answered` - Connected but unclear
8. `failed` - Call failed
9. `unknown` - No data

**Merge Logic**:
```typescript
function mergeCallSessionState(existing, incoming) {
  // Define precedence order
  const precedence = {
    'rescheduled': 9,
    'cancelled': 8,
    'confirmed': 7,
    'voicemail': 6,
    'no_answer': 5,
    'busy': 4,
    'answered': 3,
    'failed': 2,
    'unknown': 1
  };
  
  const existingPrecedence = precedence[existing.outcome] || 0;
  const incomingPrecedence = precedence[incoming.outcome] || 0;
  
  // Only update if incoming is stronger
  if (incomingPrecedence > existingPrecedence) {
    return {
      ...existing,
      outcome: incoming.outcome,
      status: incoming.status,
      // Update metadata
      endedAt: incoming.endedAt || existing.endedAt,
      duration: incoming.duration || existing.duration,
      transcript: incoming.transcript || existing.transcript
    };
  }
  
  // Keep existing state
  return existing;
}
```

**Example Scenarios**:

**Scenario 1: Webhook arrives before poll**
- Webhook: `outcome = 'confirmed'` → Updates call_sessions
- Poll (5 min later): `outcome = 'confirmed'` → No change (same precedence)

**Scenario 2: Poll finds outcome first (webhook delayed)**
- Poll: `outcome = 'confirmed'` → Updates call_sessions
- Webhook (10 min later): `outcome = 'confirmed'` → Duplicate event rejected by digest

**Scenario 3: Out-of-order webhooks**
- Webhook 1: `outcome = 'voicemail'` → Updates call_sessions
- Webhook 2: `outcome = 'confirmed'` → **Upgrades** to confirmed (higher precedence)
- Webhook 3: `outcome = 'no_answer'` → **Ignored** (lower precedence than confirmed)

---

### Polling Service

**Location**: `server/services/call-polling-service.ts`

**Purpose**: Guarantee outcome delivery even if webhooks fail

**How It Works**:

1. **Find calls needing polling**:
```typescript
async getPendingPolls() {
  return await storage.getCallSessions({
    where: {
      status: ['ongoing', 'queued'],
      OR: [
        { webhookVerified: false },
        { nextPollAt: { lte: new Date() } }
      ]
    }
  });
}
```

2. **Poll Retell API**:
```typescript
async pollCallStatus(callSession) {
  const tenant = await storage.getTenantById(callSession.tenantId);
  
  // Call Retell API
  const response = await fetch(
    `https://api.retellai.com/v2/get-call/${callSession.retellCallId}`,
    {
      headers: { 'Authorization': `Bearer ${tenant.retellApiKey}` }
    }
  );
  
  const data = await response.json();
  
  // CRITICAL: Use 'call_status' field, NOT 'status'
  const callStatus = data.call_status; // 'ended', 'completed', 'ongoing'
  const outcome = this.extractOutcome(data);
  
  return { callStatus, outcome, data };
}
```

**CRITICAL BUG FIX**: Retell API returns `call_status` NOT `status`

3. **Exponential Backoff**:
```typescript
function calculateNextPollTime(attempt) {
  const delays = [
    15 * 1000,   // 15 seconds
    30 * 1000,   // 30 seconds
    60 * 1000,   // 1 minute
    120 * 1000,  // 2 minutes
    300 * 1000,  // 5 minutes
    600 * 1000   // 10 minutes (max)
  ];
  
  const delay = delays[Math.min(attempt, delays.length - 1)];
  return new Date(Date.now() + delay);
}
```

**CRITICAL FIX**: Initial poll delay changed from 15s to **90s**
- Most calls complete in 60-90 seconds
- Polling too early finds `status = 'ongoing'` with no outcome data
- 90s delay prevents false "failed" outcomes

4. **Merge State**:
```typescript
async updateFromPoll(callSession, pollData) {
  // Get existing state
  const existing = await storage.getCallSession(callSession.id);
  
  // Merge with precedence logic
  const merged = mergeCallSessionState(existing, {
    status: pollData.callStatus === 'ended' ? 'completed' : 'ongoing',
    outcome: pollData.outcome,
    duration: pollData.call_length,
    transcript: pollData.transcript,
    payloadPollLast: pollData.data
  });
  
  // Update database
  await storage.updateCallSession(callSession.id, {
    ...merged,
    pollAttempts: existing.pollAttempts + 1,
    nextPollAt: calculateNextPollTime(existing.pollAttempts + 1),
    sourceOfTruth: existing.webhookVerified ? 'webhook' : 'poll'
  });
  
  // Update contact if outcome changed
  if (merged.outcome !== existing.outcome) {
    await updateContactFromCallOutcome(callSession.contactId, merged.outcome);
  }
}
```

5. **Stop Polling When Done**:
```typescript
// Terminal states - stop polling
const terminalStatuses = ['ended', 'completed'];
const terminalOutcomes = ['confirmed', 'cancelled', 'rescheduled', 'failed'];

if (
  terminalStatuses.includes(callStatus) ||
  terminalOutcomes.includes(outcome) ||
  webhookVerified === true
) {
  // Stop polling - outcome is final
  await storage.updateCallSession(callSession.id, {
    nextPollAt: null // Prevents future polls
  });
}
```

---

### Dead Letter Queue

**Purpose**: Detect calls stuck without outcome

**Check**:
```typescript
async findStuckCalls() {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  
  return await storage.getCallSessions({
    where: {
      createdAt: { lte: thirtyMinutesAgo },
      status: ['ongoing', 'queued'],
      outcome: null
    }
  });
}
```

**Action**: Alert admin or force to `failed` state

---

### Complete State Machine

```
Call Created
  ↓
status: 'queued'
outcome: null
  ↓
Retell Call Initiated
  ↓
status: 'ongoing'
outcome: null
  ↓
┌──────────────────┬──────────────────┐
│   Webhook Path   │   Polling Path   │
│   (Primary)      │   (Fallback)     │
└──────────────────┴──────────────────┘
  ↓                      ↓
Signature Verify    Poll API (90s+)
  ↓                      ↓
Store Event         Extract Outcome
(idempotent)            ↓
  ↓                 Merge State
Extract Outcome     (precedence)
  ↓                      ↓
Merge State ←──────────┘
(precedence)
  ↓
Update call_sessions
  ↓
Update contacts
  ↓
Schedule Follow-up?
  ↓
status: 'completed'
outcome: 'confirmed' (or other)
webhookVerified: true/false
sourceOfTruth: 'webhook'/'poll'
```

---

## 5. API Architecture

### Authentication Endpoints

#### POST `/api/auth/login`
**Purpose**: User login with JWT token generation

**Request**:
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "fullName": "John Doe",
    "role": "client_admin",
    "tenantId": 5
  }
}
```

**Storage Call**: `storage.getUserByEmail(email)`  
**Validation**: `bcrypt.compare(password, user.password)`  
**Token**: `jwt.sign({ userId, email, role, tenantId }, JWT_SECRET, { expiresIn: '24h' })`

---

#### POST `/api/auth/logout`
**Purpose**: Clear session (client-side token removal)

**Response**:
```json
{ "message": "Logged out successfully" }
```

---

### Contact Management Endpoints

#### GET `/api/contacts`
**Purpose**: Fetch all contacts for logged-in user's tenant

**Auth Required**: Yes (JWT)  
**Role**: All authenticated users

**Query Params**:
- `filter` (optional): `pending`, `confirmed`, `cancelled`

**Response**:
```json
[
  {
    "id": 123,
    "tenantId": 5,
    "name": "Vienna Barnes",
    "phone": "+14155551234",
    "appointmentDate": "2025-10-21",
    "appointmentTime": "2025-10-21T14:00:00Z",
    "appointmentStatus": "pending",
    "appointmentType": "Hair Cut",
    "lastCallOutcome": "voicemail",
    "callAttempts": 2,
    "specialInstructions": "Prefers window seat"
  }
]
```

**Storage Call**: `storage.getContacts(tenantId, { filter })`  
**Auto-refresh**: Frontend polls every 10 seconds

---

#### POST `/api/contacts`
**Purpose**: Create new contact

**Auth Required**: Yes  
**Role**: `client_admin`, `super_admin`

**Request**:
```json
{
  "name": "Jane Smith",
  "phone": "+14155559999",
  "appointmentDate": "2025-10-25",
  "appointmentTime": "2025-10-25T10:00:00Z",
  "appointmentType": "Consultation",
  "specialInstructions": "First-time client"
}
```

**Validation**: Uses `insertContactSchema` from `shared/schema.ts`  
**Storage Call**: `storage.createContact({ ...data, tenantId })`

---

#### GET `/api/contacts/stats`
**Purpose**: Dashboard statistics

**Response**:
```json
{
  "total": 150,
  "pending": 42,
  "confirmed": 95,
  "cancelled": 13
}
```

**Storage Call**: `storage.getContactStats(tenantId)`

---

### Call Management Endpoints

#### POST `/api/calls/manual`
**Purpose**: Initiate immediate "Call Now" call

**Auth Required**: Yes  
**Role**: `client_admin`, `client_user`

**Request**:
```json
{
  "contactId": 123
}
```

**Response**:
```json
{
  "callSessionId": "550e8400-e29b-41d4-a716-446655440000",
  "retellCallId": "call_abc123xyz"
}
```

**Process**:
1. Validate contact exists and belongs to tenant
2. Check daily call limit (max 3)
3. Create `call_sessions` record
4. Call `retellService.createBusinessCall()`
5. Update session with `retellCallId`
6. Return IDs to frontend

**Storage Calls**:
- `storage.getContactById(contactId, tenantId)`
- `storage.getCallSessionsToday(contactId)`
- `storage.createCallSession(data)`
- `storage.updateCallSession(id, { retellCallId })`

---

#### GET `/api/analytics/calls`
**Purpose**: Call activity analytics

**Response**:
```json
{
  "activeCalls": 2,
  "todaysSummary": {
    "callsAttemptedToday": 45,
    "callsCompletedToday": 42,
    "appointmentsConfirmedToday": 38,
    "pendingCalls": 12
  },
  "outcomeBreakdown": [
    { "outcome": "confirmed", "count": 38, "percentage": 84.4 },
    { "outcome": "voicemail", "count": 4, "percentage": 8.9 },
    { "outcome": "no_answer", "count": 3, "percentage": 6.7 }
  ],
  "recentCallActivity": [
    {
      "id": "call_123",
      "contactName": "Vienna Barnes",
      "status": "completed",
      "outcome": "confirmed",
      "timestamp": "2025-10-20T14:46:05Z",
      "duration": 87
    }
  ]
}
```

**Storage Call**: `storage.getCallActivity(tenantId)`  
**Auto-refresh**: Frontend polls every 5 seconds

---

### Webhook Endpoints

#### POST `/api/retell/webhook`
**Purpose**: Receive Retell AI call events

**Auth Required**: **No** (uses signature verification instead)  
**Middleware**: `express.raw()` to preserve raw body

**Headers**:
- `X-Retell-Signature`: HMAC-SHA256 signature

**Request Body**:
```json
{
  "event": "call_analyzed",
  "data": {
    "call_id": "call_abc123xyz",
    "call_status": "ended",
    "call_analysis": {
      "call_successful": true,
      "user_sentiment": "Positive",
      "custom_analysis_data": {
        "appointment_confirmed": true,
        "appointment_cancelled": false,
        "appointment_rescheduled": false
      }
    },
    "transcript": "Hi Vienna, this is...",
    "call_length": 87
  }
}
```

**Process**:
1. Verify HMAC signature
2. Lookup call session by `call_id`
3. Compute event digest
4. Insert into `retell_events` (idempotent)
5. Extract outcome from analysis
6. Merge with existing state (precedence)
7. Update `call_sessions` and `contacts`
8. Schedule follow-up if needed

**Critical**: Must use `express.raw()` middleware to preserve raw body for signature verification

---

#### POST `/api/webhooks/cal-com`
**Purpose**: Receive Cal.com booking webhooks

**Request**:
```json
{
  "triggerEvent": "BOOKING_CREATED",
  "payload": {
    "attendees": [
      { "name": "Vienna Barnes", "email": "vienna@example.com" }
    ],
    "startTime": "2025-10-25T14:00:00Z"
  }
}
```

**Process**:
1. Find or create contact by email/name
2. Create/update appointment
3. Schedule initial reminder call task

---

### Analytics Endpoints

#### GET `/api/analytics/performance`
**Purpose**: Performance metrics over time period

**Query Params**:
- `timePeriod` (optional): Days to analyze (default: 30)

**Response**:
```json
{
  "callSuccessRate": 85.2,
  "noShowRate": 12.3,
  "avgCallDuration": 92,
  "confirmationRate": 78.5,
  "timeSeries": [
    { "date": "2025-10-20", "calls": 45, "confirmed": 38 }
  ]
}
```

**Storage Call**: `storage.getPerformanceOverview(tenantId, timePeriod)`

---

### Daily Summary Endpoints

#### GET `/api/daily-summary/settings`
**Purpose**: Get tenant's email summary configuration

**Response**:
```json
{
  "enabled": true,
  "recipientEmail": "admin@salon.com",
  "recipientName": "Sarah Johnson",
  "deliveryTime": "08:00",
  "deliveryDays": ["Mon", "Tue", "Wed", "Thu", "Fri"],
  "timezone": "America/New_York",
  "lastSentAt": "2025-10-20T08:00:00Z"
}
```

---

#### PUT `/api/daily-summary/settings`
**Purpose**: Update email summary configuration

**Request**:
```json
{
  "enabled": true,
  "recipientEmail": "manager@salon.com",
  "recipientName": "Mike Davis",
  "deliveryTime": "09:00",
  "deliveryDays": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  "timezone": "America/Los_Angeles"
}
```

**Validation**: 
- `recipientEmail` must be valid email
- `deliveryTime` must be HH:MM format
- `deliveryDays` must not be empty array

---

## 6. Frontend Data Flow

### React Query Architecture

**Configuration** (`client/src/lib/queryClient.ts`):
```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 0 // Always fetch fresh data
    }
  }
});

// Default fetcher
const defaultQueryFn = async ({ queryKey }) => {
  const response = await fetch(queryKey[0], {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  
  return response.json();
};
```

---

### Auto-Refresh Patterns

**Dashboard** (`client/src/pages/client-admin-dashboard.tsx`):
```typescript
// Contacts auto-refresh every 5 seconds
const { data: contacts = [] } = useQuery({
  queryKey: ['/api/contacts'],
  refetchInterval: 5000
});

// Call analytics auto-refresh every 5 seconds
const { data: callAnalytics } = useQuery({
  queryKey: ['/api/analytics/calls'],
  refetchInterval: 5000
});
```

**Contacts Page** (`client/src/pages/contacts.tsx`):
```typescript
// Contacts auto-refresh every 10 seconds
const { data: contacts = [] } = useQuery({
  queryKey: ['/api/contacts'],
  refetchInterval: 10000,
  staleTime: 0,
  gcTime: 0 // Don't cache (TanStack Query v5)
});
```

**Why Different Intervals?**
- Dashboard: 5s = Real-time feel for admin overview
- Contacts: 10s = Balance between freshness and server load

---

### Cache Invalidation

**After Mutations**:
```typescript
const createContactMutation = useMutation({
  mutationFn: (data) => apiRequest('/api/contacts', {
    method: 'POST',
    body: data
  }),
  onSuccess: () => {
    // Invalidate contacts list to refetch
    queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
    
    // Also invalidate stats
    queryClient.invalidateQueries({ queryKey: ['/api/contacts/stats'] });
  }
});
```

**Hierarchical Keys** (for granular invalidation):
```typescript
// Good: Array-based keys
queryKey: ['/api/contacts', contactId]

// Invalidate all contact-related queries
queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });

// Invalidate specific contact
queryClient.invalidateQueries({ queryKey: ['/api/contacts', 123] });
```

---

### Status Display Logic

**Smart Status Calculation** (`client/src/pages/contacts.tsx`):
```typescript
const getDisplayStatus = (contact) => {
  // Priority 1: Show appointment status if confirmed/cancelled/rescheduled
  if (contact.appointmentStatus === 'confirmed') {
    return { label: 'Confirmed', color: 'bg-green-500 text-white' };
  }
  if (contact.appointmentStatus === 'cancelled') {
    return { label: 'Cancelled', color: 'bg-red-500 text-white' };
  }
  if (contact.appointmentStatus === 'rescheduled') {
    return { label: 'Rescheduled', color: 'bg-blue-500 text-white' };
  }
  
  // Priority 2: Show last call outcome if pending and call attempted
  if (contact.appointmentStatus === 'pending' && contact.lastCallOutcome) {
    const outcome = contact.lastCallOutcome.toLowerCase();
    if (outcome === 'voicemail') {
      return { label: 'Voicemail', color: 'bg-orange-500 text-white' };
    }
    if (outcome === 'no_answer') {
      return { label: 'No Answer', color: 'bg-amber-500 text-white' };
    }
    if (outcome === 'busy') {
      return { label: 'Busy', color: 'bg-amber-600 text-white' };
    }
    if (outcome === 'failed') {
      return { label: 'Failed', color: 'bg-red-600 text-white' };
    }
  }
  
  // Default: Show pending
  return { label: 'Pending', color: 'bg-yellow-500 text-white' };
};
```

**Why This Matters**:
- Shows clients **actionable information**
- "Voicemail" tells them contact isn't listening to messages
- "No Answer" suggests different call time needed
- "Confirmed" = no action needed

---

### Loading States

**Skeleton Screens**:
```typescript
if (isLoading) {
  return (
    <div className="grid grid-cols-4 gap-6">
      {[...Array(4)].map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-4 bg-muted rounded mb-2"></div>
            <div className="h-8 bg-muted rounded mb-4"></div>
            <div className="h-3 bg-muted rounded w-3/4"></div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

**Mutation Pending States**:
```typescript
<Button 
  disabled={mutation.isPending}
  data-testid="button-save"
>
  {mutation.isPending ? 'Saving...' : 'Save Changes'}
</Button>
```

---

## 7. Multi-Tenancy Implementation

### Database-Level Isolation

**Every Table**: Has `tenantId` foreign key to `tenants.id`

**Storage Layer Enforcement** (`server/storage.ts`):
```typescript
// ALWAYS filter by tenantId
async getContacts(tenantId: number, filters = {}) {
  return await db
    .select()
    .from(contacts)
    .where(
      and(
        eq(contacts.tenantId, tenantId), // Tenant isolation
        // ... other filters
      )
    );
}
```

**CRITICAL RULE**: **Never** query without `tenantId` filter (except super_admin operations)

---

### API-Level Enforcement

**JWT Middleware** (`server/routes.ts`):
```typescript
function authenticateJWT(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach user info to request
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      tenantId: decoded.tenantId // CRITICAL
    };
    
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
}
```

**Usage in Routes**:
```typescript
app.get('/api/contacts', authenticateJWT, async (req: any, res) => {
  // req.user.tenantId is ALWAYS from JWT
  const contacts = await storage.getContacts(req.user.tenantId);
  res.json(contacts);
});
```

---

### Cross-Tenant Prevention

**Attack Vector**: Malicious user tries to access other tenant's data

**Example Attack**:
```http
GET /api/contacts/999
Authorization: Bearer <user_tenant_5_token>
```

**Defense** (in route handler):
```typescript
app.get('/api/contacts/:id', authenticateJWT, async (req: any, res) => {
  const contactId = parseInt(req.params.id);
  
  // MUST verify tenantId matches
  const contact = await storage.getContactById(contactId, req.user.tenantId);
  
  if (!contact) {
    // Either doesn't exist OR belongs to different tenant
    return res.status(404).json({ message: 'Contact not found' });
  }
  
  res.json(contact);
});
```

**Storage Implementation**:
```typescript
async getContactById(id: number, tenantId: number) {
  const result = await db
    .select()
    .from(contacts)
    .where(
      and(
        eq(contacts.id, id),
        eq(contacts.tenantId, tenantId) // Enforce tenant boundary
      )
    )
    .limit(1);
  
  return result[0] || null;
}
```

---

### Super Admin Exceptions

**Super Admin**: Can access all tenants

**Tenant Impersonation Flow**:
1. Super admin clicks "View Tenant" on tenant
2. Frontend calls `/api/admin/impersonate/:tenantId`
3. Backend generates new JWT with target `tenantId`
4. Frontend stores in `sessionStorage` (not `localStorage`)
5. Banner shows "Viewing as [Tenant Name]"
6. "Exit" button restores original super admin token

**Code** (`server/routes.ts`):
```typescript
app.post('/api/admin/impersonate/:tenantId', 
  authenticateJWT, 
  requireRole(['super_admin']),
  async (req: any, res) => {
    const targetTenantId = parseInt(req.params.tenantId);
    
    // Verify tenant exists
    const tenant = await storage.getTenantById(targetTenantId);
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }
    
    // Generate impersonation token
    const token = jwt.sign({
      userId: req.user.id,
      email: req.user.email,
      role: 'client_admin', // Act as admin in target tenant
      tenantId: targetTenantId,
      impersonating: true,
      originalTenantId: req.user.tenantId
    }, process.env.JWT_SECRET, { expiresIn: '2h' });
    
    res.json({ token, tenant });
  }
);
```

---

## 8. Authentication & Authorization

### Login Flow

**Frontend** (`client/src/pages/login.tsx`):
```typescript
const loginMutation = useMutation({
  mutationFn: (credentials) => fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  }).then(r => r.json()),
  
  onSuccess: (data) => {
    // Store token in localStorage
    localStorage.setItem('token', data.token);
    
    // Store user info
    localStorage.setItem('user', JSON.stringify(data.user));
    
    // Redirect based on role
    if (data.user.role === 'super_admin') {
      navigate('/admin/dashboard');
    } else {
      navigate('/dashboard');
    }
  }
});
```

**Backend** (`server/routes.ts`):
```typescript
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  // 1. Find user by email
  const user = await storage.getUserByEmail(email);
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  
  // 2. Check if active
  if (!user.isActive) {
    return res.status(403).json({ message: 'Account deactivated' });
  }
  
  // 3. Verify password
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  
  // 4. Generate JWT
  const token = jwt.sign({
    userId: user.id,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId
  }, process.env.JWT_SECRET, { expiresIn: '24h' });
  
  // 5. Create audit log
  await storage.createAuditLog({
    userId: user.id,
    tenantId: user.tenantId,
    action: 'login',
    ipAddress: req.ip
  });
  
  // 6. Return token + user info
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      tenantId: user.tenantId
    }
  });
});
```

---

### Role-Based Access Control

**Roles**:
1. `super_admin` - Platform owner, all access
2. `client_admin` - Tenant administrator
3. `client_user` - Read-only tenant user

**Middleware** (`server/routes.ts`):
```typescript
function requireRole(allowedRoles: string[]) {
  return (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    
    next();
  };
}
```

**Usage**:
```typescript
// Super admin only
app.get('/api/admin/tenants', 
  authenticateJWT, 
  requireRole(['super_admin']),
  async (req, res) => {
    // ...
  }
);

// Admin or super admin
app.post('/api/contacts', 
  authenticateJWT, 
  requireRole(['client_admin', 'super_admin']),
  async (req, res) => {
    // ...
  }
);

// All authenticated users
app.get('/api/contacts', 
  authenticateJWT, 
  async (req, res) => {
    // ...
  }
);
```

---

### Session Management

**Token Expiration**: 24 hours

**Refresh Strategy**: **Not implemented** (user must re-login after 24h)

**Logout**:
```typescript
// Frontend
localStorage.removeItem('token');
localStorage.removeItem('user');
navigate('/login');

// No backend call needed (stateless JWT)
```

---

## 9. Daily Email Summary System

### Architecture

**Tenant-Level Configuration**: One summary per tenant, sent to configured recipient

**Configuration Fields** (`tenants` table):
- `dailySummaryEnabled`: Feature flag
- `dailySummaryRecipientEmail`: Who receives summary
- `dailySummaryRecipientName`: Display name
- `dailySummaryTime`: Delivery time (HH:MM)
- `dailySummaryDays`: Array of days (e.g., `['Mon', 'Tue', 'Wed']`)
- `dailySummaryTimezone`: IANA timezone (e.g., `America/New_York`)
- `lastDailySummarySentAt`: Duplicate prevention timestamp

---

### Daily Summary Service

**Location**: `server/services/daily-summary-service.ts`

**Main Function**:
```typescript
async sendDailySummaries() {
  // 1. Get all tenants with summaries enabled
  const tenants = await storage.getTenantsWithDailySummaryEnabled();
  
  for (const tenant of tenants) {
    // 2. Check if today is delivery day
    const now = new Date();
    const dayOfWeek = format(now, 'EEE'); // 'Mon', 'Tue', etc.
    
    if (!tenant.dailySummaryDays.includes(dayOfWeek)) {
      continue; // Skip - not a delivery day
    }
    
    // 3. Check if already sent today
    if (tenant.lastDailySummarySentAt) {
      const lastSent = new Date(tenant.lastDailySummarySentAt);
      const today = startOfDay(now);
      
      if (lastSent >= today) {
        continue; // Already sent today
      }
    }
    
    // 4. Check if delivery time has passed
    const deliveryTime = tenant.dailySummaryTime; // "08:00"
    const [hours, minutes] = deliveryTime.split(':').map(Number);
    const deliveryDateTime = setMinutes(setHours(now, hours), minutes);
    
    if (now < deliveryDateTime) {
      continue; // Not time yet
    }
    
    // 5. Gather summary data
    const summaryData = await this.gatherSummaryData(tenant.id);
    
    // 6. Send email
    await this.sendSummaryEmail(tenant, summaryData);
    
    // 7. Update last sent timestamp
    await storage.updateTenant(tenant.id, {
      lastDailySummarySentAt: now
    });
  }
}
```

**Data Gathering**:
```typescript
async gatherSummaryData(tenantId: number) {
  const yesterday = subDays(new Date(), 1);
  const startOfYesterday = startOfDay(yesterday);
  const endOfYesterday = endOfDay(yesterday);
  
  // Get call sessions from yesterday
  const callSessions = await storage.getCallSessions({
    tenantId,
    createdAt: {
      gte: startOfYesterday,
      lte: endOfYesterday
    }
  });
  
  // Group by outcome
  const confirmed = callSessions.filter(c => c.outcome === 'confirmed');
  const rescheduled = callSessions.filter(c => c.outcome === 'rescheduled');
  const cancelled = callSessions.filter(c => c.outcome === 'cancelled');
  const noAnswer = callSessions.filter(c => c.outcome === 'no_answer');
  const voicemail = callSessions.filter(c => c.outcome === 'voicemail');
  const failed = callSessions.filter(c => c.outcome === 'failed');
  
  // Get contact details
  const getContactDetails = async (session) => {
    const contact = await storage.getContactById(session.contactId, tenantId);
    return {
      name: contact.name,
      appointmentTime: contact.appointmentTime,
      phone: contact.phone
    };
  };
  
  return {
    total: callSessions.length,
    confirmed: await Promise.all(confirmed.slice(0, 10).map(getContactDetails)),
    rescheduled: await Promise.all(rescheduled.slice(0, 10).map(getContactDetails)),
    cancelled: await Promise.all(cancelled.slice(0, 10).map(getContactDetails)),
    noAnswer: await Promise.all(noAnswer.slice(0, 10).map(getContactDetails)),
    voicemail: await Promise.all(voicemail.slice(0, 10).map(getContactDetails)),
    failed: await Promise.all(failed.slice(0, 10).map(getContactDetails))
  };
}
```

**Email Sending**:
```typescript
async sendSummaryEmail(tenant, data) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  
  const emailHtml = this.renderEmailTemplate(tenant, data);
  
  await resend.emails.send({
    from: 'VioConcierge <noreply@vioconcierge.com>',
    to: tenant.dailySummaryRecipientEmail,
    subject: `Daily Summary for ${tenant.name} - ${format(new Date(), 'MMM dd, yyyy')}`,
    html: emailHtml
  });
}
```

---

### Scheduling

**Cron Job**: Runs every 15 minutes

**Entry Point** (`server/index.ts`):
```typescript
import cron from 'node-cron';
import { DailySummaryService } from './services/daily-summary-service';

const summaryService = new DailySummaryService();

// Run every 15 minutes
cron.schedule('*/15 * * * *', async () => {
  try {
    await summaryService.sendDailySummaries();
  } catch (error) {
    console.error('Daily summary error:', error);
  }
});
```

---

### Debugging

**Email not sending?**
1. Check `tenant.dailySummaryEnabled = true`
2. Check `tenant.dailySummaryDays` includes today
3. Check `tenant.dailySummaryRecipientEmail` is valid
4. Check `lastDailySummarySentAt` is not today
5. Check `RESEND_API_KEY` is valid
6. Check Resend dashboard for delivery errors

**Wrong data in email?**
1. Verify time range in `gatherSummaryData()`
2. Check `call_sessions.outcome` values
3. Check `call_sessions.createdAt` timestamps

---

## 10. Calendar Integration

### Cal.com Integration

**Location**: `server/services/cal-com.ts`

**Webhook Handler** (`server/routes.ts`):
```typescript
app.post('/api/webhooks/cal-com', async (req, res) => {
  const { triggerEvent, payload } = req.body;
  
  // 1. Determine tenant from webhook metadata
  const tenantId = payload.metadata?.tenantId;
  if (!tenantId) {
    return res.status(400).json({ message: 'Missing tenantId' });
  }
  
  // 2. Handle different event types
  switch (triggerEvent) {
    case 'BOOKING_CREATED':
      await handleBookingCreated(tenantId, payload);
      break;
    case 'BOOKING_RESCHEDULED':
      await handleBookingRescheduled(tenantId, payload);
      break;
    case 'BOOKING_CANCELLED':
      await handleBookingCancelled(tenantId, payload);
      break;
  }
  
  res.json({ received: true });
});
```

**Booking Created**:
```typescript
async function handleBookingCreated(tenantId, payload) {
  const attendee = payload.attendees[0];
  
  // 1. Find or create contact
  let contact = await storage.getContactByEmail(attendee.email, tenantId);
  
  if (!contact) {
    contact = await storage.createContact({
      tenantId,
      name: attendee.name,
      email: attendee.email,
      phone: attendee.phone || null,
      appointmentDate: format(new Date(payload.startTime), 'yyyy-MM-dd'),
      appointmentTime: new Date(payload.startTime),
      appointmentStatus: 'pending',
      appointmentType: payload.eventType?.title || 'Appointment'
    });
  } else {
    // Update existing contact
    await storage.updateContact(contact.id, {
      appointmentDate: format(new Date(payload.startTime), 'yyyy-MM-dd'),
      appointmentTime: new Date(payload.startTime),
      appointmentStatus: 'pending'
    });
  }
  
  // 2. Schedule initial reminder call
  const reminderTime = subHours(new Date(payload.startTime), 24);
  
  await storage.createCallTask({
    tenantId,
    contactId: contact.id,
    taskType: 'initial_reminder',
    scheduledFor: reminderTime,
    status: 'pending'
  });
}
```

---

### Calendly Integration

**Location**: `server/services/calendly.ts`

**Webhook Handler** (`server/routes.ts`):
```typescript
app.post('/api/webhooks/calendly', async (req, res) => {
  const { event, payload } = req.body;
  
  // Similar to Cal.com but different payload structure
  // Extract: name, email, start_time, event_type
  
  // Process based on event type:
  // - invitee.created
  // - invitee.canceled
  
  res.json({ received: true });
});
```

---

### Rescheduled Appointment Detection

**Cal.com**:
```typescript
async function handleBookingRescheduled(tenantId, payload) {
  const contact = await storage.getContactByEmail(payload.attendees[0].email, tenantId);
  
  if (contact) {
    // 1. Update appointment time
    await storage.updateContact(contact.id, {
      appointmentTime: new Date(payload.startTime),
      appointmentStatus: 'rescheduled'
    });
    
    // 2. Cancel old call tasks
    await storage.cancelCallTasks({
      contactId: contact.id,
      status: 'pending'
    });
    
    // 3. Schedule new reminder
    const reminderTime = subHours(new Date(payload.startTime), 24);
    await storage.createCallTask({
      tenantId,
      contactId: contact.id,
      taskType: 'initial_reminder',
      scheduledFor: reminderTime,
      status: 'pending'
    });
  }
}
```

---

## 11. Common Debugging Scenarios

### Scenario 1: Call Status Not Updating

**Symptom**: Contact shows "Pending" but call was made

**Debug Steps**:

1. **Check call_sessions table**:
```sql
SELECT * FROM call_sessions 
WHERE contact_id = <CONTACT_ID> 
ORDER BY created_at DESC 
LIMIT 1;
```

Look for:
- `retellCallId`: Should match Retell dashboard
- `status`: Should be `completed` or `failed`
- `outcome`: Should have value (not null)
- `webhook_verified`: Shows if webhook received

2. **Check retell_events table**:
```sql
SELECT * FROM retell_events 
WHERE call_id = '<RETELL_CALL_ID>' 
ORDER BY created_at DESC;
```

Look for:
- Event types: Should have `call_analyzed`
- Payload: Check `call_analysis.custom_analysis_data`

3. **Check webhook logs**:
```bash
# In server logs
grep "Webhook received" logs.txt
grep "Signature" logs.txt
```

Look for:
- "Signature mismatch" = Check `retellApiKey`
- "Call session not found" = `retellCallId` mismatch

4. **Check polling service**:
```sql
SELECT poll_attempts, next_poll_at, source_of_truth
FROM call_sessions 
WHERE id = '<SESSION_ID>';
```

- If `poll_attempts = 0`: Polling hasn't started (check 90s initial delay)
- If `next_poll_at IS NULL`: Polling stopped (terminal state reached)
- If `source_of_truth = 'webhook'`: Webhook delivered outcome

5. **Check contact update**:
```sql
SELECT appointment_status, last_call_outcome, call_attempts
FROM contacts
WHERE id = <CONTACT_ID>;
```

- `last_call_outcome` should match `call_sessions.outcome`
- `call_attempts` should increment after each call

**Common Fixes**:
- Webhook signature failing → Verify `tenant.retellApiKey` matches Retell dashboard
- Outcome not extracting → Check `call_analysis.custom_analysis_data` structure
- Contact not updating → Check `updateContactFromCallOutcome()` function
- Polling not running → Check cron job is running and logs

---

### Scenario 2: Webhook Signature Verification Failing

**Symptom**: Logs show "Signature mismatch" or 401 errors

**Debug Steps**:

1. **Verify middleware order**:
```typescript
// MUST use express.raw() BEFORE route handler
app.post('/api/retell/webhook', 
  express.raw({ type: 'application/json' }), // CRITICAL
  async (req, res) => {
    // ...
  }
);
```

2. **Log signature comparison**:
```typescript
const receivedSignature = req.headers['x-retell-signature'];
const rawBody = req.body.toString('utf8');
const expectedSignature = crypto
  .createHmac('sha256', tenant.retellApiKey)
  .update(rawBody)
  .digest('hex');

console.log('Received:', receivedSignature);
console.log('Expected:', expectedSignature);
console.log('Match:', receivedSignature === expectedSignature);
```

3. **Check API key**:
```sql
SELECT retell_api_key FROM tenants WHERE id = <TENANT_ID>;
```

Compare to Retell dashboard → Settings → API Keys

4. **Check webhook URL**:
- Retell dashboard → Webhooks → Verify URL is `https://yourapp.com/api/retell/webhook`
- Must be HTTPS in production

**Common Fixes**:
- Using `express.json()` instead of `express.raw()` → Body gets parsed, signature fails
- Wrong API key → Update `tenant.retellApiKey`
- Trailing slashes in URL → Remove from webhook URL

---

### Scenario 3: Follow-up Calls Not Scheduling

**Symptom**: Initial call fails but no follow-up task created

**Debug Steps**:

1. **Check initial call outcome**:
```sql
SELECT outcome FROM call_sessions 
WHERE contact_id = <CONTACT_ID> 
ORDER BY created_at DESC 
LIMIT 1;
```

Should be: `no_answer`, `voicemail`, `busy`, or `failed`

2. **Check follow-up task creation**:
```sql
SELECT * FROM call_tasks 
WHERE contact_id = <CONTACT_ID> 
AND task_type = 'follow_up' 
ORDER BY created_at DESC;
```

If empty, follow-up logic didn't run

3. **Check webhook handler**:
```typescript
// In retell webhook handler or poll merger
if (['no_answer', 'voicemail', 'busy', 'failed'].includes(outcome)) {
  console.log('Creating follow-up task for contact:', contactId);
  
  const existing = await storage.getCallTask({
    contactId,
    taskType: 'follow_up',
    status: 'pending'
  });
  
  if (existing) {
    console.log('Follow-up already exists:', existing.id);
  } else {
    const task = await storage.createCallTask({
      tenantId,
      contactId,
      taskType: 'follow_up',
      scheduledFor: new Date(Date.now() + 90 * 60 * 1000),
      status: 'pending'
    });
    console.log('Follow-up created:', task.id);
  }
}
```

4. **Check duplicate prevention**:
```sql
SELECT * FROM call_tasks 
WHERE contact_id = <CONTACT_ID> 
AND status = 'pending';
```

If multiple `pending` tasks exist, duplicate prevention is broken

**Common Fixes**:
- Outcome not in trigger list → Add to `['no_answer', 'voicemail', 'busy', 'failed']`
- Logic not running → Check webhook/poll handlers include follow-up creation
- Duplicate prevention broken → Check query logic for existing tasks

---

### Scenario 4: Daily Emails Not Sending

**Symptom**: Configured but no emails received

**Debug Steps**:

1. **Check tenant config**:
```sql
SELECT 
  daily_summary_enabled,
  daily_summary_recipient_email,
  daily_summary_time,
  daily_summary_days,
  daily_summary_timezone,
  last_daily_summary_sent_at
FROM tenants 
WHERE id = <TENANT_ID>;
```

Verify:
- `enabled = true`
- `recipient_email` is valid
- `days` includes today (e.g., `['Mon']`)
- `time` is in past today
- `last_sent_at` is not today

2. **Check cron job**:
```bash
# Check if cron is running
ps aux | grep node
# Should see scheduled tasks
```

3. **Check Resend logs**:
- Visit Resend dashboard
- Check "Emails" → Recent sends
- Look for delivery errors

4. **Manually trigger**:
```typescript
// In server console
const service = new DailySummaryService();
await service.sendDailySummaries();
```

Watch for errors

**Common Fixes**:
- `daily_summary_days` is empty array → Must have at least one day
- `last_sent_at` is today → Wait until tomorrow
- `RESEND_API_KEY` invalid → Check env var
- Email bouncing → Verify recipient email is valid

---

### Scenario 5: Status Showing "Pending" Instead of Call Outcome

**Symptom**: Contact had call go to voicemail but still shows "Pending"

**Root Cause**: Frontend status display logic not checking `lastCallOutcome`

**Debug Steps**:

1. **Check contact data**:
```sql
SELECT 
  appointment_status,
  last_call_outcome,
  call_attempts
FROM contacts 
WHERE id = <CONTACT_ID>;
```

Expected:
- `appointment_status = 'pending'`
- `last_call_outcome = 'voicemail'`
- `call_attempts > 0`

2. **Check frontend logic** (`client/src/pages/contacts.tsx`):
```typescript
const getDisplayStatus = (contact) => {
  // Should check lastCallOutcome when status is pending
  if (contact.appointmentStatus === 'pending' && contact.lastCallOutcome) {
    return getOutcomeLabel(contact.lastCallOutcome);
  }
  return contact.appointmentStatus;
};
```

3. **Check data in React Query**:
```typescript
// In browser console
queryClient.getQueryData(['/api/contacts'])
```

Look for `lastCallOutcome` field in contact objects

**Fix**: Update frontend status display logic to prioritize `lastCallOutcome` over `appointmentStatus` when status is `pending`

---

## 12. Critical Configuration

### Environment Variables

**Required for Production**:

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# Retell AI (Per-Tenant Config)
# These are stored in database, NOT env vars
# - RETELL_API_KEY (in tenants table)
# - RETELL_AGENT_ID (in tenants table)
# - RETELL_WEBHOOK_SECRET (in tenants table)

# Email Service
RESEND_API_KEY=re_xxx

# Calendar Integrations (Optional, per-tenant)
# Stored in database tenants table:
# - CAL_COM_API_KEY
# - CALENDLY_TOKEN

# Server
PORT=5000
NODE_ENV=production
```

---

### Service Configuration

**Retell AI Setup** (Per Tenant):

1. Create Retell account
2. Generate API key → Store in `tenants.retellApiKey`
3. Create voice agent → Store ID in `tenants.retellAgentId`
4. Configure webhook URL: `https://yourapp.com/api/retell/webhook`
5. Copy webhook secret → Store in `tenants.retellWebhookSecret`

**Important**: Each tenant has their OWN Retell credentials

---

### Database Migrations

**NEVER write manual SQL migrations**

**Process**:

1. Edit `shared/schema.ts`
2. Run `npm run db:push`
3. If data loss warning, use `npm run db:push --force`

**Example**:
```bash
# Add new column
# Edit shared/schema.ts:
export const contacts = pgTable('contacts', {
  // ... existing columns
  preferredLanguage: varchar('preferred_language').default('en')
});

# Sync to database
npm run db:push
```

---

### Backup Strategy

**Critical Tables**:
- `tenants` - Client configurations
- `users` - User accounts
- `contacts` - Customer data
- `call_sessions` - Call history
- `audit_logs` - Compliance records

**Recommended**: Daily automated backups with 30-day retention

---

## 13. Code Conventions

### File Organization

**Backend**:
- `server/routes.ts` - API endpoints only, minimal logic
- `server/storage.ts` - Database abstraction, all queries
- `server/services/` - Business logic, external API calls
- `shared/schema.ts` - Database schema, Zod validators

**Frontend**:
- `client/src/pages/` - Route components
- `client/src/components/` - Reusable UI components
- `client/src/components/modals/` - Modal dialogs
- `client/src/hooks/` - Custom React hooks

---

### Naming Conventions

**Database**:
- Tables: `snake_case` (e.g., `call_sessions`)
- Columns: `snake_case` (e.g., `appointment_time`)
- Foreign keys: `{table}_id` (e.g., `tenant_id`)

**TypeScript**:
- Functions: `camelCase` (e.g., `getContactById`)
- Classes: `PascalCase` (e.g., `RetellService`)
- Types/Interfaces: `PascalCase` (e.g., `CallSession`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `MAX_CALLS_PER_DAY`)

**React**:
- Components: `PascalCase` (e.g., `ContactModal`)
- Props: `camelCase` (e.g., `onSuccess`)
- Hooks: `use` prefix (e.g., `useAuth`)

---

### Data Flow Pattern

**Standard CRUD Flow**:

1. **Frontend initiates**:
```typescript
const mutation = useMutation({
  mutationFn: (data) => apiRequest('/api/endpoint', {
    method: 'POST',
    body: data
  })
});
```

2. **API route validates**:
```typescript
app.post('/api/endpoint', authenticateJWT, async (req: any, res) => {
  // Validate with Zod
  const validated = insertSchema.parse(req.body);
  
  // Call storage
  const result = await storage.createThing(validated, req.user.tenantId);
  
  res.json(result);
});
```

3. **Storage executes**:
```typescript
async createThing(data, tenantId) {
  return await db.insert(things).values({
    ...data,
    tenantId
  }).returning();
}
```

4. **Frontend invalidates cache**:
```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['/api/endpoint'] });
}
```

---

### Testing Data Attributes

**Every interactive element** must have `data-testid`:

```typescript
<Button data-testid="button-submit">Submit</Button>
<Input data-testid="input-email" />
<div data-testid="status-confirmed">Confirmed</div>

// Dynamic elements
<div data-testid={`card-contact-${contact.id}`}>...</div>
```

**Pattern**: `{type}-{description}-{id?}`

---

### Error Handling

**Backend**:
```typescript
try {
  const result = await riskyOperation();
  res.json(result);
} catch (error) {
  console.error('Operation failed:', error);
  res.status(500).json({ 
    message: 'Operation failed',
    error: error instanceof Error ? error.message : 'Unknown error'
  });
}
```

**Frontend**:
```typescript
const mutation = useMutation({
  mutationFn: apiRequest,
  onError: (error) => {
    toast({
      title: "Error",
      description: error.message,
      variant: "destructive"
    });
  }
});
```

---

## Conclusion

This document covers the essential architecture, workflows, and debugging strategies for the VioConcierge platform. For additional questions or edge cases, refer to the actual code in the repository or contact the development team.

**Key Takeaways**:

1. **Calls are tracked via dual webhook + polling system** - guarantees outcome delivery
2. **Tenant isolation is enforced at database and API level** - always filter by `tenantId`
3. **Status updates use precedence logic** - `confirmed` can never downgrade to `voicemail`
4. **Frontend auto-refreshes every 5-10 seconds** - no manual refresh needed
5. **Follow-up calls automatically schedule 90 minutes after missed calls**
6. **Daily summaries are tenant-level** - one email per tenant, not per user

**For Debugging**: Start with database tables (`call_sessions`, `retell_events`), then check logs, then verify service logic.
