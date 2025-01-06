/**
 * @fileoverview TypeScript type definitions and interfaces for the frontend tracking system
 * @version 1.0.0
 */

// External imports
import { Record } from 'typescript'; // v4.9.0

// Internal imports
import { BaseEntity } from '../types/common.types';

/**
 * Configuration interface for tracking system with validation and retry support
 */
export interface TrackingConfig {
  /** API endpoint for event collection */
  endpoint: string;
  /** Number of events to batch before sending */
  batchSize: number;
  /** Interval in milliseconds between batch sends */
  flushInterval: number;
  /** Enable debug logging */
  debug: boolean;
  /** Number of retry attempts for failed sends */
  retryAttempts: number;
  /** Validation configuration */
  validation: ValidationConfig;
}

/**
 * Configuration interface for event validation rules
 */
export interface ValidationConfig {
  /** Enable strict validation mode */
  strictMode: boolean;
  /** Custom validation rules */
  rules: ValidationRules;
  /** Error handler callback */
  onError: ErrorHandler;
}

/**
 * Enhanced enumeration of supported tracking event types
 */
export enum TrackingEventType {
  PAGE_VIEW = 'PAGE_VIEW',
  CLICK = 'CLICK',
  SCROLL = 'SCROLL',
  FORM_INTERACTION = 'FORM_INTERACTION',
  CONVERSION = 'CONVERSION',
  CUSTOM = 'CUSTOM',
  ERROR = 'ERROR',
  PERFORMANCE = 'PERFORMANCE'
}

/**
 * Enumeration of tracking event processing statuses
 */
export enum TrackingStatus {
  QUEUED = 'QUEUED',
  VALIDATING = 'VALIDATING',
  SENDING = 'SENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING'
}

/**
 * Interface for event metadata tracking
 */
export interface EventMetadata {
  /** Source of the event */
  source: string;
  /** Tracking implementation version */
  version: string;
  /** Custom metadata fields */
  custom: Record<string, unknown>;
}

/**
 * Enhanced interface for tracking events with metadata and status tracking
 */
export interface TrackingEvent extends BaseEntity {
  /** Unique visitor identifier */
  visitorId: string;
  /** Session identifier */
  sessionId: string;
  /** Event type */
  type: TrackingEventType;
  /** Event properties */
  properties: EventProperties;
  /** Event metadata */
  metadata: EventMetadata;
  /** Processing status */
  status: TrackingStatus;
}

/**
 * Interface for batch event metadata
 */
export interface BatchMetadata {
  /** Batch identifier */
  batchId: string;
  /** Timestamp of batch creation */
  timestamp: Date;
  /** Number of events in batch */
  eventCount: number;
  /** Processing metrics */
  metrics: Record<string, number>;
}

/**
 * Type for flexible event property storage with runtime validation
 */
export type EventProperties = Record<string, unknown>;

/**
 * Type for batch event payloads with metadata
 */
export type BatchPayload = {
  events: TrackingEvent[];
  metadata: BatchMetadata;
};

/**
 * Type for custom validation rules
 */
export type ValidationRules = Record<string, (value: unknown) => boolean>;

/**
 * Type for error handler callback function
 */
export type ErrorHandler = (error: Error, event: TrackingEvent) => void;

/**
 * Type for tracking configuration validation
 */
export type ConfigValidation = (config: Partial<TrackingConfig>) => boolean;

/**
 * Type for event processor callback
 */
export type EventProcessor = (event: TrackingEvent) => Promise<void>;

/**
 * Type for batch processor callback
 */
export type BatchProcessor = (batch: BatchPayload) => Promise<void>;