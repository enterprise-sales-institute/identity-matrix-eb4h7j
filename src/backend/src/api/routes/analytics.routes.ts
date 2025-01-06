/**
 * Analytics Routes Configuration
 * Implements secure, scalable routes for analytics data access with comprehensive validation,
 * caching, and monitoring capabilities.
 * @version 1.0.0
 */

import { Router } from 'express'; // v4.18.2
import rateLimit from 'express-rate-limit'; // v6.7.0
import compression from 'compression'; // v1.7.4
import helmet from 'helmet'; // v7.0.0
import { AnalyticsController } from '../controllers/analytics.controller';
import { authenticate, requireRoles } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validation.middleware';

// Rate limiting configuration for analytics endpoints
const ANALYTICS_RATE_LIMIT = {
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: { error: 'RATE_LIMIT_ERROR', message: 'Too many analytics requests' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}:${(req as any).userId}`
};

// Cache configuration for analytics responses
const CACHE_CONFIG = {
  maxAge: 300000, // 5 minutes
  private: true,
  noStore: false,
  revalidate: true
};

// Request timeout configuration
const REQUEST_TIMEOUT = 30000; // 30 seconds

/**
 * Configures and returns Express router with analytics endpoints
 * including security, caching, and monitoring capabilities
 */
export const configureAnalyticsRoutes = (): Router => {
  const router = Router();
  const analyticsController = new AnalyticsController();

  // Apply security headers
  router.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"]
      }
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
  }));

  // Apply compression
  router.use(compression());

  // Apply authentication to all routes
  router.use(authenticate);

  // Apply rate limiting
  router.use(rateLimit(ANALYTICS_RATE_LIMIT));

  /**
   * GET /analytics/query
   * Retrieves analytics data with filtering, pagination, and sorting
   */
  router.get('/query',
    requireRoles(['analyst', 'admin']),
    validateRequest({
      schemaName: 'analyticsQuery',
      target: 'query',
      strict: true
    }),
    async (req, res, next) => {
      try {
        const result = await analyticsController.getAnalytics(
          req.query.timeRange,
          req.query.metrics,
          req.query.dimensions,
          req.query.channelIds
        );
        
        res.set({
          'Cache-Control': `private, max-age=${CACHE_CONFIG.maxAge / 1000}`,
          'Vary': 'Authorization'
        }).json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * GET /analytics/channels
   * Retrieves channel-specific analytics metrics with aggregation
   */
  router.get('/channels',
    requireRoles(['analyst', 'admin']),
    validateRequest({
      schemaName: 'channelMetrics',
      target: 'query',
      strict: true
    }),
    async (req, res, next) => {
      try {
        const result = await analyticsController.getChannelMetrics(
          req.query.channelId,
          req.query.timeRange,
          req.query.metrics
        );
        
        res.set({
          'Cache-Control': `private, max-age=${CACHE_CONFIG.maxAge / 1000}`,
          'Vary': 'Authorization'
        }).json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * POST /analytics/report
   * Generates comprehensive analytics report with custom parameters
   */
  router.post('/report',
    requireRoles(['analyst', 'admin']),
    validateRequest({
      schemaName: 'reportGeneration',
      target: 'body',
      strict: true
    }),
    async (req, res, next) => {
      try {
        const result = await analyticsController.generateReport(
          req.body.dimension,
          req.body.timeRange,
          req.body.metrics
        );
        
        res.set({
          'Cache-Control': 'no-store',
          'Content-Disposition': 'attachment; filename="analytics-report.json"'
        }).json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
};

// Export configured router
export default configureAnalyticsRoutes();