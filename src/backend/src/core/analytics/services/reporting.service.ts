import { Injectable } from '@nestjs/common'; // v9.0.0
import { Observable, of, throwError } from 'rxjs'; // v7.8.0
import { map, catchError, retry, timeout } from 'rxjs/operators'; // v7.8.0
import { Parser } from 'json2csv'; // v6.0.0
import * as XLSX from 'xlsx'; // v0.18.0
import { Cache } from 'cache-manager'; // v5.0.0
import { AnalyticsService } from './analytics.service';
import { AnalyticsMetric, AnalyticsReport, ChannelMetrics } from '../types/analytics.types';
import { LoggerService } from '../../../lib/logger/logger.service';

// Constants for configuration
const REPORT_CACHE_TTL = 300000; // 5 minutes
const EXPORT_FORMATS = ['csv', 'json', 'xlsx'] as const;
const DEFAULT_REPORT_METRICS = [
  AnalyticsMetric.CONVERSION_RATE,
  AnalyticsMetric.REVENUE,
  AnalyticsMetric.TOUCHPOINTS
];
const BATCH_SIZE = 1000;
const MAX_RETRIES = 3;
const TIMEOUT_MS = 30000;

// Type definitions
type ExportFormat = typeof EXPORT_FORMATS[number];

interface ExportOptions {
  includeMetadata?: boolean;
  batchSize?: number;
  compression?: boolean;
}

interface ReportCacheKey {
  filter: any;
  format?: ExportFormat;
}

@Injectable()
export class ReportingService {
  private readonly csvParser: Parser;
  private readonly logger: LoggerService;

  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly cacheManager: Cache,
    logger: LoggerService
  ) {
    this.logger = logger;
    this.csvParser = new Parser({
      flatten: true,
      defaultValue: '',
    });
  }

  /**
   * Generates analytics report with enhanced error handling and caching
   */
  public generateReport(filter: any): Observable<AnalyticsReport> {
    const cacheKey = this.generateCacheKey({ filter });

    return new Observable<AnalyticsReport>(observer => {
      this.cacheManager.get<AnalyticsReport>(cacheKey)
        .then(cached => {
          if (cached) {
            observer.next(cached);
            observer.complete();
            return;
          }

          this.analyticsService.queryAnalytics(filter)
            .pipe(
              timeout(TIMEOUT_MS),
              retry(MAX_RETRIES),
              map(data => this.processReportData(data)),
              catchError(error => this.handleError(error, 'generate_report'))
            )
            .subscribe({
              next: async (report) => {
                await this.cacheManager.set(cacheKey, report, REPORT_CACHE_TTL);
                observer.next(report);
                observer.complete();
              },
              error: (error) => observer.error(error)
            });
        })
        .catch(error => observer.error(error));
    });
  }

  /**
   * Exports analytics report in specified format with enhanced performance
   */
  public exportReport(
    filter: any,
    format: ExportFormat,
    options: ExportOptions = {}
  ): Observable<Buffer> {
    const cacheKey = this.generateCacheKey({ filter, format });

    return new Observable<Buffer>(observer => {
      this.cacheManager.get<Buffer>(cacheKey)
        .then(cached => {
          if (cached) {
            observer.next(cached);
            observer.complete();
            return;
          }

          this.generateReport(filter)
            .pipe(
              map(report => this.formatReport(report, format, options)),
              catchError(error => this.handleError(error, 'export_report'))
            )
            .subscribe({
              next: async (buffer) => {
                await this.cacheManager.set(cacheKey, buffer, REPORT_CACHE_TTL);
                observer.next(buffer);
                observer.complete();
              },
              error: (error) => observer.error(error)
            });
        })
        .catch(error => observer.error(error));
    });
  }

  /**
   * Processes and validates report data
   */
  private processReportData(data: any): AnalyticsReport {
    return {
      timeRange: data.timeRange,
      channelMetrics: this.processChannelMetrics(data.channelMetrics),
      totals: this.calculateTotals(data.channelMetrics),
      metadata: {
        generatedAt: new Date().toISOString(),
        version: '1.0.0',
        ...data.metadata
      },
      aggregations: data.aggregations || [],
      customMetrics: data.customMetrics || {}
    };
  }

  /**
   * Processes channel metrics with validation
   */
  private processChannelMetrics(metrics: any[]): ChannelMetrics[] {
    return metrics.map(metric => ({
      channelId: metric.channelId,
      channelName: metric.channelName,
      conversionRate: Number(metric.conversionRate) || 0,
      revenue: Number(metric.revenue) || 0,
      touchpoints: Number(metric.touchpoints) || 0,
      attributionWeight: Number(metric.attributionWeight) || 0,
      customMetrics: metric.customMetrics || {},
      metadata: metric.metadata || {}
    }));
  }

  /**
   * Calculates total metrics across all channels
   */
  private calculateTotals(metrics: ChannelMetrics[]): Record<AnalyticsMetric, number> {
    return metrics.reduce((totals, metric) => ({
      ...totals,
      [AnalyticsMetric.REVENUE]: (totals[AnalyticsMetric.REVENUE] || 0) + metric.revenue,
      [AnalyticsMetric.TOUCHPOINTS]: (totals[AnalyticsMetric.TOUCHPOINTS] || 0) + metric.touchpoints,
      [AnalyticsMetric.CONVERSION_RATE]: (totals[AnalyticsMetric.CONVERSION_RATE] || 0) + metric.conversionRate
    }), {} as Record<AnalyticsMetric, number>);
  }

  /**
   * Formats report data into specified export format
   */
  private formatReport(
    report: AnalyticsReport,
    format: ExportFormat,
    options: ExportOptions
  ): Buffer {
    try {
      switch (format) {
        case 'csv':
          return this.formatCSV(report, options);
        case 'xlsx':
          return this.formatXLSX(report, options);
        case 'json':
          return this.formatJSON(report, options);
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      this.logger.error('Failed to format report', {
        service: 'reporting-service',
        requestId: '',
        correlationId: '',
        additionalContext: { format, error }
      });
      throw error;
    }
  }

  /**
   * Formats report as CSV
   */
  private formatCSV(report: AnalyticsReport, options: ExportOptions): Buffer {
    const data = this.flattenReportData(report, options);
    const csv = this.csvParser.parse(data);
    return Buffer.from(csv);
  }

  /**
   * Formats report as XLSX
   */
  private formatXLSX(report: AnalyticsReport, options: ExportOptions): Buffer {
    const data = this.flattenReportData(report, options);
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Analytics Report');
    return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
  }

  /**
   * Formats report as JSON
   */
  private formatJSON(report: AnalyticsReport, options: ExportOptions): Buffer {
    const data = options.includeMetadata ? report : report.channelMetrics;
    return Buffer.from(JSON.stringify(data, null, 2));
  }

  /**
   * Flattens report data for export
   */
  private flattenReportData(report: AnalyticsReport, options: ExportOptions): any[] {
    return report.channelMetrics.map(metric => ({
      Channel: metric.channelName,
      'Conversion Rate': metric.conversionRate,
      Revenue: metric.revenue,
      Touchpoints: metric.touchpoints,
      'Attribution Weight': metric.attributionWeight,
      ...options.includeMetadata ? { Metadata: JSON.stringify(metric.metadata) } : {},
      ...metric.customMetrics
    }));
  }

  /**
   * Generates cache key for report data
   */
  private generateCacheKey(params: ReportCacheKey): string {
    return `report_${JSON.stringify(params)}`;
  }

  /**
   * Handles errors with logging and metrics tracking
   */
  private handleError(error: Error, operation: string): Observable<never> {
    this.logger.error(error.message, {
      service: 'reporting-service',
      requestId: '',
      correlationId: '',
      additionalContext: { operation, error }
    });
    return throwError(() => error);
  }
}