/**
 * @fileoverview TypeScript type definitions and interfaces for frontend analytics data structures
 * @version 1.0.0
 */

// External imports
import { Record } from 'typescript'; // v4.9.0

// Internal imports
import { BaseEntity, TimeRange } from './common.types';
import { AttributionModel } from './attribution.types';

/**
 * Enum for supported analytics metrics
 */
export enum AnalyticsMetric {
  CONVERSION_RATE = 'CONVERSION_RATE',
  REVENUE = 'REVENUE',
  TOUCHPOINTS = 'TOUCHPOINTS',
  ATTRIBUTION_WEIGHT = 'ATTRIBUTION_WEIGHT',
  AVERAGE_ORDER_VALUE = 'AVERAGE_ORDER_VALUE',
  CUSTOMER_LIFETIME_VALUE = 'CUSTOMER_LIFETIME_VALUE',
  RETURN_ON_INVESTMENT = 'RETURN_ON_INVESTMENT',
  COST_PER_ACQUISITION = 'COST_PER_ACQUISITION'
}

/**
 * Enum for supported chart visualization types
 */
export enum ChartType {
  BAR = 'BAR',
  LINE = 'LINE',
  PIE = 'PIE',
  FUNNEL = 'FUNNEL',
  SANKEY = 'SANKEY',
  HEATMAP = 'HEATMAP',
  SCATTER = 'SCATTER',
  RADAR = 'RADAR'
}

/**
 * Interface for channel performance metrics
 */
export interface ChannelPerformance extends BaseEntity {
  channelId: string;
  channelName: string;
  metrics: Record<AnalyticsMetric, number>;
  trend: number;
  attributionWeight: number;
  conversionRate: number;
  revenueContribution: number;
  touchpointCount: number;
  averageOrderValue: number;
  costPerAcquisition: number;
}

/**
 * Interface for analytics filtering options
 */
export interface AnalyticsFilter {
  timeRange: TimeRange;
  channels: string[];
  metrics: AnalyticsMetric[];
  model: AttributionModel;
  customFilters: Record<string, unknown>;
  excludeIncomplete: boolean;
  minConversions: number;
  minRevenue: number;
  tags: string[];
  segments: string[];
}

/**
 * Interface for chart visualization settings
 */
export interface ChartConfiguration {
  type: ChartType;
  data: ChartData[];
  options: ChartOptions;
  title: string;
  interactive: boolean;
  eventHandlers: Record<string, unknown>;
  colorScheme: Record<string, string>;
  animations: boolean;
  legend: {
    position: 'top' | 'bottom' | 'left' | 'right';
    visible: boolean;
  };
  tooltip: {
    enabled: boolean;
    format: string;
  };
}

/**
 * Interface for chart data points
 */
export interface ChartData {
  label: string;
  value: MetricValue;
  color: string;
  metadata: Record<string, unknown>;
  highlighted: boolean;
  interactionState: Record<string, unknown>;
  tags: string[];
  trend?: number;
  benchmark?: number;
  confidence?: number;
}

/**
 * Interface for analytics dashboard data
 */
export interface AnalyticsDashboard extends BaseEntity {
  timeRange: TimeRange;
  channels: ChannelPerformance[];
  totalRevenue: number;
  totalConversions: number;
  selectedModel: AttributionModel;
  filters: AnalyticsFilter;
  visualizations: ChartConfiguration[];
  metrics: Record<AnalyticsMetric, number>;
  segments: Record<string, number>;
  comparisonPeriod?: TimeRange;
  lastUpdated: Date;
  refreshInterval: number;
}

/**
 * Type for metric value types
 */
export type MetricValue = number | string | null;

/**
 * Type for chart configuration options
 */
export type ChartOptions = Record<string, unknown> & {
  animations?: boolean;
  responsive?: boolean;
  maintainAspectRatio?: boolean;
  tooltips?: {
    enabled: boolean;
    mode: 'point' | 'nearest' | 'index' | 'dataset';
    intersect: boolean;
    position: 'average' | 'nearest';
    callbacks?: Record<string, unknown>;
  };
  legend?: {
    display: boolean;
    position: 'top' | 'bottom' | 'left' | 'right';
    align: 'start' | 'center' | 'end';
    labels?: Record<string, unknown>;
  };
  scales?: {
    xAxes: Record<string, unknown>[];
    yAxes: Record<string, unknown>[];
  };
};

/**
 * Interface for analytics report configuration
 */
export interface ReportConfiguration extends BaseEntity {
  name: string;
  description: string;
  metrics: AnalyticsMetric[];
  filters: AnalyticsFilter;
  visualizations: ChartConfiguration[];
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    recipients: string[];
    format: 'pdf' | 'csv' | 'excel';
  };
  lastGenerated?: Date;
  isTemplate: boolean;
}

/**
 * Interface for analytics comparison data
 */
export interface AnalyticsComparison {
  metric: AnalyticsMetric;
  currentValue: number;
  previousValue: number;
  percentageChange: number;
  trend: 'up' | 'down' | 'stable';
  significance?: number;
  context?: Record<string, unknown>;
}