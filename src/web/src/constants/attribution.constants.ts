/**
 * @fileoverview Constants and configuration values for attribution modeling and analysis
 * @version 1.0.0
 */

// Internal imports
import { AttributionModel } from '../types/model.types';
import { Channel } from '../types/attribution.types';

/**
 * Default attribution window in days
 */
export const DEFAULT_ATTRIBUTION_WINDOW = 30;

/**
 * Predefined attribution window periods in days
 */
export const ATTRIBUTION_PERIODS: Readonly<Record<string, number>> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
} as const;

/**
 * Default weight distribution for marketing channels
 * Total weights must sum to 1 (100%)
 */
export const DEFAULT_CHANNEL_WEIGHTS: Readonly<Record<Channel, number>> = {
  [Channel.SOCIAL_ORGANIC]: 0.15,
  [Channel.SOCIAL_PAID]: 0.15,
  [Channel.EMAIL_MARKETING]: 0.15,
  [Channel.EMAIL_TRANSACTIONAL]: 0.05,
  [Channel.PAID_SEARCH]: 0.15,
  [Channel.ORGANIC_SEARCH]: 0.10,
  [Channel.DIRECT]: 0.05,
  [Channel.REFERRAL]: 0.05,
  [Channel.DISPLAY]: 0.05,
  [Channel.VIDEO]: 0.05,
  [Channel.AFFILIATE]: 0.03,
  [Channel.CONTENT_SYNDICATION]: 0.02,
} as const;

/**
 * Human-readable labels for attribution models
 */
export const MODEL_LABELS: Readonly<Record<AttributionModel, string>> = {
  [AttributionModel.FIRST_TOUCH]: 'First Touch',
  [AttributionModel.LAST_TOUCH]: 'Last Touch',
  [AttributionModel.LINEAR]: 'Linear',
  [AttributionModel.TIME_DECAY]: 'Time Decay',
  [AttributionModel.POSITION_BASED]: 'Position Based',
} as const;

/**
 * Human-readable labels for marketing channels
 */
export const CHANNEL_LABELS: Readonly<Record<Channel, string>> = {
  [Channel.SOCIAL_ORGANIC]: 'Organic Social Media',
  [Channel.SOCIAL_PAID]: 'Paid Social Media',
  [Channel.EMAIL_MARKETING]: 'Marketing Email',
  [Channel.EMAIL_TRANSACTIONAL]: 'Transactional Email',
  [Channel.PAID_SEARCH]: 'Paid Search',
  [Channel.ORGANIC_SEARCH]: 'Organic Search',
  [Channel.DIRECT]: 'Direct Traffic',
  [Channel.REFERRAL]: 'Referral',
  [Channel.DISPLAY]: 'Display Ads',
  [Channel.VIDEO]: 'Video Ads',
  [Channel.AFFILIATE]: 'Affiliate',
  [Channel.CONTENT_SYNDICATION]: 'Content Syndication',
} as const;

/**
 * Default half-life period in days for time decay attribution model
 */
export const DEFAULT_DECAY_HALF_LIFE = 7;

/**
 * Validation constraints for attribution window
 */
export const MIN_ATTRIBUTION_WINDOW = 1;
export const MAX_ATTRIBUTION_WINDOW = 365;

/**
 * Validation constraints for channel weights
 */
export const MIN_CHANNEL_WEIGHT = 0;
export const MAX_CHANNEL_WEIGHT = 1;
export const TOTAL_WEIGHT_SUM = 1;

/**
 * Validation constraints for time decay model
 */
export const MIN_DECAY_HALF_LIFE = 1;
export const MAX_DECAY_HALF_LIFE = 30;