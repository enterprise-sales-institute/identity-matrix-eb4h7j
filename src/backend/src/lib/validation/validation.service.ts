import { injectable } from 'inversify';
import Joi, { Schema } from 'joi';
import NodeCache from 'node-cache';
import { ValidationError } from '../../types/error.types';

/**
 * Interface defining the structure of validation results
 * @version 1.0.0
 */
interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
  data: unknown;
  schemaVersion: string;
}

/**
 * Configuration interface for schema registration
 */
interface SchemaConfig {
  schema: Schema;
  version: string;
  cacheable: boolean;
  timeoutMs: number;
}

/**
 * Cache configuration options
 */
interface CacheOptions {
  stdTTL: number;
  checkperiod: number;
  maxKeys: number;
}

/**
 * Validation options for schema validation
 */
interface ValidationOptions {
  abortEarly?: boolean;
  allowUnknown?: boolean;
  stripUnknown?: boolean;
  cache?: boolean;
}

/**
 * Service class providing centralized validation functionality with caching 
 * and performance optimizations
 * @version 1.0.0
 */
@injectable()
export class ValidationService {
  private readonly schemas: Map<string, SchemaConfig>;
  private readonly validationCache: NodeCache;
  private readonly defaultTimeout: number = 5000;

  /**
   * Initializes validation service with caching and default configuration
   * @param cacheConfig - Cache configuration options
   */
  constructor(cacheConfig: CacheOptions = {
    stdTTL: 600, // 10 minutes
    checkperiod: 120, // 2 minutes
    maxKeys: 1000
  }) {
    this.schemas = new Map<string, SchemaConfig>();
    this.validationCache = new NodeCache(cacheConfig);
  }

  /**
   * Registers a new validation schema with version control
   * @param name - Unique name for the schema
   * @param config - Schema configuration including version and caching options
   * @throws {ValidationError} If schema registration fails
   */
  public registerSchema(name: string, config: SchemaConfig): void {
    if (!name || !config.schema) {
      throw new ValidationError('Invalid schema configuration', {
        errorCode: 'VALIDATION_ERROR',
        errorMessage: 'Schema name and configuration are required',
        category: 'VALIDATION',
        timestamp: new Date(),
        traceId: '',
        serviceName: 'validation-service',
        environment: process.env.NODE_ENV || 'development',
        additionalInfo: { schemaName: name },
        stackTrace: [],
        metadata: {}
      });
    }

    // Compile schema for performance optimization
    try {
      config.schema.compile();
    } catch (error) {
      throw new ValidationError('Schema compilation failed', {
        errorCode: 'VALIDATION_ERROR',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        category: 'VALIDATION',
        timestamp: new Date(),
        traceId: '',
        serviceName: 'validation-service',
        environment: process.env.NODE_ENV || 'development',
        additionalInfo: { schemaName: name },
        stackTrace: [],
        metadata: {}
      });
    }

    // Store schema with configuration
    this.schemas.set(name, {
      ...config,
      timeoutMs: config.timeoutMs || this.defaultTimeout
    });

    // Clear related cache entries
    if (config.cacheable) {
      this.validationCache.del(new RegExp(`^${name}:`));
    }
  }

  /**
   * Validates data against a registered schema with caching
   * @param schemaName - Name of the registered schema
   * @param data - Data to validate
   * @param options - Validation options
   * @returns Promise<ValidationResult> Validation result with detailed error information
   * @throws {ValidationError} If schema is not found or validation fails
   */
  public async validateSchema(
    schemaName: string,
    data: unknown,
    options: ValidationOptions = {}
  ): Promise<ValidationResult> {
    const schemaConfig = this.schemas.get(schemaName);

    if (!schemaConfig) {
      throw new ValidationError('Schema not found', {
        errorCode: 'VALIDATION_ERROR',
        errorMessage: `Schema ${schemaName} is not registered`,
        category: 'VALIDATION',
        timestamp: new Date(),
        traceId: '',
        serviceName: 'validation-service',
        environment: process.env.NODE_ENV || 'development',
        additionalInfo: { schemaName },
        stackTrace: [],
        metadata: {}
      });
    }

    // Check cache if enabled
    const cacheKey = `${schemaName}:${JSON.stringify(data)}`;
    if (options.cache && schemaConfig.cacheable) {
      const cachedResult = this.validationCache.get<ValidationResult>(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }
    }

    try {
      // Validate with timeout
      const validationPromise = schemaConfig.schema.validateAsync(data, {
        abortEarly: options.abortEarly ?? false,
        allowUnknown: options.allowUnknown ?? false,
        stripUnknown: options.stripUnknown ?? false
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Validation timeout'));
        }, schemaConfig.timeoutMs);
      });

      const validatedData = await Promise.race([validationPromise, timeoutPromise]);

      const result: ValidationResult = {
        isValid: true,
        errors: {},
        data: validatedData,
        schemaVersion: schemaConfig.version
      };

      // Cache successful validation result
      if (options.cache && schemaConfig.cacheable) {
        this.validationCache.set(cacheKey, result);
      }

      return result;
    } catch (error) {
      if (error instanceof Joi.ValidationError) {
        const formattedErrors: Record<string, string[]> = {};
        
        error.details.forEach(detail => {
          const path = detail.path.join('.');
          if (!formattedErrors[path]) {
            formattedErrors[path] = [];
          }
          formattedErrors[path].push(detail.message);
        });

        return {
          isValid: false,
          errors: formattedErrors,
          data: null,
          schemaVersion: schemaConfig.version
        };
      }

      throw new ValidationError('Validation failed', {
        errorCode: 'VALIDATION_ERROR',
        errorMessage: error instanceof Error ? error.message : 'Unknown validation error',
        category: 'VALIDATION',
        timestamp: new Date(),
        traceId: '',
        serviceName: 'validation-service',
        environment: process.env.NODE_ENV || 'development',
        additionalInfo: { schemaName },
        stackTrace: error instanceof Error ? error.stack?.split('\n') || [] : [],
        metadata: {}
      });
    }
  }

  /**
   * Retrieves a registered schema configuration
   * @param name - Name of the schema
   * @returns SchemaConfig | undefined Schema configuration if found
   */
  public getSchema(name: string): SchemaConfig | undefined {
    return this.schemas.get(name);
  }
}