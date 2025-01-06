/**
 * @fileoverview Application entry point implementing core initialization with comprehensive monitoring
 * @version 1.0.0
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { StrictMode } from 'react';
import { ErrorBoundary } from '@sentry/react'; // v7.0.0
import * as Sentry from '@sentry/react'; // v7.0.0
import { datadogRum } from '@datadog/browser-rum'; // v4.0.0

// Internal imports
import App from './App';

/**
 * Initialize monitoring and error tracking services
 */
const initializeMonitoring = (): void => {
  // Initialize Sentry for error tracking
  if (process.env.VITE_SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.VITE_SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
      integrations: [new Sentry.BrowserTracing()],
      beforeSend(event) {
        // Sanitize sensitive data before sending
        if (event.request) {
          delete event.request.cookies;
          delete event.request.headers;
        }
        return event;
      }
    });
  }

  // Initialize Datadog RUM for performance monitoring
  if (process.env.VITE_DATADOG_RUM_ID) {
    datadogRum.init({
      applicationId: process.env.VITE_DATADOG_RUM_ID,
      clientToken: process.env.VITE_DATADOG_CLIENT_TOKEN,
      site: process.env.VITE_DATADOG_SITE || 'datadoghq.com',
      service: 'attribution-analytics',
      env: process.env.NODE_ENV,
      version: process.env.VITE_APP_VERSION,
      sessionSampleRate: 100,
      sessionReplaySampleRate: 20,
      trackUserInteractions: true,
      trackResources: true,
      trackLongTasks: true,
      defaultPrivacyLevel: 'mask-user-input'
    });
  }

  // Set up performance observers
  if (window.PerformanceObserver) {
    // Monitor long tasks
    const longTaskObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.duration > 50) { // Tasks longer than 50ms
          Sentry.captureMessage('Long Task Detected', {
            extra: {
              duration: entry.duration,
              startTime: entry.startTime,
              name: entry.name
            }
          });
        }
      });
    });
    longTaskObserver.observe({ entryTypes: ['longtask'] });

    // Monitor layout shifts
    const layoutShiftObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.value > 0.1) { // Significant layout shifts
          datadogRum.addError('Significant Layout Shift', {
            value: entry.value,
            sources: entry.sources
          });
        }
      });
    });
    layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });
  }
};

/**
 * Error fallback component for critical errors
 */
const ErrorFallback: React.FC<{ error: Error }> = ({ error }) => (
  <div role="alert" style={{ padding: '20px', textAlign: 'center' }}>
    <h1>Application Error</h1>
    <pre style={{ color: 'red' }}>{error.message}</pre>
    <button 
      onClick={() => window.location.reload()}
      style={{ 
        padding: '10px 20px',
        marginTop: '20px',
        backgroundColor: '#0066CC',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer'
      }}
    >
      Reload Application
    </button>
  </div>
);

/**
 * Initialize and render the application
 */
const renderApp = (): void => {
  const rootElement = document.getElementById('root');
  
  if (!rootElement) {
    throw new Error('Root element not found');
  }

  const root = ReactDOM.createRoot(rootElement);

  root.render(
    <StrictMode>
      <ErrorBoundary
        fallback={ErrorFallback}
        onError={(error) => {
          Sentry.captureException(error);
          datadogRum.addError(error);
        }}
      >
        <App />
      </ErrorBoundary>
    </StrictMode>
  );

  // Enable hot module replacement in development
  if (process.env.NODE_ENV === 'development' && module.hot) {
    module.hot.accept('./App', () => {
      root.render(
        <StrictMode>
          <ErrorBoundary fallback={ErrorFallback}>
            <App />
          </ErrorBoundary>
        </StrictMode>
      );
    });
  }
};

// Initialize monitoring before rendering
initializeMonitoring();

// Handle unhandled errors and rejections
window.addEventListener('error', (event) => {
  Sentry.captureException(event.error);
  datadogRum.addError(event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  Sentry.captureException(event.reason);
  datadogRum.addError(event.reason);
});

// Render the application
renderApp();