/**
 * @fileoverview Frontend tracking system configuration with enhanced security and validation
 * @version 1.0.0
 */

// External imports
import CryptoJS from 'crypto-js'; // v4.1.1

// Internal imports
import { TrackingConfig } from './types';
import { API_CONFIG } from '../config/api.config';

// Environment variables and constants
const BATCH_SIZE = 100;
const FLUSH_INTERVAL = 30000; // 30 seconds
const DEBUG_MODE = process.env.NODE_ENV === 'development';
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds
const ENCRYPTION_KEY = process.env.TRACKING_ENCRYPTION_KEY;

/**
 * Enhanced tracking system configuration with security and validation
 */
export const TRACKING_CONFIG: TrackingConfig = {
  // API endpoint configuration
  endpoint: API_CONFIG.ENDPOINTS.EVENTS.BATCH.path,
  batchSize: BATCH_SIZE,
  flushInterval: FLUSH_INTERVAL,
  debug: DEBUG_MODE,

  // Retry configuration for failed requests
  retryConfig: {
    maxRetries: MAX_RETRIES,
    delay: RETRY_DELAY,
    backoffFactor: 1.5,
    retryableStatusCodes: API_CONFIG.ERROR_RETRY_CODES
  },

  // Validation rules for event data
  validationRules: {
    maxEventSize: 32768, // 32KB
    requiredFields: ['eventType', 'timestamp', 'visitorId', 'sessionId'],
    allowedEventTypes: [
      'pageview',
      'click',
      'scroll',
      'form_interaction',
      'conversion',
      'custom',
      'error',
      'performance'
    ],
    maxCustomProperties: 50,
    maxPropertyLength: 1000
  },

  // Security configuration
  security: {
    encryptionEnabled: true,
    encryptionKey: ENCRYPTION_KEY,
    sanitizeData: true,
    headers: {
      ...API_CONFIG.DEFAULT_HEADERS,
      'X-Tracking-Version': '1.0.0'
    }
  }
};

/**
 * Storage configuration for tracking data with enhanced security
 */
export const STORAGE_CONFIG = {
  // Storage keys
  visitorIdKey: 'mta_visitor_id',
  sessionIdKey: 'mta_session_id',
  eventsKey: 'mta_events',
  
  // Encryption configuration
  encryption: {
    enabled: true,
    algorithm: 'AES-256-GCM',
    keyRotationInterval: 604800, // 7 days in seconds
    encryptionOptions: {
      mode: CryptoJS.mode.GCM,
      padding: CryptoJS.pad.Pkcs7,
      format: CryptoJS.format.Hex
    }
  },

  // Data expiration settings
  expiration: {
    visitorId: 31536000,  // 1 year in seconds
    sessionId: 1800,      // 30 minutes in seconds
    events: 86400,        // 24 hours in seconds
    maxAge: 2592000      // 30 days in seconds
  },

  // Storage validation rules
  validation: {
    maxStorageSize: 5242880, // 5MB
    maxItemSize: 102400,    // 100KB
    sanitizeKeys: true,
    validateData: true,
    allowedCharacters: /^[a-zA-Z0-9_-]+$/,
    maxKeyLength: 50
  },

  // Compression settings
  compression: {
    enabled: true,
    threshold: 1024, // Compress data larger than 1KB
    algorithm: 'GZIP'
  },

  // Error handling configuration
  errorHandling: {
    maxRetries: 3,
    retryDelay: 1000,
    fallbackToMemory: true,
    logErrors: DEBUG_MODE
  }
};

// Freeze configurations to prevent runtime modifications
Object.freeze(TRACKING_CONFIG);
Object.freeze(STORAGE_CONFIG);

/**
 * Type definitions for storage configuration
 */
export type StorageConfigType = typeof STORAGE_CONFIG;

/**
 * Type definitions for tracking configuration
 */
export type TrackingConfigType = typeof TRACKING_CONFIG;