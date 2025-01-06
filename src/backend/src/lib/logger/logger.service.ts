import pino, { Logger } from 'pino'; // v8.14.1
import pinoElasticsearch from 'pino-elasticsearch'; // v6.3.0
import { LoggerConfig, LogLevel } from '../../config/logger.config';
import defaultLoggerConfig from '../../config/logger.config';

/**
 * Interface for structured logging context
 */
export interface LogContext {
  service: string;
  requestId: string;
  userId?: string;
  correlationId: string;
  additionalContext?: Record<string, any>;
}

/**
 * Enhanced logging service with security features, performance optimizations,
 * and ELK stack integration for enterprise-grade logging capabilities.
 */
export class LoggerService {
  private logger: Logger;
  private config: LoggerConfig;
  private elasticTransport: any;

  constructor(config: LoggerConfig = defaultLoggerConfig()) {
    this.config = config;
    this.initializeLogger();
  }

  /**
   * Initializes the logger with enhanced configuration and security features
   */
  private initializeLogger(): void {
    const baseOptions = {
      level: this.config.level,
      timestamp: () => `,"time":"${new Date().toISOString()}"`,
      formatters: {
        level: (label: string) => ({ level: label.toUpperCase() }),
        bindings: (bindings: any) => ({
          pid: bindings.pid,
          host: bindings.hostname,
          node_version: process.version,
        }),
      },
      redact: {
        paths: this.config.redaction.paths,
        censor: this.config.redaction.censor,
        remove: this.config.redaction.remove,
      },
      serializers: {
        err: pino.stdSerializers.err,
        error: pino.stdSerializers.err,
        req: pino.stdSerializers.req,
        res: pino.stdSerializers.res,
      },
    };

    // Configure Elasticsearch transport in production
    if (this.config.elasticsearchConfig) {
      this.elasticTransport = pinoElasticsearch({
        ...this.config.elasticsearchConfig,
        pipeline: 'gzip',
        sync: false,
        batch: {
          size: this.config.performance.batchSize,
          timeWindow: this.config.performance.flushInterval,
        },
      });

      this.logger = pino(baseOptions, pino.multistream([
        { stream: process.stdout },
        { stream: this.elasticTransport },
      ]));
    } else {
      this.logger = this.config.prettyPrint
        ? pino({
            ...baseOptions,
            transport: {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
              },
            },
          })
        : pino(baseOptions);
    }
  }

  /**
   * Enhanced error logging with stack trace and correlation
   * @param error - Error object or error message
   * @param context - Logging context with correlation and tracking info
   */
  error(error: Error | string, context: LogContext): void {
    const errorObject = error instanceof Error ? error : new Error(error);
    const logData = this.prepareLogData(errorObject, context);

    this.logger.error(logData, errorObject.message);
  }

  /**
   * Enhanced warning logging with context tracking
   * @param message - Warning message
   * @param context - Logging context with correlation and tracking info
   */
  warn(message: string, context: LogContext): void {
    const logData = this.prepareLogData(message, context);
    this.logger.warn(logData, message);
  }

  /**
   * Enhanced info logging with performance optimization
   * @param message - Info message
   * @param context - Logging context with correlation and tracking info
   */
  info(message: string, context: LogContext): void {
    const logData = this.prepareLogData(message, context);
    this.logger.info(logData, message);
  }

  /**
   * Enhanced debug logging with detailed context
   * @param message - Debug message
   * @param context - Logging context with correlation and tracking info
   */
  debug(message: string, context: LogContext): void {
    const logData = this.prepareLogData(message, context);
    this.logger.debug(logData, message);
  }

  /**
   * Prepares log data with enhanced context and security measures
   * @param message - Log message or error
   * @param context - Logging context
   * @returns Prepared log data with enhanced context
   */
  private prepareLogData(message: any, context: LogContext): Record<string, any> {
    return {
      timestamp: new Date().toISOString(),
      correlationId: context.correlationId,
      requestId: context.requestId,
      service: context.service,
      userId: context.userId,
      environment: process.env.NODE_ENV,
      nodeVersion: process.version,
      ...this.sanitizeContext(context.additionalContext),
    };
  }

  /**
   * Sanitizes context data to prevent sensitive data leakage
   * @param context - Additional context data
   * @returns Sanitized context data
   */
  private sanitizeContext(context?: Record<string, any>): Record<string, any> {
    if (!context) return {};

    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(context)) {
      // Skip sensitive patterns
      if (this.isSensitiveKey(key)) continue;

      // Recursively sanitize nested objects
      sanitized[key] = typeof value === 'object' && value !== null
        ? this.sanitizeContext(value)
        : value;
    }

    return sanitized;
  }

  /**
   * Checks if a key matches sensitive data patterns
   * @param key - Object key to check
   * @returns Boolean indicating if key is sensitive
   */
  private isSensitiveKey(key: string): boolean {
    const sensitivePatterns = [
      /password/i,
      /secret/i,
      /token/i,
      /key/i,
      /auth/i,
      /credit/i,
      /card/i,
      /ssn/i,
      /social/i,
    ];

    return sensitivePatterns.some(pattern => pattern.test(key));
  }
}