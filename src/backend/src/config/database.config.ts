/**
 * Database Configuration Module
 * Provides centralized configuration for PostgreSQL, ClickHouse, and Redis databases
 * with support for high availability, connection pooling, and security features
 * @version 1.0.0
 */

import { config } from 'dotenv'; // v16.0.3
import { DatabaseConfig } from '../types/config.types';

// Initialize environment variables
config();

// Default configuration constants
const DEFAULT_POSTGRES_PORT = 5432;
const DEFAULT_CLICKHOUSE_PORT = 8123;
const DEFAULT_REDIS_PORT = 6379;
const DEFAULT_POOL_MIN = 2;
const DEFAULT_POOL_MAX = 10;
const DEFAULT_POOL_IDLE_TIMEOUT = 10000;
const DEFAULT_CONNECTION_TIMEOUT = 5000;
const DEFAULT_RETRY_ATTEMPTS = 3;
const DEFAULT_REPLICA_COUNT = 2;
const DEFAULT_HEALTH_CHECK_INTERVAL = 30000;

/**
 * Enhanced connection pool configuration interface
 */
interface PoolConfig {
  min: number;
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
  healthCheckIntervalMillis: number;
  retryAttempts: number;
}

/**
 * High availability configuration interface
 */
interface HighAvailabilityConfig {
  enabled: boolean;
  replicaCount: number;
  failoverTimeoutMillis: number;
  loadBalancingStrategy: string;
}

/**
 * Validates database configuration parameters
 * @param config DatabaseConfig object to validate
 * @returns boolean indicating if configuration is valid
 */
export const validateDatabaseConfig = (config: DatabaseConfig): boolean => {
  try {
    // Validate PostgreSQL configuration
    if (!config.postgres.host || !config.postgres.username || !config.postgres.password) {
      throw new Error('Invalid PostgreSQL configuration');
    }

    // Validate ClickHouse configuration
    if (!config.clickhouse.host || !config.clickhouse.username || !config.clickhouse.password) {
      throw new Error('Invalid ClickHouse configuration');
    }

    // Validate Redis configuration
    if (!config.redis.host || (config.redis.password === undefined && !config.redis.cluster.enabled)) {
      throw new Error('Invalid Redis configuration');
    }

    // Validate pool configurations
    if (config.postgres.pool.min > config.postgres.pool.max ||
        config.clickhouse.pool.min > config.clickhouse.pool.max) {
      throw new Error('Invalid pool configuration');
    }

    return true;
  } catch (error) {
    console.error('Database configuration validation failed:', error);
    return false;
  }
};

/**
 * Initializes database connection pools
 * @param config DatabaseConfig object
 */
export const initializeConnectionPools = async (config: DatabaseConfig): Promise<void> => {
  try {
    // Connection pool initialization logic would go here
    // This is a placeholder for the actual implementation
    console.log('Initializing database connection pools...');
  } catch (error) {
    console.error('Failed to initialize connection pools:', error);
    throw error;
  }
};

/**
 * Database configuration object
 * Includes comprehensive settings for all database systems
 */
export const databaseConfig: DatabaseConfig = {
  postgres: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '') || DEFAULT_POSTGRES_PORT,
    database: process.env.POSTGRES_DB || 'attribution',
    username: process.env.POSTGRES_USER || '',
    password: process.env.POSTGRES_PASSWORD || '',
    ssl: {
      rejectUnauthorized: process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED === 'true',
      ca: process.env.POSTGRES_SSL_CA,
      key: process.env.POSTGRES_SSL_KEY,
      cert: process.env.POSTGRES_SSL_CERT
    },
    pool: {
      min: parseInt(process.env.POSTGRES_POOL_MIN || '') || DEFAULT_POOL_MIN,
      max: parseInt(process.env.POSTGRES_POOL_MAX || '') || DEFAULT_POOL_MAX,
      idleTimeoutMillis: parseInt(process.env.POSTGRES_POOL_IDLE_TIMEOUT || '') || DEFAULT_POOL_IDLE_TIMEOUT,
      connectionTimeoutMillis: parseInt(process.env.POSTGRES_CONNECTION_TIMEOUT || '') || DEFAULT_CONNECTION_TIMEOUT
    },
    replication: {
      master: {
        host: process.env.POSTGRES_PRIMARY_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT || '') || DEFAULT_POSTGRES_PORT
      },
      slaves: process.env.POSTGRES_READ_REPLICAS?.split(',').map(host => ({
        host,
        port: parseInt(process.env.POSTGRES_PORT || '') || DEFAULT_POSTGRES_PORT
      })) || []
    }
  },
  clickhouse: {
    host: process.env.CLICKHOUSE_HOST || 'localhost',
    port: parseInt(process.env.CLICKHOUSE_PORT || '') || DEFAULT_CLICKHOUSE_PORT,
    database: process.env.CLICKHOUSE_DB || 'attribution_analytics',
    username: process.env.CLICKHOUSE_USER || '',
    password: process.env.CLICKHOUSE_PASSWORD || '',
    pool: {
      min: parseInt(process.env.CLICKHOUSE_POOL_MIN || '') || DEFAULT_POOL_MIN,
      max: parseInt(process.env.CLICKHOUSE_POOL_MAX || '') || DEFAULT_POOL_MAX,
      idleTimeoutMillis: parseInt(process.env.CLICKHOUSE_POOL_IDLE_TIMEOUT || '') || DEFAULT_POOL_IDLE_TIMEOUT
    },
    compression: {
      method: (process.env.CLICKHOUSE_COMPRESSION_METHOD as 'lz4' | 'zstd') || 'lz4',
      level: parseInt(process.env.CLICKHOUSE_COMPRESSION_LEVEL || '1')
    },
    cluster: {
      name: process.env.CLICKHOUSE_CLUSTER_NAME || 'attribution_cluster',
      nodes: process.env.CLICKHOUSE_CLUSTER_NODES?.split(',').map(node => {
        const [host, port] = node.split(':');
        return {
          host,
          port: parseInt(port) || DEFAULT_CLICKHOUSE_PORT
        };
      }) || []
    }
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '') || DEFAULT_REDIS_PORT,
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB || '0'),
    cluster: {
      nodes: process.env.REDIS_CLUSTER_NODES?.split(',').map(node => {
        const [host, port] = node.split(':');
        return {
          host,
          port: parseInt(port) || DEFAULT_REDIS_PORT
        };
      }) || [],
      options: {
        maxRedirections: parseInt(process.env.REDIS_MAX_REDIRECTIONS || '16'),
        retryDelayMs: parseInt(process.env.REDIS_RETRY_DELAY || '100')
      }
    },
    sentinel: {
      masters: process.env.REDIS_SENTINEL_MASTER_NAME || 'mymaster',
      sentinels: process.env.REDIS_SENTINEL_NODES?.split(',').map(node => {
        const [host, port] = node.split(':');
        return {
          host,
          port: parseInt(port) || 26379
        };
      }) || []
    },
    security: {
      tls: process.env.REDIS_TLS_ENABLED === 'true',
      tlsConfig: process.env.REDIS_TLS_ENABLED === 'true' ? {
        cert: process.env.REDIS_TLS_CERT || '',
        key: process.env.REDIS_TLS_KEY || '',
        ca: process.env.REDIS_TLS_CA || ''
      } : undefined
    }
  },
  migrations: {
    directory: process.env.DB_MIGRATIONS_DIR || './migrations',
    tableName: process.env.DB_MIGRATIONS_TABLE || 'migrations',
    schemaName: process.env.DB_MIGRATIONS_SCHEMA,
    transactional: true
  },
  backup: {
    enabled: process.env.DB_BACKUP_ENABLED === 'true',
    schedule: process.env.DB_BACKUP_SCHEDULE || '0 0 * * *',
    retention: parseInt(process.env.DB_BACKUP_RETENTION || '7'),
    path: process.env.DB_BACKUP_PATH || './backups',
    compress: process.env.DB_BACKUP_COMPRESS === 'true'
  }
};

// Validate configuration on module load
if (!validateDatabaseConfig(databaseConfig)) {
  throw new Error('Invalid database configuration');
}

export default databaseConfig;