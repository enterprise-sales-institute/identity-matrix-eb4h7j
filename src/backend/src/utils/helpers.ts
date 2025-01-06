/**
 * Core utility helper functions for common operations across the backend application
 * Provides standardized data transformation, validation, error handling, and time-based calculations
 * @version 1.0.0
 */

import { isValid, format } from 'date-fns'; // v2.30.0
import { ApiResponse } from '../types/common.types';
import { ErrorResponse } from '../types/error.types';
import { ATTRIBUTION_CONSTANTS } from './constants';

/**
 * ISO8601 date format string for consistent date formatting
 */
const ISO_DATE_FORMAT = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'" as const;

/**
 * Creates a standardized success response with type safety
 * @param data Generic data payload
 * @returns Formatted success response
 */
export function createSuccessResponse<T>(data: T): ApiResponse<T> {
  if (data === undefined || data === null) {
    throw new Error('Response data cannot be null or undefined');
  }

  return {
    success: true,
    data,
    error: null,
    metadata: {
      apiVersion: '1.0.0',
      timestamp: Date.now(),
      requestId: generateRequestId()
    }
  };
}

/**
 * Creates a standardized error response with sanitized messages
 * @param code Error code identifier
 * @param message User-safe error message
 * @returns Formatted error response
 */
export function createErrorResponse(code: string, message: string): ApiResponse<null> {
  // Sanitize inputs
  const sanitizedCode = sanitizeErrorCode(code);
  const sanitizedMessage = sanitizeErrorMessage(message);

  return {
    success: false,
    data: null,
    error: {
      code: sanitizedCode,
      message: sanitizedMessage,
      details: {},
      timestamp: formatDate(new Date())
    },
    metadata: {
      apiVersion: '1.0.0',
      timestamp: Date.now(),
      requestId: generateRequestId()
    }
  };
}

/**
 * Formats a date to ISO8601 format with validation
 * @param date Date to format
 * @returns ISO8601 formatted date string
 * @throws Error if date is invalid
 */
export function formatDate(date: Date | string): string {
  let dateToFormat: Date;

  // Convert string to Date if needed
  if (typeof date === 'string') {
    dateToFormat = new Date(date);
  } else {
    dateToFormat = date;
  }

  // Validate date
  if (!isValid(dateToFormat)) {
    throw new Error('Invalid date provided');
  }

  return format(dateToFormat, ISO_DATE_FORMAT);
}

/**
 * Calculates attribution time window with validation
 * @param endDate End date for time window
 * @param windowInDays Number of days for window
 * @returns Object containing start and end dates
 * @throws Error if parameters are invalid
 */
export function calculateTimeWindow(endDate: Date, windowInDays: number): { 
  startDate: string; 
  endDate: string; 
} {
  // Validate end date
  if (!isValid(endDate)) {
    throw new Error('Invalid end date provided');
  }

  // Validate window days
  if (windowInDays <= 0 || windowInDays > ATTRIBUTION_CONSTANTS.MAX_TIME_WINDOW) {
    throw new Error('Invalid time window duration');
  }

  // Calculate start date
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - windowInDays);

  // Validate calculated dates
  if (!isValid(startDate)) {
    throw new Error('Invalid date calculation');
  }

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate)
  };
}

/**
 * Generates a unique request ID for tracking
 * @returns Unique request identifier
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Sanitizes error codes for security
 * @param code Raw error code
 * @returns Sanitized error code
 */
function sanitizeErrorCode(code: string): string {
  return code.replace(/[^A-Z_]/g, '').substring(0, 50);
}

/**
 * Sanitizes error messages for security
 * @param message Raw error message
 * @returns Sanitized error message
 */
function sanitizeErrorMessage(message: string): string {
  return message
    .replace(/[<>]/g, '')
    .trim()
    .substring(0, 200);
}

/**
 * Validates a date string is in ISO8601 format
 * @param dateString Date string to validate
 * @returns Boolean indicating if date is valid ISO8601
 */
export function isValidISODate(dateString: string): boolean {
  const ISO8601_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
  return ISO8601_REGEX.test(dateString) && isValid(new Date(dateString));
}

/**
 * Safely parses JSON with error handling
 * @param value JSON string to parse
 * @returns Parsed object or null if invalid
 */
export function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}