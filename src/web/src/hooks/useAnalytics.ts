/**
 * @fileoverview Custom React hook for managing analytics state and operations with real-time updates
 * @version 1.0.0
 */

// External imports - v18.2.0
import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux'; // v8.1.0

// Internal imports
import {
  fetchDashboardData,
  fetchChannelPerformance,
  fetchJourneyAnalysis
} from '../store/slices/analyticsSlice';
import type { AnalyticsQuery, AnalyticsResult } from '../types/analytics.types';

/**
 * Interface for analytics error with enhanced details
 */
interface AnalyticsError {
  message: string;
  code: string;
  details: string;
  retryCount: number;
  timestamp: Date;
}

/**
 * Interface for analytics hook configuration
 */
interface AnalyticsConfig {
  pollInterval?: number;
  enableAutoRefresh?: boolean;
  retryAttempts?: number;
  cacheTimeout?: number;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<AnalyticsConfig> = {
  pollInterval: 5000, // 5 seconds for real-time updates
  enableAutoRefresh: true,
  retryAttempts: 3,
  cacheTimeout: 300000 // 5 minutes
};

/**
 * Custom hook for managing analytics state and operations
 */
export function useAnalytics(config: Partial<AnalyticsConfig> = {}) {
  const dispatch = useDispatch();
  
  // Merge provided config with defaults
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Select analytics state from Redux store
  const {
    dashboardData,
    channelPerformance,
    journeyAnalysis,
    isLoading,
    error
  } = useSelector((state: any) => state.analytics);

  // Polling control state
  let pollTimer: NodeJS.Timeout | null = null;
  let isPolling = finalConfig.enableAutoRefresh;

  /**
   * Memoized dashboard data fetch handler
   */
  const fetchDashboard = useCallback(async (query: AnalyticsQuery) => {
    try {
      await dispatch(fetchDashboardData.fulfilled(query));
    } catch (error) {
      dispatch(fetchDashboardData.rejected(error instanceof Error ? error.message : 'Failed to fetch dashboard data'));
    }
  }, [dispatch]);

  /**
   * Memoized channel performance fetch handler
   */
  const fetchChannels = useCallback(async (query: AnalyticsQuery) => {
    try {
      await dispatch(fetchChannelPerformance.fulfilled(query));
    } catch (error) {
      dispatch(fetchChannelPerformance.rejected(error instanceof Error ? error.message : 'Failed to fetch channel data'));
    }
  }, [dispatch]);

  /**
   * Memoized journey analysis fetch handler
   */
  const fetchJourney = useCallback(async (query: AnalyticsQuery) => {
    try {
      await dispatch(fetchJourneyAnalysis.fulfilled(query));
    } catch (error) {
      dispatch(fetchJourneyAnalysis.rejected(error instanceof Error ? error.message : 'Failed to fetch journey data'));
    }
  }, [dispatch]);

  /**
   * Updates polling interval
   */
  const setPollInterval = useCallback((interval: number) => {
    if (pollTimer) {
      clearInterval(pollTimer);
    }
    
    if (interval > 0 && isPolling) {
      pollTimer = setInterval(async () => {
        if (isPolling) {
          await Promise.all([
            fetchDashboard({}),
            fetchChannels({}),
            fetchJourney({})
          ]);
        }
      }, interval);
    }
  }, [fetchDashboard, fetchChannels, fetchJourney]);

  /**
   * Pauses real-time data polling
   */
  const pausePolling = useCallback(() => {
    isPolling = false;
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }, []);

  /**
   * Resumes real-time data polling
   */
  const resumePolling = useCallback(() => {
    isPolling = true;
    setPollInterval(finalConfig.pollInterval);
  }, [setPollInterval, finalConfig.pollInterval]);

  // Initialize polling on mount
  useEffect(() => {
    if (finalConfig.enableAutoRefresh) {
      setPollInterval(finalConfig.pollInterval);
    }

    // Cleanup on unmount
    return () => {
      if (pollTimer) {
        clearInterval(pollTimer);
      }
    };
  }, [finalConfig.enableAutoRefresh, finalConfig.pollInterval, setPollInterval]);

  return {
    // State
    dashboardData,
    channelPerformance,
    journeyAnalysis,
    loading: isLoading,
    error,

    // Actions
    fetchDashboard,
    fetchChannels,
    fetchJourney,
    setPollInterval,
    pausePolling,
    resumePolling
  };
}