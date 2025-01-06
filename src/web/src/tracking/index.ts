/**
 * @fileoverview Main entry point for the frontend tracking system with enhanced security and performance features
 * @version 1.0.0
 */

// External imports
import compression from 'compression'; // v1.7.4
import CryptoJS from 'crypto-js'; // v4.1.1

// Internal imports
import { 
  TrackingConfig, 
  TrackingEvent, 
  TrackingEventType,
  EventProperties,
  ValidationConfig
} from './types';
import { EventCollector } from './collector';
import { TRACKING_CONFIG, STORAGE_CONFIG } from './config';

/**
 * Performance monitoring decorator
 */
function performanceMonitor(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value;
  descriptor.value = async function(...args: any[]) {
    const start = performance.now();
    const result = await originalMethod.apply(this, args);
    const end = performance.now();
    
    if (TRACKING_CONFIG.debug) {
      console.debug(`${propertyKey} execution time:`, end - start, 'ms');
    }
    
    return result;
  };
  return descriptor;
}

/**
 * Error boundary decorator
 */
function errorBoundary(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value;
  descriptor.value = async function(...args: any[]) {
    try {
      return await originalMethod.apply(this, args);
    } catch (error) {
      console.error(`Error in ${propertyKey}:`, error);
      if (TRACKING_CONFIG.debug) {
        console.debug('Error context:', { args, this: this });
      }
      throw error;
    }
  };
  return descriptor;
}

/**
 * Initialize the tracking system with enhanced security and monitoring
 */
@performanceMonitor
@errorBoundary
function initializeTracker(): EventCollector {
  validateConfiguration();
  initializeSecurity();
  return new EventCollector();
}

/**
 * Validate tracking configuration
 */
function validateConfiguration(): void {
  if (!TRACKING_CONFIG.endpoint) {
    throw new Error('Tracking endpoint is required');
  }

  if (!TRACKING_CONFIG.security.encryptionKey && TRACKING_CONFIG.security.encryptionEnabled) {
    throw new Error('Encryption key is required when encryption is enabled');
  }

  if (TRACKING_CONFIG.batchSize <= 0 || TRACKING_CONFIG.flushInterval <= 0) {
    throw new Error('Invalid batch size or flush interval');
  }
}

/**
 * Initialize security context
 */
function initializeSecurity(): void {
  if (TRACKING_CONFIG.security.encryptionEnabled) {
    const keyHash = CryptoJS.SHA256(TRACKING_CONFIG.security.encryptionKey).toString();
    Object.defineProperty(window, '__MTA_SECURITY_CONTEXT__', {
      value: {
        keyHash,
        timestamp: Date.now(),
        version: TRACKING_CONFIG.security.headers['X-Tracking-Version']
      },
      writable: false,
      configurable: false
    });
  }
}

/**
 * Debug utilities for development environment
 */
const debug = {
  getConfig: () => TRACKING_CONFIG.debug ? TRACKING_CONFIG : null,
  getStorageState: () => TRACKING_CONFIG.debug ? {
    visitorId: localStorage.getItem(STORAGE_CONFIG.visitorIdKey),
    sessionId: localStorage.getItem(STORAGE_CONFIG.sessionIdKey),
    queueSize: localStorage.getItem(STORAGE_CONFIG.eventsKey)?.length || 0
  } : null,
  clearStorage: () => {
    if (TRACKING_CONFIG.debug) {
      localStorage.removeItem(STORAGE_CONFIG.visitorIdKey);
      localStorage.removeItem(STORAGE_CONFIG.sessionIdKey);
      localStorage.removeItem(STORAGE_CONFIG.eventsKey);
    }
  }
};

// Initialize the tracking system
const collector = initializeTracker();

/**
 * Export the tracking API with enhanced functionality
 */
export const tracker = {
  /**
   * Track a new event with validation and security measures
   */
  track: (type: TrackingEventType, properties: EventProperties) => 
    collector.track(type, properties),

  /**
   * Manually flush the event queue
   */
  flush: () => collector.flush(),

  /**
   * Get current tracking metrics
   */
  getMetrics: () => collector.getMetrics(),

  /**
   * Event type enumeration for type safety
   */
  TrackingEventType,

  /**
   * Debug utilities (only available in development)
   */
  debug: TRACKING_CONFIG.debug ? debug : null
};

// Prevent modifications to the tracker object
Object.freeze(tracker);