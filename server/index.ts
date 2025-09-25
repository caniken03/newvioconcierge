import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Disable ETag generation to prevent 304 responses
app.set('etag', false);

// Global cache-busting middleware for all API routes
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private, max-age=0');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Vary', 'Authorization');
  res.removeHeader('ETag');
  next();
});

// Exclude webhook paths from JSON parsing to allow raw body verification
app.use((req, res, next) => {
  if (req.path.startsWith('/api/webhooks/')) {
    // Skip JSON parsing for webhook routes - they handle raw bodies
    return next();
  }
  express.json()(req, res, next);
});

app.use((req, res, next) => {
  if (req.path.startsWith('/api/webhooks/')) {
    // Skip URL encoding for webhook routes
    return next();
  }
  express.urlencoded({ extended: false })(req, res, next);
});

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

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
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
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    log('Received SIGINT, shutting down gracefully...');
    const { callScheduler } = await import("./services/call-scheduler");
    callScheduler.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    log('Received SIGTERM, shutting down gracefully...');
    const { callScheduler } = await import("./services/call-scheduler");
    callScheduler.stop();
    process.exit(0);
  });
})();
