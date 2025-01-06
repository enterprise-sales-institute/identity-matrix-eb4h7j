import { Injectable, Logger } from '@nestjs/common';
import { Queue, Job, QueueOptions } from 'bull'; // v4.10.0
import { Counter, Histogram, Gauge } from 'prom-client'; // v14.0.0
import { queueConfig } from '../../config/queue.config';

/**
 * Interface for queue job data with comprehensive type safety
 */
interface QueueJobData {
  jobId: string;
  queueName: string;
  data: Record<string, unknown>;
  options: {
    attempts: number;
    backoff: number;
    removeOnComplete: number;
    removeOnFail: number;
  };
  priority: number;
  attempts: number;
  timeout: number;
}

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);
  private readonly queues = new Map<string, Queue>();

  // Prometheus metrics collectors
  private readonly jobsProcessed = new Counter({
    name: 'queue_jobs_processed_total',
    help: 'Total number of jobs processed',
    labelNames: ['queue', 'status']
  });

  private readonly processingTime = new Histogram({
    name: 'queue_job_processing_duration_seconds',
    help: 'Job processing duration in seconds',
    labelNames: ['queue'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
  });

  private readonly queueSize = new Gauge({
    name: 'queue_size_current',
    help: 'Current number of jobs in queue',
    labelNames: ['queue']
  });

  private readonly jobErrors = new Counter({
    name: 'queue_job_errors_total',
    help: 'Total number of job processing errors',
    labelNames: ['queue', 'error_type']
  });

  constructor() {
    this.initializeQueues();
    this.setupHealthChecks();
  }

  /**
   * Initializes configured queues with comprehensive monitoring
   */
  private async initializeQueues(): Promise<void> {
    try {
      // Initialize event processing queue
      await this.initializeQueue(
        queueConfig.queues.eventQueue.name,
        {
          redis: queueConfig.redis,
          defaultJobOptions: queueConfig.jobOptions,
          limiter: {
            max: queueConfig.queues.eventQueue.rateLimit,
            duration: 1000
          }
        }
      );

      // Initialize attribution processing queue
      await this.initializeQueue(
        queueConfig.queues.attributionQueue.name,
        {
          redis: queueConfig.redis,
          defaultJobOptions: queueConfig.jobOptions,
          limiter: {
            max: queueConfig.queues.attributionQueue.rateLimit,
            duration: 1000
          }
        }
      );

      // Initialize analytics processing queue
      await this.initializeQueue(
        queueConfig.queues.analyticsQueue.name,
        {
          redis: queueConfig.redis,
          defaultJobOptions: queueConfig.jobOptions,
          limiter: {
            max: queueConfig.queues.analyticsQueue.rateLimit,
            duration: 1000
          }
        }
      );

      this.logger.log('All queues initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize queues', error);
      throw error;
    }
  }

  /**
   * Initializes a single queue with comprehensive monitoring
   */
  private async initializeQueue(queueName: string, options: QueueOptions): Promise<Queue> {
    try {
      const queue = new Queue(queueName, options);

      // Set up event handlers
      queue.on('error', (error) => {
        this.logger.error(`Queue ${queueName} error:`, error);
        this.jobErrors.inc({ queue: queueName, error_type: error.name });
      });

      queue.on('completed', (job) => {
        this.jobsProcessed.inc({ queue: queueName, status: 'success' });
        this.updateQueueMetrics(queueName);
      });

      queue.on('failed', (job, error) => {
        this.jobsProcessed.inc({ queue: queueName, status: 'failed' });
        this.jobErrors.inc({ queue: queueName, error_type: error.name });
        this.updateQueueMetrics(queueName);
      });

      queue.on('stalled', (jobId) => {
        this.logger.warn(`Job ${jobId} in queue ${queueName} is stalled`);
        this.jobErrors.inc({ queue: queueName, error_type: 'stalled' });
      });

      this.queues.set(queueName, queue);
      return queue;
    } catch (error) {
      this.logger.error(`Failed to initialize queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Adds a new job to the specified queue with comprehensive tracking
   */
  public async addJob(jobData: QueueJobData): Promise<Job> {
    const { queueName, data, options, priority } = jobData;
    const queue = this.queues.get(queueName);

    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    try {
      const job = await queue.add(data, {
        ...options,
        priority,
        jobId: jobData.jobId,
        timeout: jobData.timeout,
        attempts: jobData.attempts
      });

      this.updateQueueMetrics(queueName);
      return job;
    } catch (error) {
      this.logger.error(`Failed to add job to queue ${queueName}:`, error);
      this.jobErrors.inc({ queue: queueName, error_type: 'add_failed' });
      throw error;
    }
  }

  /**
   * Sets up job processor with comprehensive monitoring
   */
  public async processQueue(queueName: string, processor: (job: Job) => Promise<void>): Promise<void> {
    const queue = this.queues.get(queueName);
    
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    try {
      const concurrency = this.getQueueConcurrency(queueName);
      
      queue.process(concurrency, async (job) => {
        const timer = this.processingTime.startTimer({ queue: queueName });
        
        try {
          await processor(job);
          timer();
        } catch (error) {
          timer();
          this.logger.error(`Error processing job ${job.id}:`, error);
          this.jobErrors.inc({ queue: queueName, error_type: 'processing_failed' });
          throw error;
        }
      });

      this.logger.log(`Processor set up for queue ${queueName} with concurrency ${concurrency}`);
    } catch (error) {
      this.logger.error(`Failed to set up processor for queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Removes a job from the queue with cleanup
   */
  public async removeJob(queueName: string, jobId: string): Promise<void> {
    const queue = this.queues.get(queueName);
    
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    try {
      const job = await queue.getJob(jobId);
      if (job) {
        await job.remove();
        this.updateQueueMetrics(queueName);
      }
    } catch (error) {
      this.logger.error(`Failed to remove job ${jobId} from queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Clears all jobs from the specified queue
   */
  public async clearQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    try {
      await queue.pause();
      await queue.empty();
      await queue.resume();
      
      this.updateQueueMetrics(queueName);
      this.logger.log(`Queue ${queueName} cleared successfully`);
    } catch (error) {
      this.logger.error(`Failed to clear queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Updates queue metrics for monitoring
   */
  private async updateQueueMetrics(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (queue) {
      const jobCounts = await queue.getJobCounts();
      this.queueSize.set({ queue: queueName }, jobCounts.waiting + jobCounts.active);
    }
  }

  /**
   * Sets up health check monitoring for queues
   */
  private setupHealthChecks(): void {
    setInterval(async () => {
      for (const [queueName, queue] of this.queues) {
        try {
          await queue.ping();
        } catch (error) {
          this.logger.error(`Health check failed for queue ${queueName}:`, error);
          this.jobErrors.inc({ queue: queueName, error_type: 'health_check_failed' });
        }
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Gets configured concurrency for specified queue
   */
  private getQueueConcurrency(queueName: string): number {
    const queueConfig = {
      'event-processing': queueConfig.queues.eventQueue.concurrency,
      'attribution-processing': queueConfig.queues.attributionQueue.concurrency,
      'analytics-processing': queueConfig.queues.analyticsQueue.concurrency
    };
    return queueConfig[queueName as keyof typeof queueConfig] || 1;
  }
}