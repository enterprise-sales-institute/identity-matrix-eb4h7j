/**
 * Type definitions and interfaces for the event tracking system
 * Defines comprehensive data structures for user interactions, marketing events,
 * and conversion tracking with enhanced type safety and validation
 * @version 1.0.0
 */

import { TimeRange } from '../../../types/common.types';
import { Record } from 'typescript'; // v4.9.0

/**
 * Enumeration of all supported event types in the tracking system
 */
export enum EventType {
  PAGE_VIEW = 'PAGE_VIEW',
  CLICK = 'CLICK',
  CONVERSION = 'CONVERSION',
  CUSTOM = 'CUSTOM',
  FORM_SUBMIT = 'FORM_SUBMIT',
  SCROLL = 'SCROLL',
  ENGAGEMENT = 'ENGAGEMENT'
}

/**
 * Enumeration of possible event processing statuses
 */
export enum EventStatus {
  PENDING = 'PENDING',
  VALIDATING = 'VALIDATING',
  PROCESSING = 'PROCESSING',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
  INVALID = 'INVALID',
  ARCHIVED = 'ARCHIVED'
}

/**
 * Type definition for flexible event properties with immutability
 */
export type EventProperties = Readonly<Record<string, unknown>>;

/**
 * Type definition for event filtering criteria with partial matching
 */
export type EventFilter = Readonly<Partial<Record<keyof Event, unknown>>>;

/**
 * Type definition for event validation results
 */
export type ValidationResult = {
  readonly valid: boolean;
  readonly errors?: string[];
  readonly warnings?: string[];
};

/**
 * Type definition for query pagination options
 */
export type PaginationOptions = {
  readonly limit: number;
  readonly offset: number;
  readonly sortBy?: keyof Event;
  readonly sortOrder?: 'asc' | 'desc';
};

/**
 * Interface for event metadata tracking
 */
export interface EventMetadata {
  readonly source: string;
  readonly version: string;
  readonly environment: string;
  readonly tags: Record<string, string>;
}

/**
 * Core event interface for tracking user interactions
 */
export interface Event {
  readonly id: string;
  readonly visitorId: string;
  readonly sessionId: string;
  readonly type: EventType;
  readonly timestamp: Date;
  readonly properties: EventProperties;
  readonly metadata: EventMetadata;
}

/**
 * Interface for event querying parameters
 */
export interface EventQuery {
  readonly timeRange: TimeRange;
  readonly visitorIds?: readonly string[];
  readonly types?: readonly EventType[];
  readonly filters?: EventFilter;
  readonly pagination?: PaginationOptions;
}

/**
 * Interface for batch event processing
 */
export interface EventBatch {
  readonly events: readonly Event[];
  readonly batchId: string;
  readonly processedAt: Date;
  readonly status: EventStatus;
  readonly validation: ValidationResult;
}

/**
 * Type guard to validate Event structure
 */
export function isEvent(value: unknown): value is Event {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'visitorId' in value &&
    'sessionId' in value &&
    'type' in value &&
    'timestamp' in value &&
    'properties' in value &&
    'metadata' in value &&
    typeof (value as Event).id === 'string' &&
    typeof (value as Event).visitorId === 'string' &&
    typeof (value as Event).sessionId === 'string' &&
    (value as Event).type in EventType &&
    value instanceof Date
  );
}

/**
 * Type guard to validate EventBatch structure
 */
export function isEventBatch(value: unknown): value is EventBatch {
  return (
    typeof value === 'object' &&
    value !== null &&
    'events' in value &&
    'batchId' in value &&
    'processedAt' in value &&
    'status' in value &&
    'validation' in value &&
    Array.isArray((value as EventBatch).events) &&
    (value as EventBatch).events.every(isEvent) &&
    typeof (value as EventBatch).batchId === 'string' &&
    (value as EventBatch).processedAt instanceof Date &&
    (value as EventBatch).status in EventStatus
  );
}