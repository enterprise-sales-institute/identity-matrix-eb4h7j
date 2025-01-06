import { Request, Response, NextFunction } from 'express';
import winston from 'winston';
import { ValidationService } from '../../lib/validation/validation.service';
import { ValidationError } from '../../types/error.types';
import { ApiResponse } from '../../types/common.types';

/**
 * Configuration options for validation middleware
 * @version 1.0.0
 */
interface ValidationMiddlewareOptions {
  schemaName: string;
  target: 'body' | 'query' | 'params';
  strict?: boolean;
  timeoutMs?: number;
}

/**
 * Metadata for validation results
 */
interface ValidationMetadata {
  schemaVersion: string;
  validationTime: number;
  cached: boolean;
}

// Initialize validation service instance
const validationService = new ValidationService();

// Configure logger for validation middleware
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'validation-middleware' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

/**
 * Express middleware factory that creates a validation middleware for specific schema
 * with performance monitoring and error handling
 * @param options - Validation middleware configuration options
 * @returns Express middleware function
 */
export const validateRequest = (options: ValidationMiddlewareOptions) => {
  // Validate middleware options
  if (!options.schemaName) {
    throw new Error('Schema name is required for validation middleware');
  }

  if (!['body', 'query', 'params'].includes(options.target)) {
    throw new Error('Invalid validation target specified');
  }

  // Get schema version for validation metadata
  const schema = validationService.getSchema(options.schemaName);
  if (!schema) {
    throw new Error(`Schema ${options.schemaName} not found`);
  }

  // Return middleware function
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = process.hrtime();

    try {
      // Extract data to validate based on target
      const dataToValidate = req[options.target];

      // Validate data against schema
      const validationResult = await validationService.validateSchema(
        options.schemaName,
        dataToValidate,
        {
          abortEarly: false,
          allowUnknown: !options.strict,
          stripUnknown: options.strict,
          cache: true
        }
      );

      // Calculate validation time
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const validationTimeMs = (seconds * 1000 + nanoseconds / 1000000);

      // Add validation metadata to request
      const validationMetadata: ValidationMetadata = {
        schemaVersion: validationResult.schemaVersion,
        validationTime: validationTimeMs,
        cached: false // TODO: Add cache hit detection
      };

      // If validation successful, attach validated data and metadata
      if (validationResult.isValid) {
        req[options.target] = validationResult.data;
        (req as any).validationMetadata = validationMetadata;

        logger.debug('Validation successful', {
          schema: options.schemaName,
          target: options.target,
          metadata: validationMetadata
        });

        return next();
      }

      // If validation failed, return error response
      logger.warn('Validation failed', {
        schema: options.schemaName,
        target: options.target,
        errors: validationResult.errors
      });

      const response: ApiResponse<null> = {
        success: false,
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: validationResult.errors,
          timestamp: new Date().toISOString()
        },
        metadata: {
          apiVersion: '1.0',
          timestamp: Date.now(),
          requestId: req.headers['x-request-id'] as string || ''
        }
      };

      return res.status(400).json(response);
    } catch (error) {
      // Handle validation timeout
      if (error instanceof Error && error.message === 'Validation timeout') {
        logger.error('Validation timeout', {
          schema: options.schemaName,
          target: options.target,
          timeout: options.timeoutMs
        });

        const response: ApiResponse<null> = {
          success: false,
          data: null,
          error: {
            code: 'TIMEOUT_ERROR',
            message: 'Request validation timed out',
            details: {
              timeoutMs: options.timeoutMs
            },
            timestamp: new Date().toISOString()
          },
          metadata: {
            apiVersion: '1.0',
            timestamp: Date.now(),
            requestId: req.headers['x-request-id'] as string || ''
          }
        };

        return res.status(408).json(response);
      }

      // Handle unexpected errors
      logger.error('Validation error', {
        schema: options.schemaName,
        target: options.target,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      const response: ApiResponse<null> = {
        success: false,
        data: null,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred during validation',
          details: {
            error: error instanceof Error ? error.message : 'Unknown error'
          },
          timestamp: new Date().toISOString()
        },
        metadata: {
          apiVersion: '1.0',
          timestamp: Date.now(),
          requestId: req.headers['x-request-id'] as string || ''
        }
      };

      return res.status(500).json(response);
    }
  };
};

export default validateRequest;