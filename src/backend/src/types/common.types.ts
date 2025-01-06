/**
 * Core TypeScript type definitions and interfaces used across the backend application
 * for standardizing data structures, responses, and common patterns.
 * @version 1.0.0
 */

/**
 * Enumeration of all possible error codes in the system
 */
export enum ErrorCodes {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INVALID_REQUEST = 'INVALID_REQUEST',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE'
}

/**
 * Union type of all possible error codes
 */
export type ErrorCode = keyof typeof ErrorCodes;

/**
 * Branded type for ISO8601 date strings with compile-time validation
 */
export type ISO8601Date = string & { readonly _ISO8601DateBrand: unique symbol };

/**
 * Immutable type for JSON-serializable values
 */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

/**
 * Interface for response metadata including timing and version
 */
export interface ResponseMetadata {
  readonly apiVersion: string;
  readonly timestamp: number;
  readonly requestId: string;
}

/**
 * Enhanced error response structure with timestamp and typed error codes
 */
export interface ErrorResponse {
  readonly code: ErrorCode;
  readonly message: string;
  readonly details: Record<string, unknown>;
  readonly timestamp: ISO8601Date;
}

/**
 * Generic interface for standardized API responses with metadata
 */
export interface ApiResponse<T> {
  readonly success: boolean;
  readonly data: T;
  readonly error: ErrorResponse | null;
  readonly metadata: ResponseMetadata;
}

/**
 * Type guard for validating ApiResponse structure
 */
export function isApiResponse(value: unknown): value is ApiResponse<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    'data' in value &&
    'error' in value &&
    'metadata' in value &&
    typeof (value as ApiResponse<unknown>).success === 'boolean' &&
    typeof (value as ApiResponse<unknown>).metadata === 'object'
  );
}

/**
 * Type guard for validating ISO8601 date strings
 */
export function isISO8601Date(value: string): value is ISO8601Date {
  const ISO8601_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
  return ISO8601_REGEX.test(value);
}