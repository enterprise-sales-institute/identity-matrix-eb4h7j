/**
 * Entry point for the Multi-Touch Attribution Analytics Tool backend server
 * Implements high-performance server with comprehensive error handling,
 * graceful shutdown, health monitoring, and production-grade security features
 * @version 1.0.0
 */

import http from 'http';
import helmet from 'helmet'; // v7.0.0
import app from './app';
import { serverConfig } from './config/server.config';
import { LoggerService } from './lib/logger/logger.service';
import { MetricsService } from './lib/metrics/metrics.service';

// Initialize services
const logger = new LoggerService();
const metrics = new MetricsService(logger);

// Track active connections for graceful shutdown
const activeConnections = new Set<http.Socket>();

/**
 * Starts the HTTP server with enhanced security and monitoring
 */
async function startServer(): Promise<http.Server> {
  try {
    // Apply security headers
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"]
        }
      },
      crossOriginEmbedderPolicy: true,
      crossOriginOpenerPolicy: true,
      crossOriginResourcePolicy: { policy: "same-site" },
      dnsPrefetchControl: { allow: false },
      expectCt: { maxAge: 86400, enforce: true },
      frameguard: { action: "deny" },
      hidePoweredBy: true,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      },
      ieNoOpen: true,
      noSniff: true,
      permittedCrossDomainPolicies: { permittedPolicies: "none" },
      referrerPolicy: { policy: "same-origin" },
      xssFilter: true
    }));

    // Create HTTP server
    const server = http.createServer(app);

    // Configure connection tracking
    server.on('connection', (socket) => {
      activeConnections.add(socket);
      socket.on('close', () => {
        activeConnections.delete(socket);
      });
    });

    // Start listening
    await new Promise<void>((resolve) => {
      server.listen(serverConfig.port, serverConfig.host, () => {
        logger.info('Server started successfully', {
          service: 'server',
          requestId: 'system',
          correlationId: 'startup',
          additionalContext: {
            port: serverConfig.port,
            host: serverConfig.host,
            environment: process.env.NODE_ENV
          }
        });
        resolve();
      });
    });

    // Initialize health monitoring
    initializeHealthMonitoring(server);

    return server;
  } catch (error) {
    logger.error(error instanceof Error ? error : new Error(String(error)), {
      service: 'server',
      requestId: 'system',
      correlationId: 'startup-error'
    });
    throw error;
  }
}

/**
 * Handles graceful server shutdown with connection draining
 */
async function handleShutdown(server: http.Server): Promise<void> {
  logger.info('Initiating graceful shutdown', {
    service: 'server',
    requestId: 'system',
    correlationId: 'shutdown',
    additionalContext: {
      activeConnections: activeConnections.size
    }
  });

  // Stop accepting new connections
  server.close(() => {
    logger.info('Server stopped accepting new connections', {
      service: 'server',
      requestId: 'system',
      correlationId: 'shutdown'
    });
  });

  try {
    // Wait for existing connections to complete (with timeout)
    const shutdownTimeout = serverConfig.shutdownTimeout || 30000;
    const shutdownTimer = setTimeout(() => {
      logger.warn('Forcing shutdown due to timeout', {
        service: 'server',
        requestId: 'system',
        correlationId: 'shutdown'
      });
      process.exit(1);
    }, shutdownTimeout);

    // Close all active connections
    for (const socket of activeConnections) {
      socket.destroy();
      activeConnections.delete(socket);
    }

    // Clear shutdown timer
    clearTimeout(shutdownTimer);

    // Log successful shutdown
    logger.info('Server shutdown completed successfully', {
      service: 'server',
      requestId: 'system',
      correlationId: 'shutdown'
    });

    process.exit(0);
  } catch (error) {
    logger.error(error instanceof Error ? error : new Error(String(error)), {
      service: 'server',
      requestId: 'system',
      correlationId: 'shutdown-error'
    });
    process.exit(1);
  }
}

/**
 * Handles uncaught errors and exceptions
 */
function handleUncaughtErrors(error: Error): void {
  const errorId = `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  logger.error(error, {
    service: 'server',
    requestId: 'system',
    correlationId: errorId,
    additionalContext: {
      type: 'uncaught',
      stack: error.stack
    }
  });

  // Record error metrics
  metrics.incrementCounter('uncaught_errors_total', 1, {
    type: error.name,
    handled: 'false'
  });

  // Attempt graceful shutdown
  process.exit(1);
}

/**
 * Initializes health monitoring for the server
 */
function initializeHealthMonitoring(server: http.Server): void {
  // Monitor server metrics
  setInterval(() => {
    const used = process.memoryUsage();
    metrics.setGauge('memory_usage_bytes', used.heapUsed, { type: 'heap' });
    metrics.setGauge('memory_usage_bytes', used.rss, { type: 'rss' });
    
    metrics.setGauge('active_connections', activeConnections.size);
    
    if (server.listening) {
      metrics.setGauge('server_up', 1);
    } else {
      metrics.setGauge('server_up', 0);
    }
  }, 5000);

  // Log periodic health status
  setInterval(() => {
    logger.info('Server health check', {
      service: 'server',
      requestId: 'system',
      correlationId: 'health-check',
      additionalContext: {
        activeConnections: activeConnections.size,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage()
      }
    });
  }, 30000);
}

// Register error handlers
process.on('uncaughtException', handleUncaughtErrors);
process.on('unhandledRejection', handleUncaughtErrors);

// Register shutdown handlers
process.on('SIGTERM', () => {
  const server = http.createServer(app);
  handleShutdown(server);
});
process.on('SIGINT', () => {
  const server = http.createServer(app);
  handleShutdown(server);
});

// Start server
startServer().catch((error) => {
  logger.error(error instanceof Error ? error : new Error(String(error)), {
    service: 'server',
    requestId: 'system',
    correlationId: 'startup-error'
  });
  process.exit(1);
});

export default app;