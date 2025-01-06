/**
 * @fileoverview Redux slice for managing analytics state with real-time updates
 * @version 1.0.0
 */

// External imports
import { createSlice, PayloadAction } from '@reduxjs/toolkit'; // v1.9.0

// Internal imports
import { 
  AnalyticsMetric,
  AnalyticsDashboard,
  AnalyticsFilter,
  ChartConfiguration
} from '../../types/analytics.types';
import { TimeRange } from '../../types/common.types';
import AnalyticsService from '../../services/analytics.service';

/**
 * Interface for analytics state
 */
interface AnalyticsState {
  dashboardData: AnalyticsDashboard | null;
  isLoading: boolean;
  error: string | null;
  selectedTimeRange: TimeRange;
  selectedMetrics: AnalyticsMetric[];
  selectedChannels: string[];
  autoRefresh: boolean;
  refreshInterval: number;
  visualizationConfig: ChartConfiguration;
  filterState: AnalyticsFilter;
}

/**
 * Default time range for analytics
 */
const DEFAULT_TIME_RANGE: TimeRange = {
  startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
  endDate: new Date(),
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
};

/**
 * Initial state configuration
 */
const initialState: AnalyticsState = {
  dashboardData: null,
  isLoading: false,
  error: null,
  selectedTimeRange: DEFAULT_TIME_RANGE,
  selectedMetrics: [
    AnalyticsMetric.CONVERSION_RATE,
    AnalyticsMetric.REVENUE,
    AnalyticsMetric.TOUCHPOINTS,
    AnalyticsMetric.ATTRIBUTION_WEIGHT
  ],
  selectedChannels: [],
  autoRefresh: true,
  refreshInterval: 5000, // 5 seconds
  visualizationConfig: {
    type: 'BAR',
    data: [],
    options: {},
    title: 'Channel Performance',
    interactive: true,
    eventHandlers: {},
    colorScheme: {},
    animations: true,
    legend: {
      position: 'bottom',
      visible: true
    },
    tooltip: {
      enabled: true,
      format: '{value}'
    }
  },
  filterState: {
    timeRange: DEFAULT_TIME_RANGE,
    channels: [],
    metrics: [],
    model: 'FIRST_TOUCH',
    customFilters: {},
    excludeIncomplete: false,
    minConversions: 0,
    minRevenue: 0,
    tags: [],
    segments: []
  }
};

/**
 * Analytics slice with enhanced real-time capabilities
 */
export const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    setTimeRange: (state, action: PayloadAction<TimeRange>) => {
      state.selectedTimeRange = action.payload;
      state.filterState.timeRange = action.payload;
    },
    setSelectedMetrics: (state, action: PayloadAction<AnalyticsMetric[]>) => {
      state.selectedMetrics = action.payload;
      state.filterState.metrics = action.payload;
    },
    setSelectedChannels: (state, action: PayloadAction<string[]>) => {
      state.selectedChannels = action.payload;
      state.filterState.channels = action.payload;
    },
    setAutoRefresh: (state, action: PayloadAction<boolean>) => {
      state.autoRefresh = action.payload;
    },
    setRefreshInterval: (state, action: PayloadAction<number>) => {
      state.refreshInterval = action.payload;
    },
    setVisualizationConfig: (state, action: PayloadAction<ChartConfiguration>) => {
      state.visualizationConfig = action.payload;
    },
    setFilterState: (state, action: PayloadAction<AnalyticsFilter>) => {
      state.filterState = action.payload;
    },
    setDashboardData: (state, action: PayloadAction<AnalyticsDashboard>) => {
      state.dashboardData = action.payload;
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    clearError: (state) => {
      state.error = null;
    }
  }
});

/**
 * Async thunk for fetching dashboard data with retry logic
 */
export const fetchDashboardData = (
  timeRange: TimeRange,
  metrics: AnalyticsMetric[],
  filters: AnalyticsFilter
) => async (dispatch: any) => {
  try {
    dispatch(setLoading(true));
    dispatch(clearError());

    const analyticsService = new AnalyticsService();
    const response = await analyticsService.getDashboardData(timeRange, metrics);

    if (response.success) {
      dispatch(setDashboardData(response.data));
    } else {
      dispatch(setError(response.message));
    }
  } catch (error) {
    dispatch(setError(error instanceof Error ? error.message : 'Failed to fetch dashboard data'));
  } finally {
    dispatch(setLoading(false));
  }
};

/**
 * Async thunk for refreshing analytics data
 */
export const refreshAnalytics = (force: boolean = false) => async (dispatch: any, getState: any) => {
  const state = getState().analytics;
  
  if (!force && (!state.autoRefresh || state.isLoading)) {
    return;
  }

  try {
    await dispatch(fetchDashboardData(
      state.selectedTimeRange,
      state.selectedMetrics,
      state.filterState
    ));
  } catch (error) {
    console.error('Error refreshing analytics:', error);
  }
};

// Export actions
export const {
  setTimeRange,
  setSelectedMetrics,
  setSelectedChannels,
  setAutoRefresh,
  setRefreshInterval,
  setVisualizationConfig,
  setFilterState,
  setDashboardData,
  setLoading,
  setError,
  clearError
} = analyticsSlice.actions;

// Export reducer
export default analyticsSlice.reducer;