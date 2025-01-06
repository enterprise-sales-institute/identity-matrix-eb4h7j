/**
 * @fileoverview TypeScript type definitions and interfaces for attribution data structures
 * @version 1.0.0
 */

// External imports
import { Record } from 'typescript'; // v4.9.0

// Internal imports
import { BaseEntity, ValidationError } from './common.types';
import { AttributionModelType } from './model.types';

/**
 * Enhanced enumeration of marketing channels with granular categorization
 */
export enum Channel {
  SOCIAL_ORGANIC = 'SOCIAL_ORGANIC',
  SOCIAL_PAID = 'SOCIAL_PAID',
  EMAIL_MARKETING = 'EMAIL_MARKETING',
  EMAIL_TRANSACTIONAL = 'EMAIL_TRANSACTIONAL',
  PAID_SEARCH = 'PAID_SEARCH',
  ORGANIC_SEARCH = 'ORGANIC_SEARCH',
  DIRECT = 'DIRECT',
  REFERRAL = 'REFERRAL',
  DISPLAY = 'DISPLAY',
  VIDEO = 'VIDEO',
  AFFILIATE = 'AFFILIATE',
  CONTENT_SYNDICATION = 'CONTENT_SYNDICATION'
}

/**
 * Interface for touchpoint validation rules and metadata
 */
export interface TouchpointValidation {
  ruleId: string;
  ruleName: string;
  isValid: boolean;
  errors: ValidationError[];
  validatedAt: Date;
}

/**
 * Enhanced interface for marketing touchpoint data with validation and metadata
 */
export interface Touchpoint extends BaseEntity {
  channel: Channel;
  timestamp: Date;
  value: number;
  campaignId: string;
  sourceDetails: Record<string, unknown>;
  metadata: Record<string, unknown>;
  validationErrors: ValidationError[];
}

/**
 * Interface for detailed attribution metrics
 */
export interface AttributionMetrics {
  contributionScore: number;
  timeToConversion: number;
  pathPosition: number;
  customMetrics: Record<string, number>;
}

/**
 * Enhanced interface for attribution calculation results with validation
 */
export interface AttributionResult extends BaseEntity {
  touchpointId: string;
  conversionId: string;
  weight: number;
  model: AttributionModelType;
  calculatedAt: Date;
  validationStatus: string;
  confidenceScore: number;
  lastValidatedAt: Date;
}

/**
 * Type for predefined attribution window periods
 */
export type AttributionPeriod = '7d' | '30d' | '90d' | 'custom';

/**
 * Type for channel weight assignments in attribution models
 */
export type ChannelWeights = Record<Channel, number>;

/**
 * Type for attribution model configuration validation
 */
export type ModelValidationResult = {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  lastValidated: Date;
};

/**
 * Type for touchpoint sequence in customer journey
 */
export type TouchpointSequence = {
  touchpoints: Touchpoint[];
  totalValue: number;
  conversionStatus: boolean;
  sequenceMetrics: AttributionMetrics;
};

/**
 * Type for attribution model performance metrics
 */
export type ModelPerformanceMetrics = {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  customMetrics: Record<string, number>;
};