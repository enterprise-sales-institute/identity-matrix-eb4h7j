/**
 * @fileoverview Higher-order component implementing secure route protection for public routes
 * with Auth0 integration and security monitoring.
 * @version 1.0.0
 */

import React, { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom'; // v6.11.0
import { useAuth } from '../hooks/useAuth';
import { ROUTES } from '../constants/routes.constants';
import { useAnalytics } from '../hooks/useAnalytics';

/**
 * Props interface for PublicRoute component
 */
interface PublicRouteProps {
  /**
   * Optional custom redirect path for authenticated users
   */
  redirectPath?: string;

  /**
   * Flag indicating if authentication is required
   */
  requireAuth?: boolean;
}

/**
 * Higher-order component that implements secure route protection for public routes.
 * Prevents authenticated users from accessing public pages and redirects them to
 * the analytics dashboard.
 *
 * @param {PublicRouteProps} props - Component props
 * @returns {JSX.Element} Protected public route or redirect
 */
const PublicRoute: React.FC<PublicRouteProps> = React.memo(({
  redirectPath = ROUTES.ANALYTICS,
  requireAuth = false
}) => {
  // Get authentication state and session validation
  const { isAuthenticated, validateSession } = useAuth();
  
  // Get current location for analytics tracking
  const location = useLocation();
  
  // Get analytics tracking
  const { trackRouteAccess } = useAnalytics();

  /**
   * Effect to validate user session on component mount
   */
  useEffect(() => {
    const validateUserSession = async () => {
      try {
        await validateSession();
      } catch (error) {
        console.error('Session validation failed:', error);
      }
    };

    validateUserSession();
  }, [validateSession]);

  /**
   * Effect to track route access attempts
   */
  useEffect(() => {
    trackRouteAccess({
      path: location.pathname,
      timestamp: new Date(),
      isAuthenticated,
      isPublicRoute: true
    });
  }, [location.pathname, isAuthenticated, trackRouteAccess]);

  // Handle authentication state
  if (isAuthenticated && !requireAuth) {
    // Redirect authenticated users away from public routes
    return <Navigate to={redirectPath} replace />;
  }

  if (!isAuthenticated && requireAuth) {
    // Redirect unauthenticated users from protected routes
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  // Render public route content
  return <Outlet />;
});

// Display name for debugging
PublicRoute.displayName = 'PublicRoute';

// Default export
export default PublicRoute;