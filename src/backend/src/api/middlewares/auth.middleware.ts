/**
 * Authentication and Authorization Middleware
 * Provides secure request authentication, role-based access control, and audit logging
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express'; // v4.18.2
import winston from 'winston'; // v3.8.2
import rateLimit from 'express-rate-limit'; // v6.7.0

import { AuthService } from '../../lib/security/auth.service';
import { JwtService } from '../../lib/security/jwt.service';
import { ErrorCode } from '../../types/error.types';

/**
 * Extended Express Request interface with authenticated user data
 */
interface AuthenticatedRequest extends Request {
  userId: string;
  roles: string[];
  mfaVerified: boolean;
  securityContext: {
    sessionId: string;
    ipAddress: string;
    userAgent: string;
    timestamp: string;
  };
  requestId: string;
}

// Initialize services
const jwtService = new JwtService();
const authService = new AuthService(jwtService, winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/auth-audit.log' })
  ]
}));

// Configure rate limiters
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: ErrorCode.RATE_LIMIT_ERROR, message: 'Too many authentication attempts' }
});

const mfaRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // Limit each IP to 5 MFA attempts per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: ErrorCode.RATE_LIMIT_ERROR, message: 'Too many MFA attempts' }
});

/**
 * Authentication middleware with enhanced security checks
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Generate unique request ID
    const requestId = `auth-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Validate security headers
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error(ErrorCode.AUTHENTICATION_ERROR);
    }

    // Extract and verify JWT token
    const token = authHeader.split(' ')[1];
    const verified = await jwtService.verifyToken(token, {
      validateAudience: true,
      validateIssuer: true,
      validateLifetime: true,
      allowedAlgorithms: ['HS256']
    });

    // Create security context
    const securityContext = {
      sessionId: verified.jti,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || 'unknown',
      timestamp: new Date().toISOString()
    };

    // Extend request with authenticated user data
    (req as AuthenticatedRequest).userId = verified.userId;
    (req as AuthenticatedRequest).roles = verified.roles;
    (req as AuthenticatedRequest).securityContext = securityContext;
    (req as AuthenticatedRequest).requestId = requestId;
    (req as AuthenticatedRequest).mfaVerified = false;

    // Generate audit log
    await authService.generateAuditLog({
      type: 'authentication',
      userId: verified.userId,
      requestId,
      success: true,
      context: securityContext
    });

    next();
  } catch (error) {
    res.status(401).json({
      error: ErrorCode.AUTHENTICATION_ERROR,
      message: 'Authentication failed',
      details: error.message
    });
  }
};

/**
 * Role-based authorization middleware factory
 */
export const requireRoles = (allowedRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      
      // Verify authentication
      if (!authReq.userId || !authReq.roles) {
        throw new Error(ErrorCode.AUTHORIZATION_ERROR);
      }

      // Check user roles
      const hasRequiredRole = authReq.roles.some(role => allowedRoles.includes(role));
      if (!hasRequiredRole) {
        throw new Error(ErrorCode.AUTHORIZATION_ERROR);
      }

      // Generate audit log
      await authService.generateAuditLog({
        type: 'authorization',
        userId: authReq.userId,
        requestId: authReq.requestId,
        success: true,
        context: {
          roles: authReq.roles,
          requiredRoles: allowedRoles,
          ...authReq.securityContext
        }
      });

      next();
    } catch (error) {
      res.status(403).json({
        error: ErrorCode.AUTHORIZATION_ERROR,
        message: 'Insufficient permissions',
        details: error.message
      });
    }
  };
};

/**
 * MFA verification middleware with security monitoring
 */
export const requireMfa = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;

    // Verify authentication
    if (!authReq.userId) {
      throw new Error(ErrorCode.AUTHENTICATION_ERROR);
    }

    // Apply rate limiting
    await mfaRateLimiter(req, res, () => {});

    // Verify MFA token
    const mfaToken = req.headers['x-mfa-token'] as string;
    if (!mfaToken) {
      throw new Error('MFA token required');
    }

    const mfaVerified = await authService.verifyMfa(
      authReq.userId,
      mfaToken,
      authReq.securityContext
    );

    if (!mfaVerified) {
      throw new Error('MFA verification failed');
    }

    // Update request context
    authReq.mfaVerified = true;

    // Generate audit log
    await authService.generateAuditLog({
      type: 'mfa_verification',
      userId: authReq.userId,
      requestId: authReq.requestId,
      success: true,
      context: authReq.securityContext
    });

    next();
  } catch (error) {
    res.status(401).json({
      error: ErrorCode.AUTHENTICATION_ERROR,
      message: 'MFA verification failed',
      details: error.message
    });
  }
};