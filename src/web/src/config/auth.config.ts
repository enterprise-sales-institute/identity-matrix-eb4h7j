/**
 * @fileoverview Authentication and authorization configuration with enhanced security features
 * @version 1.0.0
 */

import { UserRole, Permission } from '../types/auth.types';

/**
 * Interface for Auth0 configuration with enhanced security settings
 */
interface Auth0Config {
  domain: string;
  clientId: string;
  audience: string;
  redirectUri: string;
  logoutRedirectUri: string;
  useSecureCookies: boolean;
  customHeaders: Record<string, string>;
  sessionConfig: {
    rolling: boolean;
    rollingDuration: number;
    absoluteDuration: number;
  };
}

/**
 * Interface for JWT configuration with advanced security features
 */
interface JWTConfig {
  tokenExpiryMinutes: number;
  refreshTokenExpiryDays: number;
  tokenSecret: string;
  refreshTokenSecret: string;
  rotateRefreshTokens: boolean;
  tokenValidationOptions: {
    validateIssuer: boolean;
    validateAudience: boolean;
    clockTolerance: number;
  };
  revocationConfig: {
    enabled: boolean;
    revokeOnPasswordChange: boolean;
    maxConcurrentSessions: number;
  };
}

/**
 * Interface for role-based permission configuration with audit capabilities
 */
interface RolePermissionsConfig {
  [UserRole.ADMIN]: Permission[];
  [UserRole.ANALYST]: Permission[];
  [UserRole.MARKETING]: Permission[];
  auditConfig: {
    enabled: boolean;
    logPermissionChanges: boolean;
    retentionDays: number;
  };
  permissionValidation: {
    enforceHierarchy: boolean;
    validateOnStartup: boolean;
  };
}

/**
 * Interface for security headers configuration
 */
interface SecurityHeadersConfig {
  contentSecurityPolicy: {
    defaultSrc: string[];
    scriptSrc: string[];
    styleSrc: string[];
    imgSrc: string[];
    connectSrc: string[];
  };
  permissionsPolicy: {
    camera: string[];
    microphone: string[];
    geolocation: string[];
  };
  referrerPolicy: string;
  corsConfig: {
    allowedOrigins: string[];
    allowedMethods: string[];
    allowCredentials: boolean;
    maxAge: number;
  };
}

/**
 * Comprehensive authentication and authorization configuration
 */
export const authConfig = {
  auth0: {
    domain: process.env.VITE_AUTH0_DOMAIN,
    clientId: process.env.VITE_AUTH0_CLIENT_ID,
    audience: process.env.VITE_AUTH0_AUDIENCE,
    redirectUri: process.env.VITE_AUTH0_REDIRECT_URI,
    logoutRedirectUri: process.env.VITE_AUTH0_LOGOUT_REDIRECT_URI,
    useSecureCookies: true,
    customHeaders: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
    },
    sessionConfig: {
      rolling: true,
      rollingDuration: 3600, // 1 hour
      absoluteDuration: 86400 // 24 hours
    }
  } as Auth0Config,

  jwt: {
    tokenExpiryMinutes: 60,
    refreshTokenExpiryDays: 7,
    tokenSecret: process.env.VITE_JWT_SECRET,
    refreshTokenSecret: process.env.VITE_JWT_REFRESH_SECRET,
    rotateRefreshTokens: true,
    tokenValidationOptions: {
      validateIssuer: true,
      validateAudience: true,
      clockTolerance: 30 // 30 seconds
    },
    revocationConfig: {
      enabled: true,
      revokeOnPasswordChange: true,
      maxConcurrentSessions: 5
    }
  } as JWTConfig,

  rolePermissions: {
    [UserRole.ADMIN]: [
      'READ_ANALYTICS',
      'WRITE_ANALYTICS',
      'MANAGE_USERS',
      'CONFIGURE_MODELS',
      'VIEW_DASHBOARD',
      'EXPORT_DATA'
    ],
    [UserRole.ANALYST]: [
      'READ_ANALYTICS',
      'WRITE_ANALYTICS',
      'VIEW_DASHBOARD',
      'EXPORT_DATA'
    ],
    [UserRole.MARKETING]: [
      'READ_ANALYTICS',
      'VIEW_DASHBOARD'
    ],
    auditConfig: {
      enabled: true,
      logPermissionChanges: true,
      retentionDays: 90
    },
    permissionValidation: {
      enforceHierarchy: true,
      validateOnStartup: true
    }
  } as RolePermissionsConfig,

  securityHeaders: {
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.attribution.com']
    },
    permissionsPolicy: {
      camera: ['none'],
      microphone: ['none'],
      geolocation: ['none']
    },
    referrerPolicy: 'strict-origin-when-cross-origin',
    corsConfig: {
      allowedOrigins: ['https://attribution.com'],
      allowedMethods: ['GET', 'POST'],
      allowCredentials: true,
      maxAge: 86400 // 24 hours
    }
  } as SecurityHeadersConfig
};