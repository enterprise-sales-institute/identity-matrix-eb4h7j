/**
 * Security Configuration Module
 * Defines comprehensive authentication, authorization and security settings
 * @version 1.0.0
 */

import { SecurityConfig } from '../types/config.types';
import dotenv from 'dotenv'; // v16.0.0
import winston from 'winston'; // v3.8.0

// Initialize environment variables
dotenv.config();

// Configure logger for security audit trail
const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/security-audit.log' })
  ]
});

/**
 * Validates security configuration settings
 * @param config SecurityConfig object to validate
 * @returns boolean indicating if config is valid
 * @throws Error if configuration is invalid
 */
const validateSecurityConfig = (config: SecurityConfig): boolean => {
  // Validate JWT configuration
  if (!config.jwt.secret || config.jwt.secret.length < 32) {
    throw new Error('JWT secret must be at least 32 characters long');
  }

  if (!['HS256', 'HS384', 'HS512', 'RS256', 'RS384', 'RS512'].includes(config.jwt.algorithm)) {
    throw new Error('Invalid JWT algorithm specified');
  }

  // Validate OAuth configuration
  if (config.oauth.clientId && (!config.oauth.clientSecret || !config.oauth.callbackUrl)) {
    throw new Error('OAuth client secret and callback URL are required when client ID is provided');
  }

  // Validate MFA configuration
  if (config.mfa.enabled) {
    if (!config.mfa.allowedTypes?.length) {
      throw new Error('At least one MFA type must be specified when MFA is enabled');
    }
    if (config.mfa.tokenValidityMinutes < 1 || config.mfa.tokenValidityMinutes > 30) {
      throw new Error('MFA token validity must be between 1 and 30 minutes');
    }
  }

  // Validate encryption configuration
  if (config.encryption.algorithm !== 'aes-256-gcm') {
    throw new Error('Only AES-256-GCM encryption is currently supported');
  }

  if (config.encryption.keyRotationDays < 1 || config.encryption.keyRotationDays > 90) {
    throw new Error('Key rotation period must be between 1 and 90 days');
  }

  return true;
};

/**
 * Logs security configuration changes with audit trail
 * @param component Security component being changed
 * @param change Details of the configuration change
 */
const logConfigChange = (component: string, change: unknown): void => {
  securityLogger.info('Security configuration change', {
    component,
    change,
    timestamp: new Date().toISOString(),
    source: process.env.NODE_ENV
  });
};

/**
 * Security configuration object with comprehensive settings
 * for authentication, authorization, and data protection
 */
export const securityConfig: SecurityConfig = {
  jwt: {
    secret: process.env.JWT_SECRET!,
    algorithm: 'HS256',
    expiresIn: 3600, // 1 hour
    issuer: 'attribution-analytics',
    audience: process.env.JWT_AUDIENCE!,
    jwtid: process.env.JWT_ID!,
    subject: 'attribution-auth',
    clockTolerance: 30, // 30 seconds
    maxAge: '1d' // 1 day
  },
  oauth: {
    clientId: process.env.OAUTH_CLIENT_ID!,
    clientSecret: process.env.OAUTH_CLIENT_SECRET!,
    callbackUrl: process.env.OAUTH_CALLBACK_URL!,
    scopes: ['profile', 'email', 'openid'],
    allowedProviders: ['google', 'github'],
    sessionTimeout: 3600,
    stateValiditySeconds: 300,
    pkceEnabled: true
  },
  mfa: {
    enabled: true,
    type: 'totp',
    tokenValidityMinutes: 5,
    allowedTypes: ['totp', 'sms'],
    backupCodesCount: 10,
    maxAttempts: 3,
    cooldownMinutes: 15
  },
  encryption: {
    algorithm: 'aes-256-gcm',
    keyRotationDays: 30,
    minimumKeyLength: 32
  }
};

// Validate configuration on module load
validateSecurityConfig(securityConfig);

// Log initial configuration
logConfigChange('security', 'Initial security configuration loaded');

export default securityConfig;