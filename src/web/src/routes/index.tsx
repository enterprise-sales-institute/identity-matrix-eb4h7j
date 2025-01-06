/**
 * @fileoverview Main routing configuration component implementing secure routing with JWT authentication,
 * role-based access control, route-based code splitting, and accessibility features.
 * @version 1.0.0
 */

import React, { Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAnalytics } from '@analytics/react';
import { ErrorBoundary } from 'react-error-boundary';
import { CircularProgress } from '@mui/material';

// Internal imports
import PrivateRoute from './PrivateRoute';
import PublicRoute from './PublicRoute';
import { ROUTES } from '../constants/routes.constants';
import { UserRole } from '../types/auth.types';

// Lazy-loaded route components with code splitting
const LoginPage = React.lazy(() => import('../pages/LoginPage'));
const AnalyticsDashboard = React.lazy(() => import('../pages/AnalyticsDashboard'));
const AttributionPage = React.lazy(() => import('../pages/AttributionPage'));
const SettingsPage = React.lazy(() => import('../pages/SettingsPage'));

// Default redirect path for authenticated users
const DEFAULT_REDIRECT = ROUTES.ANALYTICS;

// Material Design route transition configuration
const ROUTE_TRANSITION_CONFIG = {
  duration: 300,
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
};

/**
 * Loading fallback component with Material Design progress indicator
 */
const LoadingFallback: React.FC = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh' 
  }}>
    <CircularProgress size={48} />
  </div>
);

/**
 * Error fallback component for route error boundaries
 */
const ErrorFallback: React.FC<{ error: Error }> = ({ error }) => (
  <div role="alert" style={{ padding: '20px', textAlign: 'center' }}>
    <h2>Something went wrong</h2>
    <pre style={{ color: 'red' }}>{error.message}</pre>
  </div>
);

/**
 * Route change announcer for screen readers
 */
const RouteAnnouncer: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    const pageTitle = document.title;
    const announcement = `Navigated to ${pageTitle}`;
    
    // Announce route change to screen readers
    const announcer = document.createElement('div');
    announcer.setAttribute('role', 'status');
    announcer.setAttribute('aria-live', 'polite');
    announcer.textContent = announcement;
    document.body.appendChild(announcer);

    return () => {
      document.body.removeChild(announcer);
    };
  }, [location]);

  return null;
};

/**
 * Main routing component that defines the application's route structure
 * with enhanced security, accessibility, and performance features.
 */
const AppRoutes: React.FC = () => {
  const analytics = useAnalytics();

  // Track route changes
  useEffect(() => {
    const unsubscribe = analytics.page();
    return () => unsubscribe();
  }, [analytics]);

  return (
    <BrowserRouter>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <RouteAnnouncer />
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Public Routes */}
            <Route element={<PublicRoute />}>
              <Route path={ROUTES.LOGIN} element={<LoginPage />} />
            </Route>

            {/* Protected Routes - Analytics */}
            <Route element={
              <PrivateRoute 
                allowedRoles={[UserRole.ADMIN, UserRole.ANALYST, UserRole.MARKETING]} 
                fallback={<LoadingFallback />}
              />
            }>
              <Route path={ROUTES.ANALYTICS} element={<AnalyticsDashboard />} />
            </Route>

            {/* Protected Routes - Attribution (Admin & Analyst only) */}
            <Route element={
              <PrivateRoute 
                allowedRoles={[UserRole.ADMIN, UserRole.ANALYST]} 
                fallback={<LoadingFallback />}
              />
            }>
              <Route path={ROUTES.ATTRIBUTION} element={<AttributionPage />} />
            </Route>

            {/* Protected Routes - Settings (Admin only) */}
            <Route element={
              <PrivateRoute 
                allowedRoles={[UserRole.ADMIN]} 
                fallback={<LoadingFallback />}
              />
            }>
              <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
            </Route>

            {/* Default redirect */}
            <Route path="/" element={<Navigate to={DEFAULT_REDIRECT} replace />} />

            {/* Catch all route for 404 */}
            <Route path="*" element={
              <div role="alert" style={{ padding: '20px', textAlign: 'center' }}>
                <h2>404 - Page Not Found</h2>
                <p>The requested page does not exist.</p>
              </div>
            } />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default AppRoutes;