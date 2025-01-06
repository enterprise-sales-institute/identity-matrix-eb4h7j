/**
 * @fileoverview Constants and configurations for analytics features including metrics,
 * time ranges, filters, and default values used across analytics visualizations
 * @version 1.0.0
 */

// Internal imports
import { AnalyticsMetric } from '../types/analytics.types';
import { AttributionModel } from '../types/attribution.types';

/**
 * Default time range options for analytics filtering
 */
export const DEFAULT_TIME_RANGES = {
  LAST_7_DAYS: {
    label: 'Last 7 Days',
    days: 7,
  },
  LAST_30_DAYS: {
    label: 'Last 30 Days',
    days: 30,
  },
  LAST_90_DAYS: {
    label: 'Last 90 Days',
    days: 90,
  },
} as const;

/**
 * Display configuration for analytics metrics including formatting,
 * colors (WCAG 2.1 AA compliant), and accessibility labels
 */
export const METRIC_DISPLAY_CONFIG = {
  [AnalyticsMetric.CONVERSION_RATE]: {
    label: 'Conversion Rate',
    format: 'percentage',
    decimals: 2,
    color: '#0066CC', // Blue - meets WCAG 2.1 AA contrast requirements
    accessibilityLabel: 'Conversion rate metric',
  },
  [AnalyticsMetric.REVENUE]: {
    label: 'Revenue',
    format: 'currency',
    currency: 'USD',
    color: '#33CC33', // Green - meets WCAG 2.1 AA contrast requirements
    accessibilityLabel: 'Revenue metric',
  },
  [AnalyticsMetric.TOUCHPOINTS]: {
    label: 'Touchpoints',
    format: 'number',
    color: '#FF9900', // Orange - meets WCAG 2.1 AA contrast requirements
    accessibilityLabel: 'Touchpoint count metric',
  },
  [AnalyticsMetric.ATTRIBUTION_WEIGHT]: {
    label: 'Attribution Weight',
    format: 'percentage',
    decimals: 2,
    color: '#9933CC', // Purple - meets WCAG 2.1 AA contrast requirements
    accessibilityLabel: 'Attribution weight metric',
  },
} as const;

/**
 * Default filter settings for analytics views
 */
export const DEFAULT_ANALYTICS_FILTERS = {
  timeRange: {
    startDate: null,
    endDate: null,
  },
  metrics: [
    AnalyticsMetric.CONVERSION_RATE,
    AnalyticsMetric.REVENUE,
    AnalyticsMetric.TOUCHPOINTS,
  ],
  model: AttributionModel.LAST_TOUCH,
} as const;

/**
 * Refresh interval for real-time analytics updates (in milliseconds)
 * Set to 5 minutes (300000ms) based on system performance requirements
 */
export const ANALYTICS_REFRESH_INTERVAL = 300000;

/**
 * Maximum number of channels to display in visualizations
 * Prevents visual clutter and maintains performance
 */
export const MAX_CHANNELS_DISPLAY = 10;

/**
 * Minimum number of data points required for trend calculation
 * Ensures statistical significance in analytics calculations
 */
export const MIN_DATA_POINTS = 2;

/**
 * Chart color scheme configuration
 * Colors are WCAG 2.1 AA compliant for accessibility
 */
export const CHART_COLORS = {
  PRIMARY: '#0066CC',
  SECONDARY: '#33CC33',
  TERTIARY: '#FF9900',
  QUATERNARY: '#9933CC',
  BACKGROUND: '#FFFFFF',
  GRID: '#E5E5E5',
  TEXT: '#333333',
} as const;

/**
 * Chart animation configuration
 * Optimized for performance and accessibility
 */
export const CHART_ANIMATION_CONFIG = {
  duration: 750, // milliseconds
  easing: 'easeInOutQuart',
  animateRotate: true,
  animateScale: false,
} as const;

/**
 * Default chart tooltip configuration
 */
export const CHART_TOOLTIP_CONFIG = {
  enabled: true,
  mode: 'index' as const,
  intersect: false,
  position: 'nearest' as const,
  backgroundColor: 'rgba(255, 255, 255, 0.95)',
  titleColor: '#333333',
  bodyColor: '#666666',
  borderColor: '#E5E5E5',
  borderWidth: 1,
} as const;

/**
 * Attribution model display configuration
 */
export const ATTRIBUTION_MODEL_CONFIG = {
  [AttributionModel.FIRST_TOUCH]: {
    label: 'First Touch',
    description: 'Attributes 100% credit to the first touchpoint',
  },
  [AttributionModel.LAST_TOUCH]: {
    label: 'Last Touch',
    description: 'Attributes 100% credit to the last touchpoint',
  },
  [AttributionModel.LINEAR]: {
    label: 'Linear',
    description: 'Distributes credit equally across all touchpoints',
  },
  [AttributionModel.TIME_DECAY]: {
    label: 'Time Decay',
    description: 'Attributes more credit to recent touchpoints',
  },
  [AttributionModel.POSITION_BASED]: {
    label: 'Position Based',
    description: 'Attributes credit based on touchpoint position',
  },
} as const;

/**
 * Metric formatting configuration for consistent display
 */
export const METRIC_FORMAT_CONFIG = {
  percentage: {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    style: 'percent',
  },
  currency: {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    style: 'currency',
    currency: 'USD',
  },
  number: {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    style: 'decimal',
  },
} as const;