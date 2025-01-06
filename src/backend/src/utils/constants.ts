/**
 * Core constants and configuration values for the attribution modeling system
 * Provides strictly typed, immutable configuration values with comprehensive documentation
 * @version 1.0.0
 */

import { AttributionModel } from '../core/attribution/types/attribution.types';
import { EventType } from '../core/events/types/event.types';

/**
 * Current API version for request routing and response metadata
 */
export const API_VERSION = 'v1' as const;

/**
 * Default pagination size for optimized list endpoint performance
 * Based on performance testing for optimal response times
 */
export const DEFAULT_PAGE_SIZE = 50 as const;

/**
 * Maximum allowed pagination size to prevent system overload
 * Ensures <5s response time with 99.9% reliability
 */
export const MAX_PAGE_SIZE = 1000 as const;

/**
 * Core attribution system configuration constants
 * Defines model parameters, time windows, and weight distributions
 */
export const ATTRIBUTION_CONSTANTS = {
  // Default attribution window of 30 days in milliseconds
  DEFAULT_TIME_WINDOW: 30 * 24 * 60 * 60 * 1000,
  
  // Default attribution model type
  DEFAULT_MODEL: AttributionModel.LAST_TOUCH,
  
  // Weight configurations for different attribution models
  MODEL_WEIGHTS: {
    // Single-touch models
    FIRST_TOUCH: 1.0,
    LAST_TOUCH: 1.0,
    
    // Multi-touch models
    LINEAR: 0.2, // Equal distribution across touchpoints
    TIME_DECAY: 0.7, // Decay factor for time-based weighting
    
    // Position-based model weights
    POSITION_BASED: {
      FIRST: 0.4,
      MIDDLE: 0.2,
      LAST: 0.4
    }
  },
  
  // Validation thresholds
  VALIDATION: {
    MIN_CONFIDENCE_SCORE: 0.7,
    MIN_TOUCHPOINTS: 2,
    MAX_TOUCHPOINTS: 50,
    MAX_JOURNEY_DURATION: 90 * 24 * 60 * 60 * 1000 // 90 days in ms
  }
} as const;

/**
 * Event processing system configuration constants
 * Defines processing limits, timeouts, and batch operations
 */
export const EVENT_CONSTANTS = {
  // Maximum events per batch for optimal processing
  MAX_BATCH_SIZE: 1000,
  
  // Session timeout in milliseconds (30 minutes)
  SESSION_TIMEOUT: 30 * 60 * 1000,
  
  // Processing timeout for event handling (5 seconds)
  PROCESSING_TIMEOUT: 5000,
  
  // Retry configuration for failed events
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // Delay between retries in ms
  
  // Event type priorities for processing order
  PRIORITY: {
    [EventType.CONVERSION]: 1,
    [EventType.PAGE_VIEW]: 2,
    DEFAULT: 3
  }
} as const;

/**
 * Cache configuration constants for performance optimization
 */
export const CACHE_CONSTANTS = {
  // Default cache TTL in seconds
  DEFAULT_TTL: 3600,
  
  // Maximum cache TTL in seconds
  MAX_TTL: 86400,
  
  // Analytics results cache TTL in seconds
  ANALYTICS_TTL: 300,
  
  // Cache key prefixes
  PREFIXES: {
    ATTRIBUTION: 'attr:',
    EVENT: 'evt:',
    SESSION: 'sess:',
    ANALYTICS: 'analytics:'
  }
} as const;

/**
 * Rate limiting configuration for API protection
 * Ensures system stability under high load
 */
export const RATE_LIMIT_CONSTANTS = {
  // Time window for rate limiting in milliseconds
  WINDOW_MS: 60000,
  
  // Maximum requests per window
  MAX_REQUESTS: 1000,
  
  // Endpoint-specific limits
  ENDPOINTS: {
    EVENTS: {
      WINDOW_MS: 60000,
      MAX_REQUESTS: 5000
    },
    ATTRIBUTION: {
      WINDOW_MS: 60000,
      MAX_REQUESTS: 1000
    },
    ANALYTICS: {
      WINDOW_MS: 60000,
      MAX_REQUESTS: 100
    }
  }
} as const;

/**
 * System performance thresholds for monitoring and alerts
 */
export const PERFORMANCE_CONSTANTS = {
  // Maximum acceptable latency in milliseconds
  MAX_LATENCY: 5000,
  
  // Maximum events per second
  MAX_EVENTS_PER_SECOND: 1000,
  
  // Maximum concurrent processing threads
  MAX_CONCURRENT_PROCESSES: 100,
  
  // Memory usage thresholds
  MEMORY_THRESHOLDS: {
    WARNING: 0.7, // 70% usage
    CRITICAL: 0.9 // 90% usage
  }
} as const;