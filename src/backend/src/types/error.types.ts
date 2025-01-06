/**
 * Core TypeScript error type definitions, enums, and base error classes for standardized 
 * error handling across the backend application with enhanced monitoring and categorization support.
 * @version 1.0.0
 */

import { ErrorResponse } from './common.types';

/**
 * Comprehensive enumeration of standardized error codes for error identification and monitoring
 */
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  CONFLICT_ERROR = 'CONFLICT_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  CACHE_ERROR = 'CACHE_ERROR',
  QUEUE_ERROR = 'QUEUE_ERROR',
  ATTRIBUTION_ERROR = 'ATTRIBUTION_ERROR',
  EVENT_PROCESSING_ERROR = 'EVENT_PROCESSING_ERROR',
  ANALYTICS_ERROR = 'ANALYTICS_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  INTEGRATION_ERROR = 'INTEGRATION_ERROR',
  API_ERROR = 'API_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR'
}

/**
 * Enhanced categorization of errors for monitoring and reporting
 */
export enum ErrorCategory {
  VALIDATION = 'VALIDATION',
  SECURITY = 'SECURITY',
  INFRASTRUCTURE = 'INFRASTRUCTURE',
  BUSINESS_LOGIC = 'BUSINESS_LOGIC',
  INTEGRATION = 'INTEGRATION',
  SYSTEM = 'SYSTEM',
  PERFORMANCE = 'PERFORMANCE',
  DATA = 'DATA',
  CONFIGURATION = 'CONFIGURATION'
}

/**
 * Enhanced interface for structured error details with monitoring support
 */
export interface ErrorDetails {
  readonly errorCode: string;
  readonly errorMessage: string;
  readonly category: ErrorCategory;
  readonly timestamp: Date;
  readonly traceId: string;
  readonly serviceName: string;
  readonly environment: string;
  readonly additionalInfo: Record<string, unknown>;
  readonly stackTrace: string[];
  readonly metadata: Record<string, unknown>;
}

/**
 * Enhanced base error class with improved monitoring and debugging capabilities
 */
export class BaseError extends Error implements ErrorResponse {
  public readonly code: string;
  public readonly message: string;
  public readonly details: ErrorDetails;
  public readonly category: ErrorCategory;
  public readonly timestamp: Date;
  public readonly traceId: string;
  public readonly stack: string;

  /**
   * Initializes a new BaseError instance with enhanced monitoring support
   * @param code - Error code from ErrorCode enum
   * @param message - Descriptive error message
   * @param details - Structured error details
   * @param category - Error category for classification
   */
  constructor(
    code: string,
    message: string,
    details: ErrorDetails,
    category: ErrorCategory
  ) {
    super(message);

    // Set error name and message
    this.name = this.constructor.name;
    this.message = message;

    // Set error properties
    this.code = code;
    this.category = category;
    this.details = {
      ...details,
      errorCode: code,
      errorMessage: message,
      category: category,
      timestamp: new Date(),
      traceId: this.generateTraceId(),
      serviceName: process.env.SERVICE_NAME || 'attribution-service',
      environment: process.env.NODE_ENV || 'development',
      stackTrace: this.stack ? this.stack.split('\n') : [],
      additionalInfo: details.additionalInfo || {},
      metadata: details.metadata || {}
    };

    // Set timestamp
    this.timestamp = new Date();

    // Generate trace ID for request tracking
    this.traceId = this.generateTraceId();

    // Capture and format stack trace
    Error.captureStackTrace(this, this.constructor);

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, BaseError.prototype);

    // Freeze the error instance for immutability
    Object.freeze(this);
  }

  /**
   * Generates a unique trace ID for error tracking
   * @returns Unique trace ID string
   */
  private generateTraceId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Converts error instance to JSON for logging and serialization
   */
  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      category: this.category,
      timestamp: this.timestamp.toISOString(),
      traceId: this.traceId,
      details: this.details,
      stack: this.stack
    };
  }

  /**
   * Creates a formatted string representation of the error
   */
  public toString(): string {
    return `[${this.category}] ${this.code}: ${this.message} (${this.traceId})`;
  }
}