import pino, { Logger, LoggerOptions } from 'pino'; // v8.14.1
import pinoElasticsearch from 'pino-elasticsearch'; // v6.3.0
import pinoPretty from 'pino-pretty'; // v9.1.0

// Type Definitions
export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

export interface RedactionConfig {
  paths: string[];
  censor: string;
  remove: boolean;
}

export interface RotationConfig {
  size: string;
  interval: string;
  compress: boolean;
}

export interface PerformanceConfig {
  batchSize: number;
  flushInterval: number;
  compression: boolean;
}

export interface ElasticsearchConfig {
  node: string;
  index: string;
  flushBytes: number;
  flushInterval: number;
  retryCount: number;
  timeout: number;
  auth: {
    username: string;
    password: string;
  };
  tls: {
    rejectUnauthorized: boolean;
    ca?: string;
    cert?: string;
    key?: string;
  };
}

export interface LoggerConfig {
  level: LogLevel;
  prettyPrint: boolean;
  destination: string;
  elasticsearchConfig?: ElasticsearchConfig;
  redaction: RedactionConfig;
  rotation: RotationConfig;
  performance: PerformanceConfig;
}

// Constants
const DEFAULT_LOG_LEVEL: LogLevel = 'info';
const ELASTICSEARCH_INDEX = 'attribution-analytics-logs';
const DEFAULT_BATCH_SIZE = 1000;
const DEFAULT_FLUSH_INTERVAL = 30000;
const PII_PATHS = ['user.email', 'user.phone', 'payment.card'];

/**
 * Validates logger configuration completeness and correctness
 * @param config Logger configuration object
 * @returns boolean indicating validation result
 */
const validateConfig = (config: LoggerConfig): boolean => {
  if (!config.level || !config.redaction || !config.rotation || !config.performance) {
    return false;
  }

  if (config.elasticsearchConfig) {
    const { elasticsearchConfig } = config;
    if (!elasticsearchConfig.node || !elasticsearchConfig.index || 
        !elasticsearchConfig.auth.username || !elasticsearchConfig.auth.password) {
      return false;
    }
  }

  return true;
};

/**
 * Generates environment-specific logger configuration
 * @returns LoggerConfig object with environment-specific settings
 */
const getLoggerConfig = (): LoggerConfig => {
  const isProd = process.env.NODE_ENV === 'production';
  
  const config: LoggerConfig = {
    level: (process.env.LOG_LEVEL as LogLevel) || DEFAULT_LOG_LEVEL,
    prettyPrint: !isProd,
    destination: isProd ? 'pino.log' : 'stdout',
    redaction: {
      paths: PII_PATHS,
      censor: '[REDACTED]',
      remove: false
    },
    rotation: {
      size: process.env.LOG_ROTATION_SIZE || '100M',
      interval: process.env.LOG_ROTATION_INTERVAL || '1d',
      compress: isProd
    },
    performance: {
      batchSize: Number(process.env.BATCH_SIZE) || DEFAULT_BATCH_SIZE,
      flushInterval: Number(process.env.FLUSH_INTERVAL) || DEFAULT_FLUSH_INTERVAL,
      compression: isProd
    }
  };

  if (isProd && process.env.ELASTICSEARCH_URL) {
    config.elasticsearchConfig = {
      node: process.env.ELASTICSEARCH_URL,
      index: ELASTICSEARCH_INDEX,
      flushBytes: 1000000,
      flushInterval: 30000,
      retryCount: 5,
      timeout: 30000,
      auth: {
        username: process.env.ELASTICSEARCH_USERNAME || '',
        password: process.env.ELASTICSEARCH_PASSWORD || ''
      },
      tls: {
        rejectUnauthorized: true
      }
    };
  }

  if (!validateConfig(config)) {
    throw new Error('Invalid logger configuration');
  }

  return config;
};

/**
 * Creates and configures a Pino logger instance based on environment
 * @returns Configured Logger instance
 */
export const createLogger = (): Logger => {
  const config = getLoggerConfig();
  const options: LoggerOptions = {
    level: config.level,
    redact: config.redaction.paths,
    timestamp: true,
    formatters: {
      level: (label) => ({ level: label.toUpperCase() })
    },
    serializers: {
      err: pino.stdSerializers.err,
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res
    }
  };

  if (config.prettyPrint) {
    return pino(options, pinoPretty({
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }));
  }

  const streams: any[] = [{ stream: process.stdout }];

  if (config.elasticsearchConfig) {
    const elasticsearchStream = pinoElasticsearch({
      ...config.elasticsearchConfig,
      pipeline: 'gzip',
      sync: false
    });
    streams.push({ stream: elasticsearchStream });
  }

  return pino(options, pino.multistream(streams));
};

export default createLogger;