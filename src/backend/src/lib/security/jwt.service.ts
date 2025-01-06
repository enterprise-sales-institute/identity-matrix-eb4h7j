/**
 * Enhanced JWT Service Implementation
 * Provides secure token generation, validation, and management with advanced security features
 * @version 1.0.0
 */

import jwt from 'jsonwebtoken'; // v9.0.0
import ms from 'ms'; // v2.1.3
import { RateLimiterMemory } from 'rate-limiter-flexible'; // v2.4.1
import winston from 'winston'; // v3.8.2
import NodeCache from 'node-cache'; // v5.1.2

import { SecurityConfig } from '../../types/config.types';
import { securityConfig } from '../../config/security.config';
import { ApiResponse } from '../../types/common.types';

/**
 * Enhanced interface for JWT token payload with additional security fields
 */
interface TokenPayload {
  userId: string;
  roles: string[];
  scopes: string[];
  audience: string;
  issuer: string;
  iat: number;
  exp: number;
  jti: string;
}

/**
 * Enhanced interface for token generation response with metadata
 */
interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  scopes: string[];
}

/**
 * Interface for token validation options
 */
interface TokenValidationOptions {
  validateAudience: boolean;
  validateIssuer: boolean;
  validateLifetime: boolean;
  allowedAlgorithms: string[];
}

/**
 * Enhanced service class for handling JWT operations with advanced security features
 */
export class JwtService {
  private readonly config: SecurityConfig['jwt'];
  private readonly secret: string;
  private readonly algorithms: string[];
  private readonly tokenCache: NodeCache;
  private readonly rateLimiter: RateLimiterMemory;
  private readonly logger: winston.Logger;
  private readonly tokenBlacklist: Set<string>;

  constructor() {
    // Initialize configuration and security features
    this.config = securityConfig.jwt;
    this.secret = this.config.secretKey;
    this.algorithms = [this.config.algorithm];
    
    // Initialize token cache with security-focused settings
    this.tokenCache = new NodeCache({
      stdTTL: ms('1h') / 1000,
      checkperiod: 120,
      useClones: false,
      deleteOnExpire: true
    });

    // Configure rate limiter for token operations
    this.rateLimiter = new RateLimiterMemory({
      points: 100,
      duration: 60,
      blockDuration: 300
    });

    // Setup secure logging
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'logs/jwt-audit.log' })
      ]
    });

    // Initialize token blacklist
    this.tokenBlacklist = new Set<string>();
  }

  /**
   * Generates a new JWT token with enhanced security features
   */
  public async generateToken(
    userId: string,
    roles: string[],
    scopes: string[]
  ): Promise<TokenResponse> {
    try {
      // Apply rate limiting
      await this.rateLimiter.consume(userId);

      // Generate unique token ID
      const jti = crypto.randomUUID();

      // Create token payload with enhanced security
      const payload: TokenPayload = {
        userId,
        roles,
        scopes,
        audience: this.config.audience,
        issuer: this.config.issuer,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + ms(this.config.expiresIn) / 1000,
        jti
      };

      // Sign token with selected algorithm
      const accessToken = jwt.sign(payload, this.secret, {
        algorithm: this.config.algorithm,
        jwtid: jti
      });

      // Generate refresh token
      const refreshToken = jwt.sign(
        { userId, jti: crypto.randomUUID() },
        this.secret,
        {
          algorithm: this.config.algorithm,
          expiresIn: this.config.refreshExpiresIn
        }
      );

      // Cache token metadata
      this.tokenCache.set(jti, { userId, roles, scopes }, ms(this.config.expiresIn) / 1000);

      // Log token generation
      this.logger.info('Token generated', {
        userId,
        jti,
        scopes,
        timestamp: new Date().toISOString()
      });

      return {
        accessToken,
        refreshToken,
        expiresIn: ms(this.config.expiresIn) / 1000,
        tokenType: 'Bearer',
        scopes
      };
    } catch (error) {
      this.logger.error('Token generation failed', { error, userId });
      throw error;
    }
  }

  /**
   * Verifies and decodes a JWT token with comprehensive validation
   */
  public async verifyToken(
    token: string,
    options: TokenValidationOptions
  ): Promise<TokenPayload> {
    try {
      // Check token blacklist
      if (this.tokenBlacklist.has(token)) {
        throw new Error('Token has been revoked');
      }

      // Check token cache
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded || typeof decoded === 'string') {
        throw new Error('Invalid token format');
      }

      const cachedToken = this.tokenCache.get<TokenPayload>(decoded.payload.jti);
      if (cachedToken) {
        return cachedToken;
      }

      // Verify token with comprehensive options
      const verified = jwt.verify(token, this.secret, {
        algorithms: options.allowedAlgorithms,
        audience: options.validateAudience ? this.config.audience : undefined,
        issuer: options.validateIssuer ? this.config.issuer : undefined,
        clockTolerance: 30
      }) as TokenPayload;

      // Additional security validations
      if (options.validateLifetime && verified.exp < Math.floor(Date.now() / 1000)) {
        throw new Error('Token has expired');
      }

      // Cache verification result
      this.tokenCache.set(verified.jti, verified);

      // Log verification
      this.logger.info('Token verified', {
        jti: verified.jti,
        userId: verified.userId,
        timestamp: new Date().toISOString()
      });

      return verified;
    } catch (error) {
      this.logger.error('Token verification failed', { error });
      throw error;
    }
  }

  /**
   * Refreshes an existing token with security validation
   */
  public async refreshToken(refreshToken: string): Promise<TokenResponse> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, this.secret) as { userId: string; jti: string };

      // Apply rate limiting
      await this.rateLimiter.consume(decoded.userId);

      // Verify token family
      const cachedToken = this.tokenCache.get<TokenPayload>(decoded.jti);
      if (!cachedToken) {
        throw new Error('Invalid refresh token');
      }

      // Generate new token pair
      const newTokens = await this.generateToken(
        decoded.userId,
        cachedToken.roles,
        cachedToken.scopes
      );

      // Invalidate old refresh token
      this.tokenBlacklist.add(refreshToken);
      this.tokenCache.del(decoded.jti);

      // Log refresh
      this.logger.info('Token refreshed', {
        userId: decoded.userId,
        oldJti: decoded.jti,
        timestamp: new Date().toISOString()
      });

      return newTokens;
    } catch (error) {
      this.logger.error('Token refresh failed', { error });
      throw error;
    }
  }

  /**
   * Revokes an active token
   */
  public async revokeToken(token: string): Promise<void> {
    try {
      // Verify token before revocation
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded || typeof decoded === 'string') {
        throw new Error('Invalid token format');
      }

      // Add to blacklist and remove from cache
      this.tokenBlacklist.add(token);
      this.tokenCache.del(decoded.payload.jti);

      // Log revocation
      this.logger.info('Token revoked', {
        jti: decoded.payload.jti,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.logger.error('Token revocation failed', { error });
      throw error;
    }
  }
}