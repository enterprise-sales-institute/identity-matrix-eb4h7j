import { Redis, Cluster } from 'ioredis'; // v5.3.2
import { CircuitBreaker } from 'opossum'; // v6.0.0
import { RedisConfig } from '../../types/config.types';
import { cacheConfig } from '../../config/cache.config';
import { LoggerService } from '../../lib/logger/logger.service';

// Constants for connection management
const REDIS_RECONNECT_DELAY = 5000;
const REDIS_MAX_RETRIES = 5;
const REDIS_CONNECT_TIMEOUT = 10000;
const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_TIMEOUT = 30000;
const CONNECTION_POOL_MIN = 5;
const CONNECTION_POOL_MAX = 50;
const HEALTH_CHECK_INTERVAL = 30000;

// Types for connection management
interface ConnectionMetrics {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingRequests: number;
  latency: number;
  lastHealthCheck: Date;
}

interface HealthStatus {
  isHealthy: boolean;
  latency: number;
  circuitBreakerStatus: string;
  activeConnections: number;
  lastChecked: Date;
  details?: any;
}

/**
 * Manages Redis connections with advanced features including connection pooling,
 * circuit breaker pattern, and health monitoring
 */
export class RedisConnection {
  private client: Redis | Cluster;
  private readonly config: RedisConfig;
  private readonly logger: LoggerService;
  private isConnected: boolean = false;
  private circuitBreaker: CircuitBreaker;
  private metrics: ConnectionMetrics = {
    totalConnections: 0,
    activeConnections: 0,
    idleConnections: 0,
    waitingRequests: 0,
    latency: 0,
    lastHealthCheck: new Date()
  };

  constructor(config: RedisConfig = cacheConfig.redis, logger: LoggerService) {
    this.config = config;
    this.logger = logger;
    this.initializeCircuitBreaker();
  }

  /**
   * Initializes the circuit breaker for fault tolerance
   */
  private initializeCircuitBreaker(): void {
    this.circuitBreaker = new CircuitBreaker(async () => {
      return this.client.ping();
    }, {
      timeout: CIRCUIT_BREAKER_TIMEOUT,
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
    });

    this.circuitBreaker.on('open', () => {
      this.logger.warn('Redis circuit breaker opened', {
        service: 'RedisConnection',
        requestId: 'system',
        correlationId: 'circuit-breaker'
      });
    });
  }

  /**
   * Establishes connection to Redis with retry logic and warm-up
   */
  public async connect(): Promise<void> {
    try {
      if (this.config.cluster?.enabled) {
        this.client = new Cluster(this.config.cluster.nodes.map(node => ({
          host: node.host,
          port: node.port,
          password: this.config.password,
          tls: this.config.security?.tls ? {
            ...this.config.security.tlsConfig,
            rejectUnauthorized: false
          } : undefined
        })), {
          maxRedirections: 16,
          retryDelayOnFailover: REDIS_RECONNECT_DELAY,
          scaleReads: 'slave',
          redisOptions: {
            connectTimeout: REDIS_CONNECT_TIMEOUT,
            retryStrategy: (times: number) => {
              if (times > REDIS_MAX_RETRIES) return null;
              return Math.min(times * REDIS_RECONNECT_DELAY, 5000);
            }
          }
        });
      } else {
        this.client = new Redis({
          host: this.config.host,
          port: this.config.port,
          password: this.config.password,
          db: this.config.db,
          connectTimeout: REDIS_CONNECT_TIMEOUT,
          retryStrategy: (times: number) => {
            if (times > REDIS_MAX_RETRIES) return null;
            return Math.min(times * REDIS_RECONNECT_DELAY, 5000);
          },
          tls: this.config.security?.tls ? {
            ...this.config.security.tlsConfig,
            rejectUnauthorized: false
          } : undefined
        });
      }

      // Set up event listeners
      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.info('Redis connected successfully', {
          service: 'RedisConnection',
          requestId: 'system',
          correlationId: 'connection'
        });
      });

      this.client.on('error', (error) => {
        this.logger.error(error, {
          service: 'RedisConnection',
          requestId: 'system',
          correlationId: 'error'
        });
      });

      // Initialize connection monitoring
      this.startHealthCheck();

      await this.warmUpConnection();
    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), {
        service: 'RedisConnection',
        requestId: 'system',
        correlationId: 'connection-error'
      });
      throw error;
    }
  }

  /**
   * Performs connection warm-up to ensure readiness
   */
  private async warmUpConnection(): Promise<void> {
    try {
      await this.client.ping();
      this.updateMetrics();
    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), {
        service: 'RedisConnection',
        requestId: 'system',
        correlationId: 'warmup-error'
      });
      throw error;
    }
  }

  /**
   * Updates connection metrics
   */
  private updateMetrics(): void {
    const info = (this.client as Redis).info();
    info.then((result) => {
      const metrics = result.split('\n').reduce((acc: any, line) => {
        const [key, value] = line.split(':');
        if (key && value) acc[key.trim()] = value.trim();
        return acc;
      }, {});

      this.metrics = {
        ...this.metrics,
        totalConnections: parseInt(metrics.connected_clients || '0'),
        activeConnections: parseInt(metrics.connected_clients || '0') - parseInt(metrics.blocked_clients || '0'),
        idleConnections: parseInt(metrics.blocked_clients || '0'),
        lastHealthCheck: new Date()
      };
    }).catch((error) => {
      this.logger.error(error, {
        service: 'RedisConnection',
        requestId: 'system',
        correlationId: 'metrics-error'
      });
    });
  }

  /**
   * Starts periodic health checking
   */
  private startHealthCheck(): void {
    setInterval(async () => {
      try {
        const status = await this.healthCheck();
        if (!status.isHealthy) {
          this.logger.warn('Redis health check failed', {
            service: 'RedisConnection',
            requestId: 'system',
            correlationId: 'health-check',
            additionalContext: status
          });
        }
      } catch (error) {
        this.logger.error(error instanceof Error ? error : new Error(String(error)), {
          service: 'RedisConnection',
          requestId: 'system',
          correlationId: 'health-check-error'
        });
      }
    }, HEALTH_CHECK_INTERVAL);
  }

  /**
   * Performs comprehensive health check
   */
  public async healthCheck(): Promise<HealthStatus> {
    const start = Date.now();
    try {
      await this.circuitBreaker.fire();
      const latency = Date.now() - start;

      const status: HealthStatus = {
        isHealthy: this.isConnected,
        latency,
        circuitBreakerStatus: this.circuitBreaker.status,
        activeConnections: this.metrics.activeConnections,
        lastChecked: new Date(),
        details: { ...this.metrics }
      };

      return status;
    } catch (error) {
      return {
        isHealthy: false,
        latency: Date.now() - start,
        circuitBreakerStatus: this.circuitBreaker.status,
        activeConnections: this.metrics.activeConnections,
        lastChecked: new Date(),
        details: error
      };
    }
  }

  /**
   * Gracefully disconnects from Redis
   */
  public async disconnect(): Promise<void> {
    try {
      await this.client.quit();
      this.isConnected = false;
      this.logger.info('Redis disconnected successfully', {
        service: 'RedisConnection',
        requestId: 'system',
        correlationId: 'disconnect'
      });
    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), {
        service: 'RedisConnection',
        requestId: 'system',
        correlationId: 'disconnect-error'
      });
      throw error;
    }
  }

  /**
   * Returns the Redis client instance
   */
  public getClient(): Redis | Cluster {
    return this.client;
  }

  /**
   * Returns current connection metrics
   */
  public getMetrics(): ConnectionMetrics {
    return { ...this.metrics };
  }
}