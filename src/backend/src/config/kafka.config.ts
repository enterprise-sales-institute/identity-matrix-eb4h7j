/**
 * Kafka Configuration Module
 * Provides centralized configuration settings for Kafka producers and consumers
 * Optimized for high-throughput and low-latency event processing
 * @version 1.0.0
 */

import { KafkaConfig, CompressionTypes, logLevel } from 'kafkajs';
import { ConfigTypes } from '../types/config.types';

/**
 * Interface for Kafka consumer configuration with performance optimizations
 */
interface ConsumerConfig {
  groupId: string;
  sessionTimeout: number;
  heartbeatInterval: number;
  maxBatchSize: number;
  readBatchTimeout: number;
  autoCommit: boolean;
  retry: {
    maxRetries: number;
    initialRetryTime: number;
    maxRetryTime: number;
  };
  maxWaitTimeInMs: number;
  maxBytesPerPartition: number;
  readUncommitted: boolean;
}

/**
 * Interface for Kafka producer configuration optimized for high throughput
 */
interface ProducerConfig {
  maxInFlightRequests: number;
  idempotent: boolean;
  batchSize: number;
  compressionLevel: number;
  compressionType: string;
  requestTimeout: number;
  lingerMs: number;
  retries: number;
  enableIdempotence: boolean;
  acks: string;
}

/**
 * Interface for Kafka security configuration
 */
interface SecurityConfig {
  ssl: boolean;
  sasl: {
    mechanism: string;
    username: string;
    password: string;
  };
  rejectUnauthorized: boolean;
}

/**
 * Interface for Kafka monitoring configuration
 */
interface MonitoringConfig {
  enableMetrics: boolean;
  metricsInterval: number;
  metricsTags: string[];
  enableLogging: boolean;
}

/**
 * Interface for Kafka topic configuration
 */
interface TopicConfig {
  events: string;
  analytics: string;
  attribution: string;
  deadLetter: string;
}

/**
 * Comprehensive Kafka configuration with optimized settings
 * for high-throughput event processing and reliability
 */
export const kafkaConfig: KafkaConfig & {
  consumer: ConsumerConfig;
  producer: ProducerConfig;
  security: SecurityConfig;
  monitoring: MonitoringConfig;
  topics: TopicConfig;
} = {
  // Broker configuration
  brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
  clientId: 'attribution-analytics',

  // Consumer configuration optimized for real-time processing
  consumer: {
    groupId: 'attribution-analytics-group',
    sessionTimeout: 30000, // 30 seconds
    heartbeatInterval: 3000, // 3 seconds
    maxBatchSize: 1000, // Optimal batch size for processing
    readBatchTimeout: 1000, // 1 second batch timeout
    autoCommit: true,
    retry: {
      maxRetries: 5,
      initialRetryTime: 100,
      maxRetryTime: 30000,
    },
    maxWaitTimeInMs: 5000, // Maximum wait time for batch
    maxBytesPerPartition: 1048576, // 1MB per partition
    readUncommitted: false, // Ensure consistency
  },

  // Producer configuration optimized for high throughput
  producer: {
    maxInFlightRequests: 5,
    idempotent: true, // Ensure exactly-once delivery
    batchSize: 100, // Optimal batch size for throughput
    compressionLevel: 5, // Balance between compression ratio and CPU usage
    compressionType: CompressionTypes.GZIP,
    requestTimeout: 30000, // 30 seconds
    lingerMs: 100, // Batch collection time
    retries: 3,
    enableIdempotence: true, // Prevent duplicate messages
    acks: 'all', // Ensure durability
  },

  // Security configuration
  security: {
    ssl: true,
    sasl: {
      mechanism: 'plain',
      username: process.env.KAFKA_USERNAME || '',
      password: process.env.KAFKA_PASSWORD || '',
    },
    rejectUnauthorized: true,
  },

  // Monitoring and metrics configuration
  monitoring: {
    enableMetrics: true,
    metricsInterval: 5000, // 5 seconds interval
    metricsTags: ['environment', 'service'],
    enableLogging: true,
  },

  // Topic configuration
  topics: {
    events: 'raw-events',
    analytics: 'processed-analytics',
    attribution: 'attribution-results',
    deadLetter: 'dead-letter-queue',
  },

  // Logging configuration
  logLevel: logLevel.INFO,
};

export default kafkaConfig;