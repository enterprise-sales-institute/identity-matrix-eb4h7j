/**
 * @fileoverview Utility functions for form validation, data validation, and input sanitization
 * @version 1.0.0
 */

import i18next from 'i18next'; // v21.0.0
import * as yup from 'yup'; // v0.32.0
import { isAfter, differenceInDays, isValid, parseISO } from 'date-fns'; // v2.30.0

import { ErrorType } from '../types/common.types';
import { AttributionModelConfig, Channel } from '../types/attribution.types';

// Validation Constants
const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const PASSWORD_MIN_LENGTH = 8;
const MAX_TIME_RANGE_DAYS = 90;
const MIN_CHANNEL_WEIGHT = 0;
const MAX_CHANNEL_WEIGHT = 100;
const TOTAL_WEIGHT_SUM = 100;

// Schema Validation
const passwordSchema = yup.string()
  .min(PASSWORD_MIN_LENGTH, i18next.t('validation.password.minLength'))
  .matches(/[A-Z]/, i18next.t('validation.password.uppercase'))
  .matches(/[a-z]/, i18next.t('validation.password.lowercase'))
  .matches(/[0-9]/, i18next.t('validation.password.number'))
  .matches(/[!@#$%^&*]/, i18next.t('validation.password.special'))
  .required(i18next.t('validation.password.required'));

/**
 * Validates email format using robust regex pattern
 * @param email - Email address to validate
 * @returns ErrorType object if invalid, null if valid
 */
export const validateEmail = (email: string): ErrorType | null => {
  if (!email) {
    return { email: [i18next.t('validation.email.required')] };
  }

  const normalizedEmail = email.trim().toLowerCase();
  
  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return { email: [i18next.t('validation.email.invalid')] };
  }

  return null;
};

/**
 * Validates password against security requirements
 * @param password - Password to validate
 * @returns ErrorType object if invalid, null if valid
 */
export const validatePassword = async (password: string): Promise<ErrorType | null> => {
  try {
    await passwordSchema.validate(password);
    return null;
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      return { password: [error.message] };
    }
    return { password: [i18next.t('validation.password.invalid')] };
  }
};

/**
 * Validates time range selection with business rules
 * @param startDate - Start date of range
 * @param endDate - End date of range
 * @returns ErrorType object if invalid, null if valid
 */
export const validateTimeRange = (startDate: Date, endDate: Date): ErrorType | null => {
  const errors: ErrorType = {};

  // Validate date objects
  if (!isValid(startDate) || !isValid(endDate)) {
    return { timeRange: [i18next.t('validation.timeRange.invalidDates')] };
  }

  // Check if end date is after start date
  if (!isAfter(endDate, startDate)) {
    errors.timeRange = [...(errors.timeRange || []), 
      i18next.t('validation.timeRange.endBeforeStart')];
  }

  // Validate range duration
  const rangeDays = differenceInDays(endDate, startDate);
  if (rangeDays > MAX_TIME_RANGE_DAYS) {
    errors.timeRange = [...(errors.timeRange || []),
      i18next.t('validation.timeRange.exceedsMaxDuration', { days: MAX_TIME_RANGE_DAYS })];
  }

  // Check if dates are in future
  const now = new Date();
  if (isAfter(startDate, now) || isAfter(endDate, now)) {
    errors.timeRange = [...(errors.timeRange || []),
      i18next.t('validation.timeRange.futureDates')];
  }

  return Object.keys(errors).length > 0 ? errors : null;
};

/**
 * Validates attribution model configuration
 * @param modelConfig - Attribution model configuration to validate
 * @returns ErrorType object if invalid, null if valid
 */
export const validateAttributionModel = (modelConfig: AttributionModelConfig): ErrorType | null => {
  const errors: ErrorType = {};

  // Validate model type
  if (!modelConfig.model) {
    errors.model = [i18next.t('validation.attributionModel.modelRequired')];
  }

  // Validate channel weights
  if (modelConfig.channelWeights) {
    let totalWeight = 0;
    
    for (const [channel, weight] of Object.entries(modelConfig.channelWeights)) {
      // Validate weight range
      if (weight < MIN_CHANNEL_WEIGHT || weight > MAX_CHANNEL_WEIGHT) {
        errors.weights = [...(errors.weights || []),
          i18next.t('validation.attributionModel.weightRange', { channel })];
      }
      totalWeight += weight;
    }

    // Validate total weight sum
    if (Math.abs(totalWeight - TOTAL_WEIGHT_SUM) > 0.01) {
      errors.weights = [...(errors.weights || []),
        i18next.t('validation.attributionModel.totalWeight', { expected: TOTAL_WEIGHT_SUM })];
    }
  }

  // Validate time decay parameters if applicable
  if (modelConfig.model === 'TIME_DECAY' && modelConfig.customRules) {
    if (!modelConfig.customRules.decayHalfLife || modelConfig.customRules.decayHalfLife <= 0) {
      errors.decay = [i18next.t('validation.attributionModel.invalidDecay')];
    }
  }

  return Object.keys(errors).length > 0 ? errors : null;
};

/**
 * Sanitizes user input with XSS prevention
 * @param input - String to sanitize
 * @returns Sanitized string
 */
export const sanitizeInput = (input: string): string => {
  if (!input) return '';

  return input
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Escape special characters
    .replace(/[&<>"']/g, (char) => {
      const entities: { [key: string]: string } = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      };
      return entities[char];
    })
    // Normalize whitespace
    .trim()
    // Normalize Unicode characters
    .normalize('NFKC');
};