import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Trust proxy for Replit hosting - prevents cookie/session issues
app.set('trust proxy', 1);

// Disable ETag generation to prevent 304 responses
app.set('etag', false);

// CORS configuration - explicit allowlist for security
const allowedOrigins = [
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : null,
  process.env.REPL_SLUG && process.env.REPL_OWNER 
    ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` 
    : null,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Explicit preflight handler
app.options('*', cors());

// Global cache-busting middleware for all API routes
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private, max-age=0');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Vary', 'Authorization');
  res.removeHeader('ETag');
  next();
});

// Capture raw body for webhook signature verification
app.use('/api/webhooks', express.raw({ type: 'application/json', limit: '10mb' }), (req, res, next) => {
  if (req.body) {
    try {
      (req as any).rawBody = req.body.toString('utf8');
      req.body = JSON.parse((req as any).rawBody);
    } catch (error) {
      console.error('Webhook JSON parse error:', error);
      return res.status(400).json({ message: 'Invalid JSON payload' });
    }
  }
  next();
});

// Body parsing for all other routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      // SECURITY: Remove full JSON response from logs to prevent PII/secret exposure
      log(logLine.replace(/ :: .*/, ' :: [response logged]'));
      
      // Record performance metrics for observability
      try {
        const { getObservabilityService } = require("./services/observability-service");
        const obs = getObservabilityService();
        const tenantId = (req as any).user?.tenantId;
        obs.recordRequestPerformance(path, req.method, duration, res.statusCode, tenantId);
      } catch (error) {
        // Silently fail if observability service not ready
      }
    }
  });

  next();
});

(async () => {
  // CRITICAL: Validate AUDIT_HMAC_SECRET at boot-time for hash integrity
  if (!process.env.AUDIT_HMAC_SECRET) {
    console.error('❌ FATAL: AUDIT_HMAC_SECRET environment variable is not set');
    console.error('Audit trail integrity verification requires this secret for tamper-resistant hashing');
    process.exit(1);
  }
  log('✅ AUDIT_HMAC_SECRET validated');
  
  const server = await registerRoutes(app);

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    console.error('[ERROR HANDLER]', {
      path: req.originalUrl,
      method: req.method,
      status,
      message,
      stack: err.stack
    });

    if (!res.headersSent) {
      res.status(status).json({ message });
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    
    // Start the call scheduler service
    import("./services/call-scheduler").then(({ callScheduler }) => {
      callScheduler.start();
    });
    
    // Initialize and start observability service
    import("./services/observability-service").then(({ initializeObservability }) => {
      import("./storage").then(({ storage }) => {
        const obs = initializeObservability(storage);
        obs.start();
        log('🔍 Observability service started');
      });
    });
    
    // Start the daily summary email service
    import("./services/daily-summary-service").then(({ dailySummaryService }) => {
      dailySummaryService.start();
    });
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    log('Received SIGINT, shutting down gracefully...');
    const { callScheduler } = await import("./services/call-scheduler");
    const { getObservabilityService } = await import("./services/observability-service");
    
    callScheduler.stop();
    try {
      getObservabilityService().stop();
    } catch (error) {
      // Service may not be initialized
    }
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    log('Received SIGTERM, shutting down gracefully...');
    const { callScheduler } = await import("./services/call-scheduler");
    const { getObservabilityService } = await import("./services/observability-service");
    
    callScheduler.stop();
    try {
      getObservabilityService().stop();
    } catch (error) {
      // Service may not be initialized
    }
    process.exit(0);
  });
})();
