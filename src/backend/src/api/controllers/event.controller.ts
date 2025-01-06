import { 
  Controller, 
  Post, 
  Get, 
  Body, 
  Query, 
  Headers,
  UseGuards,
  UseInterceptors,
  HttpStatus,
  BadRequestException,
  InternalServerErrorException
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiHeader 
} from '@nestjs/swagger';
import { Event } from '../../core/events/types/event.types';
import { EventService } from '../../core/events/services/event.service';
import { eventSchema } from '../validators/event.validator';
import { LoggerService } from '../../lib/logger/logger.service';
import { MetricsService } from '../../lib/metrics/metrics.service';
import { AuthGuard } from '../guards/auth.guard';
import { RateLimitGuard } from '../guards/rate-limit.guard';
import { LoggingInterceptor } from '../interceptors/logging.interceptor';
import { MonitoringInterceptor } from '../interceptors/monitoring.interceptor';
import { CircuitBreakerInterceptor } from '../interceptors/circuit-breaker.interceptor';

@Controller('events')
@ApiTags('events')
@UseInterceptors(LoggingInterceptor, MonitoringInterceptor, CircuitBreakerInterceptor)
@UseGuards(AuthGuard, RateLimitGuard)
export class EventController {
  constructor(
    private readonly eventService: EventService,
    private readonly logger: LoggerService,
    private readonly metricsService: MetricsService
  ) {}

  @Post()
  @ApiOperation({ summary: 'Track new event' })
  @ApiResponse({ status: HttpStatus.CREATED, type: Event })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid event data' })
  @ApiResponse({ status: HttpStatus.TOO_MANY_REQUESTS, description: 'Rate limit exceeded' })
  @ApiHeader({ name: 'X-Correlation-ID', required: true })
  async trackEvent(
    @Body() eventData: Omit<Event, 'id' | 'timestamp'>,
    @Headers('x-correlation-id') correlationId: string
  ): Promise<Event> {
    const startTime = process.hrtime();

    try {
      // Validate correlation ID
      if (!correlationId) {
        throw new BadRequestException('Missing correlation ID header');
      }

      // Validate event data
      const validationResult = await eventSchema.validateAsync(eventData, {
        abortEarly: false,
        stripUnknown: true
      });

      if (!validationResult.isValid) {
        this.metricsService.incrementCounter('event_validation_failures');
        throw new BadRequestException(validationResult.errors);
      }

      // Track event
      const event = await this.eventService.trackEvent(eventData);

      // Record metrics
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const duration = seconds * 1000 + nanoseconds / 1e6;
      
      this.metricsService.recordHistogram('event_processing_duration', duration);
      this.metricsService.incrementCounter('events_processed_total');

      this.logger.info('Event tracked successfully', {
        service: 'event-controller',
        requestId: event.id,
        correlationId,
        additionalContext: {
          eventType: event.type,
          duration
        }
      });

      return event;

    } catch (error) {
      // Record error metrics
      this.metricsService.incrementCounter('event_processing_failures');

      this.logger.error('Failed to track event', {
        service: 'event-controller',
        requestId: 'unknown',
        correlationId,
        additionalContext: {
          error: error instanceof Error ? error.message : 'Unknown error',
          eventData
        }
      });

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to process event');
    }
  }

  @Post('batch')
  @ApiOperation({ summary: 'Track multiple events in batch' })
  @ApiResponse({ status: HttpStatus.CREATED, type: [Event] })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid batch data' })
  @ApiHeader({ name: 'X-Correlation-ID', required: true })
  async trackBatchEvents(
    @Body() events: Array<Omit<Event, 'id' | 'timestamp'>>,
    @Headers('x-correlation-id') correlationId: string
  ): Promise<Event[]> {
    const startTime = process.hrtime();

    try {
      // Validate batch size
      if (!events.length || events.length > 1000) {
        throw new BadRequestException('Invalid batch size. Must be between 1 and 1000 events.');
      }

      // Process batch
      const processedEvents = await this.eventService.bulkTrackEvents(events);

      // Record metrics
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const duration = seconds * 1000 + nanoseconds / 1e6;

      this.metricsService.recordHistogram('batch_processing_duration', duration);
      this.metricsService.incrementCounter('events_processed_total', events.length);

      this.logger.info('Batch events tracked successfully', {
        service: 'event-controller',
        requestId: 'batch',
        correlationId,
        additionalContext: {
          batchSize: events.length,
          duration
        }
      });

      return processedEvents;

    } catch (error) {
      this.metricsService.incrementCounter('batch_processing_failures');

      this.logger.error('Failed to track batch events', {
        service: 'event-controller',
        requestId: 'batch',
        correlationId,
        additionalContext: {
          error: error instanceof Error ? error.message : 'Unknown error',
          batchSize: events.length
        }
      });

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to process batch events');
    }
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get event processing metrics' })
  @ApiResponse({ status: HttpStatus.OK })
  @ApiHeader({ name: 'X-Correlation-ID', required: true })
  async getEventMetrics(
    @Query('timeRange') timeRange: string,
    @Headers('x-correlation-id') correlationId: string
  ): Promise<Record<string, number>> {
    try {
      const metrics = await this.eventService.getEventMetrics(timeRange);

      this.logger.info('Event metrics retrieved successfully', {
        service: 'event-controller',
        requestId: 'metrics',
        correlationId,
        additionalContext: { timeRange }
      });

      return metrics;

    } catch (error) {
      this.logger.error('Failed to retrieve event metrics', {
        service: 'event-controller',
        requestId: 'metrics',
        correlationId,
        additionalContext: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timeRange
        }
      });

      throw new InternalServerErrorException('Failed to retrieve event metrics');
    }
  }
}