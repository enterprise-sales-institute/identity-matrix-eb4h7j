/**
 * Enhanced User Controller Implementation
 * Handles user-related HTTP requests with comprehensive security features,
 * authentication methods, and detailed audit logging.
 * @version 1.0.0
 */

import { Request, Response } from 'express'; // v4.18.2
import { RateLimiterMemory } from 'rate-limiter-flexible'; // v3.0.0
import helmet from 'helmet'; // v7.0.0
import winston from 'winston'; // v3.8.2

import { UserRepository } from '../../database/postgres/repositories/user.repository';
import { AuthService } from '../../lib/security/auth.service';
import { ErrorCode, ErrorCategory } from '../../types/error.types';
import { ApiResponse } from '../../types/common.types';

/**
 * Interface for enhanced request security context
 */
interface SecurityContext {
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  geoLocation?: string;
  deviceId?: string;
}

/**
 * Enhanced User Controller with comprehensive security features
 */
export class UserController {
  private readonly userRepository: UserRepository;
  private readonly authService: AuthService;
  private readonly rateLimiter: RateLimiterMemory;
  private readonly logger: winston.Logger;

  constructor(
    userRepository: UserRepository,
    authService: AuthService
  ) {
    this.userRepository = userRepository;
    this.authService = authService;

    // Initialize rate limiter for request throttling
    this.rateLimiter = new RateLimiterMemory({
      points: 5, // Number of requests
      duration: 60, // Per 1 minute
      blockDuration: 300 // Block for 5 minutes
    });

    // Configure secure logging
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'logs/user-audit.log' })
      ]
    });
  }

  /**
   * Enhanced user login with comprehensive security checks
   */
  public async login(req: Request, res: Response): Promise<Response> {
    try {
      // Apply rate limiting
      await this.rateLimiter.consume(req.ip);

      // Extract and validate credentials
      const { email, password, mfaToken, deviceId } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Invalid credentials provided',
            category: ErrorCategory.VALIDATION
          }
        });
      }

      // Build security context
      const securityContext: SecurityContext = {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || 'unknown',
        timestamp: new Date().toISOString(),
        deviceId,
        geoLocation: req.headers['x-geo-location'] as string
      };

      // Attempt authentication
      const authResponse = await this.authService.login(
        { email, password, mfaToken, deviceId },
        securityContext
      );

      // Log successful login
      this.logger.info('User login successful', {
        userId: authResponse.sessionId,
        ipAddress: securityContext.ipAddress,
        timestamp: securityContext.timestamp
      });

      return res.status(200).json({
        success: true,
        data: authResponse,
        error: null
      });
    } catch (error) {
      // Log authentication failure
      this.logger.error('Login failed', {
        ipAddress: req.ip,
        timestamp: new Date().toISOString(),
        error: error.message
      });

      return res.status(401).json({
        success: false,
        error: {
          code: ErrorCode.AUTHENTICATION_ERROR,
          message: 'Authentication failed',
          category: ErrorCategory.SECURITY
        }
      });
    }
  }

  /**
   * Verify MFA token with security logging
   */
  public async verifyMfa(req: Request, res: Response): Promise<Response> {
    try {
      const { userId, mfaToken } = req.body;
      const securityContext = {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || 'unknown',
        timestamp: new Date().toISOString()
      };

      const verified = await this.authService.verifyMfa(
        userId,
        mfaToken,
        securityContext
      );

      return res.status(200).json({
        success: true,
        data: { verified },
        error: null
      });
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: {
          code: ErrorCode.AUTHENTICATION_ERROR,
          message: 'MFA verification failed',
          category: ErrorCategory.SECURITY
        }
      });
    }
  }

  /**
   * Refresh authentication token with security validation
   */
  public async refreshToken(req: Request, res: Response): Promise<Response> {
    try {
      const { refreshToken } = req.body;
      const securityContext = {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || 'unknown',
        timestamp: new Date().toISOString(),
        sessionId: req.headers['x-session-id'] as string
      };

      const tokens = await this.authService.refreshAccessToken(
        refreshToken,
        securityContext
      );

      return res.status(200).json({
        success: true,
        data: tokens,
        error: null
      });
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: {
          code: ErrorCode.AUTHENTICATION_ERROR,
          message: 'Token refresh failed',
          category: ErrorCategory.SECURITY
        }
      });
    }
  }

  /**
   * Create new user with security validation
   */
  public async createUser(req: Request, res: Response): Promise<Response> {
    try {
      const userData = req.body;
      const createdBy = req.user?.id;

      if (!createdBy) {
        return res.status(401).json({
          success: false,
          error: {
            code: ErrorCode.AUTHORIZATION_ERROR,
            message: 'Unauthorized access',
            category: ErrorCategory.SECURITY
          }
        });
      }

      const user = await this.userRepository.create({
        ...userData,
        createdBy
      });

      this.logger.info('User created', {
        userId: user.id,
        createdBy,
        timestamp: new Date().toISOString()
      });

      return res.status(201).json({
        success: true,
        data: user,
        error: null
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'User creation failed',
          category: ErrorCategory.VALIDATION
        }
      });
    }
  }

  /**
   * Update user profile with security checks
   */
  public async updateUser(req: Request, res: Response): Promise<Response> {
    try {
      const { userId } = req.params;
      const updates = req.body;
      const updatedBy = req.user?.id;

      if (!updatedBy) {
        return res.status(401).json({
          success: false,
          error: {
            code: ErrorCode.AUTHORIZATION_ERROR,
            message: 'Unauthorized access',
            category: ErrorCategory.SECURITY
          }
        });
      }

      const user = await this.userRepository.update(userId, {
        ...updates,
        updatedBy
      });

      this.logger.info('User updated', {
        userId,
        updatedBy,
        timestamp: new Date().toISOString()
      });

      return res.status(200).json({
        success: true,
        data: user,
        error: null
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'User update failed',
          category: ErrorCategory.VALIDATION
        }
      });
    }
  }

  /**
   * Delete user with security validation
   */
  public async deleteUser(req: Request, res: Response): Promise<Response> {
    try {
      const { userId } = req.params;
      const deletedBy = req.user?.id;

      if (!deletedBy) {
        return res.status(401).json({
          success: false,
          error: {
            code: ErrorCode.AUTHORIZATION_ERROR,
            message: 'Unauthorized access',
            category: ErrorCategory.SECURITY
          }
        });
      }

      await this.userRepository.delete(userId);

      this.logger.info('User deleted', {
        userId,
        deletedBy,
        timestamp: new Date().toISOString()
      });

      return res.status(204).send();
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'User deletion failed',
          category: ErrorCategory.VALIDATION
        }
      });
    }
  }

  /**
   * Get user profile with security validation
   */
  public async getUserProfile(req: Request, res: Response): Promise<Response> {
    try {
      const { userId } = req.params;
      const requestedBy = req.user?.id;

      if (!requestedBy) {
        return res.status(401).json({
          success: false,
          error: {
            code: ErrorCode.AUTHORIZATION_ERROR,
            message: 'Unauthorized access',
            category: ErrorCategory.SECURITY
          }
        });
      }

      const user = await this.userRepository.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            code: ErrorCode.NOT_FOUND_ERROR,
            message: 'User not found',
            category: ErrorCategory.VALIDATION
          }
        });
      }

      return res.status(200).json({
        success: true,
        data: user,
        error: null
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Failed to retrieve user profile',
          category: ErrorCategory.VALIDATION
        }
      });
    }
  }
}