/**
 * Core validation utility functions providing comprehensive, type-safe validation logic
 * for data integrity and security across the application.
 * @version 1.0.0
 */

import { isEmail, isURL, isUUID } from 'validator'; // v13.9.0
import { ValidationError } from '../types/error.types';

/**
 * Interface for URL validation options
 */
interface URLValidationOptions {
  requireProtocol: boolean;
  requireValidProtocol: boolean;
  protocols: string[];
  requireSSL: boolean;
  blockedDomains: string[];
}

/**
 * Interface for attribution model configuration
 */
interface AttributionModelConfig {
  modelType: string;
  weights: Record<string, number>;
  touchpoints: TouchpointConfig[];
  timeDecay?: TimeDecayConfig;
  customRules?: CustomRules;
}

/**
 * Interface for channel data validation
 */
interface ChannelData {
  channelName: string;
  utmParameters: UTMParams;
  metrics: ChannelMetrics;
  trackingConfig: TrackingConfig;
  customParameters?: CustomParams;
}

/**
 * Interface for validation results
 */
interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates email address format using RFC 5322 standards
 * @param email - Email address to validate
 * @throws ValidationError if validation fails
 */
export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];
  
  // Sanitize input
  const sanitizedEmail = email?.trim().toLowerCase();
  
  // Check for null/undefined
  if (!sanitizedEmail) {
    errors.push('Email address is required');
    throw new ValidationError('VALIDATION_ERROR', 'Invalid email address', { validationErrors: errors });
  }

  // Validate email format
  if (!isEmail(sanitizedEmail, { 
    allow_utf8_local_part: false,
    require_tld: true,
    allow_ip_domain: false
  })) {
    errors.push('Invalid email format');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates UUID string format (v4)
 * @param uuid - UUID string to validate
 * @throws ValidationError if validation fails
 */
export function validateUUID(uuid: string): ValidationResult {
  const errors: string[] = [];
  
  // Sanitize input
  const sanitizedUUID = uuid?.trim();
  
  // Check for null/undefined
  if (!sanitizedUUID) {
    errors.push('UUID is required');
    throw new ValidationError('VALIDATION_ERROR', 'Invalid UUID', { validationErrors: errors });
  }

  // Validate UUID format
  if (!isUUID(sanitizedUUID, 4)) {
    errors.push('Invalid UUID format - must be version 4');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates URL format with customizable protocol and security options
 * @param url - URL string to validate
 * @param options - URL validation options
 * @throws ValidationError if validation fails
 */
export function validateURL(url: string, options: URLValidationOptions): ValidationResult {
  const errors: string[] = [];
  
  // Sanitize input
  const sanitizedURL = url?.trim();
  
  // Check for null/undefined
  if (!sanitizedURL) {
    errors.push('URL is required');
    throw new ValidationError('VALIDATION_ERROR', 'Invalid URL', { validationErrors: errors });
  }

  // Validate URL format
  if (!isURL(sanitizedURL, {
    require_protocol: options.requireProtocol,
    require_valid_protocol: options.requireValidProtocol,
    protocols: options.protocols,
    require_tld: true,
    require_host: true,
    disallow_auth: true
  })) {
    errors.push('Invalid URL format');
  }

  // Check blocked domains
  const urlObj = new URL(sanitizedURL);
  if (options.blockedDomains.includes(urlObj.hostname)) {
    errors.push('Domain is blocked');
  }

  // Validate SSL if required
  if (options.requireSSL && !sanitizedURL.startsWith('https://')) {
    errors.push('SSL (HTTPS) is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates date range for analytics queries
 * @param startDate - Start date
 * @param endDate - End date
 * @param options - Date range validation options
 * @throws ValidationError if validation fails
 */
export function validateDateRange(
  startDate: Date,
  endDate: Date,
  options: DateRangeOptions = { maxRangeInDays: 365 }
): ValidationResult {
  const errors: string[] = [];

  // Validate date objects
  if (!(startDate instanceof Date) || isNaN(startDate.getTime())) {
    errors.push('Invalid start date');
  }

  if (!(endDate instanceof Date) || isNaN(endDate.getTime())) {
    errors.push('Invalid end date');
  }

  if (errors.length > 0) {
    throw new ValidationError('VALIDATION_ERROR', 'Invalid date range', { validationErrors: errors });
  }

  // Convert to UTC for comparison
  const utcStartDate = new Date(startDate.toUTCString());
  const utcEndDate = new Date(endDate.toUTCString());

  // Verify date order
  if (utcStartDate >= utcEndDate) {
    errors.push('Start date must be before end date');
  }

  // Check maximum range
  const daysDiff = Math.ceil((utcEndDate.getTime() - utcStartDate.getTime()) / (1000 * 60 * 60 * 24));
  if (daysDiff > options.maxRangeInDays) {
    errors.push(`Date range cannot exceed ${options.maxRangeInDays} days`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates attribution model configuration
 * @param config - Attribution model configuration
 * @throws ValidationError if validation fails
 */
export function validateAttributionModel(config: AttributionModelConfig): ValidationResult {
  const errors: string[] = [];
  
  // Validate model type
  const validModelTypes = ['first_touch', 'last_touch', 'linear', 'time_decay', 'position_based'];
  if (!validModelTypes.includes(config.modelType)) {
    errors.push('Invalid attribution model type');
  }

  // Validate weights
  const totalWeight = Object.values(config.weights).reduce((sum, weight) => sum + weight, 0);
  if (Math.abs(totalWeight - 100) > 0.01) {
    errors.push('Channel weights must sum to 100%');
  }

  // Validate touchpoints
  if (!Array.isArray(config.touchpoints) || config.touchpoints.length === 0) {
    errors.push('At least one touchpoint configuration is required');
  }

  // Validate time decay configuration if applicable
  if (config.modelType === 'time_decay' && config.timeDecay) {
    if (config.timeDecay.halfLifeDays <= 0) {
      errors.push('Time decay half-life must be positive');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates marketing channel data
 * @param data - Channel data to validate
 * @throws ValidationError if validation fails
 */
export function validateChannelData(data: ChannelData): ValidationResult {
  const errors: string[] = [];

  // Validate channel name
  const validChannels = ['social', 'email', 'ppc', 'organic', 'direct', 'referral'];
  if (!validChannels.includes(data.channelName.toLowerCase())) {
    errors.push('Invalid channel name');
  }

  // Validate UTM parameters
  const requiredUTMParams = ['source', 'medium', 'campaign'];
  for (const param of requiredUTMParams) {
    if (!data.utmParameters[param]) {
      errors.push(`Missing required UTM parameter: ${param}`);
    }
  }

  // Validate metrics
  if (typeof data.metrics.conversionRate !== 'number' || 
      data.metrics.conversionRate < 0 || 
      data.metrics.conversionRate > 100) {
    errors.push('Invalid conversion rate');
  }

  // Validate tracking configuration
  if (!data.trackingConfig.pixelId || !validateUUID(data.trackingConfig.pixelId).isValid) {
    errors.push('Invalid tracking pixel ID');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}