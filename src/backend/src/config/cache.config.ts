/**
 * Advanced Redis cache configuration module
 * Supports standalone and cluster modes with comprehensive security and HA features
 * @version 1.0.0
 */

import { config } from 'dotenv'; // v16.0.0
import { RedisConfig } from '../types/config.types';

// Load environment variables
config();

// Default configuration constants
const REDIS_DEFAULT_PORT = 6379;
const REDIS_DEFAULT_DB = 0;
const REDIS_RETRY_MAX_ATTEMPTS = 5;
const REDIS_RETRY_DELAY = 1000;
const REDIS_POOL_MIN_SIZE = 5;
const REDIS_POOL_MAX_SIZE = 50;

/**
 * Validates Redis configuration parameters
 * @param config Redis configuration object
 * @returns boolean indicating if configuration is valid
 */
const validateRedisConfig = (config: RedisConfig): boolean => {
  if (!config.host) {
    throw new Error('Redis host configuration is required');
  }

  if (config.port && (config.port < 1 || config.port > 65535)) {
    throw new Error('Redis port must be between 1 and 65535');
  }

  if (config.cluster?.enabled && (!config.cluster.nodes || config.cluster.nodes.length === 0)) {
    throw new Error('Cluster nodes must be specified when cluster mode is enabled');
  }

  if (config.sentinel?.enabled && (!config.sentinel.masters || !config.sentinel.sentinels)) {
    throw new Error('Sentinel configuration requires master and sentinel nodes');
  }

  return true;
};

/**
 * Generates Redis connection string based on configuration
 * @param config Redis configuration object
 * @returns Formatted connection string
 */
const generateConnectionString = (config: RedisConfig): string => {
  const protocol = config.security?.tls ? 'rediss://' : 'redis://';
  const auth = config.password ? `${encodeURIComponent(config.password)}@` : '';
  const host = config.host;
  const port = config.port || REDIS_DEFAULT_PORT;
  const db = config.db || REDIS_DEFAULT_DB;

  return `${protocol}${auth}${host}:${port}/${db}`;
};

/**
 * Comprehensive Redis cache configuration
 * Supports standalone, cluster, and sentinel modes with advanced features
 */
export const cacheConfig = {
  redis: {
    // Basic connection settings
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT!) || REDIS_DEFAULT_PORT,
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB!) || REDIS_DEFAULT_DB,

    // Cluster configuration
    cluster: {
      enabled: process.env.REDIS_CLUSTER_ENABLED === 'true',
      nodes: process.env.REDIS_CLUSTER_NODES?.split(',') || [],
      replicas: parseInt(process.env.REDIS_CLUSTER_REPLICAS!) || 1,
      readFromReplicas: process.env.REDIS_READ_REPLICAS === 'true'
    },

    // Sentinel configuration for high availability
    sentinel: {
      enabled: process.env.REDIS_SENTINEL_ENABLED === 'true',
      masters: process.env.REDIS_SENTINEL_MASTER_NAME!,
      sentinels: process.env.REDIS_SENTINEL_NODES?.split(',').map(node => {
        const [host, port] = node.split(':');
        return { host, port: parseInt(port) };
      }) || []
    },

    // Security configuration
    security: {
      tls: process.env.REDIS_SSL_ENABLED === 'true',
      tlsConfig: process.env.REDIS_SSL_ENABLED === 'true' ? {
        cert: process.env.REDIS_SSL_CERT!,
        key: process.env.REDIS_SSL_KEY!,
        ca: process.env.REDIS_SSL_CA!
      } : undefined
    },

    // Connection pool settings
    connectionPool: {
      minSize: parseInt(process.env.REDIS_POOL_MIN_SIZE!) || REDIS_POOL_MIN_SIZE,
      maxSize: parseInt(process.env.REDIS_POOL_MAX_SIZE!) || REDIS_POOL_MAX_SIZE,
      idleTimeoutMillis: parseInt(process.env.REDIS_POOL_IDLE_TIMEOUT!) || 30000
    },

    // Retry configuration
    retry: {
      maxAttempts: parseInt(process.env.REDIS_RETRY_MAX_ATTEMPTS!) || REDIS_RETRY_MAX_ATTEMPTS,
      delay: parseInt(process.env.REDIS_RETRY_DELAY!) || REDIS_RETRY_DELAY
    },

    // Monitoring and observability
    monitoring: {
      metrics: process.env.REDIS_METRICS_ENABLED === 'true',
      logging: process.env.REDIS_LOGGING_ENABLED === 'true',
      alerting: process.env.REDIS_ALERTING_ENABLED === 'true'
    }
  } as RedisConfig
};

// Validate configuration on module load
validateRedisConfig(cacheConfig.redis);

export default cacheConfig;