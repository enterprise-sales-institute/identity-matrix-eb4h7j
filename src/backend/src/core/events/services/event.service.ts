import { Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { CircuitBreaker } from '@nestjs/circuit-breaker';
import { MetricsService } from '@nestjs/metrics';
import { Event } from '../types/event.types';
import { EventRepository } from '../../../database/clickhouse/repositories/event.repository';
import { EventProcessingService } from './processing.service';

/**
 * High-performance service for handling event tracking and management
 * Supports processing 10M+ events daily with sub-5 second latency
 * @version 1.0.0
 */
@Injectable()
@CircuitBreaker({
  timeout: 5000,
  maxFailures: 3,
  resetTimeout: 30000
})
export class EventService {
  private readonly logger: Logger;
  private readonly batchSize: number = 1000;
  private readonly processingTimeout: number = 5000;
  private readonly retryAttempts: number = 3;

  constructor(
    private readonly eventRepository: EventRepository,
    private readonly processingService: EventProcessingService,
    private readonly metricsService: MetricsService
  ) {
    this.logger = new Logger(EventService.name);
  }

  /**
   * Tracks and processes a new event with high-performance distributed processing
   * @param eventData Event data to track
   * @returns Processed event with tracking metadata
   */
  public async trackEvent(eventData: Omit<Event, 'id' | 'timestamp'>): Promise<Event> {
    const startTime = process.hrtime();

    try {
      // Generate event ID and timestamp
      const event: Event = {
        ...eventData,
        id: uuidv4(),
        timestamp: new Date(),
        metadata: {
          ...eventData.metadata,
          processedAt: new Date().toISOString(),
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          tags: {
            ...eventData.metadata?.tags,
            source: 'event-service'
          }
        }
      };

      // Record event metrics
      this.metricsService.recordHistogram('event_processing_start', process.hrtime(startTime)[0]);

      // Process event through distributed processing service
      const processedEvent = await this.processingService.processEvent(event);

      // Store event with retry mechanism
      await this.retryOperation(
        () => this.eventRepository.storeEvent(processedEvent),
        this.retryAttempts
      );

      // Record success metrics
      this.metricsService.incrementCounter('events_processed_total', 1, {
        type: event.type,
        status: 'success'
      });

      const processingTime = process.hrtime(startTime)[0];
      this.metricsService.recordHistogram('event_processing_duration', processingTime);

      this.logger.debug(`Event processed successfully in ${processingTime}s`, {
        eventId: event.id,
        type: event.type
      });

      return processedEvent;

    } catch (error) {
      // Record failure metrics
      this.metricsService.incrementCounter('events_failed_total', 1, {
        type: eventData.type,
        error: error instanceof Error ? error.name : 'unknown'
      });

      this.logger.error('Failed to process event', {
        error,
        eventData,
        duration: process.hrtime(startTime)[0]
      });

      throw error;
    }
  }

  /**
   * Retrieves events for a specific visitor with pagination
   * @param visitorId Visitor ID to fetch events for
   * @param limit Maximum number of events to return
   * @param offset Pagination offset
   */
  public async getVisitorEvents(
    visitorId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<Event[]> {
    const startTime = process.hrtime();

    try {
      const events = await this.eventRepository.getEventsByVisitor(visitorId, limit, offset);

      const duration = process.hrtime(startTime)[0];
      this.metricsService.recordHistogram('event_retrieval_duration', duration);

      return events;
    } catch (error) {
      this.logger.error('Failed to retrieve visitor events', {
        error,
        visitorId,
        limit,
        offset
      });
      throw error;
    }
  }

  /**
   * Retrieves events for a specific session
   * @param sessionId Session ID to fetch events for
   */
  public async getSessionEvents(sessionId: string): Promise<Event[]> {
    const startTime = process.hrtime();

    try {
      const events = await this.eventRepository.getEventsBySession(sessionId);

      const duration = process.hrtime(startTime)[0];
      this.metricsService.recordHistogram('session_events_retrieval_duration', duration);

      return events;
    } catch (error) {
      this.logger.error('Failed to retrieve session events', {
        error,
        sessionId
      });
      throw error;
    }
  }

  /**
   * Retries an operation with exponential backoff
   * @param operation Operation to retry
   * @param maxAttempts Maximum number of retry attempts
   */
  private async retryOperation(
    operation: () => Promise<void>,
    maxAttempts: number
  ): Promise<void> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await operation();
        return;
      } catch (error) {
        if (attempt === maxAttempts) {
          throw error;
        }
        const backoffTime = Math.min(1000 * Math.pow(2, attempt), 10000);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
      }
    }
  }
}