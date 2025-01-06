/**
 * Server configuration module for the attribution analytics backend
 * Implements comprehensive server settings with enhanced security and monitoring
 * @version 1.0.0
 */

import { config } from 'dotenv';
import { vault } from '@hashicorp/vault-client';
import * as winston from 'winston';
import { 
  ServerConfig, 
  Environment, 
  CorsConfig, 
  RateLimitConfig,
  SecurityConfig,
  LoggingConfig 
} from '../types/config.types';
import { RATE_LIMIT_CONSTANTS } from '../utils/constants';

// Initialize environment variables
config();

/**
 * Default CORS configuration with strict security settings
 */
const DEFAULT_CORS_CONFIG: CorsConfig = {
  origins: process.env.ALLOWED_ORIGINS?.split(',') || [],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Request-ID',
    'X-API-Key'
  ],
  credentials: true,
  maxAge: 3600,
  validateOrigin: true
};

/**
 * Enhanced rate limiting configuration with burst protection
 */
const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  windowMs: RATE_LIMIT_CONSTANTS.WINDOW_MS,
  max: RATE_LIMIT_CONSTANTS.MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: 'ip',
  handler: 'default',
  skipSuccessfulRequests: false,
  whitelist: []
};

/**
 * Default logging configuration with structured output
 */
const DEFAULT_LOGGING_CONFIG: LoggingConfig = {
  level: 'info',
  format: 'json',
  enableConsole: true,
  enableFile: true,
  directory: './logs',
  maxFiles: 30,
  maxSize: 10485760 // 10MB
};

/**
 * Validates server configuration with enhanced security checks
 */
export function validateServerConfig(config: ServerConfig): { 
  isValid: boolean; 
  errors: string[] 
} {
  const errors: string[] = [];

  // Validate port number
  if (!config.port || config.port < 1 || config.port > 65535) {
    errors.push('Invalid port number');
  }

  // Validate host
  if (!config.host || !/^[a-zA-Z0-9\-.]+$/.test(config.host)) {
    errors.push('Invalid host configuration');
  }

  // Validate CORS settings
  if (!config.cors.origins || !Array.isArray(config.cors.origins)) {
    errors.push('Invalid CORS origins configuration');
  }

  // Validate rate limiting
  if (config.rateLimit.max < 1 || config.rateLimit.windowMs < 1000) {
    errors.push('Invalid rate limit configuration');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Loads environment-specific configuration with secure value retrieval
 */
export async function loadEnvironmentConfig(env: Environment): Promise<ServerConfig> {
  // Initialize vault client for secure configuration
  const vaultClient = vault.connect({
    endpoint: process.env.VAULT_ENDPOINT,
    token: process.env.VAULT_TOKEN
  });

  // Retrieve secure configuration values
  const secureConfig = await vaultClient.read(`secret/attribution/${env}`);

  const config: ServerConfig = {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || '0.0.0.0',
    cors: {
      ...DEFAULT_CORS_CONFIG,
      origins: secureConfig.data.allowedOrigins || DEFAULT_CORS_CONFIG.origins
    },
    rateLimit: {
      ...DEFAULT_RATE_LIMIT_CONFIG,
      max: secureConfig.data.rateLimit?.max || DEFAULT_RATE_LIMIT_CONFIG.max
    },
    env,
    logging: {
      ...DEFAULT_LOGGING_CONFIG,
      level: process.env.LOG_LEVEL || DEFAULT_LOGGING_CONFIG.level
    }
  };

  // Validate configuration
  const validation = validateServerConfig(config);
  if (!validation.isValid) {
    throw new Error(`Invalid server configuration: ${validation.errors.join(', ')}`);
  }

  return config;
}

/**
 * Server configuration manager class with validation and monitoring
 */
export class ConfigurationManager {
  private currentConfig: ServerConfig;
  private readonly logger: winston.Logger;

  constructor(env: Environment) {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'config-manager.log' })
      ]
    });

    // Initialize with environment configuration
    loadEnvironmentConfig(env)
      .then(config => {
        this.currentConfig = config;
        this.logger.info('Configuration loaded successfully', { environment: env });
      })
      .catch(error => {
        this.logger.error('Failed to load configuration', { error });
        throw error;
      });
  }

  /**
   * Updates configuration with validation
   */
  async updateConfig(updates: Partial<ServerConfig>): Promise<boolean> {
    const newConfig = { ...this.currentConfig, ...updates };
    const validation = validateServerConfig(newConfig);

    if (!validation.isValid) {
      this.logger.error('Invalid configuration update', { errors: validation.errors });
      return false;
    }

    this.currentConfig = newConfig;
    this.logger.info('Configuration updated successfully');
    return true;
  }

  /**
   * Retrieves current configuration
   */
  getConfig(): Readonly<ServerConfig> {
    return Object.freeze({ ...this.currentConfig });
  }
}

// Export immutable server configuration instance
export const serverConfig = new ConfigurationManager(
  (process.env.NODE_ENV as Environment) || 'development'
).getConfig();