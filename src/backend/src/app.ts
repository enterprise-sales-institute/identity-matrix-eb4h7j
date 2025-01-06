/**
 * Main Express application configuration with enhanced security, monitoring, and performance features
 * @version 1.0.0
 */

import express, { Express, Request, Response, NextFunction } from 'express'; // v4.18.2
import cors from 'cors'; // v2.8.5
import helmet from 'helmet'; // v7.0.0
import compression from 'compression'; // v1.7.4
import { validate } from 'express-validator'; // v7.0.1
import Redis from 'ioredis'; // v5.3.2
import promClient from 'prom-client'; // v14.2.0
import CircuitBreaker from 'opossum'; // v7.1.0

// Import internal middleware and services
import { authenticate, requireRoles, requireMfa } from './api/middlewares/auth.middleware';
import { errorHandler, notFoundHandler } from './api/middlewares/error.middleware';
import { requestLogger, correlationIdMiddleware } from './api/middlewares/logging.middleware';
import { createRateLimiter } from './api/middlewares/rateLimit.middleware';

// Initialize Express app
const app: Express = express();

/**
 * Configures global middleware stack with security, monitoring, and performance features
 * @param app Express application instance
 */
const configureMiddleware = (app: Express): void => {
  // Initialize metrics collection
  const metrics = new promClient.Registry();
  promClient.collectDefaultMetrics({ register: metrics });

  // Request correlation and logging
  app.use(correlationIdMiddleware);
  app.use(requestLogger);

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'"],
        'style-src': ["'self'"],
        'img-src': ["'self'", 'data:', 'https:'],
        'font-src': ["'self'"],
        'object-src': ["'none'"],
        'frame-ancestors': ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: true,
    dnsPrefetchControl: true,
    frameguard: true,
    hidePoweredBy: true,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    ieNoOpen: true,
    noSniff: true,
    referrerPolicy: true,
    xssFilter: true
  }));

  // CORS configuration
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID'],
    credentials: true,
    maxAge: 7200
  }));

  // Request parsing and compression
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(compression({
    level: 6,
    threshold: 1024,
    filter: (req: Request) => {
      return !req.headers['x-no-compression'] &&
             compression.filter(req, {} as Response);
    }
  }));

  // Rate limiting configuration
  const attributionLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 1000,
    keyPrefix: 'rl:attribution:'
  });

  const analyticsLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 100,
    keyPrefix: 'rl:analytics:'
  });

  const eventsLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 10000,
    keyPrefix: 'rl:events:'
  });

  // Apply rate limiters to specific paths
  app.use('/api/v1/attribution', attributionLimiter);
  app.use('/api/v1/analytics', analyticsLimiter);
  app.use('/api/v1/events', eventsLimiter);
};

/**
 * Configures API routes with enhanced error handling and monitoring
 * @param app Express application instance
 */
const configureRoutes = (app: Express): void => {
  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Metrics endpoint
  app.get('/metrics', async (req: Request, res: Response) => {
    try {
      res.set('Content-Type', promClient.register.contentType);
      res.send(await promClient.register.metrics());
    } catch (error) {
      res.status(500).send('Error collecting metrics');
    }
  });

  // Mount API routes with authentication
  app.use('/api/v1/attribution', authenticate, require('./api/routes/attribution.routes'));
  app.use('/api/v1/analytics', authenticate, require('./api/routes/analytics.routes'));
  app.use('/api/v1/events', authenticate, require('./api/routes/events.routes'));

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);
};

/**
 * Configures graceful shutdown handling
 * @param app Express application instance
 * @param server HTTP server instance
 */
const configureGracefulShutdown = (app: Express, server: any): void => {
  const shutdown = async (signal: string) => {
    console.log(`${signal} received, starting graceful shutdown`);

    // Stop accepting new requests
    server.close(async () => {
      try {
        // Close database connections
        await Promise.all([
          // Add database connection closures here
        ]);

        console.log('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
      }
    });
  };

  // Handle shutdown signals
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

// Configure application
configureMiddleware(app);
configureRoutes(app);

export default app;