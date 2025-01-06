/**
 * Authentication Configuration
 * Defines comprehensive security settings for JWT tokens, OAuth 2.0, and MFA
 * @version 1.0.0
 */

import { SecurityConfig } from '../types/config.types';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { ConfigValidator } from 'config-validator';

// Load environment variables
dotenv.config();

/**
 * Validates the authentication configuration settings
 * @param config SecurityConfig object to validate
 * @returns boolean indicating if configuration is valid
 */
@ConfigValidator
function validateAuthConfig(config: SecurityConfig): boolean {
  // JWT Validation
  if (!config.jwt.secret || 
      config.jwt.secret.length < config.jwt.validation.minSecretLength ||
      !config.jwt.validation.allowedAlgorithms.includes(config.jwt.algorithm)) {
    return false;
  }

  // OAuth Validation
  if (config.oauth.providers.google.enabled) {
    const urlPattern = new RegExp(config.oauth.validation.urlPattern);
    if (!urlPattern.test(config.oauth.providers.google.endpoints.authorize) ||
        !urlPattern.test(config.oauth.providers.google.endpoints.token)) {
      return false;
    }
  }

  // MFA Validation
  if (config.mfa.enabled) {
    if (config.mfa.tokenValidityMinutes < config.mfa.validation.minTokenValidity ||
        config.mfa.tokenValidityMinutes > config.mfa.validation.maxTokenValidity ||
        config.mfa.backupCodes.count < config.mfa.validation.minBackupCodes) {
      return false;
    }
  }

  return true;
}

/**
 * Encrypts sensitive configuration values
 * @param value Value to encrypt
 * @param encryptionKey Encryption key
 * @returns Encrypted value with IV
 */
function encryptSensitiveConfig(value: string, encryptionKey: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

/**
 * Authentication configuration object
 * Contains comprehensive settings for all authentication methods
 */
export const authConfig = {
  jwt: {
    secret: process.env.JWT_SECRET,
    algorithm: 'HS256' as const,
    expiresIn: 3600, // 1 hour
    issuer: 'attribution-analytics',
    refreshToken: {
      enabled: true,
      expiresIn: 86400 // 24 hours
    },
    validation: {
      minSecretLength: 32,
      allowedAlgorithms: ['HS256', 'HS384', 'HS512']
    }
  },

  oauth: {
    clientId: process.env.OAUTH_CLIENT_ID,
    clientSecret: process.env.OAUTH_CLIENT_SECRET,
    callbackUrl: process.env.OAUTH_CALLBACK_URL,
    scopes: ['profile', 'email'],
    providers: {
      google: {
        enabled: true,
        endpoints: {
          authorize: 'https://accounts.google.com/o/oauth2/v2/auth',
          token: 'https://oauth2.googleapis.com/token'
        }
      }
    },
    validation: {
      urlPattern: '^https://',
      requiredScopes: ['profile']
    }
  },

  mfa: {
    enabled: true,
    type: 'totp' as const,
    tokenValidityMinutes: 5,
    backupCodes: {
      count: 10,
      length: 8
    },
    totp: {
      algorithm: 'SHA256',
      digits: 6,
      period: 30
    },
    validation: {
      minTokenValidity: 1,
      maxTokenValidity: 15,
      minBackupCodes: 5
    }
  },

  audit: {
    enabled: true,
    logLevel: 'info' as const,
    retention: {
      days: 90
    }
  }
} as const;

// Validate configuration on initialization
if (!validateAuthConfig(authConfig)) {
  throw new Error('Invalid authentication configuration');
}

export default authConfig;