/**
 * @fileoverview TypeScript type definitions and interfaces for attribution model configuration and management
 * @version 1.0.0
 */

// External imports
import { Record } from 'typescript'; // v4.9.0

// Internal imports
import { BaseEntity, TimeRange } from './common.types';

/**
 * Enumeration of supported attribution models
 */
export enum AttributionModel {
  FIRST_TOUCH = 'FIRST_TOUCH',
  LAST_TOUCH = 'LAST_TOUCH',
  LINEAR = 'LINEAR',
  POSITION_BASED = 'POSITION_BASED',
  TIME_DECAY = 'TIME_DECAY',
  CUSTOM = 'CUSTOM'
}

/**
 * Enumeration of marketing channels
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
  AFFILIATE = 'AFFILIATE',
  VIDEO = 'VIDEO',
  CONTENT_SYNDICATION = 'CONTENT_SYNDICATION'
}

/**
 * Enumeration of model configuration statuses
 */
export enum ModelStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
  VALIDATING = 'VALIDATING',
  ERROR = 'ERROR'
}

/**
 * Type for channel weight assignments in attribution models
 */
export type ModelWeights = Record<Channel, number>;

/**
 * Type for predefined attribution window periods
 */
export type AttributionPeriod = '7d' | '30d' | '90d' | 'custom';

/**
 * Type for custom channel grouping configuration
 */
export type ChannelGroup = {
  name: string;
  channels: Channel[];
  weight: number;
};

/**
 * Interface for custom model rules configuration
 */
export interface ModelRules {
  applyFirstTouchBonus: boolean;
  includeTimeDecay: boolean;
  decayHalfLife: number;
  customChannelGrouping: boolean;
  channelGroups: ChannelGroup[];
  customWeights: Record<string, number>;
}

/**
 * Interface for model validation rules
 */
export interface ValidationRules {
  minChannelWeight: number;
  maxChannelWeight: number;
  totalWeightSum: number;
  minDecayHalfLife: number;
  maxDecayHalfLife: number;
}

/**
 * Interface for attribution model configuration
 * Extends BaseEntity for common fields like id, createdAt, updatedAt
 */
export interface ModelConfiguration extends BaseEntity {
  model: AttributionModel;
  name: string;
  channelWeights: ModelWeights;
  attributionWindow: TimeRange;
  customRules: ModelRules;
  status: ModelStatus;
  validationRules: ValidationRules;
}