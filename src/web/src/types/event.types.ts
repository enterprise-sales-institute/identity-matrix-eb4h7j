/**
 * @fileoverview Core TypeScript type definitions and interfaces for the frontend event tracking system
 * @version 1.0.0
 */

// External imports
import { Record } from 'typescript'; // v4.9.0

// Internal imports
import { BaseEntity } from './common.types';

/**
 * Enumeration of all supported event types in the tracking system
 */
export enum EventType {
  PAGE_VIEW = 'PAGE_VIEW',
  CLICK = 'CLICK',
  FORM_SUBMISSION = 'FORM_SUBMISSION',
  SCROLL = 'SCROLL',
  UTM_CAPTURE = 'UTM_CAPTURE',
  REFERRER_CAPTURE = 'REFERRER_CAPTURE',
  CONVERSION = 'CONVERSION',
  CUSTOM = 'CUSTOM'
}

/**
 * Enumeration of event processing statuses
 */
export enum EventStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
  VALIDATED = 'VALIDATED',
  INVALID = 'INVALID'
}

/**
 * Interface defining UTM tracking parameters structure
 */
export interface UTMParameters {
  source: string;
  medium: string;
  campaign: string;
  term?: string;
  content?: string;
}

/**
 * Interface defining referrer tracking data structure
 */
export interface ReferrerData {
  url: string;
  domain: string;
  parameters?: string;
  timestamp: Date;
}

/**
 * Type definition for flexible event property storage
 */
export type EventProperties = Record<string, unknown>;

/**
 * Type definition for event filtering criteria
 */
export type EventFilter = Partial<Record<keyof Event, unknown>>;

/**
 * Comprehensive interface for tracked user events
 * Extends BaseEntity to inherit common fields like id and createdAt
 */
export interface Event extends BaseEntity {
  visitorId: string;
  sessionId: string;
  type: EventType;
  timestamp: Date;
  status: EventStatus;
  properties: EventProperties;
  utmParams: UTMParameters;
  referrerData: ReferrerData;
  metadata: Record<string, unknown>;
}