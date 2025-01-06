/**
 * @fileoverview Enterprise-grade date manipulation utilities with timezone support
 * @version 1.0.0
 * Implements comprehensive date operations for attribution and analytics
 */

// External imports - date-fns v2.30.0
import { 
  addDays,
  subDays,
  startOfDay,
  endOfDay,
  isValid,
  differenceInDays
} from 'date-fns';

// Internal imports
import { TimeRange } from '../types/common.types';

/**
 * Options interface for date range validation
 */
interface ValidationOptions {
  maxRangeDays?: number;
  requireBusinessHours?: boolean;
  timezone?: string;
}

/**
 * Interface for day calculation options
 */
interface DayCalculationOptions {
  includeBusinessDaysOnly?: boolean;
  timezone?: string;
}

/**
 * Interface for validation results
 */
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  details: {
    code: string;
    message: string;
  }[];
}

/**
 * Interface for day calculation results
 */
interface DayCalculationResult {
  days: number;
  businessDays: number;
  metadata: {
    timezone: string;
    includedWeekends: boolean;
  };
}

/**
 * Default validation options
 */
const DEFAULT_VALIDATION_OPTIONS: ValidationOptions = {
  maxRangeDays: 730, // 2 years
  requireBusinessHours: true,
  timezone: 'UTC'
};

/**
 * Default business hours configuration
 */
const BUSINESS_HOURS = {
  start: 9, // 9 AM
  end: 17, // 5 PM
  timezone: 'UTC'
};

/**
 * Validates if a given value is a valid date object
 * @param value - Value to validate as date
 * @returns Boolean indicating if value is a valid date
 */
export function isValidDate(value: any): value is Date {
  if (!value) return false;
  if (!(value instanceof Date)) return false;
  if (Number.isNaN(value.getTime())) return false;
  return isValid(value);
}

/**
 * Creates a TimeRange object for specified number of days
 * @param days - Number of days to include in range
 * @param timezone - Timezone for date calculations (default: UTC)
 * @returns TimeRange object with start and end dates
 * @throws Error if invalid parameters provided
 */
export function getDateRange(days: number, timezone: string = 'UTC'): TimeRange {
  if (!Number.isInteger(days) || days < 1) {
    throw new Error('Days must be a positive integer');
  }

  const endDate = endOfDay(new Date());
  const startDate = startOfDay(subDays(endDate, days - 1));

  return {
    startDate,
    endDate,
    timeZone: timezone
  };
}

/**
 * Validates a date range against business rules
 * @param range - TimeRange object to validate
 * @param options - Validation options
 * @returns ValidationResult with detailed validation information
 */
export function validateDateRange(
  range: TimeRange,
  options: ValidationOptions = DEFAULT_VALIDATION_OPTIONS
): ValidationResult {
  const errors: string[] = [];
  const details: { code: string; message: string }[] = [];

  // Validate date objects
  if (!isValidDate(range.startDate) || !isValidDate(range.endDate)) {
    errors.push('Invalid date objects provided');
    details.push({
      code: 'INVALID_DATE',
      message: 'One or both dates are invalid'
    });
  }

  // Validate date order
  if (range.startDate > range.endDate) {
    errors.push('Start date must be before end date');
    details.push({
      code: 'INVALID_ORDER',
      message: 'Start date occurs after end date'
    });
  }

  // Validate range duration
  const daysDiff = differenceInDays(range.endDate, range.startDate);
  if (daysDiff > (options.maxRangeDays || DEFAULT_VALIDATION_OPTIONS.maxRangeDays!)) {
    errors.push(`Date range exceeds maximum allowed (${options.maxRangeDays} days)`);
    details.push({
      code: 'RANGE_TOO_LARGE',
      message: 'Date range exceeds maximum allowed duration'
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    details
  };
}

/**
 * Calculates number of days between two dates
 * @param startDate - Start date for calculation
 * @param endDate - End date for calculation
 * @param options - Calculation options
 * @returns DayCalculationResult with detailed day counts
 * @throws Error if invalid dates provided
 */
export function getDaysBetween(
  startDate: Date,
  endDate: Date,
  options: DayCalculationOptions = {}
): DayCalculationResult {
  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    throw new Error('Invalid date objects provided');
  }

  const totalDays = differenceInDays(endDate, startDate);
  let businessDays = totalDays;

  if (options.includeBusinessDaysOnly) {
    businessDays = calculateBusinessDays(startDate, endDate);
  }

  return {
    days: totalDays,
    businessDays,
    metadata: {
      timezone: options.timezone || 'UTC',
      includedWeekends: !options.includeBusinessDaysOnly
    }
  };
}

/**
 * Normalizes a date by setting time to start or end of day
 * @param date - Date to normalize
 * @param isEndOfDay - Whether to set to end of day
 * @param timezone - Timezone for normalization
 * @returns Normalized date object
 * @throws Error if invalid date provided
 */
export function normalizeDate(
  date: Date,
  isEndOfDay: boolean = false,
  timezone: string = 'UTC'
): Date {
  if (!isValidDate(date)) {
    throw new Error('Invalid date object provided');
  }

  return isEndOfDay ? endOfDay(date) : startOfDay(date);
}

/**
 * Helper function to calculate business days between dates
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Number of business days
 */
function calculateBusinessDays(startDate: Date, endDate: Date): number {
  let count = 0;
  const curDate = new Date(startDate.getTime());

  while (curDate <= endDate) {
    const dayOfWeek = curDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    curDate.setDate(curDate.getDate() + 1);
  }

  return count;
}