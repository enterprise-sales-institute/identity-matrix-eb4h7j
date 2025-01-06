import { Injectable } from '@nestjs/common'; // v9.0.0
import { Registry, Counter, Gauge, Histogram } from 'prom-client'; // v14.2.0
import { LoggerService } from '../logger/logger.service';
import { ApiResponse } from '../../types/common.types';

// Constants for metric configuration
const DEFAULT_BUCKETS = [0.1, 0.5, 1, 2, 5, 10, 20, 60];
const METRIC_PREFIX = 'attribution_';
const SYSTEM_METRICS = {
  HTTP_DURATION: 'http_request_duration_seconds',
  HTTP_REQUESTS: 'http_requests_total',
  EVENT_PROCESSING: 'event_processing_duration_seconds',
  ATTRIBUTION_CALCULATION: 'attribution_calculation_duration_seconds',
  ACTIVE_USERS: 'active_users_total',
  CONVERSION_RATE: 'conversion_rate_percent',
  REVENUE: 'revenue_total',
  SYSTEM_UPTIME: 'system_uptime_seconds',
  MEMORY_USAGE: 'memory_usage_bytes',
  CPU_USAGE: 'cpu_usage_percent'
} as const;

@Injectable()
export class MetricsService {
  private readonly registry: Registry;
  private readonly counters: Map<string, Counter<string>>;
  private readonly gauges: Map<string, Gauge<string>>;
  private readonly histograms: Map<string, Histogram<string>>;

  constructor(private readonly logger: LoggerService) {
    this.registry = new Registry();
    this.counters = new Map();
    this.gauges = new Map();
    this.histograms = new Map();

    // Initialize default metrics collection
    this.initializeDefaultMetrics();
    this.initializeSystemMetrics();
  }

  /**
   * Initialize default Prometheus metrics collection
   */
  private initializeDefaultMetrics(): void {
    try {
      const defaultMetrics = this.registry.collectDefaultMetrics({
        prefix: METRIC_PREFIX,
        timestamps: true,
        gcDurationBuckets: DEFAULT_BUCKETS
      });

      this.logger.info('Default metrics initialized', {
        service: 'MetricsService',
        requestId: 'system',
        correlationId: 'system',
        additionalContext: { metrics: defaultMetrics }
      });
    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), {
        service: 'MetricsService',
        requestId: 'system',
        correlationId: 'system'
      });
    }
  }

  /**
   * Initialize system-specific metrics
   */
  private initializeSystemMetrics(): void {
    try {
      // HTTP metrics
      this.createHistogram(SYSTEM_METRICS.HTTP_DURATION, 'HTTP request duration in seconds', ['method', 'route', 'status']);
      this.createCounter(SYSTEM_METRICS.HTTP_REQUESTS, 'Total HTTP requests', ['method', 'route', 'status']);

      // Business metrics
      this.createGauge(SYSTEM_METRICS.ACTIVE_USERS, 'Total number of active users', ['timeframe']);
      this.createGauge(SYSTEM_METRICS.CONVERSION_RATE, 'Conversion rate percentage', ['channel']);
      this.createGauge(SYSTEM_METRICS.REVENUE, 'Total revenue', ['channel', 'campaign']);

      // Performance metrics
      this.createHistogram(SYSTEM_METRICS.EVENT_PROCESSING, 'Event processing duration in seconds', ['event_type']);
      this.createHistogram(SYSTEM_METRICS.ATTRIBUTION_CALCULATION, 'Attribution calculation duration in seconds', ['model_type']);
      
      // System metrics
      this.createGauge(SYSTEM_METRICS.SYSTEM_UPTIME, 'System uptime in seconds');
      this.createGauge(SYSTEM_METRICS.MEMORY_USAGE, 'Memory usage in bytes', ['type']);
      this.createGauge(SYSTEM_METRICS.CPU_USAGE, 'CPU usage percentage', ['core']);

      this.logger.info('System metrics initialized', {
        service: 'MetricsService',
        requestId: 'system',
        correlationId: 'system'
      });
    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), {
        service: 'MetricsService',
        requestId: 'system',
        correlationId: 'system'
      });
    }
  }

  /**
   * Create a new counter metric
   */
  private createCounter(name: string, help: string, labelNames: string[] = []): Counter<string> {
    const counter = new Counter({
      name: `${METRIC_PREFIX}${name}`,
      help,
      labelNames,
      registers: [this.registry]
    });
    this.counters.set(name, counter);
    return counter;
  }

  /**
   * Create a new gauge metric
   */
  private createGauge(name: string, help: string, labelNames: string[] = []): Gauge<string> {
    const gauge = new Gauge({
      name: `${METRIC_PREFIX}${name}`,
      help,
      labelNames,
      registers: [this.registry]
    });
    this.gauges.set(name, gauge);
    return gauge;
  }

  /**
   * Create a new histogram metric
   */
  private createHistogram(name: string, help: string, labelNames: string[] = []): Histogram<string> {
    const histogram = new Histogram({
      name: `${METRIC_PREFIX}${name}`,
      help,
      labelNames,
      buckets: DEFAULT_BUCKETS,
      registers: [this.registry]
    });
    this.histograms.set(name, histogram);
    return histogram;
  }

  /**
   * Increment a counter metric
   */
  public incrementCounter(name: string, value: number = 1, labels: Record<string, string> = {}): void {
    try {
      const counter = this.counters.get(name);
      if (!counter) {
        throw new Error(`Counter metric ${name} not found`);
      }
      counter.inc(labels, value);

      this.logger.debug(`Counter ${name} incremented`, {
        service: 'MetricsService',
        requestId: 'system',
        correlationId: 'system',
        additionalContext: { value, labels }
      });
    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), {
        service: 'MetricsService',
        requestId: 'system',
        correlationId: 'system'
      });
    }
  }

  /**
   * Set a gauge metric value
   */
  public setGauge(name: string, value: number, labels: Record<string, string> = {}): void {
    try {
      const gauge = this.gauges.get(name);
      if (!gauge) {
        throw new Error(`Gauge metric ${name} not found`);
      }
      gauge.set(labels, value);

      this.logger.debug(`Gauge ${name} set`, {
        service: 'MetricsService',
        requestId: 'system',
        correlationId: 'system',
        additionalContext: { value, labels }
      });
    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), {
        service: 'MetricsService',
        requestId: 'system',
        correlationId: 'system'
      });
    }
  }

  /**
   * Record a value in a histogram metric
   */
  public recordHistogram(name: string, value: number, labels: Record<string, string> = {}): void {
    try {
      const histogram = this.histograms.get(name);
      if (!histogram) {
        throw new Error(`Histogram metric ${name} not found`);
      }
      histogram.observe(labels, value);

      this.logger.debug(`Histogram ${name} observed`, {
        service: 'MetricsService',
        requestId: 'system',
        correlationId: 'system',
        additionalContext: { value, labels }
      });
    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), {
        service: 'MetricsService',
        requestId: 'system',
        correlationId: 'system'
      });
    }
  }

  /**
   * Get all metrics in Prometheus format
   */
  public async getMetrics(): Promise<ApiResponse<string>> {
    try {
      const metrics = await this.registry.metrics();
      return {
        success: true,
        data: metrics,
        error: null,
        metadata: {
          apiVersion: '1.0',
          timestamp: Date.now(),
          requestId: 'system'
        }
      };
    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), {
        service: 'MetricsService',
        requestId: 'system',
        correlationId: 'system'
      });
      return {
        success: false,
        data: '',
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve metrics',
          details: {},
          timestamp: new Date().toISOString() as any
        },
        metadata: {
          apiVersion: '1.0',
          timestamp: Date.now(),
          requestId: 'system'
        }
      };
    }
  }
}