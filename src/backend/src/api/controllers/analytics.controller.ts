import { Controller, Get, Post, Body, Query, UseGuards, UseInterceptors } from '@nestjs/common'; // v9.0.0
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity } from '@nestjs/swagger'; // v6.0.0
import { Observable, throwError } from 'rxjs'; // v7.8.0
import { catchError, timeout } from 'rxjs/operators'; // v7.8.0
import { AnalyticsService } from '../../core/analytics/services/analytics.service';
import { CacheService } from '@nestjs/cache-manager'; // v1.0.0
import { LoggerService } from '../../lib/logger/logger.service';
import { AuthGuard } from '../../security/guards/auth.guard';
import { RateLimitGuard } from '../../security/guards/rate-limit.guard';
import { TimeoutInterceptor } from '../../interceptors/timeout.interceptor';
import { CacheInterceptor } from '../../interceptors/cache.interceptor';
import { 
  AnalyticsMetric, 
  AnalyticsDimension, 
  AnalyticsReport, 
  ChannelMetrics 
} from '../../core/analytics/types/analytics.types';
import { TimeRange } from '../../types/common.types';

// Constants for configuration
const DEFAULT_TIME_RANGE = {
  startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  endDate: new Date()
};

const DEFAULT_METRICS = [
  AnalyticsMetric.CONVERSION_RATE,
  AnalyticsMetric.REVENUE,
  AnalyticsMetric.TOUCHPOINTS
];

const CACHE_TTL = 300000; // 5 minutes
const REQUEST_TIMEOUT = 30000; // 30 seconds

@Controller('analytics')
@ApiTags('analytics')
@UseGuards(AuthGuard)
@UseInterceptors(CacheInterceptor)
@UseInterceptors(TimeoutInterceptor)
@ApiSecurity('bearer')
export class AnalyticsController {
  private readonly logger: LoggerService;

  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly cacheService: CacheService,
    logger: LoggerService
  ) {
    this.logger = logger;
  }

  @Get('/query')
  @ApiOperation({ summary: 'Query analytics data with filtering and aggregation' })
  @ApiResponse({ status: 200, description: 'Analytics data retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request parameters' })
  @ApiResponse({ status: 408, description: 'Request timeout' })
  @UseGuards(RateLimitGuard)
  async getAnalytics(
    @Query('timeRange') timeRange: TimeRange = DEFAULT_TIME_RANGE,
    @Query('metrics') metrics: AnalyticsMetric[] = DEFAULT_METRICS,
    @Query('dimensions') dimensions?: AnalyticsDimension[],
    @Query('channelIds') channelIds?: string[]
  ): Promise<Observable<AnalyticsReport>> {
    const requestId = `analytics_${Date.now()}`;

    try {
      // Validate time range
      if (timeRange.endDate < timeRange.startDate) {
        throw new Error('Invalid time range: end date must be after start date');
      }

      // Check cache first
      const cacheKey = this.generateCacheKey({ timeRange, metrics, dimensions, channelIds });
      const cachedData = await this.cacheService.get(cacheKey);
      
      if (cachedData) {
        this.logger.info('Cache hit for analytics query', {
          service: 'analytics-controller',
          requestId,
          correlationId: requestId,
          additionalContext: { cacheKey }
        });
        return cachedData;
      }

      // Query analytics with timeout and error handling
      return this.analyticsService.queryAnalytics(
        {
          timeRange,
          metrics,
          dimensions,
          channelIds,
          customFilters: {}
        },
        {
          useCache: true,
          cacheTTL: CACHE_TTL,
          timeout: REQUEST_TIMEOUT
        }
      ).pipe(
        timeout(REQUEST_TIMEOUT),
        catchError(error => {
          this.logger.error('Failed to retrieve analytics data', {
            service: 'analytics-controller',
            requestId,
            correlationId: requestId,
            additionalContext: { error, params: { timeRange, metrics, dimensions, channelIds } }
          });
          return throwError(() => error);
        })
      );
    } catch (error) {
      this.logger.error('Error in analytics query', {
        service: 'analytics-controller',
        requestId,
        correlationId: requestId,
        additionalContext: { error }
      });
      throw error;
    }
  }

  @Get('/metrics/channel/:channelId')
  @ApiOperation({ summary: 'Get metrics for a specific channel' })
  @ApiResponse({ status: 200, description: 'Channel metrics retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Channel not found' })
  @UseGuards(RateLimitGuard)
  async getChannelMetrics(
    @Query('channelId') channelId: string,
    @Query('timeRange') timeRange: TimeRange = DEFAULT_TIME_RANGE,
    @Query('metrics') metrics: AnalyticsMetric[] = DEFAULT_METRICS
  ): Promise<ChannelMetrics> {
    const requestId = `channel_metrics_${channelId}_${Date.now()}`;

    try {
      return await this.analyticsService.calculateMetrics(
        channelId,
        timeRange,
        metrics
      );
    } catch (error) {
      this.logger.error('Failed to retrieve channel metrics', {
        service: 'analytics-controller',
        requestId,
        correlationId: requestId,
        additionalContext: { error, channelId, timeRange, metrics }
      });
      throw error;
    }
  }

  @Post('/aggregate')
  @ApiOperation({ summary: 'Aggregate analytics data by dimension' })
  @ApiResponse({ status: 200, description: 'Analytics data aggregated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid aggregation parameters' })
  @UseGuards(RateLimitGuard)
  async aggregateAnalytics(
    @Body('dimension') dimension: AnalyticsDimension,
    @Body('timeRange') timeRange: TimeRange = DEFAULT_TIME_RANGE,
    @Body('metrics') metrics: AnalyticsMetric[] = DEFAULT_METRICS
  ): Promise<Observable<any>> {
    const requestId = `aggregate_${dimension}_${Date.now()}`;

    try {
      return await this.analyticsService.aggregateByDimension(
        dimension,
        {
          timeRange,
          metrics,
          customFilters: {}
        },
        {
          useCache: true,
          cacheTTL: CACHE_TTL,
          timeout: REQUEST_TIMEOUT
        }
      );
    } catch (error) {
      this.logger.error('Failed to aggregate analytics data', {
        service: 'analytics-controller',
        requestId,
        correlationId: requestId,
        additionalContext: { error, dimension, timeRange, metrics }
      });
      throw error;
    }
  }

  private generateCacheKey(params: Record<string, any>): string {
    return `analytics_${JSON.stringify(params)}`;
  }
}