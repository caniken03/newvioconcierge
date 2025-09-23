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

// CSV Security helpers
const CSV_MAX_ROWS = 10000; // Maximum rows to process

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

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Authentication routes
  app.post('/api/auth/login', async (req, res) => {
    try {
      const loginSchema = z.object({
        email: z.string().email(),
        password: z.string().min(1),
        role: z.enum(['super_admin', 'client_admin', 'client_user']).optional(),
      });

      const { email, password, role } = loginSchema.parse(req.body);
      
      const user = await storage.authenticateUser(email, password);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Check role if specified
      if (role && user.role !== role) {
        return res.status(401).json({ message: 'Invalid role for this user' });
      }

      const token = jwt.sign(
        { userId: user.id, tenantId: user.tenantId, role: user.role },
        JWT_SECRET,
        { expiresIn: '8h' }
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

  // Tenant routes (Super Admin only)
  app.get('/api/admin/tenants', authenticateJWT, requireRole(['super_admin']), async (req, res) => {
    try {
      const tenants = await storage.getAllTenants();
      res.json(tenants);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch tenants' });
    }
  });

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
      
      res.json(contacts);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch contacts' });
    }
  });

  app.post('/api/contacts', authenticateJWT, requireRole(['client_admin', 'super_admin']), async (req: any, res) => {
    try {
      const contactSchema = z.object({
        name: z.string().min(1),
        phone: z.string().min(1),
        email: z.string().email().optional(),
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

  app.get('/api/contacts/:id', authenticateJWT, requireTenantAccess, async (req, res) => {
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
        email: z.string().email().optional(),
        appointmentTime: z.string().datetime().optional(),
        appointmentType: z.string().optional(),
        appointmentDuration: z.number().optional(),
        appointmentStatus: z.enum(['pending', 'confirmed', 'cancelled', 'completed']).optional(),
        notes: z.string().optional(),
        specialInstructions: z.string().optional(),
      });

      const updates = updateSchema.parse(req.body);
      const processedUpdates: any = { ...updates };
      if (updates.appointmentTime) {
        processedUpdates.appointmentTime = new Date(updates.appointmentTime);
      }
      
      const contact = await storage.updateContact(req.params.id, processedUpdates);
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

  app.get('/api/admin/dashboard/analytics', authenticateJWT, requireRole(['super_admin']), async (req, res) => {
    try {
      const analytics = await storage.getPlatformAnalytics();
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch platform analytics' });
    }
  });

  // Retell AI webhook endpoint
  app.post('/api/webhooks/retell', async (req, res) => {
    try {
      const payload = retellService.parseWebhookPayload(req.body);
      
      if (payload.event === 'call_ended' || payload.event === 'call_completed') {
        // Find the call session by retellCallId
        const session = await storage.getCallSessionByRetellId(payload.call_id);
        
        if (session) {
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
      const payload = calComService.parseWebhookPayload(req.body);
      const action = calComService.determineWebhookAction(payload);
      
      if (action === 'unknown') {
        return res.status(200).json({ received: true, action: 'ignored' });
      }

      const booking = payload.payload.booking;
      const contactData = calComService.mapBookingToContact(booking);
      
      // Find tenant by Cal.com event type or booking metadata
      const tenantId = booking.metadata?.tenantId;
      if (!tenantId) {
        console.warn('Cal.com webhook received without tenant ID in metadata');
        return res.status(400).json({ message: 'Missing tenant ID in booking metadata' });
      }

      // Check if contact already exists by email
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

      // Extract tenant ID from event type URI or custom tracking
      const tenantId = invitee.tracking?.salesforce_uuid; // Use tracking field for tenant ID
      if (!tenantId) {
        console.warn('Calendly webhook received without tenant ID in tracking data');
        return res.status(400).json({ message: 'Missing tenant ID in invitee tracking data' });
      }

      const contactData = calendlyService.mapEventToContact(event, invitee);
      
      // Check if contact already exists by email
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
        tenantConfig.calendlyOrganization,
        tenantConfig.calendlyUser
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
        tenantConfig.calendlyOrganization,
        tenantConfig.calendlyUser
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
        tenantConfig.calendlyOrganization,
        tenantConfig.calendlyUser
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

  const httpServer = createServer(app);
  return httpServer;
}
