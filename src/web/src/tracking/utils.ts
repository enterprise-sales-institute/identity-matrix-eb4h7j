/**
 * @fileoverview Utility functions for frontend tracking system with enhanced security and validation
 * @version 1.0.0
 */

// External imports
import { v4 as uuidv4 } from 'uuid'; // v9.0.0

// Internal imports
import { TrackingEvent, TrackingEventType, EventProperties } from './types';
import { TRACKING_CONFIG } from './config';
import { getStorageState } from './storage';

/**
 * Required fields for tracking events including context
 */
const REQUIRED_EVENT_FIELDS = [
  'id',
  'visitorId',
  'sessionId',
  'type',
  'properties',
  'timestamp',
  'context'
] as const;

/**
 * Privacy-aware browser context fields to collect
 */
const BROWSER_CONTEXT_FIELDS = [
  'userAgent',
  'language',
  'screenResolution',
  'viewport',
  'timezone',
  'doNotTrack'
] as const;

/**
 * Fields requiring special privacy handling
 */
const PRIVACY_SENSITIVE_FIELDS = [
  'ip',
  'fingerprint',
  'precise_location'
] as const;

/**
 * Generates a unique identifier for tracking events with validation
 * @returns Validated UUID v4 string
 * @throws Error if UUID generation fails
 */
export function generateEventId(): string {
  try {
    const eventId = uuidv4();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(eventId)) {
      throw new Error('Invalid UUID format generated');
    }

    if (TRACKING_CONFIG.debug) {
      console.debug(`Generated event ID: ${eventId}`);
    }

    return eventId;
  } catch (error) {
    throw new Error(`Failed to generate event ID: ${error.message}`);
  }
}

/**
 * Creates a new tracking event with required properties and validation
 * @param type Event type from TrackingEventType enum
 * @param properties Custom event properties
 * @returns Validated new tracking event object
 * @throws Error if event creation or validation fails
 */
export function createTrackingEvent(
  type: TrackingEventType,
  properties: EventProperties
): TrackingEvent {
  try {
    // Validate input parameters
    if (!Object.values(TrackingEventType).includes(type)) {
      throw new Error(`Invalid event type: ${type}`);
    }

    if (!properties || typeof properties !== 'object') {
      throw new Error('Properties must be a valid object');
    }

    // Get current storage state
    const storageState = getStorageState();
    const eventId = generateEventId();

    // Create event object with required fields
    const event: TrackingEvent = {
      id: eventId,
      visitorId: storageState.visitorId,
      sessionId: storageState.sessionId,
      type,
      properties: sanitizeProperties(properties),
      timestamp: Date.now(),
      context: getBrowserContext()
    };

    // Validate complete event
    if (!validateEvent(event)) {
      throw new Error('Event validation failed');
    }

    if (TRACKING_CONFIG.debug) {
      console.debug('Created tracking event:', event);
    }

    return event;
  } catch (error) {
    throw new Error(`Failed to create tracking event: ${error.message}`);
  }
}

/**
 * Validates tracking event data with comprehensive checks
 * @param event Event object to validate
 * @returns Validation result
 */
export function validateEvent(event: TrackingEvent): boolean {
  try {
    // Check required fields
    for (const field of REQUIRED_EVENT_FIELDS) {
      if (!(field in event)) {
        if (TRACKING_CONFIG.debug) {
          console.error(`Missing required field: ${field}`);
        }
        return false;
      }
    }

    // Validate field types and formats
    if (typeof event.id !== 'string' || 
        typeof event.visitorId !== 'string' || 
        typeof event.sessionId !== 'string') {
      return false;
    }

    // Validate event type
    if (!Object.values(TrackingEventType).includes(event.type)) {
      return false;
    }

    // Validate timestamp
    if (!Number.isInteger(event.timestamp) || event.timestamp <= 0) {
      return false;
    }

    // Apply custom validation rules
    const { validationRules } = TRACKING_CONFIG;
    if (Object.keys(event.properties).length > validationRules.maxCustomProperties) {
      return false;
    }

    // Validate context data
    if (!validateContext(event.context)) {
      return false;
    }

    return true;
  } catch (error) {
    if (TRACKING_CONFIG.debug) {
      console.error('Event validation error:', error);
    }
    return false;
  }
}

/**
 * Enriches event data with context while ensuring privacy compliance
 * @param event Event object to enrich
 * @returns Privacy-compliant enriched event object
 */
export function enrichEventData(event: TrackingEvent): TrackingEvent {
  try {
    const enrichedEvent = { ...event };

    // Add precise timestamp
    enrichedEvent.timestamp = Date.now();

    // Add sanitized page data
    enrichedEvent.properties = {
      ...enrichedEvent.properties,
      page_url: sanitizeUrl(window.location.href),
      page_title: document.title,
      referrer: sanitizeUrl(document.referrer)
    };

    // Process UTM parameters
    const utmParams = extractUtmParameters();
    if (Object.keys(utmParams).length > 0) {
      enrichedEvent.properties.utm = utmParams;
    }

    // Add browser context
    enrichedEvent.context = {
      ...enrichedEvent.context,
      ...getBrowserContext()
    };

    // Apply privacy filters
    enrichedEvent.properties = filterSensitiveData(enrichedEvent.properties);
    enrichedEvent.context = filterSensitiveData(enrichedEvent.context);

    if (TRACKING_CONFIG.debug) {
      console.debug('Enriched event data:', enrichedEvent);
    }

    return enrichedEvent;
  } catch (error) {
    throw new Error(`Failed to enrich event data: ${error.message}`);
  }
}

/**
 * Private helper functions
 */

function sanitizeProperties(properties: EventProperties): EventProperties {
  const sanitized: EventProperties = {};
  for (const [key, value] of Object.entries(properties)) {
    if (typeof value === 'string') {
      sanitized[key] = value.slice(0, TRACKING_CONFIG.validationRules.maxPropertyLength);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function getBrowserContext() {
  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    doNotTrack: navigator.doNotTrack === '1'
  };
}

function validateContext(context: any): boolean {
  return BROWSER_CONTEXT_FIELDS.every(field => field in context);
}

function sanitizeUrl(url: string): string {
  try {
    const parsedUrl = new URL(url);
    // Remove sensitive query parameters
    const sensitiveParams = ['token', 'key', 'password', 'secret'];
    sensitiveParams.forEach(param => parsedUrl.searchParams.delete(param));
    return parsedUrl.toString();
  } catch {
    return '';
  }
}

function extractUtmParameters(): Record<string, string> {
  const utmParams: Record<string, string> = {};
  const searchParams = new URLSearchParams(window.location.search);
  
  ['source', 'medium', 'campaign', 'term', 'content'].forEach(param => {
    const value = searchParams.get(`utm_${param}`);
    if (value) {
      utmParams[param] = value;
    }
  });
  
  return utmParams;
}

function filterSensitiveData<T extends Record<string, any>>(data: T): T {
  const filtered = { ...data };
  PRIVACY_SENSITIVE_FIELDS.forEach(field => {
    delete filtered[field];
  });
  return filtered;
}