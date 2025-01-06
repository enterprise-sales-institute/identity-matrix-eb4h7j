import { Request, Response, NextFunction } from 'express'; // ^4.18.2
import { v4 as uuidv4 } from 'uuid'; // ^9.0.0
import { LoggerService } from '../../lib/logger/logger.service';
import { ErrorCode } from '../../types/error.types';

// Initialize logger service
const logger = new LoggerService();

/**
 * Interface for enhanced request logging context with security and performance tracking
 */
interface RequestLogContext {
  requestId: string;
  method: string;
  path: string;
  headers: Record<string, any>;
  query: Record<string, any>;
  body: any;
  clientIp: string;
  userAgent: string;
  timestamp: number;
  securityContext: Record<string, any>;
  performanceMetrics: Record<string, any>;
}

/**
 * Interface for enhanced response logging context with timing and cache metrics
 */
interface ResponseLogContext {
  requestId: string;
  statusCode: number;
  headers: Record<string, any>;
  body: any;
  responseTime: number;
  responseSize: number;
  cacheStatus: string;
  performanceMetrics: Record<string, any>;
  securityMetrics: Record<string, any>;
}

/**
 * Sanitizes sensitive data from objects before logging
 * @param obj Object to sanitize
 * @returns Sanitized object
 */
const sanitizeData = (obj: any): any => {
  if (!obj) return obj;
  
  const sensitiveFields = [
    /password/i, /token/i, /key/i, /secret/i, /authorization/i,
    /credit.*card/i, /card.*number/i, /ssn/i, /social.*security/i
  ];

  const sanitized = { ...obj };
  
  Object.keys(sanitized).forEach(key => {
    if (sensitiveFields.some(pattern => pattern.test(key))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeData(sanitized[key]);
    }
  });

  return sanitized;
};

/**
 * Enhanced request logging with security and performance context
 */
const logRequest = (req: Request, requestId: string): void => {
  const startTime = process.hrtime();
  
  const context: RequestLogContext = {
    requestId,
    method: req.method,
    path: req.path,
    headers: sanitizeData(req.headers),
    query: sanitizeData(req.query),
    body: sanitizeData(req.body),
    clientIp: req.ip,
    userAgent: req.get('user-agent') || 'unknown',
    timestamp: Date.now(),
    securityContext: {
      authenticated: req.headers.authorization ? true : false,
      tlsVersion: (req.socket as any)?.getTLSVersion?.(),
      cipher: (req.socket as any)?.getCipher?.(),
    },
    performanceMetrics: {
      startTime,
      nodeEnv: process.env.NODE_ENV,
      processId: process.pid,
    }
  };

  logger.info(`Incoming ${req.method} request to ${req.path}`, {
    service: 'api-gateway',
    requestId,
    correlationId: req.headers['x-correlation-id'] as string || requestId,
    additionalContext: context
  });
};

/**
 * Enhanced response logging with performance metrics and security context
 */
const logResponse = (res: Response, requestId: string, body: any): void => {
  const responseTime = res.get('X-Response-Time');
  const responseSize = Buffer.byteLength(JSON.stringify(body), 'utf8');
  
  const context: ResponseLogContext = {
    requestId,
    statusCode: res.statusCode,
    headers: sanitizeData(res.getHeaders()),
    body: sanitizeData(body),
    responseTime: parseInt(responseTime || '0'),
    responseSize,
    cacheStatus: res.get('X-Cache') || 'MISS',
    performanceMetrics: {
      contentEncoding: res.get('content-encoding'),
      contentLength: res.get('content-length'),
      compressionRatio: res.get('content-encoding') ? 
        (parseInt(res.get('content-length') || '0') / responseSize) : 1
    },
    securityMetrics: {
      contentSecurityPolicy: res.get('content-security-policy') ? true : false,
      strictTransportSecurity: res.get('strict-transport-security') ? true : false,
      xssProtection: res.get('x-xss-protection') ? true : false
    }
  };

  logger.info(`Outgoing response for ${requestId}`, {
    service: 'api-gateway',
    requestId,
    correlationId: res.get('x-correlation-id') || requestId,
    additionalContext: context
  });
};

/**
 * Express middleware for enhanced logging with security and performance tracking
 */
const loggingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = uuidv4();
  const startTime = process.hrtime();

  // Add correlation headers
  res.set('X-Request-ID', requestId);
  res.set('X-Correlation-ID', req.headers['x-correlation-id'] as string || requestId);

  // Log request
  logRequest(req, requestId);

  // Capture original json method
  const originalJson = res.json;

  // Override json method to intercept response body
  res.json = function(body: any): Response {
    const endTime = process.hrtime(startTime);
    const responseTime = Math.round((endTime[0] * 1e9 + endTime[1]) / 1e6);
    
    res.set('X-Response-Time', responseTime.toString());

    // Log response
    logResponse(res, requestId, body);

    return originalJson.call(this, body);
  };

  // Error handling
  res.on('error', (error: Error) => {
    logger.error(error.message, {
      service: 'api-gateway',
      requestId,
      correlationId: res.get('x-correlation-id') || requestId,
      additionalContext: {
        errorCode: ErrorCode.INTERNAL_SERVER_ERROR,
        stack: error.stack
      }
    });
  });

  // Continue to next middleware
  next();
};

export default loggingMiddleware;