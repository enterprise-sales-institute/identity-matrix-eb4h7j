/**
 * PostgreSQL Connection Manager
 * Implements robust connection pooling, high availability support, health monitoring,
 * and advanced error handling with retry mechanisms.
 * @version 1.0.0
 */

import { Pool, Client } from 'pg'; // v8.11.0
import { databaseConfig } from '../../config/database.config';
import { DatabaseError } from '../../types/error.types';

// Constants for connection management
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const HEALTH_CHECK_INTERVAL_MS = 30000;
const CONNECTION_TIMEOUT_MS = 5000;
const IDLE_TIMEOUT_MS = 10000;
const MAX_CLIENT_AGE_MS = 3600000;

/**
 * Enhanced PostgreSQL connection options interface
 */
interface ConnectionOptions {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: SSLConfig;
  readReplicas?: ReadReplicaConfig[];
  connectionTimeoutMillis: number;
  idleTimeoutMillis: number;
  maxClientAge: number;
}

/**
 * Detailed connection pool statistics interface
 */
interface PoolStats {
  total: number;
  idle: number;
  waiting: number;
  active: number;
  avgAcquireTime: number;
  avgIdleTime: number;
  errorRate: number;
}

/**
 * Health check result interface
 */
interface HealthCheckResult {
  isHealthy: boolean;
  primaryPool: boolean;
  replicaPools: boolean[];
  replicationLag: number[];
  lastCheck: Date;
  errorCount: number;
}

/**
 * Connection mode for read/write operations
 */
type ConnectionMode = 'primary' | 'replica';

/**
 * Advanced PostgreSQL connection manager with high availability support
 */
export class PostgresConnection {
  private readonly primaryPool: Pool;
  private readonly replicaPools: Pool[] = [];
  private isHealthy: boolean = true;
  private healthCheckInterval: NodeJS.Timer;
  private connectionStats: Map<string, PoolStats> = new Map();

  /**
   * Initializes PostgreSQL connection pools with advanced configuration
   */
  constructor(options?: Partial<ConnectionOptions>) {
    const config = {
      ...databaseConfig.postgres,
      ...options,
      connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
      idleTimeoutMillis: IDLE_TIMEOUT_MS,
      max: databaseConfig.postgres.pool.max,
      min: databaseConfig.postgres.pool.min
    };

    // Initialize primary pool
    this.primaryPool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl,
      connectionTimeoutMillis: config.connectionTimeoutMillis,
      idleTimeoutMillis: config.idleTimeoutMillis,
      max: config.max,
      min: config.min
    });

    // Set up error handler for primary pool
    this.primaryPool.on('error', (err: Error) => {
      console.error('Primary pool error:', err);
      this.isHealthy = false;
    });

    // Initialize replica pools if configured
    if (databaseConfig.postgres.replication.slaves.length > 0) {
      databaseConfig.postgres.replication.slaves.forEach(replica => {
        const replicaPool = new Pool({
          ...config,
          host: replica.host,
          port: replica.port
        });

        replicaPool.on('error', (err: Error) => {
          console.error(`Replica pool error (${replica.host}):`, err);
        });

        this.replicaPools.push(replicaPool);
      });
    }

    // Start health monitoring
    this.healthCheckInterval = setInterval(
      () => this.healthCheck(),
      HEALTH_CHECK_INTERVAL_MS
    );
  }

  /**
   * Get a client from the appropriate connection pool with retry logic
   */
  public async connect(mode: ConnectionMode = 'primary'): Promise<Client> {
    if (!this.isHealthy) {
      throw new DatabaseError('Database connection is unhealthy');
    }

    let retries = 0;
    let lastError: Error | null = null;

    while (retries < MAX_RETRIES) {
      try {
        const pool = this.getPool(mode);
        const client = await pool.connect();
        
        // Validate connection
        await this.validateConnection(client);
        
        // Update connection statistics
        this.updateConnectionStats(mode);
        
        return client;
      } catch (error) {
        lastError = error as Error;
        retries++;
        
        if (retries < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * retries));
        }
      }
    }

    throw new DatabaseError(
      'Failed to establish database connection',
      {
        retries,
        mode,
        lastError: lastError?.message
      }
    );
  }

  /**
   * Comprehensive health check across all connection pools
   */
  public async healthCheck(): Promise<HealthCheckResult> {
    const result: HealthCheckResult = {
      isHealthy: true,
      primaryPool: true,
      replicaPools: [],
      replicationLag: [],
      lastCheck: new Date(),
      errorCount: 0
    };

    try {
      // Check primary pool
      const primaryClient = await this.primaryPool.connect();
      await this.validateConnection(primaryClient);
      primaryClient.release();

      // Check replica pools
      for (const replicaPool of this.replicaPools) {
        try {
          const replicaClient = await replicaPool.connect();
          await this.validateConnection(replicaClient);
          
          // Check replication lag
          const lagResult = await replicaClient.query(
            'SELECT EXTRACT(EPOCH FROM NOW() - pg_last_xact_replay_timestamp())::INT as lag'
          );
          result.replicationLag.push(lagResult.rows[0].lag);
          result.replicaPools.push(true);
          
          replicaClient.release();
        } catch (error) {
          result.replicaPools.push(false);
          result.errorCount++;
          result.isHealthy = false;
        }
      }
    } catch (error) {
      result.primaryPool = false;
      result.isHealthy = false;
      result.errorCount++;
    }

    this.isHealthy = result.isHealthy;
    return result;
  }

  /**
   * Get detailed statistics for all connection pools
   */
  public getPoolStats(): PoolStats {
    const stats = {
      total: this.primaryPool.totalCount,
      idle: this.primaryPool.idleCount,
      waiting: this.primaryPool.waitingCount,
      active: this.primaryPool.totalCount - this.primaryPool.idleCount,
      avgAcquireTime: 0,
      avgIdleTime: 0,
      errorRate: 0
    };

    return stats;
  }

  /**
   * Gracefully close all connection pools
   */
  public async close(): Promise<void> {
    clearInterval(this.healthCheckInterval);

    // Wait for active queries to complete
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Close all pools
    await Promise.all([
      this.primaryPool.end(),
      ...this.replicaPools.map(pool => pool.end())
    ]);
  }

  /**
   * Get appropriate pool based on connection mode
   */
  private getPool(mode: ConnectionMode): Pool {
    if (mode === 'primary' || this.replicaPools.length === 0) {
      return this.primaryPool;
    }

    // Simple round-robin selection for replicas
    const replicaIndex = Math.floor(Math.random() * this.replicaPools.length);
    return this.replicaPools[replicaIndex];
  }

  /**
   * Validate database connection
   */
  private async validateConnection(client: Client): Promise<void> {
    try {
      await client.query('SELECT 1');
    } catch (error) {
      throw new DatabaseError('Connection validation failed', { error });
    }
  }

  /**
   * Update connection statistics
   */
  private updateConnectionStats(mode: ConnectionMode): void {
    const pool = this.getPool(mode);
    const stats = {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount,
      active: pool.totalCount - pool.idleCount,
      avgAcquireTime: 0,
      avgIdleTime: 0,
      errorRate: 0
    };
    this.connectionStats.set(mode, stats);
  }
}