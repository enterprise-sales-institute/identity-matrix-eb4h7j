import { Redis, Cluster } from 'ioredis'; // v5.3.2
import { CircuitBreaker } from 'opossum'; // v7.1.0
import Redlock from 'redlock'; // v5.0.0
import { RedisConnection } from '../connection';
import { LoggerService } from '../../../lib/logger/logger.service';

// Constants for cache operations
const DEFAULT_TTL = 3600; // 1 hour in seconds
const MAX_TTL = 86400; // 24 hours in seconds
const MAX_RETRIES = 3;
const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_TIMEOUT = 30000;
const LOCK_TTL = 5000; // 5 seconds

// Interface for cache operation options
interface CacheOptions {
  ttl?: number;
  useCompression?: boolean;
  useLock?: boolean;
  retryCount?: number;
}

interface SetOptions extends CacheOptions {
  nx?: boolean; // Only set if key doesn't exist
  xx?: boolean; // Only set if key exists
}

interface GetOptions extends CacheOptions {
  throwOnMiss?: boolean;
}

/**
 * Advanced repository class for Redis cache operations with comprehensive
 * error handling, circuit breaking, and distributed locking capabilities
 */
export class CacheRepository {
  private readonly client: Redis | Cluster;
  private readonly logger: LoggerService;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly lockManager: Redlock;
  private readonly retryCounters: Map<string, number>;
  private readonly maxRetries: number;

  constructor(
    private readonly connection: RedisConnection,
    private readonly loggerService: LoggerService
  ) {
    this.client = this.connection.getClient();
    this.logger = loggerService;
    this.retryCounters = new Map();
    this.maxRetries = MAX_RETRIES;

    // Initialize circuit breaker
    this.circuitBreaker = new CircuitBreaker(async () => true, {
      timeout: CIRCUIT_BREAKER_TIMEOUT,
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
    });

    // Initialize distributed lock manager
    this.lockManager = new Redlock([this.client], {
      driftFactor: 0.01,
      retryCount: 3,
      retryDelay: 200,
      retryJitter: 200,
    });

    this.setupCircuitBreakerEvents();
  }

  /**
   * Sets up circuit breaker event handlers
   */
  private setupCircuitBreakerEvents(): void {
    this.circuitBreaker.on('open', () => {
      this.logger.warn('Cache circuit breaker opened', {
        service: 'CacheRepository',
        requestId: 'system',
        correlationId: 'circuit-breaker',
      });
    });

    this.circuitBreaker.on('halfOpen', () => {
      this.logger.info('Cache circuit breaker half-open', {
        service: 'CacheRepository',
        requestId: 'system',
        correlationId: 'circuit-breaker',
      });
    });

    this.circuitBreaker.on('close', () => {
      this.logger.info('Cache circuit breaker closed', {
        service: 'CacheRepository',
        requestId: 'system',
        correlationId: 'circuit-breaker',
      });
    });
  }

  /**
   * Sets a value in the cache with comprehensive error handling and retry logic
   */
  public async set<T>(
    key: string,
    value: T,
    options: SetOptions = {}
  ): Promise<void> {
    const startTime = Date.now();
    let lock;

    try {
      // Validate inputs
      if (!key) {
        throw new Error('Cache key is required');
      }

      // Acquire distributed lock if needed
      if (options.useLock) {
        lock = await this.lockManager.acquire([`lock:${key}`], LOCK_TTL);
      }

      // Prepare value for storage
      const serializedValue = this.serialize(value);
      const ttl = Math.min(options.ttl || DEFAULT_TTL, MAX_TTL);

      // Execute cache operation through circuit breaker
      await this.circuitBreaker.fire(async () => {
        const setArgs = ['NX', 'XX'].filter(arg => options[arg.toLowerCase()]);
        
        if (setArgs.length > 0) {
          await this.client.set(key, serializedValue, ...setArgs, 'EX', ttl);
        } else {
          await this.client.setex(key, ttl, serializedValue);
        }
      });

      // Log success
      this.logger.debug('Cache set operation successful', {
        service: 'CacheRepository',
        requestId: 'system',
        correlationId: key,
        additionalContext: {
          duration: Date.now() - startTime,
          key,
          ttl,
        },
      });

    } catch (error) {
      // Handle errors with retry logic
      const retryCount = (this.retryCounters.get(key) || 0) + 1;
      this.retryCounters.set(key, retryCount);

      this.logger.error(error instanceof Error ? error : new Error(String(error)), {
        service: 'CacheRepository',
        requestId: 'system',
        correlationId: key,
        additionalContext: {
          duration: Date.now() - startTime,
          retryCount,
          operation: 'set',
        },
      });

      if (retryCount <= this.maxRetries) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 100));
        return this.set(key, value, options);
      }

      throw error;
    } finally {
      // Release lock if acquired
      if (lock) {
        await lock.release().catch(error => {
          this.logger.error(error, {
            service: 'CacheRepository',
            requestId: 'system',
            correlationId: key,
            additionalContext: { operation: 'releaseLock' },
          });
        });
      }
    }
  }

  /**
   * Retrieves a value from cache with type safety and error handling
   */
  public async get<T>(key: string, options: GetOptions = {}): Promise<T | null> {
    const startTime = Date.now();

    try {
      // Validate inputs
      if (!key) {
        throw new Error('Cache key is required');
      }

      // Execute cache operation through circuit breaker
      const result = await this.circuitBreaker.fire(async () => {
        return await this.client.get(key);
      });

      // Handle cache miss
      if (result === null) {
        if (options.throwOnMiss) {
          throw new Error(`Cache miss for key: ${key}`);
        }
        return null;
      }

      // Deserialize and return result
      const value = this.deserialize<T>(result);

      // Log success
      this.logger.debug('Cache get operation successful', {
        service: 'CacheRepository',
        requestId: 'system',
        correlationId: key,
        additionalContext: {
          duration: Date.now() - startTime,
          key,
          hit: true,
        },
      });

      return value;

    } catch (error) {
      // Handle errors with retry logic
      const retryCount = (this.retryCounters.get(key) || 0) + 1;
      this.retryCounters.set(key, retryCount);

      this.logger.error(error instanceof Error ? error : new Error(String(error)), {
        service: 'CacheRepository',
        requestId: 'system',
        correlationId: key,
        additionalContext: {
          duration: Date.now() - startTime,
          retryCount,
          operation: 'get',
        },
      });

      if (retryCount <= this.maxRetries) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 100));
        return this.get(key, options);
      }

      throw error;
    }
  }

  /**
   * Serializes a value for cache storage
   */
  private serialize<T>(value: T): string {
    try {
      return JSON.stringify(value);
    } catch (error) {
      throw new Error(`Failed to serialize cache value: ${error.message}`);
    }
  }

  /**
   * Deserializes a value from cache storage with type safety
   */
  private deserialize<T>(value: string): T {
    try {
      return JSON.parse(value) as T;
    } catch (error) {
      throw new Error(`Failed to deserialize cache value: ${error.message}`);
    }
  }
}