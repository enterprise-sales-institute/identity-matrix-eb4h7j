import { Request, Response, NextFunction } from 'express'; // v4.18.2
import { RedisConnection } from '../../database/redis/connection';
import { BaseError } from '../../types/error.types';
import { LoggerService } from '../../lib/logger/logger.service';
import crypto from 'crypto';

// Constants for rate limiting configuration
const DEFAULT_WINDOW_MS = 60000;
const DEFAULT_MAX_REQUESTS = 100;
const DEFAULT_KEY_PREFIX = 'rl:';
const BURST_MULTIPLIER = 2;
const FALLBACK_MAX_REQUESTS = 50;
const KEY_ROTATION_INTERVAL = 3600000;
const ALERT_THRESHOLD = 0.8;

/**
 * Interface for enhanced rate limiting options
 */
interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
  useCluster?: boolean;
  whitelist?: {
    ips: string[];
    userIds: string[];
  };
  bypassTokens?: {
    [key: string]: number;
  };
  monitoring?: {
    alertThreshold?: number;
    metricsEnabled?: boolean;
  };
  fallbackOptions?: {
    maxRequests: number;
    windowMs: number;
  };
}

/**
 * Creates an enhanced rate limiter middleware with distributed tracking and monitoring
 * @param options - Configuration options for rate limiting
 */
export const createRateLimiter = (options: RateLimitOptions) => {
  const logger = new LoggerService();
  const redisConnection = new RedisConnection();
  const redis = options.useCluster ? redisConnection.getClusterClient() : redisConnection.getClient();

  const {
    windowMs = DEFAULT_WINDOW_MS,
    maxRequests = DEFAULT_MAX_REQUESTS,
    keyPrefix = DEFAULT_KEY_PREFIX,
    whitelist = { ips: [], userIds: [] },
    bypassTokens = {},
    monitoring = { alertThreshold: ALERT_THRESHOLD, metricsEnabled: true },
    fallbackOptions = { maxRequests: FALLBACK_MAX_REQUESTS, windowMs: DEFAULT_WINDOW_MS }
  } = options;

  /**
   * Generates a secure rate limit key for a request
   */
  const generateKey = (req: Request): string => {
    const identifier = req.ip || 
                      req.headers['x-forwarded-for'] || 
                      req.headers['x-real-ip'] ||
                      'unknown';
    
    const hash = crypto
      .createHash('sha256')
      .update(`${identifier}:${req.path}`)
      .digest('hex');

    return `${keyPrefix}${hash}`;
  };

  /**
   * Checks if request is whitelisted
   */
  const isWhitelisted = (req: Request): boolean => {
    const ip = req.ip || req.headers['x-forwarded-for'];
    const userId = req.headers['x-user-id'];

    return (
      (ip && whitelist.ips.includes(String(ip))) ||
      (userId && whitelist.userIds.includes(String(userId)))
    );
  };

  /**
   * Validates bypass tokens
   */
  const validateBypassToken = (req: Request): number | null => {
    const token = req.headers['x-bypass-token'];
    if (token && typeof token === 'string' && bypassTokens[token]) {
      return bypassTokens[token];
    }
    return null;
  };

  /**
   * Records rate limit metrics
   */
  const recordMetrics = (key: string, remaining: number): void => {
    if (monitoring.metricsEnabled) {
      logger.metric('rate_limit_remaining', remaining, {
        service: 'rate_limiter',
        key,
        max: maxRequests,
        window: windowMs
      });

      if (remaining / maxRequests <= monitoring.alertThreshold) {
        logger.warn('Rate limit threshold reached', {
          service: 'rate_limiter',
          requestId: 'system',
          correlationId: 'rate-limit-alert',
          additionalContext: { key, remaining, max: maxRequests }
        });
      }
    }
  };

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check whitelist and bypass tokens
      if (isWhitelisted(req)) {
        return next();
      }

      const bypassLimit = validateBypassToken(req);
      if (bypassLimit) {
        return next();
      }

      const key = generateKey(req);
      const now = Date.now();
      const windowStart = now - windowMs;

      // Implement sliding window rate limiting with Redis
      const multi = redis.multi();
      multi.zremrangebyscore(key, 0, windowStart);
      multi.zadd(key, now, `${now}:${crypto.randomBytes(8).toString('hex')}`);
      multi.zcard(key);
      multi.pexpire(key, windowMs);

      const [, , requestCount] = await multi.exec();
      const currentCount = requestCount ? Number(requestCount[1]) : 0;

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - currentCount));
      res.setHeader('X-RateLimit-Reset', Math.ceil((windowStart + windowMs) / 1000));

      // Record metrics
      recordMetrics(key, maxRequests - currentCount);

      // Check rate limit
      if (currentCount > maxRequests) {
        throw new BaseError(
          'RATE_LIMIT_ERROR',
          'Rate limit exceeded',
          {
            errorCode: 'RATE_LIMIT_ERROR',
            errorMessage: 'Too many requests',
            category: 'PERFORMANCE',
            timestamp: new Date(),
            traceId: req.headers['x-request-id'] as string,
            serviceName: 'rate-limiter',
            environment: process.env.NODE_ENV || 'development',
            additionalInfo: {
              path: req.path,
              method: req.method,
              remaining: 0,
              resetTime: Math.ceil((windowStart + windowMs) / 1000)
            },
            stackTrace: [],
            metadata: {}
          },
          'PERFORMANCE'
        );
      }

      next();
    } catch (error) {
      // Handle Redis failures gracefully
      if (error instanceof Error && error.message.includes('Redis')) {
        logger.error(error, {
          service: 'rate_limiter',
          requestId: req.headers['x-request-id'] as string,
          correlationId: 'redis-error',
          additionalContext: { path: req.path }
        });

        // Apply fallback rate limiting
        const fallbackKey = `${keyPrefix}fallback:${req.ip}`;
        const fallbackCount = parseInt(req.headers['x-request-count'] as string) || 0;

        if (fallbackCount > fallbackOptions.maxRequests) {
          throw new BaseError(
            'RATE_LIMIT_ERROR',
            'Rate limit exceeded (fallback)',
            {
              errorCode: 'RATE_LIMIT_ERROR',
              errorMessage: 'Too many requests',
              category: 'PERFORMANCE',
              timestamp: new Date(),
              traceId: req.headers['x-request-id'] as string,
              serviceName: 'rate-limiter',
              environment: process.env.NODE_ENV || 'development',
              additionalInfo: {
                path: req.path,
                method: req.method,
                fallback: true
              },
              stackTrace: [],
              metadata: {}
            },
            'PERFORMANCE'
          );
        }

        res.setHeader('x-request-count', fallbackCount + 1);
        return next();
      }

      next(error);
    }
  };
};

/**
 * Default rate limiting middleware with standard configuration
 */
export default createRateLimiter({
  windowMs: DEFAULT_WINDOW_MS,
  maxRequests: DEFAULT_MAX_REQUESTS,
  useCluster: true,
  monitoring: {
    alertThreshold: ALERT_THRESHOLD,
    metricsEnabled: true
  }
});