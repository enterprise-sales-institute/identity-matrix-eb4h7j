/**
 * Type definitions and interfaces for the attribution modeling system
 * Defines comprehensive data structures for attribution models, touchpoints,
 * and attribution results with enhanced validation and metadata support
 * @version 1.0.0
 */

import { TimeRange } from '../../../types/common.types';
import { Event } from '../../events/types/event.types';
import { Record } from 'typescript'; // v4.9.0

/**
 * Enumeration of supported attribution models
 */
export enum AttributionModel {
  FIRST_TOUCH = 'FIRST_TOUCH',
  LAST_TOUCH = 'LAST_TOUCH',
  LINEAR = 'LINEAR',
  POSITION_BASED = 'POSITION_BASED',
  TIME_DECAY = 'TIME_DECAY'
}

/**
 * Enumeration of marketing channels
 */
export enum Channel {
  SOCIAL = 'SOCIAL',
  EMAIL = 'EMAIL',
  PAID_SEARCH = 'PAID_SEARCH',
  ORGANIC_SEARCH = 'ORGANIC_SEARCH',
  DIRECT = 'DIRECT',
  REFERRAL = 'REFERRAL',
  DISPLAY = 'DISPLAY',
  AFFILIATE = 'AFFILIATE',
  VIDEO = 'VIDEO',
  CONTENT_SYNDICATION = 'CONTENT_SYNDICATION'
}

/**
 * Enumeration of validation states for attribution results
 */
export enum ValidationStatus {
  VALID = 'VALID',
  PARTIAL = 'PARTIAL',
  INVALID = 'INVALID',
  PENDING_VALIDATION = 'PENDING_VALIDATION'
}

/**
 * Type for immutable channel weight assignments
 */
export type ModelWeights = Readonly<Record<string, number>>;

/**
 * Type for predefined attribution window periods
 */
export type AttributionPeriod = '7d' | '30d' | '90d' | 'custom';

/**
 * Type for attribution configuration validation constraints
 */
export type ValidationConfig = {
  readonly minWeight: number;
  readonly maxWeight: number;
  readonly requiredChannels: readonly string[];
};

/**
 * Type for attribution calculation metadata
 */
export type CalculationMetadata = {
  readonly version: string;
  readonly parameters: Readonly<Record<string, unknown>>;
  readonly timestamp: Date;
};

/**
 * Interface for touchpoint metadata
 */
export interface TouchpointMetadata {
  readonly source: string;
  readonly campaign?: string;
  readonly medium?: string;
  readonly content?: string;
  readonly term?: string;
  readonly position: number;
  readonly isFirstTouch: boolean;
  readonly isLastTouch: boolean;
}

/**
 * Interface for marketing touchpoint data
 */
export interface Touchpoint {
  readonly id: string;
  readonly event: Event;
  readonly channel: string;
  readonly timestamp: Date;
  readonly value: number;
  readonly metadata: TouchpointMetadata;
}

/**
 * Interface for journey interaction metrics
 */
export interface InteractionMetrics {
  readonly touchpointCount: number;
  readonly averageTimeGap: number;
  readonly totalDuration: number;
  readonly channelDiversity: number;
}

/**
 * Interface for journey metadata
 */
export interface JourneyMetadata {
  readonly startDate: Date;
  readonly endDate: Date;
  readonly firstChannel: Channel;
  readonly lastChannel: Channel;
  readonly conversionPath: readonly Channel[];
}

/**
 * Interface for custom period configuration
 */
export interface CustomPeriodConfig {
  readonly startDate: Date;
  readonly endDate: Date;
  readonly customWeights?: ModelWeights;
}

/**
 * Interface for attribution model configuration
 */
export interface AttributionConfig {
  readonly model: AttributionModel;
  readonly attributionWindow: TimeRange;
  readonly channelWeights: Record<string, number>;
  readonly includeTimeDecay: boolean;
  readonly decayHalfLife: number;
  readonly validation: ValidationConfig;
  readonly customPeriod?: CustomPeriodConfig;
}

/**
 * Interface for attribution calculation results
 */
export interface AttributionResult {
  readonly touchpointId: string;
  readonly conversionId: string;
  readonly weight: number;
  readonly model: AttributionModel;
  readonly calculatedAt: Date;
  readonly confidenceScore: number;
  readonly validationStatus: ValidationStatus;
  readonly metadata: CalculationMetadata;
}

/**
 * Interface for customer journey touchpoint sequence
 */
export interface TouchpointJourney {
  readonly visitorId: string;
  readonly touchpoints: readonly Touchpoint[];
  readonly converted: boolean;
  readonly conversionValue: number;
  readonly metadata: JourneyMetadata;
  readonly metrics: InteractionMetrics;
  readonly validation: ValidationResult;
}

/**
 * Type guard for validating Touchpoint structure
 */
export function isTouchpoint(value: unknown): value is Touchpoint {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'event' in value &&
    'channel' in value &&
    'timestamp' in value &&
    'value' in value &&
    'metadata' in value &&
    typeof (value as Touchpoint).id === 'string' &&
    typeof (value as Touchpoint).channel === 'string' &&
    (value as Touchpoint).timestamp instanceof Date &&
    typeof (value as Touchpoint).value === 'number'
  );
}

/**
 * Type guard for validating AttributionResult structure
 */
export function isAttributionResult(value: unknown): value is AttributionResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'touchpointId' in value &&
    'conversionId' in value &&
    'weight' in value &&
    'model' in value &&
    'calculatedAt' in value &&
    'confidenceScore' in value &&
    'validationStatus' in value &&
    'metadata' in value &&
    typeof (value as AttributionResult).touchpointId === 'string' &&
    typeof (value as AttributionResult).conversionId === 'string' &&
    typeof (value as AttributionResult).weight === 'number' &&
    (value as AttributionResult).model in AttributionModel &&
    (value as AttributionResult).calculatedAt instanceof Date &&
    typeof (value as AttributionResult).confidenceScore === 'number' &&
    (value as AttributionResult).validationStatus in ValidationStatus
  );
}