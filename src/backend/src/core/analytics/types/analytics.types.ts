/**
 * Type definitions and interfaces for analytics data structures, metrics, and reporting models
 * Provides comprehensive typing for the attribution analytics system with strict validation
 * @version 1.0.0
 */

import { TimeRange } from '../../../types/common.types';
import { Event } from '../../events/types/event.types';
import { Record } from 'typescript'; // v4.9.0

/**
 * Enumeration of core analytics metrics
 */
export enum AnalyticsMetric {
  CONVERSION_RATE = 'CONVERSION_RATE',
  REVENUE = 'REVENUE',
  TOUCHPOINTS = 'TOUCHPOINTS',
  ATTRIBUTION_WEIGHT = 'ATTRIBUTION_WEIGHT'
}

/**
 * Enumeration of analytics dimensions for data aggregation
 */
export enum AnalyticsDimension {
  CHANNEL = 'CHANNEL',
  CAMPAIGN = 'CAMPAIGN',
  TIME = 'TIME',
  SOURCE = 'SOURCE'
}

/**
 * Type definition for supported aggregation operations
 */
export type AggregationType = 'SUM' | 'AVG' | 'MIN' | 'MAX' | 'COUNT';

/**
 * Type definition for metric values with strict typing
 */
export type MetricValue = number | string | boolean | null;

/**
 * Interface for channel-specific analytics metrics
 */
export interface ChannelMetrics {
  readonly channelId: string;
  readonly channelName: string;
  readonly conversionRate: number;
  readonly revenue: number;
  readonly touchpoints: number;
  readonly attributionWeight: number;
  readonly customMetrics: Record<string, MetricValue>;
  readonly metadata: Record<string, unknown>;
}

/**
 * Interface for analytics data aggregation configuration
 */
export interface AnalyticsAggregation {
  readonly dimension: AnalyticsDimension;
  readonly metric: AnalyticsMetric;
  readonly type: AggregationType;
  readonly parameters: Record<string, unknown>;
  readonly includeSubdimensions: boolean;
}

/**
 * Interface for comprehensive analytics report data
 */
export interface AnalyticsReport {
  readonly timeRange: TimeRange;
  readonly channelMetrics: ChannelMetrics[];
  readonly totals: Record<AnalyticsMetric, number>;
  readonly metadata: Record<string, unknown>;
  readonly aggregations: AnalyticsAggregation[];
  readonly customMetrics: Record<string, MetricValue>;
}

/**
 * Type guard to validate ChannelMetrics structure
 */
export function isChannelMetrics(value: unknown): value is ChannelMetrics {
  return (
    typeof value === 'object' &&
    value !== null &&
    'channelId' in value &&
    'channelName' in value &&
    'conversionRate' in value &&
    'revenue' in value &&
    'touchpoints' in value &&
    'attributionWeight' in value &&
    'customMetrics' in value &&
    'metadata' in value &&
    typeof (value as ChannelMetrics).channelId === 'string' &&
    typeof (value as ChannelMetrics).channelName === 'string' &&
    typeof (value as ChannelMetrics).conversionRate === 'number' &&
    typeof (value as ChannelMetrics).revenue === 'number' &&
    typeof (value as ChannelMetrics).touchpoints === 'number' &&
    typeof (value as ChannelMetrics).attributionWeight === 'number'
  );
}

/**
 * Type guard to validate AnalyticsReport structure
 */
export function isAnalyticsReport(value: unknown): value is AnalyticsReport {
  return (
    typeof value === 'object' &&
    value !== null &&
    'timeRange' in value &&
    'channelMetrics' in value &&
    'totals' in value &&
    'metadata' in value &&
    'aggregations' in value &&
    'customMetrics' in value &&
    Array.isArray((value as AnalyticsReport).channelMetrics) &&
    (value as AnalyticsReport).channelMetrics.every(isChannelMetrics)
  );
}

/**
 * Type guard to validate AnalyticsAggregation structure
 */
export function isAnalyticsAggregation(value: unknown): value is AnalyticsAggregation {
  return (
    typeof value === 'object' &&
    value !== null &&
    'dimension' in value &&
    'metric' in value &&
    'type' in value &&
    'parameters' in value &&
    'includeSubdimensions' in value &&
    (value as AnalyticsAggregation).dimension in AnalyticsDimension &&
    (value as AnalyticsAggregation).metric in AnalyticsMetric &&
    typeof (value as AnalyticsAggregation).type === 'string' &&
    typeof (value as AnalyticsAggregation).includeSubdimensions === 'boolean'
  );
}