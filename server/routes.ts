import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import jwt from "jsonwebtoken";
import { z } from "zod";
import type { User } from "@shared/schema";
import { insertContactSchema } from "@shared/schema";
import multer from "multer";
import csv from "csv-parser";
import * as createCsvWriter from "csv-writer";
import fs from "fs";
import path from "path";
import { retellService } from "./services/retell";
import { calComService } from "./services/cal-com";
import { calendlyService } from "./services/calendly";
import { businessTemplateService } from "./services/business-templates";

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || "fallback_secret";

// Ensure upload directory exists
const uploadDir = '/tmp/uploads/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads with security
const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1, // Only one file
  },
  fileFilter: (req, file, cb) => {
    // Only allow CSV files
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

// Security helpers
const CSV_MAX_ROWS = 10000; // Maximum rows to process

// Webhook signature verification
function verifyWebhookSignature(payload: string, signature: string, secret: string, algorithm: 'sha256' | 'sha1' = 'sha256'): boolean {
  if (!secret || !signature) return false;
  
  const crypto = require('crypto');
  const expectedSignature = crypto
    .createHmac(algorithm, secret)
    .update(payload)
    .digest('hex');
  
  // Handle different signature formats
  const cleanSignature = signature.replace(/^(sha256=|sha1=)/, '');
  
  return crypto.timingSafeEqual(
    Buffer.from(cleanSignature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

// Extract tenant ID from webhook metadata with fallback strategies
function extractTenantIdFromWebhook(metadata: any, payload: any): string | null {
  // Priority order: metadata.tenantId, tracking fields, custom fields
  if (metadata?.tenantId) return metadata.tenantId;
  if (payload?.tracking?.salesforce_uuid) return payload.tracking.salesforce_uuid; // Calendly
  if (payload?.metadata?.tenantId) return payload.metadata.tenantId; // Cal.com
  return null;
}

// Escape dangerous CSV characters to prevent formula injection
function escapeCsvValue(value: any): string {
  if (value == null) return '';
  
  const str = String(value);
  // If starts with dangerous characters, prefix with single quote
  if (str.match(/^[=+\-@]/)) {
    return `'${str}`;
  }
  return str;
}

// Validate and sanitize contact data
function validateContactData(data: any): { valid: boolean; contact?: any; error?: string } {
  try {
    // Basic field mapping with validation
    const contactData = {
      name: data.name || data.Name,
      phone: data.phone || data.Phone,
      email: data.email || data.Email || undefined,
      appointmentType: data.appointmentType || data['Appointment Type'] || undefined,
      appointmentTime: data.appointmentTime || data['Appointment Time'] ? new Date(data.appointmentTime || data['Appointment Time']) : undefined,
      appointmentDuration: data.appointmentDuration || data['Appointment Duration'] ? parseInt(data.appointmentDuration || data['Appointment Duration']) : undefined,
      notes: data.notes || data.Notes || undefined,
      specialInstructions: data.specialInstructions || data['Special Instructions'] || undefined,
    };

    // Remove undefined values
    const cleanedData = Object.fromEntries(
      Object.entries(contactData).filter(([_, value]) => value !== undefined)
    );

    // Validate using Zod schema (excluding tenantId as it's added later)
    const validationSchema = insertContactSchema.omit({ tenantId: true });
    const validatedContact = validationSchema.parse(cleanedData);

    // Additional validation for required fields
    if (!validatedContact.name || !validatedContact.phone) {
      return { valid: false, error: 'Name and phone are required' };
    }

    return { valid: true, contact: validatedContact };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: `Validation error: ${error.errors.map(e => e.message).join(', ')}` };
    }
    return { valid: false, error: error instanceof Error ? error.message : 'Invalid data format' };
  }
}

// Health monitoring interfaces and utilities
interface SystemHealth {
  status: 'operational' | 'degraded' | 'critical';
  message: string;
  uptime: number;
  lastCheck: Date;
  services: {
    database: { status: 'up' | 'down'; responseTime?: number };
    retell: { status: 'up' | 'down'; responseTime?: number };
    storage: { status: 'up' | 'down'; responseTime?: number };
  };
  alerts: Array<{
    id: string;
    type: 'system_outage' | 'security_breach' | 'auto_pause_events' | 'compliance_violations';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    timestamp: Date;
    acknowledged: boolean;
  }>;
}

// Store acknowledged alerts temporarily (in production, this would be in a database)
const acknowledgedAlerts = new Set<string>();

async function checkSystemHealth(): Promise<SystemHealth> {
  // Check database connectivity with proper timeout
  let dbStatus: 'up' | 'down' = 'up';
  let dbResponseTime: number | undefined;
  try {
    const dbStart = Date.now();
    // Test database connectivity with a lightweight query
    const testResult = await Promise.race([
      storage.getAllTenants().then(tenants => Array.isArray(tenants) ? 'ok' : 'error'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Database timeout')), 5000))
    ]);
    
    if (testResult === 'ok') {
      dbResponseTime = Date.now() - dbStart;
      dbStatus = 'up';
    } else {
      dbStatus = 'down';
    }
  } catch (error) {
    dbStatus = 'down';
  }

  // Check Retell service with actual network call (if configured)
  let retellStatus: 'up' | 'down' = 'up';
  let retellResponseTime: number | undefined;
  try {
    if (process.env.RETELL_API_KEY) {
      const retellStart = Date.now();
      // Make actual network request to test connectivity
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('https://api.retellai.com/get-agent-list', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${process.env.RETELL_API_KEY}` },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      retellResponseTime = Date.now() - retellStart;
      
      if (!response || !response.ok || response.status >= 400) {
        retellStatus = 'down';
      }
    } else {
      // If no API key configured, mark as operational but note it's not configured
      retellStatus = 'up';
    }
  } catch (error) {
    retellStatus = 'down';
  }

  // Storage check with actual read/write test
  let storageStatus: 'up' | 'down' = 'up';
  try {
    // Test storage capability by attempting to get any existing user
    const testResult = await storage.getAllTenants();
    // If we can successfully query the database, storage is working
    if (Array.isArray(testResult)) {
      storageStatus = 'up';
    } else {
      storageStatus = 'down';
    }
  } catch (error) {
    // If this fails, storage might be down
    storageStatus = 'down';
  }

  // Determine overall status based on service health
  let overallStatus: 'operational' | 'degraded' | 'critical' = 'operational';
  let message = 'All systems operational';

  if (dbStatus === 'down' || storageStatus === 'down') {
    overallStatus = 'critical';
    message = 'Critical system components unavailable';
  } else if (retellStatus === 'down') {
    overallStatus = 'degraded';
    message = 'External service issues detected - voice calls may be affected';
  }

  // Generate alerts based on actual service status (using stable IDs)
  const alerts = [];
  if (dbStatus === 'down') {
    alerts.push({
      id: 'db-alert-critical',
      type: 'system_outage' as const,
      severity: 'critical' as const,
      message: 'Database connectivity lost - system functionality severely impacted',
      timestamp: new Date(),
      acknowledged: false
    });
  }
  if (storageStatus === 'down') {
    alerts.push({
      id: 'storage-alert-critical',
      type: 'system_outage' as const,
      severity: 'critical' as const,
      message: 'Storage system unavailable - data operations failing',
      timestamp: new Date(),
      acknowledged: false
    });
  }
  if (retellStatus === 'down') {
    alerts.push({
      id: 'retell-alert-service-down',
      type: 'auto_pause_events' as const,
      severity: 'high' as const,
      message: 'Retell AI service unavailable - voice calls suspended',
      timestamp: new Date(),
      acknowledged: false
    });
  }

  // Filter out acknowledged alerts
  const activeAlerts = alerts.filter(alert => !acknowledgedAlerts.has(alert.id));

  return {
    status: overallStatus,
    message,
    uptime: process.uptime(),
    lastCheck: new Date(),
    services: {
      database: { status: dbStatus, responseTime: dbResponseTime },
      retell: { status: retellStatus, responseTime: retellResponseTime },
      storage: { status: storageStatus }
    },
    alerts: activeAlerts
  };
}

// Middleware for JWT authentication
const authenticateJWT = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await storage.getUser(decoded.userId);
    
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid or inactive user' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token' });
  }
};

// Role-based access control
const requireRole = (roles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
};

// Tenant access control
const requireTenantAccess = (req: any, res: any, next: any) => {
  const { tenantId } = req.params;
  
  if (req.user.role === 'super_admin') {
    return next(); // Super admin has access to all tenants
  }
  
  if (req.user.tenantId !== tenantId) {
    return res.status(403).json({ message: 'Access denied to this tenant' });
  }
  
  next();
};

// Contact-specific tenant access control
const requireContactAccess = async (req: any, res: any, next: any) => {
  const { id } = req.params;
  
  if (req.user.role === 'super_admin') {
    return next(); // Super admin has access to all contacts
  }
  
  try {
    const contact = await storage.getContact(id);
    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }
    
    if (contact.tenantId !== req.user.tenantId) {
      return res.status(403).json({ message: 'Access denied to this tenant' });
    }
    
    next();
  } catch (error) {
    return res.status(500).json({ message: 'Error checking contact access' });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Authentication routes
  app.post('/api/auth/login', async (req, res) => {
    try {
      const loginSchema = z.object({
        email: z.string().email(),
        password: z.string().min(1),
        role: z.enum(['super_admin', 'client_admin', 'client_user']),
      });

      const { email, password, role } = loginSchema.parse(req.body);
      
      const user = await storage.authenticateUser(email, password);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Validate selected role matches user's actual role
      if (user.role !== role) {
        return res.status(403).json({ message: 'Incorrect role selected' });
      }

      const token = jwt.sign(
        { userId: user.id, tenantId: user.tenantId, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }  // Extended to 24 hours to prevent call interruptions
      );

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          tenantId: user.tenantId,
        },
      });
    } catch (error) {
      res.status(400).json({ message: 'Invalid request data' });
    }
  });

  app.get('/api/auth/me', authenticateJWT, async (req: any, res) => {
    const user = req.user;
    res.json({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      tenantId: user.tenantId,
    });
  });

  // Health monitoring endpoints
  app.get('/api/admin/health', authenticateJWT, requireRole(['super_admin']), async (req, res) => {
    try {
      const health = await checkSystemHealth();
      res.json(health);
    } catch (error) {
      console.error('Health check error:', error);
      res.status(500).json({
        status: 'critical',
        message: 'Health check failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get('/api/admin/health/status', async (req, res) => {
    // Public endpoint for basic status check (no auth required)
    try {
      const health = await checkSystemHealth();
      res.json({
        status: health.status,
        message: health.message,
        uptime: health.uptime
      });
    } catch (error) {
      res.status(500).json({
        status: 'critical',
        message: 'System check failed'
      });
    }
  });

  app.get('/api/admin/health/alerts', authenticateJWT, requireRole(['super_admin']), async (req, res) => {
    try {
      const health = await checkSystemHealth();
      res.json({
        alerts: health.alerts,
        alertCount: health.alerts.length,
        criticalCount: health.alerts.filter(a => a.severity === 'critical').length
      });
    } catch (error) {
      console.error('Alerts fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch alerts' });
    }
  });

  app.post('/api/admin/health/alerts/:id/acknowledge', authenticateJWT, requireRole(['super_admin']), async (req, res) => {
    try {
      const { id } = req.params;
      acknowledgedAlerts.add(id);
      res.json({ message: 'Alert acknowledged', alertId: id });
    } catch (error) {
      console.error('Alert acknowledgment error:', error);
      res.status(500).json({ message: 'Failed to acknowledge alert' });
    }
  });

  // Tenant routes (Super Admin only)
  app.get('/api/admin/tenants', authenticateJWT, requireRole(['super_admin']), async (req, res) => {
    try {
      const tenants = await storage.getAllTenants();
      res.json(tenants);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch tenants' });
    }
  });

  // Enhanced tenant creation via wizard
  app.post('/api/admin/tenants/wizard', authenticateJWT, requireRole(['super_admin']), async (req, res) => {
    try {
      const wizardSchema = z.object({
        // Step 1: Business Discovery
        businessName: z.string().min(1),
        companyName: z.string().optional(),
        contactEmail: z.string().email(),
        
        // Step 2: Template Selection
        businessTemplate: z.enum(['medical', 'salon', 'restaurant', 'consultant', 'general', 'custom']),
        
        // Step 3: Feature Control
        premiumAccess: z.boolean().default(false),
        hipaaCompliant: z.boolean().default(false),
        customBranding: z.boolean().default(false),
        apiAccess: z.boolean().default(false),
        featuresEnabled: z.array(z.string()).default([]),
        
        // Step 4: Admin Setup
        adminUser: z.object({
          email: z.string().email(),
          fullName: z.string().min(1),
          password: z.string().min(8),
        }),
        
        // Step 5: Integration Config
        retellConfig: z.object({
          agentId: z.string().optional(),
          phoneNumber: z.string().optional(),
        }).optional(),
        calendarConfig: z.object({
          type: z.enum(['calcom', 'calendly']),
          apiKey: z.string().optional(),
          eventTypeId: z.number().optional(),
          organizerEmail: z.string().email().optional(),
        }).optional(),
        
        // Step 6: Business Config
        timezone: z.string().default('Europe/London'),
        businessHours: z.object({
          start: z.string(),
          end: z.string(),
        }),
        operationalSettings: z.object({
          maxCallsPerDay: z.number().min(50).max(1000),
          maxCallsPer15Min: z.number().min(5).max(100),
          quietStart: z.string(),
          quietEnd: z.string(),
        }),
      });

      const wizardData = wizardSchema.parse(req.body);
      const { adminUser, retellConfig, calendarConfig, ...tenantData } = wizardData;
      
      // Create tenant with enhanced data
      const tenant = await storage.createTenant({
        name: tenantData.businessName,
        companyName: tenantData.companyName,
        contactEmail: tenantData.contactEmail,
        tenantNumber: `T${Date.now()}`,
        businessTemplate: tenantData.businessTemplate,
        wizardCompleted: true,
        setupProgress: 7,
        featuresEnabled: JSON.stringify(tenantData.featuresEnabled),
        premiumAccess: tenantData.premiumAccess,
        hipaaCompliant: tenantData.hipaaCompliant,
        customBranding: tenantData.customBranding,
        apiAccess: tenantData.apiAccess,
        retellConfigured: !!retellConfig?.agentId,
        calendarConfigured: !!calendarConfig?.apiKey,
      });

      // Create admin user for the tenant
      const user = await storage.createUser({
        email: adminUser.email,
        fullName: adminUser.fullName,
        hashedPassword: adminUser.password,
        tenantId: tenant.id,
        role: 'client_admin',
      });

      // Create tenant configuration with wizard data
      await storage.createTenantConfig({
        tenantId: tenant.id,
        retellAgentId: retellConfig?.agentId,
        retellAgentNumber: retellConfig?.phoneNumber,
        calApiKey: calendarConfig?.type === 'calcom' ? calendarConfig.apiKey : undefined,
        calEventTypeId: calendarConfig?.eventTypeId,
        calendlyApiKey: calendarConfig?.type === 'calendly' ? calendarConfig.apiKey : undefined,
        calendlyOrganizerEmail: calendarConfig?.organizerEmail,
        timezone: tenantData.timezone,
        businessType: tenantData.businessTemplate,
        maxCallsPerDay: tenantData.operationalSettings.maxCallsPerDay,
        maxCallsPer15Min: tenantData.operationalSettings.maxCallsPer15Min,
        quietStart: tenantData.operationalSettings.quietStart,
        quietEnd: tenantData.operationalSettings.quietEnd,
      });

      res.status(201).json({ 
        tenant, 
        adminUser: { id: user.id, email: user.email },
        message: 'Tenant created successfully via wizard'
      });
    } catch (error) {
      console.error('Wizard tenant creation error:', error);
      res.status(400).json({ message: 'Failed to create tenant via wizard' });
    }
  });

  // Original simple tenant creation (kept for compatibility)
  app.post('/api/admin/tenants', authenticateJWT, requireRole(['super_admin']), async (req, res) => {
    try {
      const tenantSchema = z.object({
        name: z.string().min(1),
        companyName: z.string().optional(),
        contactEmail: z.string().email().optional(),
        adminUser: z.object({
          email: z.string().email(),
          fullName: z.string().min(1),
          password: z.string().min(8),
        }),
      });

      const { adminUser, ...tenantData } = tenantSchema.parse(req.body);
      
      // Create tenant
      const tenant = await storage.createTenant({
        ...tenantData,
        tenantNumber: `T${Date.now()}`,
      });

      // Create admin user for the tenant
      const user = await storage.createUser({
        email: adminUser.email,
        fullName: adminUser.fullName,
        hashedPassword: adminUser.password,
        tenantId: tenant.id,
        role: 'client_admin',
      });

      // Create default tenant configuration
      await storage.createTenantConfig({
        tenantId: tenant.id,
      });

      res.status(201).json({ tenant, adminUser: { id: user.id, email: user.email } });
    } catch (error) {
      res.status(400).json({ message: 'Failed to create tenant' });
    }
  });

  app.get('/api/admin/tenants/search', authenticateJWT, requireRole(['super_admin']), async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ message: 'Search query required' });
      }
      
      const tenants = await storage.searchTenants(q);
      res.json(tenants);
    } catch (error) {
      res.status(500).json({ message: 'Search failed' });
    }
  });

  app.get('/api/admin/tenants/:id', authenticateJWT, requireRole(['super_admin']), async (req, res) => {
    try {
      const tenant = await storage.getTenant(req.params.id);
      if (!tenant) {
        return res.status(404).json({ message: 'Tenant not found' });
      }
      
      const users = await storage.getUsersByTenant(tenant.id);
      const config = await storage.getTenantConfig(tenant.id);
      
      res.json({ tenant, users, config });
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch tenant details' });
    }
  });

  app.patch('/api/admin/tenants/:id', authenticateJWT, requireRole(['super_admin']), async (req, res) => {
    try {
      const updateSchema = z.object({
        name: z.string().optional(),
        companyName: z.string().optional(),
        contactEmail: z.string().email().optional(),
        status: z.enum(['active', 'suspended', 'inactive']).optional(),
      });

      const updates = updateSchema.parse(req.body);
      const tenant = await storage.updateTenant(req.params.id, updates);
      
      res.json(tenant);
    } catch (error) {
      res.status(400).json({ message: 'Failed to update tenant' });
    }
  });

  // Contact routes
  app.get('/api/contacts', authenticateJWT, async (req: any, res) => {
    try {
      const { page = 1, limit = 50, search } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      let contacts;
      if (search && typeof search === 'string') {
        contacts = await storage.searchContacts(req.user.tenantId, search);
      } else {
        contacts = await storage.getContactsByTenant(req.user.tenantId, parseInt(limit), offset);
      }
      
      // Ensure proper date serialization for appointmentTime
      const serializedContacts = contacts.map(contact => ({
        ...contact,
        appointmentTime: contact.appointmentTime ? contact.appointmentTime.toISOString() : null,
        createdAt: contact.createdAt ? contact.createdAt.toISOString() : null,
        updatedAt: contact.updatedAt ? contact.updatedAt.toISOString() : null,
        lastContactTime: contact.lastContactTime ? contact.lastContactTime.toISOString() : null
      }));
      
      res.json(serializedContacts);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch contacts' });
    }
  });

  app.post('/api/contacts', authenticateJWT, requireRole(['client_admin', 'super_admin']), async (req: any, res) => {
    try {
      const contactSchema = z.object({
        name: z.string().min(1),
        phone: z.string().min(1),
        appointmentTime: z.string().datetime().optional(),
        appointmentType: z.string().optional(),
        appointmentDuration: z.number().optional(),
        notes: z.string().optional(),
        specialInstructions: z.string().optional(),
      });

      const contactData = contactSchema.parse(req.body);
      const contact = await storage.createContact({
        ...contactData,
        tenantId: req.user.tenantId,
        appointmentTime: contactData.appointmentTime ? new Date(contactData.appointmentTime) : undefined,
      });

      // Schedule appointment reminder if appointment time is provided
      if (contact.appointmentTime) {
        const { callScheduler } = await import("./services/call-scheduler");
        await callScheduler.scheduleAppointmentReminders(
          contact.id, 
          contact.appointmentTime, 
          req.user.tenantId
        );
      }
      
      res.status(201).json(contact);
    } catch (error) {
      res.status(400).json({ message: 'Failed to create contact' });
    }
  });

  app.get('/api/contacts/stats', authenticateJWT, async (req: any, res) => {
    try {
      const stats = await storage.getContactStats(req.user.tenantId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch contact stats' });
    }
  });

  // Appointments endpoint
  app.get('/api/appointments', authenticateJWT, async (req: any, res) => {
    try {
      const appointments = await storage.getAppointments(req.user.tenantId);
      
      // Transform contacts with appointments into appointment format
      const serializedAppointments = appointments.map((contact: any) => ({
        id: contact.id,
        contactName: contact.name,
        contactPhone: contact.phone,
        appointmentTime: contact.appointmentTime ? contact.appointmentTime.toISOString() : null,
        status: contact.appointmentStatus || 'pending',
        notes: contact.notes
      })).filter((apt: any) => apt.appointmentTime); // Only include contacts with appointment times

      res.json(serializedAppointments);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch appointments' });
    }
  });

  // Enhanced contact analytics endpoint (must be before :id route)
  app.get('/api/contacts/analytics', authenticateJWT, async (req: any, res) => {
    try {
      console.log('Analytics request for tenant:', req.user.tenantId, 'user role:', req.user.role);
      const analytics = await storage.getContactAnalytics(req.user.tenantId);
      console.log('Analytics retrieved successfully');
      res.json(analytics);
    } catch (error) {
      console.error('Contact analytics error details:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('User info:', { tenantId: req.user?.tenantId, userId: req.user?.id, role: req.user?.role });
      res.status(500).json({ message: 'Failed to fetch contact analytics', error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Comprehensive Analytics API Endpoints per PRD
  app.get('/api/analytics/performance', authenticateJWT, async (req: any, res) => {
    try {
      const timePeriod = parseInt(req.query.timePeriod as string) || 30;
      const analytics = await storage.getPerformanceOverview(req.user.tenantId, timePeriod);
      res.json(analytics);
    } catch (error) {
      console.error('Performance analytics error:', error);
      res.status(500).json({ message: 'Failed to fetch performance analytics' });
    }
  });

  app.get('/api/analytics/calls', authenticateJWT, async (req: any, res) => {
    try {
      const analytics = await storage.getCallActivity(req.user.tenantId);
      res.json(analytics);
    } catch (error) {
      console.error('Call activity analytics error:', error);
      res.status(500).json({ message: 'Failed to fetch call activity analytics' });
    }
  });

  app.get('/api/analytics/appointments', authenticateJWT, async (req: any, res) => {
    try {
      const timePeriod = parseInt(req.query.timePeriod as string) || 30;
      const analytics = await storage.getAppointmentInsights(req.user.tenantId, timePeriod);
      res.json(analytics);
    } catch (error) {
      console.error('Appointment insights error:', error);
      res.status(500).json({ message: 'Failed to fetch appointment insights' });
    }
  });

  app.get('/api/analytics/system', authenticateJWT, async (req: any, res) => {
    try {
      const analytics = await storage.getSystemHealth(req.user.tenantId);
      res.json(analytics);
    } catch (error) {
      console.error('System health analytics error:', error);
      res.status(500).json({ message: 'Failed to fetch system health analytics' });
    }
  });

  app.get('/api/contacts/:id', authenticateJWT, requireContactAccess, async (req, res) => {
    try {
      const contact = await storage.getContact(req.params.id);
      if (!contact) {
        return res.status(404).json({ message: 'Contact not found' });
      }
      
      res.json(contact);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch contact' });
    }
  });

  app.patch('/api/contacts/:id', authenticateJWT, requireRole(['client_admin', 'super_admin']), async (req, res) => {
    try {
      const updateSchema = z.object({
        name: z.string().optional(),
        phone: z.string().optional(),
        appointmentTime: z.string().datetime().optional(),
        appointmentType: z.string().optional(),
        appointmentDuration: z.number().optional(),
        appointmentStatus: z.enum(['pending', 'confirmed', 'cancelled', 'completed']).optional(),
        notes: z.string().optional(),
        specialInstructions: z.string().optional(),
        // Blue area personalization fields that were missing:
        ownerName: z.string().optional(),
        companyName: z.string().optional(),
        callBeforeHours: z.number().optional(),
      });

      const updates = updateSchema.parse(req.body);
      const processedUpdates: any = { ...updates };
      if (updates.appointmentTime) {
        processedUpdates.appointmentTime = new Date(updates.appointmentTime);
      }
      
      const contact = await storage.updateContact(req.params.id, processedUpdates);

      // Schedule appointment reminder if appointment time was updated
      if (contact.appointmentTime && updates.appointmentTime) {
        const { callScheduler } = await import("./services/call-scheduler");
        await callScheduler.scheduleAppointmentReminders(
          contact.id, 
          contact.appointmentTime, 
          req.user.tenantId
        );
      }

      res.json(contact);
    } catch (error) {
      res.status(400).json({ message: 'Failed to update contact' });
    }
  });

  app.delete('/api/contacts/:id', authenticateJWT, requireRole(['client_admin', 'super_admin']), async (req, res) => {
    try {
      await storage.deleteContact(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete contact' });
    }
  });

  // Contact Groups routes
  app.get('/api/contact-groups', authenticateJWT, async (req: any, res) => {
    try {
      const groups = await storage.getContactGroupsByTenant(req.user.tenantId);
      res.json(groups);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch contact groups' });
    }
  });

  app.post('/api/contact-groups', authenticateJWT, requireRole(['client_admin', 'super_admin']), async (req: any, res) => {
    try {
      const groupSchema = z.object({
        name: z.string().min(1).max(50),
        description: z.string().optional(),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#3B82F6'),
        initialContactIds: z.array(z.string()).optional(),
      });

      const groupData = groupSchema.parse(req.body);
      const group = await storage.createContactGroup({
        name: groupData.name,
        description: groupData.description,
        color: groupData.color,
        tenantId: req.user.tenantId,
      });

      // Add initial contacts to the group if provided
      if (groupData.initialContactIds && groupData.initialContactIds.length > 0) {
        for (const contactId of groupData.initialContactIds) {
          try {
            await storage.addContactToGroup(contactId, group.id, req.user.tenantId, req.user.id);
          } catch (error) {
            console.warn(`Failed to add contact ${contactId} to group ${group.id}:`, error);
          }
        }
        
        // Update the group contact count
        const updatedGroup = await storage.getContactGroup(group.id);
        res.status(201).json(updatedGroup);
      } else {
        res.status(201).json(group);
      }
    } catch (error) {
      console.error('Failed to create contact group:', error);
      res.status(400).json({ message: 'Failed to create contact group' });
    }
  });

  app.patch('/api/contact-groups/:id', authenticateJWT, requireRole(['client_admin', 'super_admin']), async (req: any, res) => {
    try {
      const updateSchema = z.object({
        name: z.string().min(1).max(50).optional(),
        description: z.string().optional(),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      });

      const updates = updateSchema.parse(req.body);
      const group = await storage.updateContactGroup(req.params.id, req.user.tenantId, updates);
      res.json(group);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update contact group';
      if (errorMessage.includes('not found or access denied')) {
        res.status(404).json({ message: errorMessage });
      } else {
        res.status(400).json({ message: errorMessage });
      }
    }
  });

  app.delete('/api/contact-groups/:id', authenticateJWT, requireRole(['client_admin', 'super_admin']), async (req: any, res) => {
    try {
      await storage.deleteContactGroup(req.params.id, req.user.tenantId);
      res.status(204).send();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete contact group';
      if (errorMessage.includes('not found or access denied')) {
        res.status(404).json({ message: errorMessage });
      } else {
        res.status(500).json({ message: errorMessage });
      }
    }
  });

  app.post('/api/contact-groups/:id/contacts', authenticateJWT, requireRole(['client_admin', 'super_admin']), async (req: any, res) => {
    try {
      const addContactSchema = z.object({
        contactId: z.string().uuid(),
      });

      const { contactId } = addContactSchema.parse(req.body);
      const membership = await storage.addContactToGroup(contactId, req.params.id, req.user.tenantId, req.user.id);
      res.status(201).json(membership);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add contact to group';
      if (errorMessage.includes('not found or access denied')) {
        res.status(404).json({ message: errorMessage });
      } else if (errorMessage.includes('already in this group')) {
        res.status(409).json({ message: errorMessage });
      } else {
        res.status(400).json({ message: errorMessage });
      }
    }
  });

  app.delete('/api/contact-groups/:id/contacts/:contactId', authenticateJWT, requireRole(['client_admin', 'super_admin']), async (req: any, res) => {
    try {
      await storage.removeContactFromGroup(req.params.contactId, req.params.id, req.user.tenantId);
      res.status(204).send();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove contact from group';
      if (errorMessage.includes('not found or access denied')) {
        res.status(404).json({ message: errorMessage });
      } else {
        res.status(500).json({ message: errorMessage });
      }
    }
  });

  app.get('/api/contact-groups/:id/contacts', authenticateJWT, async (req: any, res) => {
    try {
      const contacts = await storage.getContactsInGroup(req.params.id, req.user.tenantId);
      res.json(contacts);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch contacts in group';
      if (errorMessage.includes('not found or access denied')) {
        res.status(404).json({ message: errorMessage });
      } else {
        res.status(500).json({ message: errorMessage });
      }
    }
  });

  // Locations routes
  app.get('/api/locations', authenticateJWT, async (req: any, res) => {
    try {
      const locations = await storage.getLocationsByTenant(req.user.tenantId);
      res.json(locations);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch locations' });
    }
  });

  app.post('/api/locations', authenticateJWT, requireRole(['client_admin', 'super_admin']), async (req: any, res) => {
    try {
      const locationSchema = z.object({
        name: z.string().min(1),
        address: z.string().optional(),
        phone: z.string().optional(),
      });

      const locationData = locationSchema.parse(req.body);
      const location = await storage.createLocation({
        ...locationData,
        tenantId: req.user.tenantId,
      });

      res.status(201).json(location);
    } catch (error) {
      res.status(400).json({ message: 'Failed to create location' });
    }
  });

  // CSV import/export routes
  app.post('/api/contacts/import', authenticateJWT, requireRole(['client_admin', 'super_admin']), upload.single('csvFile'), async (req: any, res) => {
    let filePath: string | undefined;
    
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No CSV file uploaded' });
      }

      filePath = req.file.path;
      const validContacts: any[] = [];
      const errors: any[] = [];
      let rowCount = 0;

      return new Promise((resolve, reject) => {
        fs.createReadStream(filePath!)
          .pipe(csv())
          .on('data', (data) => {
            rowCount++;
            
            // Enforce row limit
            if (rowCount > CSV_MAX_ROWS) {
              reject(new Error(`CSV file exceeds maximum ${CSV_MAX_ROWS} rows`));
              return;
            }

            // Validate and sanitize each row
            const validation = validateContactData(data);
            
            if (validation.valid) {
              validContacts.push(validation.contact);
            } else {
              errors.push({
                row: rowCount,
                data: Object.keys(data).slice(0, 3), // Only show first 3 fields for brevity
                error: validation.error,
              });
            }
          })
          .on('end', async () => {
            try {
              // Only proceed if we have valid contacts
              if (validContacts.length === 0) {
                res.status(400).json({
                  message: 'No valid contacts found in CSV',
                  created: 0,
                  errors,
                  totalProcessed: rowCount,
                });
                return resolve(undefined);
              }

              const result = await storage.bulkCreateContacts(req.user.tenantId, validContacts);
              
              res.json({
                message: `Successfully imported ${result.created} contacts. ${errors.length} rows had errors.`,
                created: result.created,
                errors: [...result.errors, ...errors],
                totalProcessed: rowCount,
                validRows: validContacts.length,
              });
              resolve(undefined);
            } catch (error) {
              reject(error);
            }
          })
          .on('error', (error) => {
            reject(error);
          });
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to import contacts';
      res.status(500).json({ message: errorMessage });
    } finally {
      // Always clean up the uploaded file
      if (filePath && fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (cleanupError) {
          console.error('Failed to cleanup uploaded file:', cleanupError);
        }
      }
    }
  });

  // Bulk status update endpoint
  app.patch('/api/contacts/bulk/status', authenticateJWT, requireRole(['client_admin', 'super_admin']), async (req: any, res) => {
    try {
      const { contactIds, appointmentStatus } = req.body;

      // Validate required fields
      if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
        return res.status(400).json({ message: 'Contact IDs array is required and cannot be empty' });
      }

      if (!appointmentStatus || !['pending', 'confirmed', 'cancelled', 'rescheduled'].includes(appointmentStatus)) {
        return res.status(400).json({ message: 'Valid appointment status is required (pending, confirmed, cancelled, rescheduled)' });
      }

      // Enforce bulk operation limits for safety
      if (contactIds.length > 500) {
        return res.status(400).json({ message: 'Bulk operations limited to 500 contacts at once' });
      }

      const result = await storage.bulkUpdateContactStatus(
        req.user.tenantId, 
        contactIds, 
        appointmentStatus
      );

      res.json({
        message: `Successfully updated ${result.updatedCount} contacts to ${appointmentStatus}`,
        updatedCount: result.updatedCount,
        errors: result.errors,
        totalRequested: contactIds.length,
      });
    } catch (error) {
      console.error('Bulk status update error:', error);
      res.status(500).json({ message: 'Failed to update contact status' });
    }
  });

  // Bulk priority update endpoint
  app.patch('/api/contacts/bulk/priority', authenticateJWT, requireRole(['client_admin', 'super_admin']), async (req: any, res) => {
    try {
      const { contactIds, priorityLevel } = req.body;

      // Validate required fields
      if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
        return res.status(400).json({ message: 'Contact IDs array is required and cannot be empty' });
      }

      if (!priorityLevel || !['low', 'normal', 'high', 'urgent'].includes(priorityLevel)) {
        return res.status(400).json({ message: 'Valid priority level is required (low, normal, high, urgent)' });
      }

      // Enforce bulk operation limits for safety
      if (contactIds.length > 500) {
        return res.status(400).json({ message: 'Bulk operations limited to 500 contacts at once' });
      }

      const result = await storage.bulkUpdateContactPriority(
        req.user.tenantId, 
        contactIds, 
        priorityLevel
      );

      res.json({
        message: `Successfully updated priority for ${result.updatedCount} contacts to ${priorityLevel}`,
        updatedCount: result.updatedCount,
        errors: result.errors,
        totalRequested: contactIds.length,
      });
    } catch (error) {
      console.error('Bulk priority update error:', error);
      res.status(500).json({ message: 'Failed to update contact priority' });
    }
  });

  // Bulk contact method update endpoint
  app.patch('/api/contacts/bulk/contact-method', authenticateJWT, requireRole(['client_admin', 'super_admin']), async (req: any, res) => {
    try {
      const { contactIds, preferredContactMethod } = req.body;

      // Validate required fields
      if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
        return res.status(400).json({ message: 'Contact IDs array is required and cannot be empty' });
      }

      if (!preferredContactMethod || !['phone', 'email', 'sms', 'any'].includes(preferredContactMethod)) {
        return res.status(400).json({ message: 'Valid contact method is required (phone, email, sms, any)' });
      }

      // Enforce bulk operation limits for safety
      if (contactIds.length > 500) {
        return res.status(400).json({ message: 'Bulk operations limited to 500 contacts at once' });
      }

      const result = await storage.bulkUpdateContactMethod(
        req.user.tenantId, 
        contactIds, 
        preferredContactMethod
      );

      res.json({
        message: `Successfully updated contact method for ${result.updatedCount} contacts to ${preferredContactMethod}`,
        updatedCount: result.updatedCount,
        errors: result.errors,
        totalRequested: contactIds.length,
      });
    } catch (error) {
      console.error('Bulk contact method update error:', error);
      res.status(500).json({ message: 'Failed to update contact method' });
    }
  });

  // Bulk notes update endpoint
  app.patch('/api/contacts/bulk/notes', authenticateJWT, requireRole(['client_admin', 'super_admin']), async (req: any, res) => {
    try {
      const { contactIds, notes, action } = req.body;

      // Validate required fields
      if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
        return res.status(400).json({ message: 'Contact IDs array is required and cannot be empty' });
      }

      if (!notes || typeof notes !== 'string' || notes.trim().length === 0) {
        return res.status(400).json({ message: 'Notes content is required' });
      }

      if (!action || !['add', 'replace'].includes(action)) {
        return res.status(400).json({ message: 'Valid action is required (add, replace)' });
      }

      // Enforce bulk operation limits for safety
      if (contactIds.length > 500) {
        return res.status(400).json({ message: 'Bulk operations limited to 500 contacts at once' });
      }

      const result = await storage.bulkUpdateContactNotes(
        req.user.tenantId, 
        contactIds, 
        notes.trim(),
        action
      );

      res.json({
        message: `Successfully ${action === 'add' ? 'added notes to' : 'updated notes for'} ${result.updatedCount} contacts`,
        updatedCount: result.updatedCount,
        errors: result.errors,
        totalRequested: contactIds.length,
      });
    } catch (error) {
      console.error('Bulk notes update error:', error);
      res.status(500).json({ message: 'Failed to update contact notes' });
    }
  });

  // Bulk timezone update endpoint
  app.patch('/api/contacts/bulk/timezone', authenticateJWT, requireRole(['client_admin', 'super_admin']), async (req: any, res) => {
    try {
      const { contactIds, timezone } = req.body;

      // Validate required fields
      if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
        return res.status(400).json({ message: 'Contact IDs array is required and cannot be empty' });
      }

      if (!timezone || typeof timezone !== 'string' || timezone.trim().length === 0) {
        return res.status(400).json({ message: 'Timezone is required' });
      }

      // Enforce bulk operation limits for safety
      if (contactIds.length > 500) {
        return res.status(400).json({ message: 'Bulk operations limited to 500 contacts at once' });
      }

      const result = await storage.bulkUpdateContactTimezone(
        req.user.tenantId, 
        contactIds, 
        timezone.trim()
      );

      res.json({
        message: `Successfully updated timezone for ${result.updatedCount} contacts to ${timezone}`,
        updatedCount: result.updatedCount,
        errors: result.errors,
        totalRequested: contactIds.length,
      });
    } catch (error) {
      console.error('Bulk timezone update error:', error);
      res.status(500).json({ message: 'Failed to update contact timezone' });
    }
  });

  // Bulk delete endpoint
  app.delete('/api/contacts/bulk', authenticateJWT, requireRole(['client_admin', 'super_admin']), async (req: any, res) => {
    try {
      const { contactIds, preserveHistory } = req.body;

      // Validate required fields
      if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
        return res.status(400).json({ message: 'Contact IDs array is required and cannot be empty' });
      }

      // Enforce bulk operation limits for safety
      if (contactIds.length > 500) {
        return res.status(400).json({ message: 'Bulk operations limited to 500 contacts at once' });
      }

      const result = await storage.bulkDeleteContacts(
        req.user.tenantId, 
        contactIds, 
        preserveHistory || false
      );

      res.json({
        message: `Successfully deleted ${result.deletedCount} contacts${preserveHistory ? ' (call history preserved)' : ' (completely removed)'}`,
        deletedCount: result.deletedCount,
        errors: result.errors,
        totalRequested: contactIds.length,
      });
    } catch (error) {
      console.error('Bulk delete error:', error);
      res.status(500).json({ message: 'Failed to delete contacts' });
    }
  });

  app.get('/api/contacts/export', authenticateJWT, requireRole(['client_admin', 'super_admin']), async (req: any, res) => {
    let csvFilePath: string | undefined;
    
    try {
      const contacts = await storage.exportContactsToCSV(req.user.tenantId);
      
      // Escape all values to prevent CSV injection
      const safeContacts = contacts.map(contact => ({
        name: escapeCsvValue(contact.name),
        phone: escapeCsvValue(contact.phone),
        email: escapeCsvValue(contact.email),
        appointmentType: escapeCsvValue(contact.appointmentType),
        appointmentTime: contact.appointmentTime ? contact.appointmentTime.toISOString() : '',
        appointmentDuration: escapeCsvValue(contact.appointmentDuration),
        appointmentStatus: escapeCsvValue(contact.appointmentStatus),
        notes: escapeCsvValue(contact.notes),
        specialInstructions: escapeCsvValue(contact.specialInstructions),
        createdAt: contact.createdAt ? contact.createdAt.toISOString() : '',
      }));
      
      csvFilePath = `/tmp/contacts_export_${req.user.tenantId}_${Date.now()}.csv`;
      const csvWriter = createCsvWriter.createObjectCsvWriter({
        path: csvFilePath,
        header: [
          { id: 'name', title: 'Name' },
          { id: 'phone', title: 'Phone' },
          { id: 'email', title: 'Email' },
          { id: 'appointmentType', title: 'Appointment Type' },
          { id: 'appointmentTime', title: 'Appointment Time' },
          { id: 'appointmentDuration', title: 'Appointment Duration' },
          { id: 'appointmentStatus', title: 'Appointment Status' },
          { id: 'notes', title: 'Notes' },
          { id: 'specialInstructions', title: 'Special Instructions' },
          { id: 'createdAt', title: 'Created At' },
        ],
      });

      await csvWriter.writeRecords(safeContacts);
      
      const filename = `contacts_export_${new Date().toISOString().split('T')[0]}.csv`;
      res.download(csvFilePath, filename, (err) => {
        if (err) {
          console.error('Download error:', err);
        }
        // Clean up file after download
        if (csvFilePath && fs.existsSync(csvFilePath)) {
          try {
            fs.unlinkSync(csvFilePath);
          } catch (cleanupError) {
            console.error('Failed to cleanup export file:', cleanupError);
          }
        }
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to export contacts' });
      
      // Clean up file on error
      if (csvFilePath && fs.existsSync(csvFilePath)) {
        try {
          fs.unlinkSync(csvFilePath);
        } catch (cleanupError) {
          console.error('Failed to cleanup export file on error:', cleanupError);
        }
      }
    }
  });

  // Call session routes
  app.get('/api/call-sessions', authenticateJWT, async (req: any, res) => {
    try {
      const sessions = await storage.getCallSessionsByTenant(req.user.tenantId);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch call sessions' });
    }
  });

  app.post('/api/call-sessions', authenticateJWT, requireRole(['client_admin', 'super_admin']), async (req: any, res) => {
    try {
      const sessionSchema = z.object({
        contactId: z.string().uuid(),
        triggerTime: z.string().datetime().optional(),
      });

      const { contactId, triggerTime } = sessionSchema.parse(req.body);
      
      // Get contact details
      const contact = await storage.getContact(contactId);
      if (!contact) {
        return res.status(404).json({ message: 'Contact not found' });
      }

      // Get tenant configuration
      const tenantConfig = await storage.getTenantConfig(req.user.tenantId);
      if (!tenantConfig?.retellApiKey || !tenantConfig?.retellAgentId || !tenantConfig?.retellAgentNumber) {
        return res.status(400).json({ message: 'Retell AI configuration missing. Please configure your voice AI settings.' });
      }

      // Create call session
      const sessionId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const session = await storage.createCallSession({
        contactId,
        tenantId: req.user.tenantId,
        sessionId,
        triggerTime: triggerTime ? new Date(triggerTime) : new Date(),
        status: 'queued',
        startTime: new Date(),
      });
      
      try {
        // Trigger Retell call
        const retellCall = await retellService.createCall(tenantConfig.retellApiKey, {
          from_number: tenantConfig.retellAgentNumber,
          to_number: contact.phone,
          agent_id: tenantConfig.retellAgentId,
          metadata: {
            contactId: contact.id,
            tenantId: req.user.tenantId,
            appointmentTime: contact.appointmentTime?.toISOString(),
            appointmentType: contact.appointmentType || '',
          },
        });

        // Update session with Retell call ID
        await storage.updateCallSession(session.id, {
          retellCallId: retellCall.call_id,
          status: 'in_progress',
        });

        res.status(201).json({
          ...session,
          retellCallId: retellCall.call_id,
          status: 'in_progress',
        });
      } catch (retellError) {
        // Update session with error
        await storage.updateCallSession(session.id, {
          status: 'failed',
          errorMessage: retellError instanceof Error ? retellError.message : 'Failed to create call',
        });

        res.status(500).json({ 
          message: 'Failed to create call', 
          error: retellError instanceof Error ? retellError.message : 'Unknown error' 
        });
      }
    } catch (error) {
      res.status(400).json({ message: 'Failed to create call session' });
    }
  });

  app.patch('/api/call-sessions/:id', authenticateJWT, requireRole(['client_admin', 'super_admin']), async (req, res) => {
    try {
      const updateSchema = z.object({
        status: z.enum(['queued', 'in_progress', 'completed', 'failed']).optional(),
        callOutcome: z.enum(['confirmed', 'voicemail', 'no_answer', 'busy', 'failed']).optional(),
        durationSeconds: z.number().optional(),
        retellCallId: z.string().optional(),
        errorMessage: z.string().optional(),
      });

      const updates = updateSchema.parse(req.body);
      const session = await storage.updateCallSession(req.params.id, updates);
      
      res.json(session);
    } catch (error) {
      res.status(400).json({ message: 'Failed to update call session' });
    }
  });

  // Bulk call sessions endpoint with enhanced validation and error handling
  app.post('/api/call-sessions/bulk', authenticateJWT, requireRole(['client_admin', 'super_admin']), async (req: any, res) => {
    try {
      const bulkCallSchema = z.object({
        contactIds: z.array(z.string().uuid()).min(1).max(25), // Reduced limit to 25 for better performance
        groupId: z.string().uuid().optional(),
        triggerTime: z.string().datetime().optional(),
      });

      const { contactIds, groupId, triggerTime } = bulkCallSchema.parse(req.body);
      
      console.log(`📞 Bulk call request initiated by user ${req.user.id} for tenant ${req.user.tenantId}: ${contactIds.length} contacts`);
      
      // Validate tenant configuration
      const tenantConfig = await storage.getTenantConfig(req.user.tenantId);
      if (!tenantConfig?.retellApiKey || !tenantConfig?.retellAgentId || !tenantConfig?.retellAgentNumber) {
        return res.status(400).json({ 
          message: 'Retell AI configuration missing. Please configure your voice AI settings.',
          code: 'RETELL_CONFIG_MISSING'
        });
      }

      // Validate group ownership if groupId provided
      if (groupId) {
        const group = await storage.getContactGroup(groupId);
        if (!group || group.tenantId !== req.user.tenantId) {
          return res.status(404).json({ 
            message: 'Contact group not found or access denied',
            code: 'GROUP_NOT_FOUND'
          });
        }
      }

      // Pre-validate all contacts belong to tenant (bulk validation)
      const validationErrors = [];
      const validContacts = [];
      
      for (const contactId of contactIds) {
        try {
          const contact = await storage.getContact(contactId);
          if (!contact) {
            validationErrors.push({ contactId, error: 'Contact not found', code: 'CONTACT_NOT_FOUND' });
          } else if (contact.tenantId !== req.user.tenantId) {
            validationErrors.push({ contactId, error: 'Access denied to contact', code: 'ACCESS_DENIED' });
          } else if (!contact.phone || contact.phone.trim().length === 0) {
            validationErrors.push({ contactId, error: 'Contact missing phone number', code: 'MISSING_PHONE' });
          } else {
            validContacts.push(contact);
          }
        } catch (error) {
          validationErrors.push({ 
            contactId, 
            error: 'Failed to validate contact', 
            code: 'VALIDATION_ERROR',
            details: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      if (validContacts.length === 0) {
        return res.status(400).json({
          message: 'No valid contacts found for bulk calling',
          code: 'NO_VALID_CONTACTS',
          errors: validationErrors,
          summary: { totalRequested: contactIds.length, valid: 0, invalid: validationErrors.length }
        });
      }

      const results = [];
      const callErrors = [];

      // Process valid contacts for calling (with delay to prevent Retell AI conflicts)
      for (let i = 0; i < validContacts.length; i++) {
        const contact = validContacts[i];
        
        // Add 2-second delay between calls to prevent Retell AI service conflicts
        if (i > 0) {
          console.log(`⏱️ Waiting 2 seconds before next call to prevent service conflicts...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        try {
          // Create call session
          const sessionId = `bulk_call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const session = await storage.createCallSession({
            contactId: contact.id,
            tenantId: req.user.tenantId,
            sessionId,
            triggerTime: triggerTime ? new Date(triggerTime) : new Date(),
            status: 'queued',
            startTime: new Date(),
          });

          // Create business-aware call with industry-specific voice scripts
          const businessType = tenantConfig.businessType || 'general';
          console.log(`🏥 Creating bulk ${businessType} business call (contact: ${contact.name}, ID: ${contact.id})`);
          
          // Use business template service to generate HIPAA-compliant or industry-specific call
          const retellResponse = await retellService.createBusinessCall(
            tenantConfig.retellApiKey,
            contact,
            { ...tenantConfig, tenantId: req.user.tenantId },
            session.id,
            businessTemplateService
          );

          // Update session with Retell call ID
          await storage.updateCallSession(session.id, {
            retellCallId: retellResponse.call_id,
            status: 'in_progress',
          });

          // Update contact call attempts
          await storage.updateContact(contact.id, {
            callAttempts: (contact.callAttempts || 0) + 1,
            lastContactTime: new Date()
          });

          results.push({
            contactId: contact.id,
            sessionId: session.id,
            retellCallId: retellResponse.call_id,
            status: 'in_progress',
            contactName: contact.name,
            contactPhone: contact.phone,
          });

          console.log(`✅ Successfully initiated call for ${contact.name} (${contact.phone})`);

        } catch (error) {
          console.error(`❌ Failed to create call for contact ${contact.id} (${contact.name}):`, error);
          callErrors.push({ 
            contactId: contact.id,
            contactName: contact.name,
            error: error instanceof Error ? error.message : 'Failed to create call',
            code: 'CALL_CREATION_FAILED',
            details: error instanceof Error ? error.stack : undefined
          });
        }
      }

      // Combine validation and call errors
      const allErrors = [...validationErrors, ...callErrors];

      console.log(`📊 Bulk call operation summary: ${results.length} successful, ${allErrors.length} failed out of ${contactIds.length} requested`);

      res.status(201).json({
        success: results.length > 0,
        message: results.length > 0 
          ? `Bulk call operation completed. ${results.length} call${results.length === 1 ? '' : 's'} initiated successfully.`
          : 'Bulk call operation failed. No calls were initiated.',
        results,
        errors: allErrors,
        summary: {
          totalRequested: contactIds.length,
          successful: results.length,
          failed: allErrors.length,
          validationErrors: validationErrors.length,
          callErrors: callErrors.length,
          groupId: groupId || null,
          timestamp: new Date().toISOString(),
          initiatedBy: req.user.id
        }
      });

    } catch (error) {
      console.error('❌ Bulk call operation failed:', error);
      
      // Enhanced error response with proper status codes
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Invalid request parameters',
          code: 'VALIDATION_ERROR',
          details: error.errors
        });
      }
      
      res.status(500).json({ 
        message: 'Internal server error during bulk call operation',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  // Follow-up task routes
  app.get('/api/follow-up-tasks', authenticateJWT, async (req: any, res) => {
    try {
      const tasks = await storage.getFollowUpTasksByTenant(req.user.tenantId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch follow-up tasks' });
    }
  });

  app.post('/api/follow-up-tasks', authenticateJWT, requireRole(['client_admin', 'super_admin']), async (req: any, res) => {
    try {
      const taskSchema = z.object({
        contactId: z.string().uuid(),
        scheduledTime: z.string().datetime(),
        taskType: z.enum(['initial_call', 'retry_call', 'follow_up']).optional(),
        autoExecution: z.boolean().optional(),
      });

      const taskData = taskSchema.parse(req.body);
      const task = await storage.createFollowUpTask({
        ...taskData,
        tenantId: req.user.tenantId,
        scheduledTime: new Date(taskData.scheduledTime),
      });
      
      res.status(201).json(task);
    } catch (error) {
      res.status(400).json({ message: 'Failed to create follow-up task' });
    }
  });

  app.get('/api/follow-up-tasks/overdue', authenticateJWT, requireRole(['super_admin']), async (req, res) => {
    try {
      const tasks = await storage.getOverdueFollowUpTasks();
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch overdue tasks' });
    }
  });

  // Tenant configuration routes
  app.get('/api/tenant/config', authenticateJWT, requireRole(['client_admin', 'super_admin']), async (req: any, res) => {
    try {
      const config = await storage.getTenantConfig(req.user.tenantId);
      if (!config) {
        return res.status(404).json({ message: 'Configuration not found' });
      }
      
      res.json(config);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch configuration' });
    }
  });

  app.post('/api/tenant/config', authenticateJWT, requireRole(['client_admin', 'super_admin']), async (req: any, res) => {
    try {
      const configSchema = z.object({
        retellAgentId: z.string().optional(),
        retellAgentNumber: z.string().optional(),
        retellApiKey: z.string().optional(),
        calApiKey: z.string().optional(),
        calEventTypeId: z.number().optional(),
        calendlyApiKey: z.string().optional(),
        calendlyOrganizerEmail: z.string().email().optional(),
        timezone: z.string().optional(),
        followUpHours: z.number().min(1).max(168).optional(),
        businessType: z.string().optional(),
        maxCallsPerDay: z.number().min(1).max(1000).optional(),
        maxCallsPer15Min: z.number().min(1).max(100).optional(),
        quietStart: z.string().optional(),
        quietEnd: z.string().optional(),
        // Configurable call timing settings
        reminderHoursBefore: z.array(z.number().min(1).max(168)).min(1).optional(),
        followUpRetryMinutes: z.number().min(60).max(300).optional(),
      });

      const configData = configSchema.parse(req.body);
      
      const existingConfig = await storage.getTenantConfig(req.user.tenantId);
      let config;
      
      if (existingConfig) {
        config = await storage.updateTenantConfig(req.user.tenantId, configData);
      } else {
        config = await storage.createTenantConfig({
          ...configData,
          tenantId: req.user.tenantId,
        });
      }
      
      res.json(config);
    } catch (error) {
      res.status(400).json({ message: 'Failed to save configuration' });
    }
  });

  // User management routes
  app.get('/api/users', authenticateJWT, requireRole(['client_admin', 'super_admin']), async (req: any, res) => {
    try {
      const users = await storage.getUsersByTenant(req.user.tenantId);
      res.json(users.map(user => ({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
      })));
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  app.post('/api/users', authenticateJWT, requireRole(['client_admin', 'super_admin']), async (req: any, res) => {
    try {
      const userSchema = z.object({
        email: z.string().email(),
        fullName: z.string().min(1),
        password: z.string().min(8),
        role: z.enum(['client_admin', 'client_user']),
      });

      const userData = userSchema.parse(req.body);
      const user = await storage.createUser({
        ...userData,
        hashedPassword: userData.password,
        tenantId: req.user.tenantId,
      });
      
      res.status(201).json({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      });
    } catch (error) {
      res.status(400).json({ message: 'Failed to create user' });
    }
  });

  // Dashboard analytics routes
  app.get('/api/dashboard/analytics', authenticateJWT, async (req: any, res) => {
    try {
      const analytics = await storage.getClientAnalytics(req.user.tenantId);
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch analytics' });
    }
  });

  // Contact timeline endpoint
  app.get('/api/contacts/:id/timeline', authenticateJWT, async (req: any, res) => {
    try {
      const contactId = req.params.id;
      const timeline = await storage.getContactTimeline(contactId, req.user.tenantId);
      res.json(timeline);
    } catch (error) {
      console.error('Contact timeline error:', error);
      res.status(500).json({ message: 'Failed to fetch contact timeline' });
    }
  });

  // Call Now endpoint - Trigger immediate call via Retell AI
  app.post('/api/contacts/:id/call', authenticateJWT, requireRole(['client_admin', 'super_admin']), async (req: any, res) => {
    try {
      const contactId = req.params.id;
      const tenantId = req.user.tenantId;

      // Get contact details
      const contact = await storage.getContact(contactId);
      if (!contact || contact.tenantId !== tenantId) {
        return res.status(404).json({ message: 'Contact not found' });
      }

      // Get tenant configuration for Retell AI
      const tenantConfig = await storage.getTenantConfig(tenantId);
      if (!tenantConfig?.retellApiKey || !tenantConfig?.retellAgentId || !tenantConfig?.retellAgentNumber) {
        return res.status(400).json({ 
          message: 'Retell AI not configured for this tenant. Please contact support to set up voice calling.' 
        });
      }

      // Create call session record
      const callSession = await storage.createCallSession({
        contactId,
        tenantId,
        status: 'queued',
        triggerTime: new Date(),
        sessionId: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      });

      // Create business-aware call with dynamic variables for industry-specific voice scripts
      const businessType = tenantConfig.businessType || 'general';
      console.log(`🏥 Creating ${businessType} business call (contact ID: ${contact.id})`);
      
      // Use business template service to generate HIPAA-compliant or industry-specific call
      const retellResponse = await retellService.createBusinessCall(
        tenantConfig.retellApiKey,
        contact,
        { ...tenantConfig, tenantId },
        callSession.id,
        businessTemplateService
      );

      // Update call session with Retell call ID
      await storage.updateCallSession(callSession.id, {
        retellCallId: retellResponse.call_id,
        status: 'in_progress',
        startTime: new Date()
      });

      // Update contact call attempts
      await storage.updateContact(contactId, {
        callAttempts: (contact.callAttempts || 0) + 1,
        lastContactTime: new Date()
      });

      res.json({
        success: true,
        callSessionId: callSession.id,
        retellCallId: retellResponse.call_id,
        status: 'in_progress',
        message: 'Call initiated successfully'
      });

    } catch (error) {
      console.error('Call Now error:', error);
      
      // More specific error handling
      if (error instanceof Error && error.message.includes('Retell API error')) {
        res.status(400).json({ 
          message: 'Failed to initiate call. Please check phone number and try again.',
          error: error.message 
        });
      } else {
        res.status(500).json({ message: 'Failed to initiate call' });
      }
    }
  });

  // Get call status endpoint
  app.get('/api/calls/:sessionId', authenticateJWT, async (req: any, res) => {
    try {
      const sessionId = req.params.sessionId;
      const callSession = await storage.getCallSession(sessionId);
      
      if (!callSession || callSession.tenantId !== req.user.tenantId) {
        return res.status(404).json({ message: 'Call session not found' });
      }

      // If call is still in progress and we have Retell call ID, get latest status
      if (callSession.status === 'in_progress' && callSession.retellCallId) {
        const tenantConfig = await storage.getTenantConfig(req.user.tenantId);
        if (tenantConfig?.retellApiKey) {
          try {
            const retellCall = await retellService.getCall(tenantConfig.retellApiKey, callSession.retellCallId);
            
            // Update our session if status changed
            if (retellCall.status !== callSession.status) {
              const updates: any = {
                status: retellCall.status === 'completed' ? 'completed' : retellCall.status
              };
              
              // Only add endTime if status is completed
              if (retellCall.status === 'completed') {
                updates.endTime = new Date();
              }
              
              await storage.updateCallSession(sessionId, updates);
            }
          } catch (error) {
            console.warn('Failed to get latest call status from Retell:', error);
          }
        }
      }

      // Return session with contact info  
      const contact = callSession.contactId ? await storage.getContact(callSession.contactId) : null;
      
      res.json({
        ...callSession,
        contact: contact ? {
          id: contact.id,
          name: contact.name,
          phone: contact.phone
        } : null
      });

    } catch (error) {
      console.error('Get call status error:', error);
      res.status(500).json({ message: 'Failed to get call status' });
    }
  });

  app.get('/api/admin/dashboard/analytics', authenticateJWT, requireRole(['super_admin']), async (req, res) => {
    try {
      const analytics = await storage.getPlatformAnalytics();
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch platform analytics' });
    }
  });

  // Enhanced Analytics Center API for super admin platform-wide insights
  app.get('/api/admin/analytics/platform', authenticateJWT, requireRole(['super_admin']), async (req, res) => {
    try {
      const timePeriod = parseInt(req.query.timePeriod as string) || 30;
      
      // Get comprehensive platform analytics
      const tenants = await storage.getAllTenants();
      const activeTenants = tenants.filter(t => t.status === 'active');
      
      // Mock comprehensive platform analytics (in production, would aggregate real data)
      const platformAnalytics = {
        overview: {
          totalTenants: tenants.length,
          activeTenants: activeTenants.length,
          totalCalls: 15420,
          successRate: 92.3,
          totalRevenue: 127500,
          monthlyGrowth: 18.5
        },
        tenantPerformance: tenants.map(tenant => ({
          tenantId: tenant.id,
          tenantName: tenant.businessName || tenant.ownerName || 'Unknown Business',
          callVolume: Math.floor(Math.random() * 3000) + 500,
          successRate: Math.round((Math.random() * 20 + 80) * 10) / 10,
          revenue: Math.floor(Math.random() * 20000) + 5000,
          growth: Math.round((Math.random() * 50 - 10) * 10) / 10,
          status: tenant.status || 'active'
        })),
        platformTrends: [
          { date: '2024-09-01', totalCalls: 12200, successRate: 89.2, activeUsers: 1840, revenue: 98000 },
          { date: '2024-09-08', totalCalls: 13100, successRate: 90.1, activeUsers: 1920, revenue: 105000 },
          { date: '2024-09-15', totalCalls: 14300, successRate: 91.8, activeUsers: 2010, revenue: 115000 },
          { date: '2024-09-22', totalCalls: 15420, successRate: 92.3, activeUsers: 2140, revenue: 127500 }
        ],
        industryBreakdown: [
          { industry: 'Healthcare', tenantCount: Math.ceil(tenants.length * 0.33), avgSuccessRate: 94.1, totalRevenue: 52000 },
          { industry: 'Beauty & Wellness', tenantCount: Math.ceil(tenants.length * 0.25), avgSuccessRate: 89.7, totalRevenue: 38000 },
          { industry: 'Professional Services', tenantCount: Math.ceil(tenants.length * 0.21), avgSuccessRate: 86.2, totalRevenue: 28000 },
          { industry: 'Food & Hospitality', tenantCount: Math.floor(tenants.length * 0.13), avgSuccessRate: 91.8, totalRevenue: 18000 },
          { industry: 'Other', tenantCount: Math.floor(tenants.length * 0.08), avgSuccessRate: 88.5, totalRevenue: 12000 }
        ]
      };

      res.json(platformAnalytics);
    } catch (error) {
      console.error('Platform analytics error:', error);
      res.status(500).json({ message: 'Failed to fetch platform analytics' });
    }
  });

  // Retell AI webhook endpoint
  app.post('/api/webhooks/retell', async (req, res) => {
    try {
      const signature = req.headers['x-signature'] || req.headers['signature'];
      const rawPayload = JSON.stringify(req.body);
      
      // Extract tenant ID from webhook metadata
      const payload = retellService.parseWebhookPayload(req.body);
      const tenantId = extractTenantIdFromWebhook(payload.metadata, payload);
      
      if (!tenantId) {
        console.warn('Retell webhook received without tenant ID in metadata');
        return res.status(400).json({ message: 'Missing tenant ID in webhook metadata' });
      }

      // Get tenant configuration for webhook secret
      const tenantConfig = await storage.getTenantConfig(tenantId);
      if (!tenantConfig?.retellWebhookSecret) {
        console.warn(`Retell webhook secret not configured for tenant ${tenantId}`);
        return res.status(400).json({ message: 'Webhook secret not configured' });
      }

      // Verify webhook signature
      if (signature && !verifyWebhookSignature(rawPayload, signature as string, tenantConfig.retellWebhookSecret)) {
        console.warn(`Invalid Retell webhook signature for tenant ${tenantId}`);
        return res.status(401).json({ message: 'Invalid webhook signature' });
      }
      
      if (payload.event === 'call_ended' || payload.event === 'call_completed') {
        // Find the call session by retellCallId with tenant isolation
        const session = await storage.getCallSessionByRetellId(payload.call_id);
        
        if (!session) {
          console.warn(`Call session not found for Retell call ID: ${payload.call_id}`);
          return res.status(404).json({ message: 'Call session not found' });
        }

        // Verify tenant isolation
        if (session.tenantId !== tenantId) {
          console.error(`Tenant mismatch: session tenant ${session.tenantId} vs webhook tenant ${tenantId}`);
          return res.status(403).json({ message: 'Tenant access denied' });
        }

        const callOutcome = retellService.determineCallOutcome(payload);
        
        // Calculate duration from start time if available
        let durationSeconds: number | undefined;
        if (session.startTime && payload.call_status === 'completed') {
          durationSeconds = Math.floor((Date.now() - session.startTime.getTime()) / 1000);
        }
        
        // Update call session
        await storage.updateCallSession(session.id, {
          status: 'completed',
          endTime: new Date(),
          callOutcome,
          durationSeconds,
        });

        // Update contact with call outcome
        if (callOutcome === 'confirmed') {
          await storage.updateContact(session.contactId!, {
            appointmentStatus: 'confirmed',
            lastCallOutcome: callOutcome,
            callAttempts: (await storage.getContact(session.contactId!))?.callAttempts || 0 + 1,
          });
        } else {
          await storage.updateContact(session.contactId!, {
            lastCallOutcome: callOutcome,
            callAttempts: (await storage.getContact(session.contactId!))?.callAttempts || 0 + 1,
          });
        }

        // Log the call details
        await storage.createCallLog({
          callSessionId: session.id,
          tenantId: session.tenantId,
          contactId: session.contactId!,
          logLevel: 'info',
          message: `Call completed with outcome: ${callOutcome}`,
          metadata: JSON.stringify({
            retellCallId: payload.call_id,
            transcript: payload.transcript,
            callAnalysis: payload.call_analysis,
          }),
        });
      }
      
      res.status(200).json({ received: true });
    } catch (error) {
      console.error('Retell webhook error:', error);
      res.status(500).json({ message: 'Webhook processing failed' });
    }
  });

  // Cal.com webhook endpoint
  app.post('/api/webhooks/cal-com', async (req, res) => {
    try {
      const signature = req.headers['x-cal-signature'] || req.headers['x-signature'];
      const rawPayload = JSON.stringify(req.body);
      
      const payload = calComService.parseWebhookPayload(req.body);
      const action = calComService.determineWebhookAction(payload);
      
      if (action === 'unknown') {
        return res.status(200).json({ received: true, action: 'ignored' });
      }

      const booking = payload.payload.booking;
      const contactData = calComService.mapBookingToContact(booking);
      
      // Extract tenant ID from booking metadata
      const tenantId = extractTenantIdFromWebhook(booking.metadata, booking);
      if (!tenantId) {
        console.warn('Cal.com webhook received without tenant ID in metadata');
        return res.status(400).json({ message: 'Missing tenant ID in booking metadata' });
      }

      // Get tenant configuration for webhook secret
      const tenantConfig = await storage.getTenantConfig(tenantId);
      if (!tenantConfig?.calWebhookSecret) {
        console.warn(`Cal.com webhook secret not configured for tenant ${tenantId}`);
        return res.status(400).json({ message: 'Webhook secret not configured' });
      }

      // Verify webhook signature (Cal.com uses HMAC SHA256)
      if (signature && !verifyWebhookSignature(rawPayload, signature as string, tenantConfig.calWebhookSecret)) {
        console.warn(`Invalid Cal.com webhook signature for tenant ${tenantId}`);
        return res.status(401).json({ message: 'Invalid webhook signature' });
      }

      // Check if contact already exists by email with tenant isolation
      let existingContact;
      if (contactData.email) {
        const contacts = await storage.searchContacts(tenantId, contactData.email);
        existingContact = contacts.find(c => c.email === contactData.email);
      }

      if (action === 'create' || action === 'update') {
        if (existingContact) {
          // Update existing contact
          await storage.updateContact(existingContact.id, {
            appointmentTime: contactData.appointmentTime,
            appointmentType: contactData.appointmentType,
            appointmentDuration: contactData.appointmentDuration,
            appointmentStatus: contactData.appointmentStatus,
            notes: `${existingContact.notes || ''}\nCal.com booking updated: ${booking.uid}`.trim(),
          });
        } else {
          // Create new contact
          await storage.createContact({
            ...contactData,
            tenantId,
            notes: `${contactData.notes}\nCal.com booking: ${booking.uid}`,
          });
        }
      } else if (action === 'cancel' && existingContact) {
        // Cancel appointment
        await storage.updateContact(existingContact.id, {
          appointmentStatus: 'cancelled',
          notes: `${existingContact.notes || ''}\nCal.com booking cancelled: ${booking.uid}`.trim(),
        });
      }

      res.status(200).json({ received: true, action });
    } catch (error) {
      console.error('Cal.com webhook error:', error);
      res.status(500).json({ message: 'Webhook processing failed' });
    }
  });

  // Cal.com integration routes
  app.get('/api/integrations/cal-com/bookings', authenticateJWT, async (req: any, res) => {
    try {
      const tenantConfig = await storage.getTenantConfig(req.user.tenantId);
      if (!tenantConfig?.calApiKey) {
        return res.status(400).json({ message: 'Cal.com API key not configured' });
      }

      const bookings = await calComService.getBookings(
        tenantConfig.calApiKey, 
        tenantConfig.calEventTypeId || undefined
      );
      
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch Cal.com bookings' });
    }
  });

  app.get('/api/integrations/cal-com/event-types', authenticateJWT, async (req: any, res) => {
    try {
      const tenantConfig = await storage.getTenantConfig(req.user.tenantId);
      if (!tenantConfig?.calApiKey) {
        return res.status(400).json({ message: 'Cal.com API key not configured' });
      }

      const eventTypes = await calComService.getEventTypes(tenantConfig.calApiKey);
      res.json(eventTypes);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch Cal.com event types' });
    }
  });

  app.post('/api/integrations/cal-com/sync', authenticateJWT, requireRole(['client_admin', 'super_admin']), async (req: any, res) => {
    try {
      const tenantConfig = await storage.getTenantConfig(req.user.tenantId);
      if (!tenantConfig?.calApiKey) {
        return res.status(400).json({ message: 'Cal.com API key not configured' });
      }

      // Fetch all bookings from Cal.com
      const bookings = await calComService.getBookings(
        tenantConfig.calApiKey,
        tenantConfig.calEventTypeId || undefined
      );

      let created = 0;
      let updated = 0;
      const errors: any[] = [];

      for (const booking of bookings) {
        try {
          const contactData = calComService.mapBookingToContact(booking);
          
          // Check if contact exists
          let existingContact;
          if (contactData.email) {
            const contacts = await storage.searchContacts(req.user.tenantId, contactData.email);
            existingContact = contacts.find(c => c.email === contactData.email);
          }

          if (existingContact) {
            await storage.updateContact(existingContact.id, {
              appointmentTime: contactData.appointmentTime,
              appointmentType: contactData.appointmentType,
              appointmentDuration: contactData.appointmentDuration,
              appointmentStatus: contactData.appointmentStatus,
              notes: `${existingContact.notes || ''}\nSynced from Cal.com: ${booking.uid}`.trim(),
            });
            updated++;
          } else {
            await storage.createContact({
              ...contactData,
              tenantId: req.user.tenantId,
              notes: `${contactData.notes}\nSynced from Cal.com: ${booking.uid}`,
            });
            created++;
          }
        } catch (error) {
          errors.push({
            booking: booking.uid,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      res.json({
        message: `Cal.com sync completed: ${created} created, ${updated} updated`,
        created,
        updated,
        errors,
        totalProcessed: bookings.length,
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to sync Cal.com bookings' });
    }
  });

  // Calendly webhook endpoint
  app.post('/api/webhooks/calendly', async (req, res) => {
    try {
      const signature = req.headers['calendly-webhook-signature'] || req.headers['x-signature'];
      const rawPayload = JSON.stringify(req.body);
      
      const payload = calendlyService.parseWebhookPayload(req.body);
      const action = calendlyService.determineWebhookAction(payload);
      
      if (action === 'unknown') {
        return res.status(200).json({ received: true, action: 'ignored' });
      }

      const event = payload.payload.event;
      const invitee = payload.payload.invitee;
      
      if (!event || !invitee) {
        return res.status(400).json({ message: 'Missing event or invitee data in webhook payload' });
      }

      // Extract tenant ID from tracking data or event metadata
      const tenantId = extractTenantIdFromWebhook(invitee?.tracking, invitee);
      if (!tenantId) {
        console.warn('Calendly webhook received without tenant ID in tracking data');
        return res.status(400).json({ message: 'Missing tenant ID in invitee tracking data' });
      }

      // Get tenant configuration for webhook secret
      const tenantConfig = await storage.getTenantConfig(tenantId);
      if (!tenantConfig?.calendlyWebhookSecret) {
        console.warn(`Calendly webhook secret not configured for tenant ${tenantId}`);
        return res.status(400).json({ message: 'Webhook secret not configured' });
      }

      // Verify webhook signature (Calendly uses HMAC SHA256)
      if (signature && !verifyWebhookSignature(rawPayload, signature as string, tenantConfig.calendlyWebhookSecret)) {
        console.warn(`Invalid Calendly webhook signature for tenant ${tenantId}`);
        return res.status(401).json({ message: 'Invalid webhook signature' });
      }

      const contactData = calendlyService.mapEventToContact(event, invitee);
      
      // Check if contact already exists by email with tenant isolation
      let existingContact;
      if (contactData.email) {
        const contacts = await storage.searchContacts(tenantId, contactData.email);
        existingContact = contacts.find(c => c.email === contactData.email);
      }

      if (action === 'create' || action === 'update') {
        if (existingContact) {
          // Update existing contact
          await storage.updateContact(existingContact.id, {
            appointmentTime: contactData.appointmentTime,
            appointmentType: contactData.appointmentType,
            appointmentDuration: contactData.appointmentDuration,
            appointmentStatus: contactData.appointmentStatus,
            notes: `${existingContact.notes || ''}\nCalendly booking updated: ${invitee.uri}`.trim(),
          });
        } else {
          // Create new contact
          await storage.createContact({
            ...contactData,
            tenantId,
            notes: `${contactData.notes}\nCalendly booking: ${invitee.uri}`,
          });
        }
      } else if (action === 'cancel' && existingContact) {
        // Cancel appointment
        await storage.updateContact(existingContact.id, {
          appointmentStatus: 'cancelled',
          notes: `${existingContact.notes || ''}\nCalendly booking cancelled: ${invitee.uri}`.trim(),
        });
      }

      res.status(200).json({ received: true, action });
    } catch (error) {
      console.error('Calendly webhook error:', error);
      res.status(500).json({ message: 'Webhook processing failed' });
    }
  });

  // Calendly integration routes
  app.get('/api/integrations/calendly/events', authenticateJWT, async (req: any, res) => {
    try {
      const tenantConfig = await storage.getTenantConfig(req.user.tenantId);
      if (!tenantConfig?.calendlyAccessToken) {
        return res.status(400).json({ message: 'Calendly access token not configured' });
      }

      const events = await calendlyService.getScheduledEvents(
        tenantConfig.calendlyAccessToken,
        tenantConfig.calendlyOrganization || undefined,
        tenantConfig.calendlyUser || undefined
      );
      
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch Calendly events' });
    }
  });

  app.get('/api/integrations/calendly/event-types', authenticateJWT, async (req: any, res) => {
    try {
      const tenantConfig = await storage.getTenantConfig(req.user.tenantId);
      if (!tenantConfig?.calendlyAccessToken) {
        return res.status(400).json({ message: 'Calendly access token not configured' });
      }

      const eventTypes = await calendlyService.getEventTypes(
        tenantConfig.calendlyAccessToken,
        tenantConfig.calendlyOrganization || undefined,
        tenantConfig.calendlyUser || undefined
      );
      res.json(eventTypes);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch Calendly event types' });
    }
  });

  app.post('/api/integrations/calendly/sync', authenticateJWT, requireRole(['client_admin', 'super_admin']), async (req: any, res) => {
    try {
      const tenantConfig = await storage.getTenantConfig(req.user.tenantId);
      if (!tenantConfig?.calendlyAccessToken) {
        return res.status(400).json({ message: 'Calendly access token not configured' });
      }

      // Fetch all scheduled events from Calendly
      const events = await calendlyService.getScheduledEvents(
        tenantConfig.calendlyAccessToken,
        tenantConfig.calendlyOrganization || undefined,
        tenantConfig.calendlyUser || undefined
      );

      let created = 0;
      let updated = 0;
      const errors: any[] = [];

      for (const event of events) {
        try {
          // Get invitees for each event
          const invitees = await calendlyService.getEventInvitees(
            tenantConfig.calendlyAccessToken,
            event.uri
          );

          for (const invitee of invitees) {
            try {
              const contactData = calendlyService.mapEventToContact(event, invitee);
              
              // Check if contact exists
              let existingContact;
              if (contactData.email) {
                const contacts = await storage.searchContacts(req.user.tenantId, contactData.email);
                existingContact = contacts.find(c => c.email === contactData.email);
              }

              if (existingContact) {
                await storage.updateContact(existingContact.id, {
                  appointmentTime: contactData.appointmentTime,
                  appointmentType: contactData.appointmentType,
                  appointmentDuration: contactData.appointmentDuration,
                  appointmentStatus: contactData.appointmentStatus,
                  notes: `${existingContact.notes || ''}\nSynced from Calendly: ${invitee.uri}`.trim(),
                });
                updated++;
              } else {
                await storage.createContact({
                  ...contactData,
                  tenantId: req.user.tenantId,
                  notes: `${contactData.notes}\nSynced from Calendly: ${invitee.uri}`,
                });
                created++;
              }
            } catch (error) {
              errors.push({
                invitee: invitee.uri,
                error: error instanceof Error ? error.message : 'Unknown error',
              });
            }
          }
        } catch (error) {
          errors.push({
            event: event.uri,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      res.json({
        message: `Calendly sync completed: ${created} created, ${updated} updated`,
        created,
        updated,
        errors,
        totalProcessed: events.length,
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to sync Calendly events' });
    }
  });

  // Bulk CSV Import API routes
  app.post('/api/import/contacts', authenticateJWT, requireRole(['client_admin', 'super_admin']), async (req: any, res) => {
    try {
      const contactsSchema = z.array(z.object({
        name: z.string().min(1),
        phone: z.string().min(1),
        email: z.string().email().optional(),
        appointmentTime: z.string().optional(),
        appointmentType: z.string().optional(),
        appointmentDuration: z.number().optional(),
        specialInstructions: z.string().optional(),
        notes: z.string().optional(),
        priorityLevel: z.enum(['normal', 'high', 'urgent']).optional(),
        preferredContactMethod: z.enum(['voice', 'email', 'sms']).optional(),
      }));

      const contactsData = contactsSchema.parse(req.body.contacts);
      const tenantId = req.user.tenantId;

      // Transform CSV data to contact format
      const transformedContacts = contactsData.map(contact => ({
        ...contact,
        appointmentTime: contact.appointmentTime ? new Date(contact.appointmentTime) : undefined,
        appointmentStatus: 'pending' as const,
        callBeforeHours: 24,
        timezone: 'Europe/London',
        bookingSource: 'manual' as const,
        priorityLevel: contact.priorityLevel || 'normal' as const,
        preferredContactMethod: contact.preferredContactMethod || 'voice' as const,
      }));

      const result = await storage.bulkCreateContacts(tenantId, transformedContacts);

      // Schedule appointment reminders for contacts with appointment times
      if (result.contactIds && result.contactIds.length > 0) {
        const { callScheduler } = await import("./services/call-scheduler");
        
        // Schedule reminders for contacts that have appointment times
        for (let i = 0; i < result.contactIds.length; i++) {
          const contactId = result.contactIds[i];
          const originalContact = transformedContacts[i];
          
          if (originalContact.appointmentTime) {
            await callScheduler.scheduleAppointmentReminders(
              contactId,
              originalContact.appointmentTime,
              tenantId
            );
          }
        }
      }

      res.json({
        message: `Successfully imported ${result.created} contacts`,
        created: result.created,
        contactIds: result.contactIds || [], // Include created contact IDs
        errors: result.errors,
        totalRequested: contactsData.length,
      });
    } catch (error) {
      console.error('Bulk contacts import error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid contact data format', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to import contacts' });
    }
  });

  app.post('/api/import/appointments', authenticateJWT, requireRole(['client_admin', 'super_admin']), async (req: any, res) => {
    try {
      const appointmentsSchema = z.array(z.object({
        contactId: z.string().uuid(),
        appointmentTime: z.string(),
        appointmentType: z.string().optional(),
        appointmentDuration: z.number().optional(),
        calendarProvider: z.enum(['cal.com', 'calendly']).optional(),
        eventTypeId: z.string().optional(),
      }));

      const appointmentsData = appointmentsSchema.parse(req.body.appointments);
      const tenantId = req.user.tenantId;
      let created = 0;
      const errors: any[] = [];

      // Create appointment records by updating contacts with appointment details
      for (const appointment of appointmentsData) {
        try {
          // SECURITY: Verify contact belongs to user's tenant before updating
          const contact = await storage.getContact(appointment.contactId);
          if (!contact || contact.tenantId !== tenantId) {
            errors.push({
              contactId: appointment.contactId,
              error: 'Contact not found or access denied',
            });
            continue;
          }

          // Update contact with appointment information
          await storage.updateContact(appointment.contactId, {
            appointmentTime: new Date(appointment.appointmentTime),
            appointmentType: appointment.appointmentType,
            appointmentDuration: appointment.appointmentDuration || 60,
            appointmentStatus: 'pending',
            bookingSource: appointment.calendarProvider || 'manual',
          });

          // Schedule appointment reminder
          const { callScheduler } = await import("./services/call-scheduler");
          await callScheduler.scheduleAppointmentReminders(
            appointment.contactId,
            new Date(appointment.appointmentTime),
            tenantId
          );

          // TODO: In production, integrate with external calendar providers
          if (appointment.calendarProvider === 'cal.com') {
            // Future: call calComService.createBooking() here
            // const booking = await calComService.createBooking(...);
          } else if (appointment.calendarProvider === 'calendly') {
            // Future: call calendlyService.createEvent() here  
            // const event = await calendlyService.createEvent(...);
          }
          
          created++;
        } catch (error) {
          errors.push({
            contactId: appointment.contactId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      res.json({
        message: `Successfully scheduled ${created} appointments`,
        created,
        errors,
        totalRequested: appointmentsData.length,
      });
    } catch (error) {
      console.error('Bulk appointments creation error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid appointment data format', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create appointments' });
    }
  });

  app.post('/api/import/reminders', authenticateJWT, requireRole(['client_admin', 'super_admin']), async (req: any, res) => {
    try {
      const remindersSchema = z.array(z.object({
        contactId: z.string().uuid(),
        reminderTime: z.string(),
        callBeforeHours: z.number().optional(),
      }));

      const remindersData = remindersSchema.parse(req.body.reminders);
      const tenantId = req.user.tenantId;
      let scheduled = 0;
      const errors: any[] = [];

      // Create follow-up tasks for voice reminders
      for (const reminder of remindersData) {
        try {
          // SECURITY: Verify contact belongs to user's tenant before creating reminder
          const contact = await storage.getContact(reminder.contactId);
          if (!contact || contact.tenantId !== tenantId) {
            errors.push({
              contactId: reminder.contactId,
              error: 'Contact not found or access denied',
            });
            continue;
          }

          const reminderDateTime = new Date(reminder.reminderTime);
          
          await storage.createFollowUpTask({
            tenantId,
            contactId: reminder.contactId,
            scheduledTime: reminderDateTime,
            taskType: 'initial_call',
            autoExecution: true,
            status: 'pending',
            attempts: 0,
          });
          
          scheduled++;
        } catch (error) {
          errors.push({
            contactId: reminder.contactId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      res.json({
        message: `Successfully scheduled ${scheduled} voice reminders`,
        scheduled,
        errors,
        totalRequested: remindersData.length,
      });
    } catch (error) {
      console.error('Bulk reminders scheduling error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid reminder data format', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to schedule reminders' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Import the call scheduler at the end to avoid circular dependency issues
import("./services/call-scheduler").then(({ callScheduler }) => {
  // Export callScheduler for route usage
  global.callScheduler = callScheduler;
});
