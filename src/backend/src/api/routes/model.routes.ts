/**
 * Attribution Model Routes Configuration
 * Implements secure CRUD operations for attribution models with comprehensive
 * middleware chain, validation, and performance monitoring
 * @version 1.0.0
 */

import express from 'express'; // v4.18.2
import helmet from 'helmet'; // v7.0.0
import rateLimit from 'express-rate-limit'; // v6.7.0
import prometheusMiddleware from 'express-prometheus-middleware'; // v1.2.0

import { ModelController } from '../controllers/model.controller';
import { authenticate, requireRoles } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validation.middleware';

// Initialize router
const router = express.Router();

// Initialize controller
const modelController = new ModelController();

// Configure rate limiters
const standardRateLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'RATE_LIMIT_ERROR', message: 'Too many requests' }
});

const writeRateLimit = rateLimit({
    windowMs: 60 * 1000,
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'RATE_LIMIT_ERROR', message: 'Too many write requests' }
});

// Configure performance monitoring
router.use(prometheusMiddleware({
    metricsPath: '/metrics',
    collectDefaultMetrics: true,
    requestDurationBuckets: [0.1, 0.5, 1, 1.5, 2, 3, 5],
    requestLengthBuckets: [512, 1024, 5120, 10240, 51200, 102400],
    responseLengthBuckets: [512, 1024, 5120, 10240, 51200, 102400]
}));

// Apply security middleware
router.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'"],
            imgSrc: ["'self'"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
        }
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

// Apply authentication to all routes
router.use(authenticate);

/**
 * GET /api/v1/models/:modelId
 * Retrieve attribution model by ID with caching
 */
router.get(
    '/:modelId',
    requireRoles(['admin', 'analyst']),
    validateRequest({
        schemaName: 'getModelSchema',
        target: 'params',
        strict: true
    }),
    standardRateLimit,
    modelController.getModel
);

/**
 * POST /api/v1/models
 * Create new attribution model with validation
 */
router.post(
    '/',
    requireRoles(['admin']),
    validateRequest({
        schemaName: 'createModelSchema',
        target: 'body',
        strict: true
    }),
    writeRateLimit,
    modelController.createModel
);

/**
 * PUT /api/v1/models/:modelId
 * Update existing attribution model
 */
router.put(
    '/:modelId',
    requireRoles(['admin']),
    validateRequest({
        schemaName: 'updateModelSchema',
        target: 'body',
        strict: true
    }),
    writeRateLimit,
    modelController.updateModel
);

/**
 * DELETE /api/v1/models/:modelId
 * Delete attribution model
 */
router.delete(
    '/:modelId',
    requireRoles(['admin']),
    validateRequest({
        schemaName: 'deleteModelSchema',
        target: 'params',
        strict: true
    }),
    writeRateLimit,
    modelController.deleteModel
);

/**
 * POST /api/v1/models/:modelId/calculate
 * Calculate attribution using specified model
 */
router.post(
    '/:modelId/calculate',
    requireRoles(['admin', 'analyst']),
    validateRequest({
        schemaName: 'calculateAttributionSchema',
        target: 'body',
        strict: true,
        timeoutMs: 5000 // 5s SLA requirement
    }),
    standardRateLimit,
    modelController.calculateAttribution
);

/**
 * POST /api/v1/models/:modelId/calculate-batch
 * Calculate attribution for multiple touchpoint batches
 */
router.post(
    '/:modelId/calculate-batch',
    requireRoles(['admin', 'analyst']),
    validateRequest({
        schemaName: 'calculateBatchAttributionSchema',
        target: 'body',
        strict: true,
        timeoutMs: 10000 // 10s for batch processing
    }),
    writeRateLimit,
    modelController.calculateBatchAttribution
);

// Error handling middleware
router.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Route error:', err);
    res.status(500).json({
        success: false,
        error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected error occurred',
            details: err.message
        }
    });
});

export default router;