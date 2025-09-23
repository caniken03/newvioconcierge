import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import jwt from "jsonwebtoken";
import { z } from "zod";
import type { User } from "@shared/schema";

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || "fallback_secret";

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

  app.get('/api/contacts/stats', authenticateJWT, async (req: any, res) => {
    try {
      const stats = await storage.getContactStats(req.user.tenantId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch contact stats' });
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
      
      const session = await storage.createCallSession({
        contactId,
        tenantId: req.user.tenantId,
        sessionId: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        triggerTime: triggerTime ? new Date(triggerTime) : new Date(),
      });
      
      res.status(201).json(session);
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
      // For now, return empty analytics - implement actual calculations later
      const analytics = {
        totalContacts: 0,
        callsToday: 0,
        successRate: 0,
        appointmentsConfirmed: 0,
        noShowRate: 0,
        recentActivity: [],
      };
      
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch analytics' });
    }
  });

  app.get('/api/admin/dashboard/analytics', authenticateJWT, requireRole(['super_admin']), async (req, res) => {
    try {
      // Platform-wide analytics for super admin
      const analytics = {
        activeTenants: 0,
        totalCallsToday: 0,
        platformSuccessRate: 0,
        systemHealth: 'excellent',
        recentTenantActivity: [],
      };
      
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch platform analytics' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
