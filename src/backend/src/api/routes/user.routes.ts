/**
 * User Routes Configuration
 * Implements secure authentication, role-based authorization, and profile management
 * with comprehensive middleware integration for security, validation, and audit logging.
 * @version 1.0.0
 */

import { Router } from 'express'; // v4.18.2
import { RateLimiterMemory } from 'rate-limiter-flexible'; // v2.4.1
import winston from 'winston'; // v3.8.2

import { UserController } from '../controllers/user.controller';
import { authenticate, requireRoles, requireMfa } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validation.middleware';

// User role constants
const USER_ROLES = {
  ADMIN: 'admin',
  ANALYST: 'analyst',
  MARKETING: 'marketing',
  USER: 'user'
} as const;

// Rate limit configurations
const RATE_LIMITS = {
  LOGIN: {
    points: 10,
    duration: 60, // 1 minute
    blockDuration: 900 // 15 minutes
  },
  MFA: {
    points: 5,
    duration: 300, // 5 minutes
    blockDuration: 900 // 15 minutes
  },
  API: {
    points: 100,
    duration: 60, // 1 minute
    blockDuration: 300 // 5 minutes
  }
} as const;

// Initialize rate limiters
const loginLimiter = new RateLimiterMemory(RATE_LIMITS.LOGIN);
const mfaLimiter = new RateLimiterMemory(RATE_LIMITS.MFA);
const apiLimiter = new RateLimiterMemory(RATE_LIMITS.API);

// Configure audit logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'user-routes' },
  transports: [
    new winston.transports.File({ filename: 'logs/user-audit.log' })
  ]
});

/**
 * Configures and returns the Express router with user-related routes
 * @param userController Instance of UserController for handling requests
 * @returns Configured Express router
 */
export const configureUserRoutes = (userController: UserController): Router => {
  const router = Router();

  // Authentication routes
  router.post('/auth/login',
    async (req, res, next) => {
      try {
        await loginLimiter.consume(req.ip);
        next();
      } catch {
        res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_ERROR',
            message: 'Too many login attempts'
          }
        });
      }
    },
    validateRequest({
      schemaName: 'USER_LOGIN_SCHEMA',
      target: 'body'
    }),
    userController.login
  );

  router.post('/auth/mfa/verify',
    authenticate,
    async (req, res, next) => {
      try {
        await mfaLimiter.consume(req.ip);
        next();
      } catch {
        res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_ERROR',
            message: 'Too many MFA attempts'
          }
        });
      }
    },
    validateRequest({
      schemaName: 'MFA_VERIFICATION_SCHEMA',
      target: 'body'
    }),
    userController.verifyMfa
  );

  router.post('/auth/token/refresh',
    validateRequest({
      schemaName: 'TOKEN_REFRESH_SCHEMA',
      target: 'body'
    }),
    userController.refreshToken
  );

  // User management routes (Admin only)
  router.post('/users',
    authenticate,
    requireRoles([USER_ROLES.ADMIN]),
    validateRequest({
      schemaName: 'USER_REGISTRATION_SCHEMA',
      target: 'body',
      strict: true
    }),
    userController.createUser
  );

  router.put('/users/:userId',
    authenticate,
    requireRoles([USER_ROLES.ADMIN]),
    validateRequest({
      schemaName: 'USER_PROFILE_UPDATE_SCHEMA',
      target: 'body'
    }),
    userController.updateUser
  );

  router.delete('/users/:userId',
    authenticate,
    requireRoles([USER_ROLES.ADMIN]),
    validateRequest({
      schemaName: 'USER_ID_SCHEMA',
      target: 'params'
    }),
    userController.deleteUser
  );

  // User profile routes (Authenticated users)
  router.get('/users/profile',
    authenticate,
    async (req, res, next) => {
      try {
        await apiLimiter.consume(req.ip);
        next();
      } catch {
        res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_ERROR',
            message: 'Too many API requests'
          }
        });
      }
    },
    userController.getUserProfile
  );

  // Secure routes requiring MFA
  router.put('/users/profile/security',
    authenticate,
    requireMfa,
    validateRequest({
      schemaName: 'SECURITY_SETTINGS_SCHEMA',
      target: 'body'
    }),
    userController.updateSecuritySettings
  );

  // Error handling middleware
  router.use((err: Error, req: any, res: any, next: any) => {
    logger.error('Route error', {
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      ip: req.ip,
      userId: req.userId
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred'
      }
    });
  });

  return router;
};

// Export configured router
export const userRouter = configureUserRoutes(new UserController());