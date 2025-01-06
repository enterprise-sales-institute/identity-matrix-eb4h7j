/**
 * Queue configuration for distributed job processing using Bull
 * Optimized for high-throughput event processing (10M+ events/day)
 * with dedicated queues for events, attribution, and analytics
 * @version 1.0.0
 */

import { QueueOptions } from 'bull'; // v4.10.0
import { RedisConfig } from '../types/config.types';

/**
 * Default job processing options with optimized settings
 * for reliability and performance
 */
interface JobOptions {
  attempts: number;       // Number of retry attempts for failed jobs
  backoff: number;       // Delay between retry attempts in ms
  removeOnComplete: number; // Number of completed jobs to keep
  removeOnFail: number;    // Number of failed jobs to keep
}

/**
 * Queue definitions for different processing tasks
 * with optimized concurrency and rate limits
 */
interface QueueDefinitions {
  eventQueue: {
    name: string;      // Queue name for event processing
    concurrency: number; // Number of concurrent jobs
    rateLimit: number;   // Jobs per second limit
  };
  attributionQueue: {
    name: string;
    concurrency: number;
    rateLimit: number;
  };
  analyticsQueue: {
    name: string;
    concurrency: number;
    rateLimit: number;
  };
}

/**
 * Comprehensive queue configuration settings
 * for distributed job processing
 */
interface QueueConfig {
  redis: RedisConfig;
  jobOptions: JobOptions;
  queues: QueueDefinitions;
}

/**
 * Queue configuration with optimized settings for high-throughput
 * event processing and analytics calculations
 */
export const queueConfig: QueueConfig = {
  // Redis connection configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || '',
    db: 0,
    cluster: {
      nodes: [],
      options: {
        maxRedirections: 16,
        retryDelayMs: 100
      }
    },
    sentinel: {
      masters: 'mymaster',
      sentinels: []
    },
    security: {
      tls: false
    }
  },

  // Default job processing options
  jobOptions: {
    attempts: 3,           // Retry failed jobs up to 3 times
    backoff: 5000,         // 5 second delay between retries
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 100      // Keep last 100 failed jobs
  },

  // Queue-specific configurations
  queues: {
    // Event processing queue - highest throughput
    eventQueue: {
      name: 'event-processing',
      concurrency: 10,  // Process 10 jobs simultaneously
      rateLimit: 1000   // Maximum 1000 jobs per second
    },
    
    // Attribution calculation queue
    attributionQueue: {
      name: 'attribution-processing',
      concurrency: 5,   // Process 5 jobs simultaneously
      rateLimit: 500    // Maximum 500 jobs per second
    },
    
    // Analytics processing queue
    analyticsQueue: {
      name: 'analytics-processing',
      concurrency: 3,   // Process 3 jobs simultaneously
      rateLimit: 200    // Maximum 200 jobs per second
    }
  }
};

/**
 * Helper function to create Bull queue options
 * @param queueName Name of the queue to configure
 * @returns Bull queue options with optimized settings
 */
export const createQueueOptions = (queueName: string): QueueOptions => {
  const queueConfig = queueConfig.queues[queueName as keyof QueueDefinitions];
  
  return {
    redis: queueConfig.redis,
    defaultJobOptions: queueConfig.jobOptions,
    limiter: {
      max: queueConfig.rateLimit,
      duration: 1000 // Per second
    },
    settings: {
      lockDuration: 30000,        // 30 seconds lock duration
      stalledInterval: 30000,     // Check for stalled jobs every 30 seconds
      maxStalledCount: 2,         // Mark as failed after 2 stalled attempts
      guardInterval: 5000,        // Check for completed jobs every 5 seconds
      retryProcessDelay: 5000,    // Wait 5 seconds before processing retries
      drainDelay: 300             // Wait 300ms between processing jobs when queue is empty
    }
  };
};

export default queueConfig;