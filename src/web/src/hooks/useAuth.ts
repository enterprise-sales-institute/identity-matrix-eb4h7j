/**
 * @fileoverview Advanced React hook for comprehensive authentication state management
 * @version 1.0.0
 */

// External imports
import { useCallback, useMemo, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';

// Internal imports
import { 
  login as loginAction,
  logout as logoutAction,
  refreshToken,
  validateSession
} from '../store/slices/authSlice';
import { 
  User,
  UserRole,
  Permission,
  MFAStatus,
  TokenData
} from '../types/auth.types';
import { RootState } from '../store';

// Constants
const TOKEN_REFRESH_INTERVAL = 4 * 60 * 1000; // 4 minutes
const SESSION_VALIDATION_INTERVAL = 60 * 1000; // 1 minute

/**
 * Enhanced authentication hook with comprehensive security features
 */
export const useAuth = () => {
  const dispatch = useDispatch();
  
  // Redux state selectors
  const user = useSelector((state: RootState) => state.auth.user);
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const isLoading = useSelector((state: RootState) => state.auth.isLoading);
  const error = useSelector((state: RootState) => state.auth.error);
  const mfaStatus = useSelector((state: RootState) => state.auth.mfaStatus);
  const tokens = useSelector((state: RootState) => state.auth.tokens);
  const lastActivity = useSelector((state: RootState) => state.auth.lastActivity);
  const sessionMetadata = useSelector((state: RootState) => state.auth.sessionMetadata);

  // Refs for interval cleanup
  const refreshTokenInterval = useRef<NodeJS.Timeout>();
  const sessionValidationInterval = useRef<NodeJS.Timeout>();

  /**
   * Enhanced login handler with MFA support
   */
  const handleLogin = useCallback(async (credentials: {
    email: string;
    password: string;
    mfaToken?: string;
  }) => {
    try {
      const response = await dispatch(loginAction(credentials)).unwrap();
      
      if (response.mfaRequired && !credentials.mfaToken) {
        return { mfaRequired: true };
      }

      // Set up token refresh and session validation
      if (response.tokens) {
        setupTokenRefresh();
        setupSessionValidation();
      }

      return response;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }, [dispatch]);

  /**
   * Secure logout handler with cleanup
   */
  const handleLogout = useCallback(async () => {
    try {
      await dispatch(logoutAction()).unwrap();
      clearTokenRefresh();
      clearSessionValidation();
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  }, [dispatch]);

  /**
   * Permission check with caching
   */
  const hasPermission = useCallback((permission: Permission): boolean => {
    if (!user || !user.permissions) return false;
    return user.permissions.includes(permission);
  }, [user]);

  /**
   * Role check with validation
   */
  const hasRole = useCallback((role: UserRole): boolean => {
    if (!user) return false;
    return user.role === role;
  }, [user]);

  /**
   * Token refresh setup with error handling
   */
  const setupTokenRefresh = useCallback(() => {
    clearTokenRefresh();
    refreshTokenInterval.current = setInterval(async () => {
      try {
        if (tokens?.accessToken) {
          await dispatch(refreshToken()).unwrap();
        }
      } catch (error) {
        console.error('Token refresh failed:', error);
        await handleLogout();
      }
    }, TOKEN_REFRESH_INTERVAL);
  }, [dispatch, tokens, handleLogout]);

  /**
   * Session validation setup with automatic logout
   */
  const setupSessionValidation = useCallback(() => {
    clearSessionValidation();
    sessionValidationInterval.current = setInterval(async () => {
      try {
        const isValid = await dispatch(validateSession()).unwrap();
        if (!isValid) {
          await handleLogout();
        }
      } catch (error) {
        console.error('Session validation failed:', error);
        await handleLogout();
      }
    }, SESSION_VALIDATION_INTERVAL);
  }, [dispatch, handleLogout]);

  /**
   * Cleanup functions for intervals
   */
  const clearTokenRefresh = useCallback(() => {
    if (refreshTokenInterval.current) {
      clearInterval(refreshTokenInterval.current);
    }
  }, []);

  const clearSessionValidation = useCallback(() => {
    if (sessionValidationInterval.current) {
      clearInterval(sessionValidationInterval.current);
    }
  }, []);

  /**
   * Effect for setting up and cleaning up intervals
   */
  useEffect(() => {
    if (isAuthenticated && tokens) {
      setupTokenRefresh();
      setupSessionValidation();
    }

    return () => {
      clearTokenRefresh();
      clearSessionValidation();
    };
  }, [isAuthenticated, tokens, setupTokenRefresh, setupSessionValidation, clearTokenRefresh, clearSessionValidation]);

  /**
   * Memoized auth context value
   */
  const authContext = useMemo(() => ({
    user,
    isAuthenticated,
    isLoading,
    error,
    mfaStatus,
    sessionMetadata,
    login: handleLogin,
    logout: handleLogout,
    hasPermission,
    hasRole,
    lastActivity,
    tokens
  }), [
    user,
    isAuthenticated,
    isLoading,
    error,
    mfaStatus,
    sessionMetadata,
    handleLogin,
    handleLogout,
    hasPermission,
    hasRole,
    lastActivity,
    tokens
  ]);

  return authContext;
};

export default useAuth;