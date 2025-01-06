import { Request, Response, NextFunction } from 'express'; // ^4.18.2
import rateLimit from 'express-rate-limit'; // ^6.7.0
import CircuitBreaker from 'opossum'; // ^6.0.0
import { BaseError, ValidationError, ErrorCode, ErrorCategory } from '../../types/error.types';
import { LoggerService } from '../../lib/logger/logger.service';

// Initialize logger service
const logger = new LoggerService();

// Enhanced error code to HTTP status code mapping with categories
const ERROR_CODE_MAP: Record<string, number> = {
  // Validation errors (400 range)
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.INVALID_REQUEST]: 400,
  
  // Authentication/Authorization errors (401, 403)
  [ErrorCode.AUTHENTICATION_ERROR]: 401,
  [ErrorCode.AUTHORIZATION_ERROR]: 403,
  
  // Resource errors (404, 409)
  [ErrorCode.NOT_FOUND_ERROR]: 404,
  [ErrorCode.CONFLICT_ERROR]: 409,
  
  // Rate limiting and availability (429, 503)
  [ErrorCode.RATE_LIMIT_ERROR]: 429,
  [ErrorCode.SERVICE_UNAVAILABLE]: 503,
  
  // Infrastructure errors (500 range)
  [ErrorCode.DATABASE_ERROR]: 503,
  [ErrorCode.CACHE_ERROR]: 503,
  [ErrorCode.QUEUE_ERROR]: 503,
  
  // Business logic errors (422 range)
  [ErrorCode.ATTRIBUTION_ERROR]: 422,
  [ErrorCode.EVENT_PROCESSING_ERROR]: 422,
  [ErrorCode.ANALYTICS_ERROR]: 422,
  
  // Integration errors (502, 504)
  [ErrorCode.INTEGRATION_ERROR]: 502,
  [ErrorCode.NETWORK_ERROR]: 502,
  [ErrorCode.TIMEOUT_ERROR]: 504,
  
  // System errors (500)
  [ErrorCode.INTERNAL_SERVER_ERROR]: 500,
  [ErrorCode.CONFIGURATION_ERROR]: 500,
  [ErrorCode.API_ERROR]: 500
};

// Security headers for error responses
const ERROR_SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'none'",
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
};

// Circuit breaker for error handling
const breaker = new CircuitBreaker(
  async () => Promise.resolve(),
  {
    timeout: 3000,
    errorThresholdPercentage: 50,
    resetTimeout: 30000
  }
);

// Rate limiter for error endpoints
const errorRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 error requests per windowMs
  message: 'Too many error requests from this IP'
});

/**
 * Maps internal error codes to HTTP status codes
 * @param errorCode - Internal error code
 * @param category - Error category
 * @returns Appropriate HTTP status code
 */
const getHttpStatusCode = (errorCode: string, category: string): number => {
  // Check category-specific mappings first
  if (category === ErrorCategory.SECURITY) {
    return 403; // Security-related errors default to 403
  }
  if (category === ErrorCategory.VALIDATION) {
    return 400; // Validation errors default to 400
  }
  
  // Use error code mapping or default to 500
  return ERROR_CODE_MAP[errorCode] || 500;
};

/**
 * Enhanced error handling middleware with comprehensive error processing
 */
const errorMiddleware = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Generate correlation ID for error tracking
  const correlationId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    // Record error for circuit breaker
    breaker.fire().catch(() => {
      logger.error('Circuit breaker triggered', {
        service: 'error-middleware',
        correlationId,
        requestId: req.id,
        additionalContext: { circuitBreakerStatus: breaker.stats }
      });
    });

    // Initialize error response
    let statusCode = 500;
    let errorResponse: any = {
      success: false,
      error: {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'An unexpected error occurred',
        correlationId
      }
    };

    // Handle BaseError instances
    if (error instanceof BaseError) {
      statusCode = getHttpStatusCode(error.code, error.category);
      errorResponse.error = {
        code: error.code,
        message: error.message,
        details: error.details,
        correlationId
      };
    }
    // Handle ValidationError instances
    else if (error instanceof ValidationError) {
      statusCode = 400;
      errorResponse.error = {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Validation error',
        details: {
          validationErrors: error.validationErrors,
          field: error.field
        },
        correlationId
      };
    }
    // Handle other error types
    else {
      // Redact sensitive information from error stack
      const sanitizedStack = error.stack?.replace(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi, '[REDACTED_EMAIL]')
        .replace(/([0-9]{4}[0-9]*[0-9]{4})/g, '[REDACTED_CARD]');

      errorResponse.error.details = {
        name: error.name,
        stack: process.env.NODE_ENV === 'production' ? undefined : sanitizedStack
      };
    }

    // Log error with context
    logger.error(error, {
      service: 'error-middleware',
      correlationId,
      requestId: req.id,
      userId: req.user?.id,
      additionalContext: {
        path: req.path,
        method: req.method,
        statusCode,
        errorCode: errorResponse.error.code
      }
    });

    // Add security headers
    Object.entries(ERROR_SECURITY_HEADERS).forEach(([header, value]) => {
      res.setHeader(header, value);
    });

    // Send error response
    res.status(statusCode).json(errorResponse);
  } catch (e) {
    // Handle errors in error handling
    logger.error('Error in error middleware', {
      service: 'error-middleware',
      correlationId,
      requestId: req.id,
      additionalContext: { originalError: error, handlingError: e }
    });

    // Send fallback error response
    res.status(500).json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'An unexpected error occurred',
        correlationId
      }
    });
  }
};

export default errorMiddleware;