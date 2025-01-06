/**
 * @fileoverview Main analytics page component providing comprehensive marketing attribution analytics
 * @version 1.0.0
 */

// External imports - v18.2.0
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Container, CircularProgress, Alert, Skeleton } from '@mui/material'; // v5.0.0
import { debounce } from 'lodash'; // v4.17.21
import { ErrorBoundary } from 'react-error-boundary'; // v4.0.11

// Internal imports
import AnalyticsDashboard from '../../components/analytics/AnalyticsDashboard/AnalyticsDashboard';
import { useAnalytics } from '../../hooks/useAnalytics';
import type { TimeRange } from '../../types/common.types';
import type { AnalyticsError } from '../../types/analytics.types';

// Constants
const DEFAULT_REFRESH_INTERVAL = 5000; // 5 seconds
const DEBOUNCE_DELAY = 250; // ms
const ERROR_RETRY_ATTEMPTS = 3;

// Types
interface AnalyticsPageProps {
  refreshInterval?: number;
  initialTimeRange?: TimeRange;
}

// Error Fallback Component
const ErrorFallback = ({ error, resetErrorBoundary }: any) => (
  <Alert 
    severity="error"
    action={
      <button onClick={resetErrorBoundary} className="error-retry-button">
        Retry
      </button>
    }
    sx={{ margin: 2 }}
  >
    {error.message}
  </Alert>
);

/**
 * Main Analytics page component with real-time updates and accessibility support
 */
const Analytics: React.FC<AnalyticsPageProps> = React.memo(({
  refreshInterval = DEFAULT_REFRESH_INTERVAL,
  initialTimeRange
}) => {
  // Analytics hook with real-time updates
  const {
    dashboardData,
    loading,
    error,
    fetchDashboard,
    resumePolling,
    pausePolling
  } = useAnalytics({
    pollInterval: refreshInterval,
    enableAutoRefresh: true
  });

  // Local state
  const [timeRange, setTimeRange] = useState<TimeRange>(initialTimeRange || {
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });

  // Performance monitoring
  const [performanceMetrics, setPerformanceMetrics] = useState({
    loadTime: 0,
    renderTime: 0,
    updateCount: 0
  });

  // Memoized dashboard configuration
  const dashboardConfig = useMemo(() => ({
    enableMonitoring: true,
    sampleRate: 0.1,
    accessibilityLabels: {
      container: 'Marketing attribution analytics dashboard',
      title: 'Analytics Dashboard',
      chart: 'Channel performance visualization',
      metrics: 'Performance metrics'
    }
  }), []);

  // Debounced time range change handler
  const handleTimeRangeChange = useCallback(
    debounce(async (newRange: TimeRange) => {
      try {
        await fetchDashboard({ timeRange: newRange });
        // Update URL parameters without page reload
        const params = new URLSearchParams(window.location.search);
        params.set('startDate', newRange.startDate.toISOString());
        params.set('endDate', newRange.endDate.toISOString());
        window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
        
        // Announce update to screen readers
        const announcement = document.getElementById('analytics-live-region');
        if (announcement) {
          announcement.textContent = 'Dashboard updated with new time range';
        }
      } catch (err) {
        console.error('Error updating time range:', err);
      }
    }, DEBOUNCE_DELAY),
    [fetchDashboard]
  );

  // Handle data export
  const handleExport = useCallback(async () => {
    try {
      // Implement export logic
      return Promise.resolve();
    } catch (error) {
      console.error('Export error:', error);
      return Promise.reject(error);
    }
  }, []);

  // Initialize analytics and setup cleanup
  useEffect(() => {
    const startTime = performance.now();
    
    // Initial data fetch
    fetchDashboard({ timeRange });
    
    // Resume real-time updates
    resumePolling();

    // Update performance metrics
    setPerformanceMetrics(prev => ({
      ...prev,
      loadTime: performance.now() - startTime
    }));

    // Cleanup
    return () => {
      pausePolling();
      handleTimeRangeChange.cancel();
    };
  }, [fetchDashboard, resumePolling, pausePolling, timeRange]);

  // Render loading state
  if (loading && !dashboardData) {
    return (
      <Container sx={{ py: 4 }}>
        <Skeleton variant="rectangular" height={200} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={400} />
      </Container>
    );
  }

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        fetchDashboard({ timeRange });
      }}
      resetKeys={[timeRange]}
    >
      {/* Live region for accessibility announcements */}
      <div
        id="analytics-live-region"
        aria-live="polite"
        className="sr-only"
        role="status"
      />

      <Container 
        sx={{ py: 4 }}
        role="main"
        aria-label="Analytics Dashboard"
      >
        <AnalyticsDashboard
          timeRange={timeRange}
          onTimeRangeChange={handleTimeRangeChange}
          onExport={handleExport}
          refreshInterval={refreshInterval}
          accessibilityLabels={dashboardConfig.accessibilityLabels}
          performanceConfig={{
            enableMonitoring: dashboardConfig.enableMonitoring,
            sampleRate: dashboardConfig.sampleRate
          }}
        />
      </Container>
    </ErrorBoundary>
  );
});

Analytics.displayName = 'Analytics';

export default Analytics;