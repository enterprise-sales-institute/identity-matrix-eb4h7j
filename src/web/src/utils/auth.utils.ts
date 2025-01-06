/**
 * @fileoverview Enhanced utility functions for secure authentication and authorization
 * @version 1.0.0
 */

// External imports
import jwtDecode from 'jwt-decode'; // v3.1.2
import { AES, enc } from 'crypto-js'; // v4.1.1

// Internal imports
import { TokenData, User } from '../types/auth.types';
import { authConfig } from '../config/auth.config';

// Constants for token management
const TOKEN_VERSION = '1.0';
const PERMISSION_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const REQUIRED_TOKEN_CLAIMS = ['sub', 'exp', 'iat', 'aud'];

// In-memory permission cache
const permissionCache = new Map<string, { result: boolean; timestamp: number }>();

/**
 * Enhanced token parsing with additional security validations
 * @param token - JWT token string to parse
 * @returns Decoded and validated token payload
 * @throws Error if token is invalid or compromised
 */
export const parseToken = (token: string): any => {
  try {
    // Basic token format validation
    if (!token || !token.includes('.') || token.split('.').length !== 3) {
      throw new Error('Invalid token format');
    }

    // Decode token without verification (verification handled by Auth0)
    const decoded = jwtDecode(token);

    // Validate required claims
    REQUIRED_TOKEN_CLAIMS.forEach(claim => {
      if (!decoded[claim]) {
        throw new Error(`Missing required claim: ${claim}`);
      }
    });

    // Validate token expiration
    const currentTime = Math.floor(Date.now() / 1000);
    if (decoded.exp < currentTime) {
      throw new Error('Token has expired');
    }

    // Validate audience
    if (decoded.aud !== authConfig.jwt.tokenValidationOptions.validateAudience) {
      throw new Error('Invalid token audience');
    }

    return decoded;
  } catch (error) {
    console.error('Token parsing error:', error);
    throw new Error('Token validation failed');
  }
};

/**
 * Encrypts sensitive token data before storage
 * @param token - Token string to encrypt
 * @param encryptionKey - Key used for encryption
 * @returns Encrypted token string
 */
export const encryptToken = (token: string): string => {
  try {
    const encryptionKey = authConfig.jwt.tokenSecret;
    if (!encryptionKey) {
      throw new Error('Encryption key not configured');
    }

    // Add version and timestamp metadata
    const tokenData = {
      version: TOKEN_VERSION,
      timestamp: Date.now(),
      token
    };

    // Encrypt token with metadata
    const encrypted = AES.encrypt(
      JSON.stringify(tokenData),
      encryptionKey
    ).toString();

    return encrypted;
  } catch (error) {
    console.error('Token encryption error:', error);
    throw new Error('Token encryption failed');
  }
};

/**
 * Securely stores encrypted authentication tokens with rotation tracking
 * @param tokenData - Token data to store
 */
export const storeTokens = (tokenData: TokenData): void => {
  try {
    // Validate token data
    if (!tokenData.accessToken || !tokenData.refreshToken) {
      throw new Error('Invalid token data');
    }

    // Encrypt tokens
    const encryptedAccess = encryptToken(tokenData.accessToken);
    const encryptedRefresh = encryptToken(tokenData.refreshToken);

    // Store encrypted tokens with secure flags
    localStorage.setItem('access_token', encryptedAccess);
    localStorage.setItem('refresh_token', encryptedRefresh);
    localStorage.setItem('token_expiry', tokenData.expiresAt.toString());

    // Track token rotation if enabled
    if (authConfig.jwt.rotateRefreshTokens && tokenData.rotationId) {
      localStorage.setItem('token_rotation_id', tokenData.rotationId);
    }

    // Clean up old tokens
    cleanupOldTokens();
  } catch (error) {
    console.error('Token storage error:', error);
    throw new Error('Failed to store tokens securely');
  }
};

/**
 * Enhanced permission validation with role hierarchy and caching
 * @param user - User object with role and permissions
 * @param requiredPermission - Permission to validate
 * @param useCache - Whether to use permission caching
 * @returns Boolean indicating if user has required permission
 */
export const hasRequiredPermission = (
  user: User,
  requiredPermission: string,
  useCache = true
): boolean => {
  try {
    // Check permission cache if enabled
    const cacheKey = `${user.id}:${requiredPermission}`;
    if (useCache) {
      const cached = permissionCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < PERMISSION_CACHE_TTL) {
        return cached.result;
      }
    }

    // Validate user data
    if (!user.role || !user.permissions) {
      return false;
    }

    // Check direct permissions
    const hasDirectPermission = user.permissions.includes(requiredPermission);

    // Check role-based permissions
    const rolePermissions = authConfig.rolePermissions[user.role] || [];
    const hasRolePermission = rolePermissions.includes(requiredPermission);

    // Check inherited permissions through role hierarchy
    const hasInheritedPermission = user.roleHierarchy?.some(role => 
      authConfig.rolePermissions[role]?.includes(requiredPermission)
    ) || false;

    const result = hasDirectPermission || hasRolePermission || hasInheritedPermission;

    // Update permission cache
    if (useCache) {
      permissionCache.set(cacheKey, {
        result,
        timestamp: Date.now()
      });
    }

    return result;
  } catch (error) {
    console.error('Permission validation error:', error);
    return false;
  }
};

/**
 * Cleans up old tokens and cache entries
 * @private
 */
const cleanupOldTokens = (): void => {
  try {
    // Clean up expired cache entries
    const now = Date.now();
    permissionCache.forEach((value, key) => {
      if (now - value.timestamp > PERMISSION_CACHE_TTL) {
        permissionCache.delete(key);
      }
    });

    // Check token expiry
    const tokenExpiry = localStorage.getItem('token_expiry');
    if (tokenExpiry && parseInt(tokenExpiry, 10) < now) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('token_expiry');
      localStorage.removeItem('token_rotation_id');
    }
  } catch (error) {
    console.error('Token cleanup error:', error);
  }
};