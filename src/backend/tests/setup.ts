/**
 * Global test setup configuration for the Multi-Touch Attribution Analytics Tool
 * Handles test environment initialization, database connections, and cleanup procedures
 * with enhanced security, monitoring, and error handling capabilities.
 * @version 1.0.0
 */

import { beforeAll, afterAll } from '@jest/globals'; // v29.0.0
import { config } from 'dotenv'; // v16.0.0
import { PostgresConnection } from '../src/database/postgres/connection';
import { RedisConnection } from '../src/database/redis/connection';
import { ClickHouseConnection } from '../src/database/clickhouse/connection';
import { LoggerService } from '../src/lib/logger/logger.service';

// Initialize test environment variables
config({ path: '.env.test' });

// Global test timeouts
const SETUP_TIMEOUT = 30000;
const TEARDOWN_TIMEOUT = 20000;
const CONNECTION_TIMEOUT = 10000;

// Test database configuration
const TEST_DB_PREFIX = 'test_';

// Initialize global connections and logger
let postgresConnection: PostgresConnection;
let redisConnection: RedisConnection;
let clickhouseConnection: ClickHouseConnection;
let testLogger: LoggerService;

/**
 * Initializes the test environment with enhanced security and monitoring
 */
export const setupTestEnvironment = async (): Promise<void> => {
  try {
    // Initialize test logger
    testLogger = new LoggerService({
      level: 'debug',
      prettyPrint: true,
      destination: 'stdout',
      redaction: {
        paths: ['password', 'token', 'secret'],
        censor: '[REDACTED]',
        remove: false
      },
      rotation: {
        size: '10M',
        interval: '1d',
        compress: false
      },
      performance: {
        batchSize: 100,
        flushInterval: 1000,
        compression: false
      }
    });

    // Initialize database connections
    postgresConnection = new PostgresConnection({
      host: process.env.TEST_POSTGRES_HOST,
      port: parseInt(process.env.TEST_POSTGRES_PORT || '5432'),
      database: `${TEST_DB_PREFIX}${process.env.POSTGRES_DB}`,
      username: process.env.TEST_POSTGRES_USER,
      password: process.env.TEST_POSTGRES_PASSWORD,
      ssl: { rejectUnauthorized: false }
    });

    redisConnection = new RedisConnection({
      host: process.env.TEST_REDIS_HOST,
      port: parseInt(process.env.TEST_REDIS_PORT || '6379'),
      password: process.env.TEST_REDIS_PASSWORD,
      db: parseInt(process.env.TEST_REDIS_DB || '1')
    }, testLogger);

    clickhouseConnection = new ClickHouseConnection({
      host: process.env.TEST_CLICKHOUSE_HOST,
      port: parseInt(process.env.TEST_CLICKHOUSE_PORT || '8123'),
      username: process.env.TEST_CLICKHOUSE_USER,
      password: process.env.TEST_CLICKHOUSE_PASSWORD,
      database: `${TEST_DB_PREFIX}${process.env.CLICKHOUSE_DB}`
    }, testLogger);

    // Connect to databases with validation
    await Promise.all([
      postgresConnection.connect(),
      redisConnection.connect(),
      clickhouseConnection.getConnection()
    ]);

    // Verify connections are healthy
    const healthChecks = await Promise.all([
      postgresConnection.healthCheck(),
      redisConnection.healthCheck(),
      clickhouseConnection.healthCheck(await clickhouseConnection.getConnection())
    ]);

    if (!healthChecks.every(check => check.isHealthy || check === true)) {
      throw new Error('Database health checks failed during setup');
    }

    testLogger.info('Test environment initialized successfully', {
      service: 'test-setup',
      requestId: 'setup',
      correlationId: 'init',
      additionalContext: { environment: 'test' }
    });
  } catch (error) {
    testLogger.error('Failed to initialize test environment', {
      service: 'test-setup',
      requestId: 'setup',
      correlationId: 'init',
      additionalContext: { error }
    });
    throw error;
  }
};

/**
 * Cleans up test environment and releases resources
 */
export const teardownTestEnvironment = async (): Promise<void> => {
  try {
    // Clear test data
    await Promise.all([
      postgresConnection.clearTestData(),
      redisConnection.flushTestData(),
      (await clickhouseConnection.getConnection()).query({
        query: `DROP DATABASE IF EXISTS ${TEST_DB_PREFIX}${process.env.CLICKHOUSE_DB}`
      })
    ]);

    // Close connections
    await Promise.all([
      postgresConnection.close(),
      redisConnection.disconnect(),
      clickhouseConnection.shutdown()
    ]);

    testLogger.info('Test environment cleaned up successfully', {
      service: 'test-setup',
      requestId: 'teardown',
      correlationId: 'cleanup',
      additionalContext: { environment: 'test' }
    });
  } catch (error) {
    testLogger.error('Failed to clean up test environment', {
      service: 'test-setup',
      requestId: 'teardown',
      correlationId: 'cleanup',
      additionalContext: { error }
    });
    throw error;
  }
};

/**
 * Global setup executed before all test suites
 */
export const beforeAllTests = async (): Promise<void> => {
  jest.setTimeout(SETUP_TIMEOUT);
  await setupTestEnvironment();
};

/**
 * Global cleanup executed after all test suites
 */
export const afterAllTests = async (): Promise<void> => {
  jest.setTimeout(TEARDOWN_TIMEOUT);
  await teardownTestEnvironment();
};

// Configure global setup and teardown
beforeAll(async () => {
  await beforeAllTests();
}, SETUP_TIMEOUT);

afterAll(async () => {
  await afterAllTests();
}, TEARDOWN_TIMEOUT);