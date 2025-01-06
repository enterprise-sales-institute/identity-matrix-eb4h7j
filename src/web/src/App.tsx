/**
 * @fileoverview Root application component implementing core application structure
 * with comprehensive security, accessibility and performance features.
 * @version 1.0.0
 */

import React, { useEffect } from 'react';
import { Provider } from 'react-redux'; // v8.0.5
import { ThemeProvider } from 'styled-components'; // v5.3.0
import { ErrorBoundary } from 'react-error-boundary'; // v4.0.0
import { PerformanceMonitor } from '@performance-monitor/react'; // v1.0.0
import { AccessibilityProvider } from '@accessibility/react'; // v1.0.0

// Internal imports
import AppRoutes from './routes';
import store from './store';
import GlobalStyles from './styles/global.styles';
import { COLORS, TYPOGRAPHY, SPACING, BREAKPOINTS, Z_INDEX } from './styles/variables.styles';
import { ThemeMode } from './types/theme.types';

// Performance monitoring thresholds (in ms)
const PERFORMANCE_THRESHOLDS = {
  FCP: 2000, // First Contentful Paint
  LCP: 2500, // Largest Contentful Paint
  FID: 100,  // First Input Delay
  CLS: 0.1   // Cumulative Layout Shift
};

// Content Security Policy
const CSP_POLICY = {
  'default-src': "'self'",
  'script-src': "'self' 'unsafe-inline'",
  'style-src': "'self' 'unsafe-inline'",
  'img-src': "'self' data: https:",
  'connect-src': "'self' https://api.attribution-analytics.com",
  'frame-ancestors': "'none'",
  'form-action': "'self'"
};

/**
 * Error fallback component for root level error boundary
 */
const ErrorFallback: React.FC<{ error: Error }> = ({ error }) => (
  <div role="alert" style={{ padding: '20px', textAlign: 'center' }}>
    <h1>Application Error</h1>
    <pre style={{ color: COLORS.light.error.main }}>{error.message}</pre>
    <button onClick={() => window.location.reload()}>Reload Application</button>
  </div>
);

/**
 * Root application component that sets up core providers and structure
 */
const App: React.FC = () => {
  // Set up CSP on mount
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = Object.entries(CSP_POLICY)
      .map(([key, value]) => `${key} ${value}`)
      .join('; ');
    document.head.appendChild(meta);

    return () => {
      document.head.removeChild(meta);
    };
  }, []);

  // Theme configuration
  const theme = {
    mode: ThemeMode.LIGHT,
    colors: COLORS.light,
    typography: TYPOGRAPHY,
    spacing: SPACING,
    breakpoints: BREAKPOINTS,
    zIndex: Z_INDEX
  };

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <PerformanceMonitor 
        thresholds={PERFORMANCE_THRESHOLDS}
        onPerformanceIssue={(metric, value) => {
          console.warn(`Performance issue detected: ${metric} = ${value}`);
        }}
      >
        <Provider store={store}>
          <ThemeProvider theme={theme}>
            <AccessibilityProvider
              announcePageChanges
              enforceHeadingOrder
              enforceAriaRoles
            >
              <GlobalStyles />
              <React.Suspense 
                fallback={
                  <div role="progressbar" aria-label="Loading application">
                    Loading...
                  </div>
                }
              >
                <AppRoutes />
              </React.Suspense>
            </AccessibilityProvider>
          </ThemeProvider>
        </Provider>
      </PerformanceMonitor>
    </ErrorBoundary>
  );
};

export default App;