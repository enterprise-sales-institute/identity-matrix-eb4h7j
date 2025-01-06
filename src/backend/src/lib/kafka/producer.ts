import { injectable } from 'inversify';
import { Kafka, Producer, CompressionTypes, Message, ProducerRecord } from 'kafkajs'; // v2.2.0
import CircuitBreaker from 'opossum'; // v6.0.0
import { kafkaConfig } from '../../config/kafka.config';
import { LoggerService } from '../logger/logger.service';
import { MetricsService } from '../metrics/metrics.service';

/**
 * Configuration options for individual message sending
 */
interface MessageOptions {
  compress?: boolean;
  timeout?: number;
  correlationId?: string;
  retryPolicy?: {
    retries: number;
    initialRetryTime: number;
    maxRetryTime: number;
  };
}

/**
 * Configuration options for batch operations
 */
interface BatchOptions {
  batchSize?: number;
  timeout?: number;
  compress?: boolean;
  correlationId?: string;
  retryPolicy?: {
    retries: number;
    initialRetryTime: number;
    maxRetryTime: number;
  };
}

/**
 * High-performance Kafka producer service with comprehensive monitoring,
 * error handling, and performance optimizations
 */
@injectable()
export class KafkaProducerService {
  private producer: Producer;
  private readonly circuitBreaker: CircuitBreaker;
  private isConnected: boolean = false;
  private readonly batchSizes: Map<string, number> = new Map();

  constructor(
    private readonly logger: LoggerService,
    private readonly metrics: MetricsService
  ) {
    // Initialize Kafka client with optimized configuration
    const kafka = new Kafka({
      clientId: kafkaConfig.clientId,
      brokers: kafkaConfig.brokers,
      ssl: kafkaConfig.security.ssl,
      sasl: kafkaConfig.security.sasl,
    });

    // Configure producer with performance optimizations
    this.producer = kafka.producer({
      ...kafkaConfig.producer,
      allowAutoTopicCreation: false,
      transactionTimeout: 30000,
    });

    // Initialize circuit breaker for fault tolerance
    this.circuitBreaker = new CircuitBreaker(
      async (record: ProducerRecord) => this.producer.send(record),
      {
        timeout: 30000,
        errorThresholdPercentage: 50,
        resetTimeout: 30000,
        rollingCountTimeout: 10000,
        rollingCountBuckets: 10,
      }
    );

    this.setupCircuitBreakerEvents();
  }

  /**
   * Establishes connection to Kafka brokers with monitoring
   */
  public async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      await this.producer.connect();
      this.isConnected = true;

      this.logger.info('Kafka producer connected successfully', {
        service: 'KafkaProducer',
        requestId: 'system',
        correlationId: 'system',
      });

      // Start monitoring producer metrics
      this.startMetricsCollection();
    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), {
        service: 'KafkaProducer',
        requestId: 'system',
        correlationId: 'system',
      });
      throw error;
    }
  }

  /**
   * Gracefully disconnects from Kafka brokers
   */
  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.producer.disconnect();
      this.isConnected = false;
      this.circuitBreaker.shutdown();
      
      this.logger.info('Kafka producer disconnected successfully', {
        service: 'KafkaProducer',
        requestId: 'system',
        correlationId: 'system',
      });
    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), {
        service: 'KafkaProducer',
        requestId: 'system',
        correlationId: 'system',
      });
      throw error;
    }
  }

  /**
   * Sends a message to specified Kafka topic with monitoring and error handling
   */
  public async sendMessage(
    topic: string,
    message: Record<string, unknown>,
    key?: string,
    options: MessageOptions = {}
  ): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Producer not connected');
    }

    const correlationId = options.correlationId || crypto.randomUUID();
    const startTime = Date.now();

    try {
      const record: ProducerRecord = {
        topic,
        messages: [{
          key: key || undefined,
          value: JSON.stringify(message),
          headers: {
            correlationId,
            timestamp: Date.now().toString(),
          },
        }],
        compression: options.compress ? CompressionTypes.GZIP : CompressionTypes.None,
      };

      await this.circuitBreaker.fire(record);

      // Record metrics
      const duration = Date.now() - startTime;
      this.metrics.recordHistogram('kafka_producer_send_duration', duration, { topic });
      this.metrics.incrementCounter('kafka_producer_messages_total', 1, { topic });

      this.logger.debug('Message sent successfully', {
        service: 'KafkaProducer',
        requestId: 'system',
        correlationId,
        additionalContext: { topic, duration },
      });
    } catch (error) {
      this.metrics.incrementCounter('kafka_producer_errors_total', 1, { topic });
      this.logger.error(error instanceof Error ? error : new Error(String(error)), {
        service: 'KafkaProducer',
        requestId: 'system',
        correlationId,
        additionalContext: { topic },
      });
      throw error;
    }
  }

  /**
   * Sends a batch of messages with optimized batching and compression
   */
  public async sendBatch(
    batch: Array<{ topic: string; messages: Record<string, unknown>[] }>,
    options: BatchOptions = {}
  ): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Producer not connected');
    }

    const correlationId = options.correlationId || crypto.randomUUID();
    const startTime = Date.now();

    try {
      const records: ProducerRecord[] = batch.map(({ topic, messages }) => ({
        topic,
        messages: messages.map(msg => ({
          value: JSON.stringify(msg),
          headers: {
            correlationId,
            timestamp: Date.now().toString(),
          },
        })),
        compression: options.compress ? CompressionTypes.GZIP : CompressionTypes.None,
      }));

      await Promise.all(records.map(record => this.circuitBreaker.fire(record)));

      // Record batch metrics
      const duration = Date.now() - startTime;
      this.metrics.recordHistogram('kafka_producer_batch_duration', duration);
      this.metrics.recordBatchSize('kafka_producer_batch_size', batch.length);

      this.logger.debug('Batch sent successfully', {
        service: 'KafkaProducer',
        requestId: 'system',
        correlationId,
        additionalContext: { batchSize: batch.length, duration },
      });
    } catch (error) {
      this.metrics.incrementCounter('kafka_producer_batch_errors_total', 1);
      this.logger.error(error instanceof Error ? error : new Error(String(error)), {
        service: 'KafkaProducer',
        requestId: 'system',
        correlationId,
      });
      throw error;
    }
  }

  /**
   * Sets up circuit breaker event handlers and monitoring
   */
  private setupCircuitBreakerEvents(): void {
    this.circuitBreaker.on('open', () => {
      this.logger.warn('Circuit breaker opened', {
        service: 'KafkaProducer',
        requestId: 'system',
        correlationId: 'system',
      });
      this.metrics.incrementCounter('kafka_producer_circuit_breaker_open', 1);
    });

    this.circuitBreaker.on('halfOpen', () => {
      this.logger.info('Circuit breaker half-open', {
        service: 'KafkaProducer',
        requestId: 'system',
        correlationId: 'system',
      });
    });

    this.circuitBreaker.on('close', () => {
      this.logger.info('Circuit breaker closed', {
        service: 'KafkaProducer',
        requestId: 'system',
        correlationId: 'system',
      });
      this.metrics.incrementCounter('kafka_producer_circuit_breaker_close', 1);
    });
  }

  /**
   * Starts collection of producer performance metrics
   */
  private startMetricsCollection(): void {
    setInterval(() => {
      this.metrics.recordMemoryUsage('kafka_producer_memory_usage');
      
      // Record producer-level metrics
      const producerMetrics = this.producer.metrics();
      if (producerMetrics) {
        this.metrics.setGauge('kafka_producer_request_rate', producerMetrics.requestRate || 0);
        this.metrics.setGauge('kafka_producer_request_latency', producerMetrics.requestLatencyAvg || 0);
        this.metrics.setGauge('kafka_producer_outgoing_byte_rate', producerMetrics.outgoingByteRate || 0);
      }
    }, 5000);
  }
}