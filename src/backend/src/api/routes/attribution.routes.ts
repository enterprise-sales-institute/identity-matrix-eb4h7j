/**
 * Attribution Routes Configuration
 * Provides secure RESTful endpoints for multi-touch attribution modeling
 * with enhanced security, validation, and performance monitoring
 * @version 1.0.0
 */

import express, { Router } from 'express'; // v4.18.2
import compression from 'compression'; // v1.7.4
import helmet from 'helmet'; // v7.0.0
import rateLimit from 'express-rate-limit'; // v6.7.0
import promMiddleware from 'express-prometheus-middleware'; // v1.2.0

import { AttributionController } from '../controllers/attribution.controller';
import { validateRequest } from '../middlewares/validation.middleware';
import { authenticate, requireRoles, requireMfa } from '../middlewares/auth.middleware';

/**
 * Configures and returns the attribution router with enhanced security and monitoring
 */
export const configureAttributionRoutes = (): Router => {
  const router = express.Router();
  const attributionController = new AttributionController();

  // Apply security headers
  router.use(helmet({
    contentSecurityPolicy: true,
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: true,
    dnsPrefetchControl: true,
    frameguard: true,
    hidePoweredBy: true,
    hsts: true,
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: true,
    referrerPolicy: true,
    xssFilter: true
  }));

  // Enable response compression
  router.use(compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    }
  }));

  // Configure Prometheus monitoring
  router.use(promMiddleware({
    metricsPath: '/metrics',
    collectDefaultMetrics: true,
    requestDurationBuckets: [0.1, 0.5, 1, 1.5, 2, 3, 5, 10],
    requestLengthBuckets: [512, 1024, 5120, 10240, 51200, 102400],
    responseLengthBuckets: [512, 1024, 5120, 10240, 51200, 102400]
  }));

  /**
   * POST /api/v1/attribution/calculate
   * Calculate attribution weights for touchpoints with enhanced security
   */
  router.post('/calculate',
    authenticate,
    requireMfa,
    requireRoles(['analyst', 'admin']),
    rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 100, // 100 requests per minute
      message: 'Too many attribution calculations, please try again later'
    }),
    validateRequest({
      schemaName: 'attributionCalculation',
      target: 'body'
    }),
    attributionController.calculateAttribution
  );

  /**
   * GET /api/v1/attribution/touchpoints/:visitorId
   * Retrieve touchpoints for a visitor with role-based access
   */
  router.get('/touchpoints/:visitorId',
    authenticate,
    requireRoles(['analyst', 'admin']),
    rateLimit({
      windowMs: 60 * 1000,
      max: 1000,
      message: 'Too many touchpoint requests, please try again later'
    }),
    validateRequest({
      schemaName: 'touchpointRetrieval',
      target: 'params'
    }),
    attributionController.getTouchpoints
  );

  /**
   * PUT /api/v1/attribution/model/config
   * Update attribution model configuration with admin-only access
   */
  router.put('/model/config',
    authenticate,
    requireMfa,
    requireRoles(['admin']),
    rateLimit({
      windowMs: 60 * 1000,
      max: 50,
      message: 'Too many configuration updates, please try again later'
    }),
    validateRequest({
      schemaName: 'modelConfiguration',
      target: 'body'
    }),
    attributionController.updateModelConfig
  );

  return router;
};

export default configureAttributionRoutes;