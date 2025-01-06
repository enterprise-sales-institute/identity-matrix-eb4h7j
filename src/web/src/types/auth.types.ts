/**
 * @fileoverview TypeScript type definitions for authentication, authorization, and security
 * @version 1.0.0
 */

// External imports
import { Record } from 'typescript'; // v4.9.0

// Internal imports
import { BaseEntity } from './common.types';

/**
 * Enum defining available user roles in the system
 */
export enum UserRole {
  ADMIN = 'ADMIN',
  ANALYST = 'ANALYST',
  MARKETING = 'MARKETING'
}

/**
 * Enum defining supported OAuth providers
 */
export enum OAuthProvider {
  AUTH0 = 'AUTH0',
  GOOGLE = 'GOOGLE',
  MICROSOFT = 'MICROSOFT'
}

/**
 * Type defining granular permissions available in the system
 */
export type Permission =
  | 'READ_ANALYTICS'
  | 'WRITE_ANALYTICS'
  | 'MANAGE_USERS'
  | 'CONFIGURE_MODELS'
  | 'VIEW_DASHBOARD'
  | 'EXPORT_DATA'
  | 'MANAGE_ATTRIBUTION'
  | 'VIEW_REPORTS';

/**
 * Type for grouping related permissions
 */
export type PermissionGroup = Record<string, Permission[]>;

/**
 * Interface for multi-factor authentication configuration
 */
export interface MFAConfig {
  enabled: boolean;
  method: string;
  secret: string;
  lastVerified: Date;
}

/**
 * Interface for tracking session metadata
 */
export interface SessionMetadata {
  deviceId: string;
  ipAddress: string;
  userAgent: string;
  lastActive: Date;
  isActive: boolean;
}

/**
 * Interface for JWT token data
 */
export interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

/**
 * Interface extending BaseEntity for user data
 */
export interface User extends BaseEntity {
  email: string;
  role: UserRole;
  permissions: Permission[];
  mfaEnabled: boolean;
  mfaConfig?: MFAConfig;
  oauthProvider?: OAuthProvider;
  lastLogin?: Date;
  failedLoginAttempts: number;
  isLocked: boolean;
  passwordLastChanged?: Date;
}

/**
 * Interface for authentication response data
 */
export interface AuthResponse {
  user: User;
  token: TokenData;
  mfaRequired: boolean;
  sessionMetadata: SessionMetadata;
}

/**
 * Interface for role-based access configuration
 */
export interface RoleConfig {
  role: UserRole;
  permissions: Permission[];
  accessLevel: number;
  restrictions?: Record<string, unknown>;
}

/**
 * Interface for OAuth authentication state
 */
export interface OAuthState {
  provider: OAuthProvider;
  redirectUri: string;
  state: string;
  codeVerifier: string;
  nonce: string;
}

/**
 * Interface for MFA verification request
 */
export interface MFAVerificationRequest {
  userId: string;
  code: string;
  method: string;
}

/**
 * Interface for password policy configuration
 */
export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  expiryDays: number;
  preventReuse: number;
}

/**
 * Type for session status
 */
export type SessionStatus = 'active' | 'expired' | 'revoked' | 'invalid';

/**
 * Interface for security audit log entries
 */
export interface SecurityAuditLog {
  userId: string;
  action: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  details: Record<string, unknown>;
}