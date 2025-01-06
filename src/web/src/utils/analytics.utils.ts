/**
 * @fileoverview Utility functions for analytics data processing, formatting, and transformation
 * with enhanced performance optimizations and caching support
 * @version 1.0.0
 */

// External imports
import { format } from 'date-fns'; // v2.30.0
import numeral from 'numeral'; // v2.0.6
import memoizee from 'memoizee'; // v0.4.15

// Internal imports
import { AnalyticsMetric } from '../types/analytics.types';
import { METRIC_DISPLAY_CONFIG } from '../constants/analytics.constants';

// Cache configuration
const CACHE_CONFIG = {
  metricValueTTL: 300000, // 5 minutes
  aggregationTTL: 60000,  // 1 minute
  maxCacheSize: 1000
} as const;

// Performance monitoring thresholds
const PERFORMANCE_THRESHOLDS = {
  aggregationWarning: 100, // ms
  aggregationError: 500    // ms
} as const;

/**
 * Formats a metric value based on its type and display configuration
 * @param value - The numeric value to format
 * @param metricType - The type of metric (from AnalyticsMetric enum)
 * @param options - Optional formatting options
 * @returns Formatted string value according to metric configuration
 * @throws {Error} If invalid metric type or value provided
 */
export const formatMetricValue = memoizee(
  (
    value: number,
    metricType: AnalyticsMetric,
    options: { locale?: string; currency?: string } = {}
  ): string => {
    // Input validation
    if (value === null || value === undefined || isNaN(value)) {
      return '-';
    }

    if (!Object.values(AnalyticsMetric).includes(metricType)) {
      throw new Error(`Invalid metric type: ${metricType}`);
    }

    const config = METRIC_DISPLAY_CONFIG[metricType];
    if (!config) {
      throw new Error(`No display configuration found for metric: ${metricType}`);
    }

    try {
      switch (config.format) {
        case 'percentage':
          return numeral(value).format(`0.${'0'.repeat(config.decimals)}%`);

        case 'currency':
          return numeral(value).format(`$0,0.${'0'.repeat(config.decimals)}`);

        case 'number':
          return numeral(value).format(`0,0.${'0'.repeat(config.decimals)}`);

        default:
          return value.toString();
      }
    } catch (error) {
      console.error('Error formatting metric value:', error);
      return '-';
    }
  },
  {
    maxAge: CACHE_CONFIG.metricValueTTL,
    max: CACHE_CONFIG.maxCacheSize,
    primitive: true
  }
);

/**
 * Calculates percentage change between two values with error handling
 * @param currentValue - Current metric value
 * @param previousValue - Previous metric value
 * @returns Percentage change as a decimal number
 */
export const calculatePercentageChange = (
  currentValue: number,
  previousValue: number
): number => {
  // Input validation
  if (
    currentValue === null ||
    previousValue === null ||
    isNaN(currentValue) ||
    isNaN(previousValue)
  ) {
    return 0;
  }

  // Handle division by zero
  if (previousValue === 0) {
    return currentValue > 0 ? 1 : 0;
  }

  return (currentValue - previousValue) / previousValue;
};

/**
 * Aggregates metrics across multiple data points with performance optimization
 * @param dataPoints - Array of data points containing metric values
 * @param metricType - Type of metric to aggregate
 * @param options - Optional aggregation options
 * @returns Aggregated metric value
 */
export const aggregateMetrics = memoizee(
  (
    dataPoints: Array<{ value: number; weight?: number }>,
    metricType: AnalyticsMetric,
    options: {
      weighted?: boolean;
      excludeZeros?: boolean;
      minValue?: number;
    } = {}
  ): number => {
    const startTime = performance.now();

    // Input validation
    if (!Array.isArray(dataPoints) || dataPoints.length === 0) {
      return 0;
    }

    try {
      // Filter invalid values and apply minimum threshold
      const validPoints = dataPoints.filter(point => {
        const isValid = !isNaN(point.value) && point.value !== null;
        const meetsThreshold = !options.minValue || point.value >= options.minValue;
        const includeZero = !options.excludeZeros || point.value !== 0;
        return isValid && meetsThreshold && includeZero;
      });

      if (validPoints.length === 0) {
        return 0;
      }

      // Perform weighted or standard aggregation
      if (options.weighted) {
        const totalWeight = validPoints.reduce((sum, point) => sum + (point.weight || 1), 0);
        const weightedSum = validPoints.reduce(
          (sum, point) => sum + point.value * (point.weight || 1),
          0
        );
        return totalWeight > 0 ? weightedSum / totalWeight : 0;
      } else {
        const sum = validPoints.reduce((acc, point) => acc + point.value, 0);
        
        switch (metricType) {
          case AnalyticsMetric.CONVERSION_RATE:
          case AnalyticsMetric.ATTRIBUTION_WEIGHT:
            return sum / validPoints.length; // Average for rates
          
          case AnalyticsMetric.REVENUE:
          case AnalyticsMetric.TOUCHPOINTS:
            return sum; // Sum for cumulative metrics
            
          default:
            return sum;
        }
      }
    } catch (error) {
      console.error('Error aggregating metrics:', error);
      return 0;
    } finally {
      const duration = performance.now() - startTime;
      if (duration > PERFORMANCE_THRESHOLDS.aggregationError) {
        console.error(`Metric aggregation performance error: ${duration}ms`);
      } else if (duration > PERFORMANCE_THRESHOLDS.aggregationWarning) {
        console.warn(`Metric aggregation performance warning: ${duration}ms`);
      }
    }
  },
  {
    maxAge: CACHE_CONFIG.aggregationTTL,
    max: CACHE_CONFIG.maxCacheSize,
    primitive: true
  }
);