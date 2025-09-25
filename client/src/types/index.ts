export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'super_admin' | 'client_admin' | 'client_user';
  tenantId: string;
  isActive: boolean;
  createdAt: string;
}

export interface Tenant {
  id: string;
  name: string;
  companyName?: string;
  tenantNumber?: string;
  status: 'active' | 'suspended' | 'inactive';
  contactEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  appointmentTime?: string;
  appointmentType?: string;
  appointmentDuration?: number;
  appointmentStatus: 'pending' | 'confirmed' | 'cancelled' | 'rescheduled';
  
  // Enhanced PRD fields
  timezone?: string;
  callBeforeHours?: number;
  lastContactTime?: string;
  ownerName?: string;
  companyName?: string;
  bookingSource?: 'manual' | 'calcom' | 'calendly';
  locationId?: string;
  priorityLevel?: 'normal' | 'high' | 'urgent';
  preferredContactMethod?: 'voice' | 'email' | 'sms';
  
  // Existing fields
  callAttempts: number;
  lastCallOutcome?: string;
  notes?: string;
  specialInstructions?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CallSession {
  id: string;
  sessionId?: string;
  contactId?: string;
  tenantId: string;
  status: 'queued' | 'in_progress' | 'completed' | 'failed';
  triggerTime?: string;
  startTime?: string;
  endTime?: string;
  durationSeconds?: number;
  callOutcome?: 'confirmed' | 'voicemail' | 'no_answer' | 'busy' | 'failed';
  retellCallId?: string;
  errorMessage?: string;
  createdAt: string;
}

export interface TenantConfig {
  id: string;
  tenantId: string;
  retellAgentId?: string;
  retellAgentNumber?: string;
  retellApiKey?: string;
  calApiKey?: string;
  calEventTypeId?: number;
  calendlyApiKey?: string;
  calendlyOrganizerEmail?: string;
  timezone: string;
  followUpHours: number;
  businessType: string;
  isPaused: boolean;
  maxCallsPerDay: number;
  maxCallsPer15Min: number;
  quietStart: string;
  quietEnd: string;
  createdAt: string;
  updatedAt: string;
}

export interface FollowUpTask {
  id: string;
  tenantId: string;
  contactId?: string;
  scheduledTime: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  taskType: 'initial_call' | 'retry_call' | 'follow_up';
  autoExecution: boolean;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardAnalytics {
  totalContacts: number;
  callsToday: number;
  successRate: number;
  appointmentsConfirmed: number;
  noShowRate: number;
  recentActivity: any[];
}

export interface ContactStats {
  total: number;
  pending: number;
  confirmed: number;
}

export interface ContactGroup {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  color: string;
  contactCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface GroupMembership {
  contactId: string;
  groupId: string;
  addedAt: string;
  addedBy: string;
  // Optional display properties for UI purposes
  groupName?: string;
  groupColor?: string;
}

export interface Location {
  id: string;
  tenantId: string;
  name: string;
  address?: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
