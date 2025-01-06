import { ClickHouse } from '@clickhouse/client'; // v0.2.0
import * as genericPool from 'generic-pool'; // v3.9.0
import { databaseConfig } from '../../config/database.config';
import { BaseError } from '../../types/error.types';
import { LoggerService } from '../../lib/logger/logger.service';

/**
 * Enhanced error class for ClickHouse connection issues
 */
export class ClickHouseConnectionError extends BaseError {
  public readonly originalError: Error;
  public readonly context: Record<string, unknown>;
  public readonly timestamp: Date;

  constructor(message: string, originalError?: Error, context: Record<string, unknown> = {}) {
    super('DATABASE_ERROR', message, {
      errorCode: 'DATABASE_ERROR',
      errorMessage: message,
      category: 'INFRASTRUCTURE',
      timestamp: new Date(),
      traceId: '',
      serviceName: 'clickhouse-connection',
      environment: process.env.NODE_ENV || 'development',
      additionalInfo: context,
      stackTrace: [],
      metadata: {}
    }, 'INFRASTRUCTURE');

    this.originalError = originalError || new Error(message);
    this.context = context;
    this.timestamp = new Date();
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Interface for ClickHouse connection options
 */
export interface ClickHouseConnectionOptions {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  pool: {
    min: number;
    max: number;
    idleTimeoutMillis: number;
  };
  tls?: {
    ca?: string;
    cert?: string;
    key?: string;
  };
  monitoring?: {
    healthCheckInterval: number;
    timeout: number;
  };
}

/**
 * Advanced ClickHouse connection manager with comprehensive pooling and monitoring
 */
export class ClickHouseConnection {
  private readonly connectionPool: genericPool.Pool<ClickHouse>;
  private readonly config: typeof databaseConfig.clickhouse;
  private readonly logger: LoggerService;
  private readonly healthCheckInterval: NodeJS.Timeout;
  private readonly metrics: {
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    waitingRequests: number;
    failedHealthChecks: number;
  };
  private isShuttingDown: boolean = false;

  constructor(config = databaseConfig.clickhouse, logger: LoggerService) {
    this.config = config;
    this.logger = logger;
    this.metrics = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      waitingRequests: 0,
      failedHealthChecks: 0
    };

    // Initialize connection pool
    this.connectionPool = genericPool.createPool({
      create: async (): Promise<ClickHouse> => {
        try {
          const client = new ClickHouse({
            host: this.config.host,
            port: this.config.port,
            username: this.config.username,
            password: this.config.password,
            database: this.config.database,
            compression: this.config.compression,
            tls: this.config.cluster.nodes.length > 0 ? {
              rejectUnauthorized: true,
              ...this.config.cluster.nodes[0]
            } : undefined
          });

          await this.healthCheck(client);
          this.metrics.totalConnections++;
          return client;
        } catch (error) {
          this.logger.error('Failed to create ClickHouse connection', {
            service: 'clickhouse-connection',
            requestId: '',
            correlationId: '',
            additionalContext: { error }
          });
          throw new ClickHouseConnectionError('Failed to create connection', error as Error);
        }
      },
      destroy: async (client: ClickHouse): Promise<void> => {
        try {
          await client.close();
          this.metrics.totalConnections--;
        } catch (error) {
          this.logger.error('Error destroying ClickHouse connection', {
            service: 'clickhouse-connection',
            requestId: '',
            correlationId: '',
            additionalContext: { error }
          });
        }
      }
    }, {
      min: this.config.pool.min,
      max: this.config.pool.max,
      idleTimeoutMillis: this.config.pool.idleTimeoutMillis,
      acquireTimeoutMillis: 30000,
      evictionRunIntervalMillis: 60000,
      numTestsPerEvictionRun: 3,
      softIdleTimeoutMillis: 300000
    });

    // Setup pool event handlers
    this.connectionPool.on('factoryCreateError', (error: Error) => {
      this.logger.error('Connection factory creation error', {
        service: 'clickhouse-connection',
        requestId: '',
        correlationId: '',
        additionalContext: { error }
      });
    });

    this.connectionPool.on('factoryDestroyError', (error: Error) => {
      this.logger.error('Connection factory destruction error', {
        service: 'clickhouse-connection',
        requestId: '',
        correlationId: '',
        additionalContext: { error }
      });
    });

    // Initialize health check interval
    this.healthCheckInterval = setInterval(
      () => this.performPoolHealthCheck(),
      300000 // 5 minutes
    );

    // Setup graceful shutdown
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
  }

  /**
   * Acquires a connection from the pool with health validation
   */
  public async getConnection(): Promise<ClickHouse> {
    if (this.isShuttingDown) {
      throw new ClickHouseConnectionError('Connection pool is shutting down');
    }

    try {
      const connection = await this.connectionPool.acquire();
      this.metrics.activeConnections++;
      this.metrics.idleConnections--;
      return connection;
    } catch (error) {
      this.logger.error('Failed to acquire connection', {
        service: 'clickhouse-connection',
        requestId: '',
        correlationId: '',
        additionalContext: { error }
      });
      throw new ClickHouseConnectionError('Failed to acquire connection', error as Error);
    }
  }

  /**
   * Releases a connection back to the pool
   */
  public async releaseConnection(connection: ClickHouse): Promise<void> {
    try {
      await this.connectionPool.release(connection);
      this.metrics.activeConnections--;
      this.metrics.idleConnections++;
    } catch (error) {
      this.logger.error('Failed to release connection', {
        service: 'clickhouse-connection',
        requestId: '',
        correlationId: '',
        additionalContext: { error }
      });
      throw new ClickHouseConnectionError('Failed to release connection', error as Error);
    }
  }

  /**
   * Performs health check on a connection
   */
  public async healthCheck(connection: ClickHouse): Promise<boolean> {
    try {
      const startTime = Date.now();
      await connection.ping();
      const queryResult = await connection.query({ query: 'SELECT 1' });
      await queryResult.json();
      
      const responseTime = Date.now() - startTime;
      const isHealthy = responseTime < 1000; // 1 second threshold

      if (!isHealthy) {
        this.metrics.failedHealthChecks++;
        this.logger.warn('Connection health check exceeded threshold', {
          service: 'clickhouse-connection',
          requestId: '',
          correlationId: '',
          additionalContext: { responseTime }
        });
      }

      return isHealthy;
    } catch (error) {
      this.metrics.failedHealthChecks++;
      this.logger.error('Connection health check failed', {
        service: 'clickhouse-connection',
        requestId: '',
        correlationId: '',
        additionalContext: { error }
      });
      return false;
    }
  }

  /**
   * Gracefully shuts down the connection pool
   */
  public async shutdown(): Promise<void> {
    if (this.isShuttingDown) return;

    this.isShuttingDown = true;
    this.logger.info('Initiating ClickHouse connection pool shutdown', {
      service: 'clickhouse-connection',
      requestId: '',
      correlationId: '',
      additionalContext: this.metrics
    });

    clearInterval(this.healthCheckInterval);

    try {
      await this.connectionPool.drain();
      await this.connectionPool.clear();
    } catch (error) {
      this.logger.error('Error during connection pool shutdown', {
        service: 'clickhouse-connection',
        requestId: '',
        correlationId: '',
        additionalContext: { error }
      });
    }
  }

  /**
   * Performs health check on all idle connections in the pool
   */
  private async performPoolHealthCheck(): Promise<void> {
    if (this.isShuttingDown) return;

    try {
      const connection = await this.getConnection();
      const isHealthy = await this.healthCheck(connection);
      await this.releaseConnection(connection);

      if (!isHealthy) {
        this.logger.warn('Pool health check failed, initiating recovery', {
          service: 'clickhouse-connection',
          requestId: '',
          correlationId: '',
          additionalContext: this.metrics
        });
        await this.connectionPool.clear();
      }
    } catch (error) {
      this.logger.error('Failed to perform pool health check', {
        service: 'clickhouse-connection',
        requestId: '',
        correlationId: '',
        additionalContext: { error }
      });
    }
  }
}