import { Kafka, Consumer, KafkaMessage, CompressionTypes } from 'kafkajs'; // v2.2.0
import { LoggerService } from '../logger/logger.service';
import { MetricsService } from '../metrics/metrics.service';
import { kafkaConfig } from '../../config/kafka.config';

/**
 * Enhanced configuration options for Kafka consumer with performance tuning
 */
interface ConsumerOptions {
  groupId: string;
  topics: string[];
  maxBatchSize: number;
  readBatchTimeout: number;
  autoCommit: boolean;
  maxRetries: number;
  retryBackoff: number;
  sessionTimeout: number;
  heartbeatInterval: number;
  enableDeadLetterQueue: boolean;
  compression: CompressionTypes;
}

/**
 * Enhanced interface for message processing with error handling
 */
interface MessageHandler {
  onMessage(topic: string, message: KafkaMessage): Promise<void>;
  onError(error: Error, topic: string, message: KafkaMessage): Promise<void>;
  onBatchComplete(size: number, duration: number): void;
  onDeadLetter(message: KafkaMessage, reason: string): Promise<void>;
}

/**
 * Advanced Kafka consumer implementation with optimized batch processing,
 * error handling, and comprehensive monitoring capabilities
 */
export class KafkaConsumer {
  private kafka: Kafka;
  private consumer: Consumer;
  private isRunning: boolean = false;
  private readonly batchMessages: Map<string, KafkaMessage[]> = new Map();
  private readonly processingTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private readonly logger: LoggerService,
    private readonly metrics: MetricsService,
    private readonly options: ConsumerOptions
  ) {
    this.kafka = new Kafka({
      clientId: 'attribution-analytics-consumer',
      brokers: kafkaConfig.brokers,
      ssl: kafkaConfig.security.ssl,
      sasl: kafkaConfig.security.sasl,
      connectionTimeout: 30000,
      retry: {
        maxRetries: this.options.maxRetries,
        initialRetryTime: this.options.retryBackoff,
        maxRetryTime: 30000,
      },
      compression: this.options.compression,
    });

    this.consumer = this.kafka.consumer({
      groupId: this.options.groupId,
      sessionTimeout: this.options.sessionTimeout,
      heartbeatInterval: this.options.heartbeatInterval,
      maxBytesPerPartition: 1048576, // 1MB
      readUncommitted: false,
    });
  }

  /**
   * Starts the consumer with enhanced error handling and monitoring
   */
  public async start(handler: MessageHandler): Promise<void> {
    try {
      await this.consumer.connect();
      this.logger.info('Kafka consumer connected', {
        service: 'KafkaConsumer',
        requestId: 'system',
        correlationId: 'system',
      });

      for (const topic of this.options.topics) {
        await this.consumer.subscribe({ topic, fromBeginning: false });
      }

      await this.consumer.run({
        autoCommit: this.options.autoCommit,
        eachBatchAutoResolve: true,
        partitionsConsumedConcurrently: 3,
        eachBatch: async ({ batch, resolveOffset, heartbeat, isRunning, isStale }) => {
          const startTime = Date.now();
          const batchSize = batch.messages.length;

          try {
            if (!isRunning() || isStale()) return;

            this.metrics.recordBatchSize('kafka_batch_size', batchSize);

            for (const message of batch.messages) {
              if (!isRunning() || isStale()) break;

              try {
                await handler.onMessage(batch.topic, message);
                resolveOffset(message.offset);
                await heartbeat();

                this.metrics.incrementEventCounter('kafka_messages_processed');
              } catch (error) {
                if (this.options.enableDeadLetterQueue) {
                  await handler.onDeadLetter(message, error instanceof Error ? error.message : 'Unknown error');
                }
                this.metrics.incrementEventCounter('kafka_messages_failed');
                this.logger.error(error instanceof Error ? error : new Error(String(error)), {
                  service: 'KafkaConsumer',
                  requestId: 'system',
                  correlationId: 'system',
                  additionalContext: { topic: batch.topic, partition: batch.partition },
                });
              }
            }

            const duration = Date.now() - startTime;
            this.metrics.recordEventProcessingTime('kafka_batch_processing_time', duration);
            handler.onBatchComplete(batchSize, duration);

          } catch (error) {
            this.metrics.incrementEventCounter('kafka_batch_failures');
            this.logger.error(error instanceof Error ? error : new Error(String(error)), {
              service: 'KafkaConsumer',
              requestId: 'system',
              correlationId: 'system',
              additionalContext: { topic: batch.topic, partition: batch.partition },
            });
          }
        },
      });

      this.isRunning = true;
      this.startHealthCheck();

    } catch (error) {
      this.metrics.incrementEventCounter('kafka_consumer_errors');
      this.logger.error(error instanceof Error ? error : new Error(String(error)), {
        service: 'KafkaConsumer',
        requestId: 'system',
        correlationId: 'system',
      });
      throw error;
    }
  }

  /**
   * Gracefully stops the consumer with resource cleanup
   */
  public async stop(): Promise<void> {
    try {
      this.isRunning = false;
      await this.consumer.disconnect();
      this.logger.info('Kafka consumer disconnected', {
        service: 'KafkaConsumer',
        requestId: 'system',
        correlationId: 'system',
      });
    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), {
        service: 'KafkaConsumer',
        requestId: 'system',
        correlationId: 'system',
      });
      throw error;
    }
  }

  /**
   * Monitors consumer health and lag
   */
  private startHealthCheck(): void {
    setInterval(async () => {
      try {
        const lag = await this.consumer.describeGroup(this.options.groupId);
        this.metrics.recordConsumerLag('kafka_consumer_lag', 
          lag.members.reduce((acc, member) => acc + Number(member.memberMetadata || 0), 0)
        );
      } catch (error) {
        this.logger.error(error instanceof Error ? error : new Error(String(error)), {
          service: 'KafkaConsumer',
          requestId: 'system',
          correlationId: 'system',
        });
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Checks if the consumer is currently running
   */
  public isHealthy(): boolean {
    return this.isRunning;
  }

  /**
   * Returns current consumer metrics
   */
  public getMetrics(): Record<string, number> {
    return {
      isRunning: this.isRunning ? 1 : 0,
      topicCount: this.options.topics.length,
      batchSize: this.options.maxBatchSize,
      sessionTimeout: this.options.sessionTimeout,
    };
  }
}