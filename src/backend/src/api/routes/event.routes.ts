/**
 * Event Routes Configuration
 * Implements secure, scalable routes for event collection and querying
 * with comprehensive middleware, validation, and monitoring
 * @version 1.0.0
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import winston from 'winston';
import { EventController } from '../controllers/event.controller';
import { authenticate, requireRoles } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validation.middleware';
import { eventSchema, eventQuerySchema } from '../validators/event.validator';
import { MetricsService } from '../../lib/metrics/metrics.service';

// Initialize logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'event-routes' },
  transports: [
    new winston.transports.File({ filename: 'logs/event-routes.log' })
  ]
});

// Initialize metrics service
const metricsService = new MetricsService(logger);

// Configure rate limiters
const eventCollectionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // 1000 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'RATE_LIMIT_ERROR', message: 'Too many event collection requests' }
});

const eventQueryLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'RATE_LIMIT_ERROR', message: 'Too many event query requests' }
});

/**
 * Configures and returns Express router with secure event tracking endpoints
 */
const configureEventRoutes = (): Router => {
  const router = Router();
  const eventController = new EventController();

  // Apply security middleware
  router.use(helmet());

  // Request logging middleware
  const logRequest = (req: any, res: any, next: any) => {
    const startTime = process.hrtime();

    res.on('finish', () => {
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const duration = seconds * 1000 + nanoseconds / 1000000;

      metricsService.recordHistogram('http_request_duration', duration, {
        method: req.method,
        path: req.path,
        status: res.statusCode.toString()
      });

      logger.info('Request processed', {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration,
        requestId: req.headers['x-request-id'],
        correlationId: req.headers['x-correlation-id']
      });
    });

    next();
  };

  // Event tracking endpoint
  router.post('/events',
    eventCollectionLimiter,
    validateRequest({
      schemaName: 'event',
      target: 'body',
      strict: true,
      timeoutMs: 5000
    }),
    authenticate,
    requireRoles(['event:write']),
    logRequest,
    async (req, res) => {
      try {
        const event = await eventController.trackEvent(req.body, {
          correlationId: req.headers['x-correlation-id'] as string
        });

        metricsService.incrementCounter('events_tracked_total');

        res.status(201).json({
          success: true,
          data: event,
          error: null,
          metadata: {
            apiVersion: '1.0',
            timestamp: Date.now(),
            requestId: req.headers['x-request-id']
          }
        });
      } catch (error) {
        logger.error('Event tracking failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
          requestId: req.headers['x-request-id'],
          correlationId: req.headers['x-correlation-id']
        });

        metricsService.incrementCounter('event_tracking_failures');

        res.status(500).json({
          success: false,
          data: null,
          error: {
            code: 'EVENT_PROCESSING_ERROR',
            message: 'Failed to process event',
            details: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          },
          metadata: {
            apiVersion: '1.0',
            timestamp: Date.now(),
            requestId: req.headers['x-request-id']
          }
        });
      }
    }
  );

  // Visitor events query endpoint
  router.get('/events/visitor/:visitorId',
    eventQueryLimiter,
    validateRequest({
      schemaName: 'eventQuery',
      target: 'query',
      strict: true,
      timeoutMs: 3000
    }),
    authenticate,
    requireRoles(['event:read']),
    logRequest,
    async (req, res) => {
      try {
        const events = await eventController.getVisitorEvents(
          req.params.visitorId,
          parseInt(req.query.limit as string) || 100,
          parseInt(req.query.offset as string) || 0
        );

        metricsService.incrementCounter('event_queries_total');

        res.status(200).json({
          success: true,
          data: events,
          error: null,
          metadata: {
            apiVersion: '1.0',
            timestamp: Date.now(),
            requestId: req.headers['x-request-id']
          }
        });
      } catch (error) {
        logger.error('Visitor events query failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
          requestId: req.headers['x-request-id'],
          correlationId: req.headers['x-correlation-id'],
          visitorId: req.params.visitorId
        });

        metricsService.incrementCounter('event_query_failures');

        res.status(500).json({
          success: false,
          data: null,
          error: {
            code: 'EVENT_QUERY_ERROR',
            message: 'Failed to retrieve visitor events',
            details: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          },
          metadata: {
            apiVersion: '1.0',
            timestamp: Date.now(),
            requestId: req.headers['x-request-id']
          }
        });
      }
    }
  );

  // Session events query endpoint
  router.get('/events/session/:sessionId',
    eventQueryLimiter,
    validateRequest({
      schemaName: 'eventQuery',
      target: 'query',
      strict: true,
      timeoutMs: 3000
    }),
    authenticate,
    requireRoles(['event:read']),
    logRequest,
    async (req, res) => {
      try {
        const events = await eventController.getSessionEvents(req.params.sessionId);

        metricsService.incrementCounter('session_queries_total');

        res.status(200).json({
          success: true,
          data: events,
          error: null,
          metadata: {
            apiVersion: '1.0',
            timestamp: Date.now(),
            requestId: req.headers['x-request-id']
          }
        });
      } catch (error) {
        logger.error('Session events query failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
          requestId: req.headers['x-request-id'],
          correlationId: req.headers['x-correlation-id'],
          sessionId: req.params.sessionId
        });

        metricsService.incrementCounter('session_query_failures');

        res.status(500).json({
          success: false,
          data: null,
          error: {
            code: 'EVENT_QUERY_ERROR',
            message: 'Failed to retrieve session events',
            details: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          },
          metadata: {
            apiVersion: '1.0',
            timestamp: Date.now(),
            requestId: req.headers['x-request-id']
          }
        });
      }
    }
  );

  return router;
};

export const eventRouter = configureEventRoutes();