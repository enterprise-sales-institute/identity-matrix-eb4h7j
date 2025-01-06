/**
 * @fileoverview API configuration file defining endpoints, security settings, and environment-specific configurations
 * @version 1.0.0
 */

// External imports
import { AxiosRequestConfig } from 'axios'; // v1.4.0

// Internal imports
import { ApiResponse } from '../types/common.types';

/**
 * Interface defining all API endpoint paths with methods and rate limits
 */
interface ApiEndpoints {
  AUTH: {
    LOGIN: { path: string; method: string; rateLimit: number; timeout: number };
    LOGOUT: { path: string; method: string; rateLimit: number; timeout: number };
    REFRESH: { path: string; method: string; rateLimit: number; timeout: number };
  };
  EVENTS: {
    TRACK: { path: string; method: string; rateLimit: number; timeout: number };
    BATCH: { path: string; method: string; rateLimit: number; timeout: number };
  };
  ATTRIBUTION: {
    MODELS: { path: string; method: string; rateLimit: number; timeout: number };
    TOUCHPOINTS: { path: string; method: string; rateLimit: number; timeout: number };
    ANALYSIS: { path: string; method: string; rateLimit: number; timeout: number };
  };
}

/**
 * Interface defining security-related headers
 */
interface ApiSecurityHeaders {
  'Content-Security-Policy': string;
  'X-Content-Type-Options': string;
  'X-Frame-Options': string;
  'X-XSS-Protection': string;
}

// Global configuration values
const BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
const TIMEOUT = 30000;
const RETRY_ATTEMPTS = 3;
const API_VERSION = 'v1';

/**
 * Main API configuration object with comprehensive settings for security, endpoints, and environments
 */
export const API_CONFIG = {
  BASE_URL,
  TIMEOUT,
  RETRY_ATTEMPTS,
  VERSION: API_VERSION,

  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Api-Version': API_VERSION,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self';"
  },

  CORS_CONFIG: {
    allowedOrigins: ['https://*.attribution-analytics.com'],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400 // 24 hours
  },

  ENDPOINTS: {
    AUTH: {
      LOGIN: {
        path: '/auth/login',
        method: 'POST',
        rateLimit: 10,
        timeout: 5000
      },
      LOGOUT: {
        path: '/auth/logout',
        method: 'POST',
        rateLimit: 10,
        timeout: 5000
      },
      REFRESH: {
        path: '/auth/refresh',
        method: 'POST',
        rateLimit: 20,
        timeout: 5000
      }
    },
    EVENTS: {
      TRACK: {
        path: '/events/track',
        method: 'POST',
        rateLimit: 10000,
        timeout: 2000
      },
      BATCH: {
        path: '/events/batch',
        method: 'POST',
        rateLimit: 1000,
        timeout: 5000
      }
    },
    ATTRIBUTION: {
      MODELS: {
        path: '/attribution/models',
        method: 'GET',
        rateLimit: 100,
        timeout: 10000
      },
      TOUCHPOINTS: {
        path: '/attribution/touchpoints',
        method: 'GET',
        rateLimit: 1000,
        timeout: 15000
      },
      ANALYSIS: {
        path: '/attribution/analysis',
        method: 'POST',
        rateLimit: 100,
        timeout: 30000
      }
    }
  },

  // HTTP status codes that should trigger retry attempts
  ERROR_RETRY_CODES: [
    408, // Request Timeout
    429, // Too Many Requests
    500, // Internal Server Error
    502, // Bad Gateway
    503, // Service Unavailable
    504  // Gateway Timeout
  ],

  // Environment-specific configurations
  ENVIRONMENT_CONFIG: {
    development: {
      enableDebug: true,
      logLevel: 'debug',
      mockResponses: true
    },
    staging: {
      enableDebug: true,
      logLevel: 'info',
      mockResponses: false
    },
    production: {
      enableDebug: false,
      logLevel: 'error',
      mockResponses: false
    }
  }
} as const;

// Type assertion to ensure configuration object is read-only
Object.freeze(API_CONFIG);

export type ApiConfigType = typeof API_CONFIG;