/**
 * @fileoverview Enhanced Redux slice for authentication state management with security features
 * @version 1.0.0
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit'; // v1.9.0
import { User, TokenData, SessionMetadata } from '../../types/auth.types';
import { AuthService } from '../../services/auth.service';

// Constants for MFA status
const MFA_STATUS = {
  NONE: 'NONE',
  REQUIRED: 'REQUIRED',
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  FAILED: 'FAILED'
} as const;

// Constants for security timeouts (in milliseconds)
const SECURITY_CONSTANTS = {
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
  ACTIVITY_CHECK_INTERVAL: 60 * 1000, // 1 minute
  MFA_TIMEOUT: 5 * 60 * 1000 // 5 minutes
} as const;

/**
 * Interface for enhanced authentication state with security features
 */
interface AuthState {
  user: User | null;
  tokens: TokenData | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  permissionCache: Record<string, boolean>;
  mfaStatus: typeof MFA_STATUS[keyof typeof MFA_STATUS];
  lastActivity: number;
  sessionMetadata: SessionMetadata | null;
  securityContext: {
    failedAttempts: number;
    lockoutUntil: number | null;
    passwordExpiry: number | null;
  };
}

/**
 * Initial state with security defaults
 */
const initialState: AuthState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  permissionCache: {},
  mfaStatus: MFA_STATUS.NONE,
  lastActivity: Date.now(),
  sessionMetadata: null,
  securityContext: {
    failedAttempts: 0,
    lockoutUntil: null,
    passwordExpiry: null
  }
};

/**
 * Enhanced authentication slice with comprehensive security features
 */
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },

    loginSuccess: (state, action: PayloadAction<{
      user: User;
      tokens: TokenData;
      sessionMetadata: SessionMetadata;
    }>) => {
      const { user, tokens, sessionMetadata } = action.payload;
      state.user = user;
      state.tokens = tokens;
      state.sessionMetadata = sessionMetadata;
      state.isAuthenticated = true;
      state.isLoading = false;
      state.error = null;
      state.lastActivity = Date.now();
      state.mfaStatus = user.mfaEnabled ? MFA_STATUS.REQUIRED : MFA_STATUS.NONE;
      state.permissionCache = user.permissions.reduce((acc, permission) => ({
        ...acc,
        [permission]: true
      }), {});
      state.securityContext.failedAttempts = 0;
      state.securityContext.lockoutUntil = null;
    },

    loginFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
      state.securityContext.failedAttempts += 1;
      
      // Implement account lockout after 5 failed attempts
      if (state.securityContext.failedAttempts >= 5) {
        state.securityContext.lockoutUntil = Date.now() + (15 * 60 * 1000); // 15 minutes
      }
    },

    handleMFAChallenge: (state, action: PayloadAction<{
      status: typeof MFA_STATUS[keyof typeof MFA_STATUS];
      verified: boolean;
    }>) => {
      const { status, verified } = action.payload;
      state.mfaStatus = status;
      
      if (verified) {
        state.isAuthenticated = true;
        state.lastActivity = Date.now();
      } else {
        state.error = 'MFA verification failed';
      }
    },

    refreshTokenSuccess: (state, action: PayloadAction<TokenData>) => {
      state.tokens = action.payload;
      state.lastActivity = Date.now();
    },

    updateSecurityContext: (state, action: PayloadAction<{
      passwordExpiry?: number;
      sessionTimeout?: boolean;
    }>) => {
      const { passwordExpiry, sessionTimeout } = action.payload;
      
      if (passwordExpiry) {
        state.securityContext.passwordExpiry = passwordExpiry;
      }
      
      if (sessionTimeout) {
        state.isAuthenticated = false;
        state.user = null;
        state.tokens = null;
        state.sessionMetadata = null;
      }
    },

    checkSessionActivity: (state) => {
      const inactiveTime = Date.now() - state.lastActivity;
      
      if (inactiveTime >= SECURITY_CONSTANTS.SESSION_TIMEOUT) {
        state.isAuthenticated = false;
        state.user = null;
        state.tokens = null;
        state.sessionMetadata = null;
        state.error = 'Session expired due to inactivity';
      }
    },

    updateLastActivity: (state) => {
      state.lastActivity = Date.now();
    },

    logout: (state) => {
      return {
        ...initialState,
        lastActivity: Date.now()
      };
    },

    clearError: (state) => {
      state.error = null;
    }
  }
});

// Export actions and reducer
export const {
  loginStart,
  loginSuccess,
  loginFailure,
  handleMFAChallenge,
  refreshTokenSuccess,
  updateSecurityContext,
  checkSessionActivity,
  updateLastActivity,
  logout,
  clearError
} = authSlice.actions;

export default authSlice.reducer;

// Selector for checking specific permissions
export const hasPermission = (state: { auth: AuthState }, permission: string): boolean => {
  return !!state.auth.permissionCache[permission];
};

// Selector for checking if session is locked
export const isSessionLocked = (state: { auth: AuthState }): boolean => {
  const { lockoutUntil } = state.auth.securityContext;
  return lockoutUntil ? Date.now() < lockoutUntil : false;
};

// Selector for checking if password needs renewal
export const needsPasswordRenewal = (state: { auth: AuthState }): boolean => {
  const { passwordExpiry } = state.auth.securityContext;
  return passwordExpiry ? Date.now() >= passwordExpiry : false;
};