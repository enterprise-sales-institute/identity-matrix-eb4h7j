/**
 * Enhanced Authentication Service Implementation
 * Provides secure user authentication, authorization, and session management
 * with comprehensive security monitoring and audit logging
 * @version 1.0.0
 */

import { Auth0 } from 'auth0'; // v3.3.0
import speakeasy from 'speakeasy'; // v2.0.0
import { RateLimiterMemory } from 'rate-limiter-flexible'; // v2.4.1
import winston from 'winston'; // v3.8.2

import { JwtService } from './jwt.service';
import { SecurityConfig } from '../../types/config.types';
import { ErrorCodes, ApiResponse } from '../../types/common.types';

/**
 * Enhanced authentication response interface with security metadata
 */
interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  mfaRequired: boolean;
  sessionId: string;
  securityMetadata: {
    lastLogin: string;
    deviceInfo: string;
    location: string;
    mfaVerified: boolean;
  };
}

/**
 * User login credentials interface with additional security fields
 */
interface UserCredentials {
  email: string;
  password: string;
  mfaToken?: string;
  deviceId?: string;
  securityContext?: {
    ipAddress: string;
    userAgent: string;
    geoLocation?: string;
  };
}

/**
 * Request context for security tracking
 */
interface RequestContext {
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  sessionId?: string;
  geoLocation?: string;
}

/**
 * Enhanced authentication service with comprehensive security features
 */
export class AuthService {
  private readonly jwtService: JwtService;
  private readonly auth0Client: Auth0;
  private readonly rateLimiter: RateLimiterMemory;
  private readonly logger: winston.Logger;
  private readonly mfaSecrets: Map<string, string>;
  private readonly suspiciousAttempts: Map<string, number>;

  constructor(
    jwtService: JwtService,
    logger: winston.Logger
  ) {
    // Initialize JWT service
    this.jwtService = jwtService;

    // Initialize Auth0 client with secure configuration
    this.auth0Client = new Auth0({
      domain: process.env.AUTH0_DOMAIN!,
      clientId: process.env.AUTH0_CLIENT_ID!,
      clientSecret: process.env.AUTH0_CLIENT_SECRET!
    });

    // Configure rate limiter for login attempts
    this.rateLimiter = new RateLimiterMemory({
      points: 5, // Number of attempts
      duration: 300, // Per 5 minutes
      blockDuration: 900 // 15 minutes block
    });

    // Configure secure logging
    this.logger = logger.child({
      service: 'AuthService',
      securityLevel: 'high'
    });

    // Initialize MFA storage with secure defaults
    this.mfaSecrets = new Map<string, string>();
    this.suspiciousAttempts = new Map<string, number>();
  }

  /**
   * Secure user authentication with rate limiting and audit logging
   */
  public async login(
    credentials: UserCredentials,
    context: RequestContext
  ): Promise<AuthResponse> {
    try {
      // Apply rate limiting by IP and email
      const rateLimitKey = `${context.ipAddress}:${credentials.email}`;
      await this.rateLimiter.consume(rateLimitKey);

      // Check for suspicious patterns
      if (this.isSuspiciousActivity(credentials, context)) {
        this.logger.warn('Suspicious login attempt detected', {
          email: credentials.email,
          ipAddress: context.ipAddress,
          timestamp: context.timestamp
        });
        throw new Error(ErrorCodes.AUTHENTICATION_ERROR);
      }

      // Authenticate with Auth0
      const auth0Response = await this.auth0Client.authenticate({
        username: credentials.email,
        password: credentials.password,
        scope: 'openid profile email'
      });

      // Verify MFA if enabled
      let mfaVerified = false;
      if (auth0Response.mfa_required && credentials.mfaToken) {
        mfaVerified = await this.verifyMfa(
          auth0Response.user_id,
          credentials.mfaToken,
          context
        );
        if (!mfaVerified) {
          throw new Error('MFA verification failed');
        }
      }

      // Generate secure JWT tokens
      const tokens = await this.jwtService.generateToken(
        auth0Response.user_id,
        auth0Response.scope.split(' '),
        ['read:profile', 'write:data']
      );

      // Create session ID
      const sessionId = crypto.randomUUID();

      // Log successful authentication
      this.logger.info('Authentication successful', {
        userId: auth0Response.user_id,
        sessionId,
        ipAddress: context.ipAddress,
        timestamp: context.timestamp,
        mfaVerified
      });

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        mfaRequired: auth0Response.mfa_required && !mfaVerified,
        sessionId,
        securityMetadata: {
          lastLogin: context.timestamp,
          deviceInfo: context.userAgent,
          location: context.geoLocation || 'unknown',
          mfaVerified
        }
      };
    } catch (error) {
      // Log authentication failure
      this.logger.error('Authentication failed', {
        email: credentials.email,
        ipAddress: context.ipAddress,
        timestamp: context.timestamp,
        error: error.message
      });

      // Update suspicious attempts counter
      this.updateSuspiciousAttempts(credentials.email);

      throw error;
    }
  }

  /**
   * Enhanced MFA verification with security logging
   */
  public async verifyMfa(
    userId: string,
    token: string,
    context: RequestContext
  ): Promise<boolean> {
    try {
      // Get user's MFA secret
      const secret = this.mfaSecrets.get(userId);
      if (!secret) {
        throw new Error('MFA not configured for user');
      }

      // Verify TOTP token
      const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: 1 // Allow 30 seconds window
      });

      // Log verification attempt
      this.logger.info('MFA verification attempt', {
        userId,
        verified,
        ipAddress: context.ipAddress,
        timestamp: context.timestamp
      });

      return verified;
    } catch (error) {
      this.logger.error('MFA verification failed', {
        userId,
        ipAddress: context.ipAddress,
        timestamp: context.timestamp,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Refresh access token with security validation
   */
  public async refreshAccessToken(
    refreshToken: string,
    context: RequestContext
  ): Promise<AuthResponse> {
    try {
      const tokens = await this.jwtService.refreshToken(refreshToken);
      
      this.logger.info('Token refreshed', {
        sessionId: context.sessionId,
        ipAddress: context.ipAddress,
        timestamp: context.timestamp
      });

      return {
        ...tokens,
        mfaRequired: false,
        sessionId: context.sessionId!,
        securityMetadata: {
          lastLogin: context.timestamp,
          deviceInfo: context.userAgent,
          location: context.geoLocation || 'unknown',
          mfaVerified: true
        }
      };
    } catch (error) {
      this.logger.error('Token refresh failed', {
        ipAddress: context.ipAddress,
        timestamp: context.timestamp,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Revoke active tokens for security purposes
   */
  public async revokeTokens(
    accessToken: string,
    refreshToken: string,
    context: RequestContext
  ): Promise<void> {
    try {
      await Promise.all([
        this.jwtService.revokeToken(accessToken),
        this.jwtService.revokeToken(refreshToken)
      ]);

      this.logger.info('Tokens revoked', {
        sessionId: context.sessionId,
        ipAddress: context.ipAddress,
        timestamp: context.timestamp
      });
    } catch (error) {
      this.logger.error('Token revocation failed', {
        sessionId: context.sessionId,
        ipAddress: context.ipAddress,
        timestamp: context.timestamp,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Check for suspicious login activity
   */
  private isSuspiciousActivity(
    credentials: UserCredentials,
    context: RequestContext
  ): boolean {
    const attempts = this.suspiciousAttempts.get(credentials.email) || 0;
    return attempts >= 3 || this.isUnusualLoginPattern(credentials, context);
  }

  /**
   * Update suspicious attempts counter
   */
  private updateSuspiciousAttempts(email: string): void {
    const attempts = (this.suspiciousAttempts.get(email) || 0) + 1;
    this.suspiciousAttempts.set(email, attempts);
    
    // Reset counter after 24 hours
    setTimeout(() => {
      this.suspiciousAttempts.delete(email);
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * Check for unusual login patterns
   */
  private isUnusualLoginPattern(
    credentials: UserCredentials,
    context: RequestContext
  ): boolean {
    // Implement additional security checks here
    // Example: Geo-velocity, device fingerprinting, etc.
    return false;
  }
}