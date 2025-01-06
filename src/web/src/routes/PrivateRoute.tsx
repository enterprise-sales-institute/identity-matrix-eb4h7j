/**
 * @fileoverview Higher-order component implementing secure route protection with role-based access control
 * @version 1.0.0
 */

import React, { useMemo } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

// Internal imports
import { useAuth } from '../hooks/useAuth';
import { ROUTES } from '../constants/routes.constants';
import { UserRole } from '../types/auth.types';

/**
 * Props interface for PrivateRoute component
 */
interface PrivateRouteProps {
  allowedRoles?: UserRole[];
  requireAllRoles?: boolean;
  fallback?: React.ReactNode;
}

/**
 * Custom hook for optimized role validation
 */
const useRoleValidation = (
  allowedRoles?: UserRole[],
  requireAllRoles: boolean = false
): boolean => {
  const { user, hasRole } = useAuth();

  return useMemo(() => {
    if (!allowedRoles || allowedRoles.length === 0) {
      return true;
    }

    if (!user) {
      return false;
    }

    if (requireAllRoles) {
      return allowedRoles.every(role => hasRole(role));
    }

    return allowedRoles.some(role => hasRole(role));
  }, [user, hasRole, allowedRoles, requireAllRoles]);
};

/**
 * Higher-order component that implements secure route protection with role-based access control
 * 
 * @param {PrivateRouteProps} props - Component props
 * @returns {JSX.Element} Protected route or redirect to login
 */
const PrivateRoute: React.FC<PrivateRouteProps> = ({
  allowedRoles,
  requireAllRoles = false,
  fallback
}) => {
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuth();
  const hasRequiredRoles = useRoleValidation(allowedRoles, requireAllRoles);

  // Show fallback while authentication state is loading
  if (isLoading) {
    return <>{fallback}</> || null;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <Navigate
        to={ROUTES.LOGIN}
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  // Redirect to unauthorized page if role requirements not met
  if (!hasRequiredRoles) {
    return (
      <Navigate
        to={ROUTES.UNAUTHORIZED}
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  // Render protected route content
  return <Outlet />;
};

export default PrivateRoute;
```

This implementation:

1. Implements secure route protection with JWT token validation through the `useAuth` hook
2. Provides granular role-based access control with support for requiring single or multiple roles
3. Uses memoization for optimized role validation
4. Handles loading states with fallback content
5. Implements proper redirection for unauthorized access
6. Preserves original requested URL in navigation state for post-login redirect
7. Follows React best practices with proper TypeScript typing
8. Uses proper code organization and comprehensive documentation

The component can be used in route configuration like this:

```typescript
<Route element={<PrivateRoute allowedRoles={[UserRole.ADMIN]} />}>
  <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
</Route>