import { Injectable } from '@nestjs/common'; // v9.0.0
import { Counter, Histogram, Gauge } from 'prom-client'; // v14.0.0
import { Event, EventType, EventStatus, isEvent } from '../types/event.types';
import { KafkaConsumer } from '../../../lib/kafka/consumer';
import { QueueService } from '../../../lib/queue/queue.service';
import { LoggerService } from '../../../lib/logger/logger.service';

@Injectable()
export class EventProcessingService {
  private readonly logger: LoggerService;
  private readonly processedEvents: Counter<string>;
  private readonly failedEvents: Counter<string>;
  private readonly retryAttempts: Counter<string>;
  private readonly processingLatency: Histogram<string>;
  private readonly batchSize: Histogram<string>;
  private readonly queueSize: Gauge<string>;

  constructor(
    private readonly kafkaConsumer: KafkaConsumer,
    private readonly queueService: QueueService
  ) {
    this.logger = new LoggerService();
    this.initializeMetrics();
  }

  /**
   * Initialize Prometheus metrics collectors for monitoring
   */
  private initializeMetrics(): void {
    this.processedEvents = new Counter({
      name: 'event_processing_total',
      help: 'Total number of processed events',
      labelNames: ['type', 'status']
    });

    this.failedEvents = new Counter({
      name: 'event_processing_failures_total',
      help: 'Total number of failed event processing attempts',
      labelNames: ['type', 'error']
    });

    this.retryAttempts = new Counter({
      name: 'event_processing_retries_total',
      help: 'Total number of event processing retry attempts',
      labelNames: ['type']
    });

    this.processingLatency = new Histogram({
      name: 'event_processing_duration_seconds',
      help: 'Event processing duration in seconds',
      labelNames: ['type'],
      buckets: [0.1, 0.5, 1, 2, 5, 10]
    });

    this.batchSize = new Histogram({
      name: 'event_processing_batch_size',
      help: 'Size of processed event batches',
      buckets: [10, 50, 100, 500, 1000, 5000]
    });

    this.queueSize = new Gauge({
      name: 'event_processing_queue_size',
      help: 'Current number of events waiting to be processed'
    });
  }

  /**
   * Process a single event with validation and enrichment
   */
  public async processEvent(event: Event): Promise<Event> {
    const timer = this.processingLatency.startTimer({ type: event.type });
    
    try {
      // Validate event structure
      if (!isEvent(event)) {
        throw new Error('Invalid event structure');
      }

      // Enrich event with additional metadata
      const enrichedEvent = {
        ...event,
        metadata: {
          ...event.metadata,
          processedAt: new Date().toISOString(),
          processingStatus: EventStatus.PROCESSING
        }
      };

      // Add event to processing queue
      await this.queueService.addJob({
        jobId: event.id,
        queueName: 'event-processing',
        data: enrichedEvent,
        options: {
          attempts: 3,
          backoff: 5000,
          removeOnComplete: 100,
          removeOnFail: 100
        },
        priority: this.getEventPriority(event.type),
        attempts: 0,
        timeout: 30000
      });

      this.processedEvents.inc({ type: event.type, status: 'success' });
      timer();

      return enrichedEvent;
    } catch (error) {
      this.failedEvents.inc({
        type: event.type,
        error: error instanceof Error ? error.name : 'unknown'
      });
      timer();
      throw error;
    }
  }

  /**
   * Process multiple events in parallel with batching
   */
  public async processBatch(events: Event[]): Promise<Event[]> {
    this.batchSize.observe(events.length);
    this.queueSize.set(events.length);

    const batchTimer = this.processingLatency.startTimer();
    const results: Event[] = [];
    const errors: Error[] = [];

    try {
      // Process events in parallel with concurrency control
      const batchPromises = events.map(async (event) => {
        try {
          const result = await this.processEvent(event);
          results.push(result);
        } catch (error) {
          errors.push(error instanceof Error ? error : new Error(String(error)));
        }
      });

      await Promise.all(batchPromises);

      // Handle any batch processing errors
      if (errors.length > 0) {
        this.logger.error('Batch processing errors occurred', {
          service: 'EventProcessingService',
          requestId: 'batch',
          correlationId: 'system',
          additionalContext: { errorCount: errors.length }
        });
      }

      batchTimer();
      return results;
    } catch (error) {
      batchTimer();
      throw error;
    }
  }

  /**
   * Start the event processing pipeline
   */
  public async startProcessing(): Promise<void> {
    try {
      await this.kafkaConsumer.start({
        onMessage: async (topic, message) => {
          const event = JSON.parse(message.value?.toString() || '');
          await this.processEvent(event);
        },
        onError: async (error, topic, message) => {
          this.logger.error('Kafka message processing error', {
            service: 'EventProcessingService',
            requestId: 'kafka',
            correlationId: 'system',
            additionalContext: { topic, error }
          });
        },
        onBatchComplete: (size, duration) => {
          this.batchSize.observe(size);
          this.processingLatency.observe({ type: 'batch' }, duration / 1000);
        },
        onDeadLetter: async (message, reason) => {
          this.logger.error('Message moved to DLQ', {
            service: 'EventProcessingService',
            requestId: 'dlq',
            correlationId: 'system',
            additionalContext: { reason }
          });
        }
      });

      this.logger.info('Event processing pipeline started', {
        service: 'EventProcessingService',
        requestId: 'system',
        correlationId: 'system'
      });
    } catch (error) {
      this.logger.error('Failed to start event processing', {
        service: 'EventProcessingService',
        requestId: 'system',
        correlationId: 'system'
      });
      throw error;
    }
  }

  /**
   * Stop the event processing pipeline
   */
  public async stopProcessing(): Promise<void> {
    try {
      await this.kafkaConsumer.stop();
      this.logger.info('Event processing pipeline stopped', {
        service: 'EventProcessingService',
        requestId: 'system',
        correlationId: 'system'
      });
    } catch (error) {
      this.logger.error('Failed to stop event processing', {
        service: 'EventProcessingService',
        requestId: 'system',
        correlationId: 'system'
      });
      throw error;
    }
  }

  /**
   * Determine event processing priority based on type
   */
  private getEventPriority(eventType: EventType): number {
    const priorities: Record<EventType, number> = {
      [EventType.CONVERSION]: 1,
      [EventType.FORM_SUBMIT]: 2,
      [EventType.CLICK]: 3,
      [EventType.PAGE_VIEW]: 4,
      [EventType.SCROLL]: 5,
      [EventType.ENGAGEMENT]: 5,
      [EventType.CUSTOM]: 5
    };
    return priorities[eventType] || 5;
  }
}