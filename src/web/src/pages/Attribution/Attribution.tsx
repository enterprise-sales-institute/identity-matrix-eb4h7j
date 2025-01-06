/**
 * @fileoverview Main attribution page component with real-time updates and accessibility support
 * @version 1.0.0
 */

// External imports
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  useTheme
} from '@mui/material';
import { DateRangePicker } from '@mui/lab';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ErrorBoundary } from 'react-error-boundary';
import useWebSocket from 'react-use-websocket';
import usePerformanceMonitor from '@performance-monitor/react';

// Internal imports
import ModelConfiguration from '../../components/attribution/ModelConfiguration/ModelConfiguration';
import TouchpointAnalysis from '../../components/attribution/TouchpointAnalysis/TouchpointAnalysis';
import useAttribution from '../../hooks/useAttribution';
import { Channel } from '../../types/attribution.types';

// Constants
const TAB_INDICES = {
  MODEL_CONFIG: 0,
  TOUCHPOINT_ANALYSIS: 1
} as const;

const DEFAULT_DATE_RANGE = {
  startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  endDate: new Date()
};

const PERFORMANCE_THRESHOLDS = {
  RENDER_TIME_MS: 16,
  DATA_UPDATE_MS: 5000,
  RECONNECT_INTERVAL_MS: 3000
} as const;

const ACCESSIBILITY_LABELS = {
  MODEL_CONFIG_TAB: 'Attribution Model Configuration',
  ANALYSIS_TAB: 'Touchpoint Analysis',
  DATE_PICKER: 'Date Range Selection',
  LOADING_STATE: 'Loading Attribution Data'
} as const;

// Interface for page state
interface AttributionPageState {
  currentTab: number;
  dateRange: { startDate: Date; endDate: Date };
  selectedChannels: Channel[];
  wsConnectionStatus: WebSocket['readyState'];
  performanceMetrics: {
    renderTime: number;
    updateTime: number;
  };
  loadingStates: Record<string, boolean>;
  errors: Record<string, Error | null>;
}

/**
 * Main Attribution page component with real-time updates and accessibility support
 */
const Attribution: React.FC = () => {
  const theme = useTheme();
  const {
    currentModel,
    results,
    updateModel,
    fetchResults,
    fetchTouchpoints,
    connectRealTime,
    loadingState
  } = useAttribution();

  // State management
  const [state, setState] = useState<AttributionPageState>({
    currentTab: TAB_INDICES.MODEL_CONFIG,
    dateRange: DEFAULT_DATE_RANGE,
    selectedChannels: Object.values(Channel),
    wsConnectionStatus: WebSocket.CONNECTING,
    performanceMetrics: { renderTime: 0, updateTime: 0 },
    loadingStates: {},
    errors: {}
  });

  // WebSocket setup for real-time updates
  const { sendMessage, lastMessage, readyState } = useWebSocket(
    `${process.env.VITE_WS_URL}/attribution/realtime`,
    {
      reconnectAttempts: 5,
      reconnectInterval: PERFORMANCE_THRESHOLDS.RECONNECT_INTERVAL_MS,
      shouldReconnect: true,
      onOpen: () => {
        setState(prev => ({
          ...prev,
          wsConnectionStatus: WebSocket.OPEN
        }));
      },
      onClose: () => {
        setState(prev => ({
          ...prev,
          wsConnectionStatus: WebSocket.CLOSED
        }));
      }
    }
  );

  // Performance monitoring
  const { trackRender, trackUpdate } = usePerformanceMonitor({
    thresholds: {
      render: PERFORMANCE_THRESHOLDS.RENDER_TIME_MS,
      update: PERFORMANCE_THRESHOLDS.DATA_UPDATE_MS
    }
  });

  // Virtualization for large datasets
  const rowVirtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => document.querySelector('.results-container'),
    estimateSize: () => 50,
    overscan: 5
  });

  // Memoized handlers
  const handleTabChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
    setState(prev => ({ ...prev, currentTab: newValue }));
  }, []);

  const handleDateRangeChange = useCallback((newRange: { startDate: Date; endDate: Date }) => {
    setState(prev => ({ ...prev, dateRange: newRange }));
    fetchResults(newRange);
  }, [fetchResults]);

  const handleModelSave = useCallback(async () => {
    try {
      setState(prev => ({
        ...prev,
        loadingStates: { ...prev.loadingStates, modelSave: true }
      }));
      await updateModel(currentModel);
      await fetchResults(state.dateRange);
    } catch (error) {
      setState(prev => ({
        ...prev,
        errors: { ...prev.errors, modelSave: error as Error }
      }));
    } finally {
      setState(prev => ({
        ...prev,
        loadingStates: { ...prev.loadingStates, modelSave: false }
      }));
    }
  }, [currentModel, updateModel, fetchResults, state.dateRange]);

  // WebSocket message handler
  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage.data);
        if (data.type === 'attribution_update') {
          trackUpdate(() => {
            fetchResults(state.dateRange);
          });
        }
      } catch (error) {
        console.error('WebSocket message parsing error:', error);
      }
    }
  }, [lastMessage, fetchResults, state.dateRange, trackUpdate]);

  // Initial data fetch
  useEffect(() => {
    const initializeData = async () => {
      try {
        await Promise.all([
          fetchResults(state.dateRange),
          fetchTouchpoints(state.dateRange)
        ]);
        await connectRealTime();
      } catch (error) {
        setState(prev => ({
          ...prev,
          errors: { ...prev.errors, initialization: error as Error }
        }));
      }
    };

    initializeData();
  }, [fetchResults, fetchTouchpoints, connectRealTime, state.dateRange]);

  return (
    <ErrorBoundary
      fallback={
        <Alert severity="error">
          Failed to load attribution analysis. Please refresh the page.
        </Alert>
      }
    >
      <Container maxWidth="xl">
        <Box mb={4}>
          <Typography variant="h4" component="h1" gutterBottom>
            Attribution Analysis
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Configure attribution models and analyze marketing touchpoints
          </Typography>
        </Box>

        <Paper elevation={2}>
          <Box p={3}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <DateRangePicker
                  value={state.dateRange}
                  onChange={handleDateRangeChange}
                  renderInput={(startProps, endProps) => (
                    <>
                      <input {...startProps} aria-label={ACCESSIBILITY_LABELS.DATE_PICKER} />
                      <Box sx={{ mx: 2 }}>to</Box>
                      <input {...endProps} />
                    </>
                  )}
                />
              </Grid>
            </Grid>

            <Box mt={3}>
              <Tabs
                value={state.currentTab}
                onChange={handleTabChange}
                aria-label="Attribution analysis tabs"
              >
                <Tab
                  label="Model Configuration"
                  id="attribution-tab-0"
                  aria-controls="attribution-tabpanel-0"
                  aria-label={ACCESSIBILITY_LABELS.MODEL_CONFIG_TAB}
                />
                <Tab
                  label="Touchpoint Analysis"
                  id="attribution-tab-1"
                  aria-controls="attribution-tabpanel-1"
                  aria-label={ACCESSIBILITY_LABELS.ANALYSIS_TAB}
                />
              </Tabs>

              <Box role="tabpanel" hidden={state.currentTab !== TAB_INDICES.MODEL_CONFIG}>
                <ModelConfiguration
                  onSave={handleModelSave}
                  onCancel={() => {}}
                  onError={(error) => {
                    setState(prev => ({
                      ...prev,
                      errors: { ...prev.errors, modelConfig: error }
                    }));
                  }}
                  initialData={currentModel}
                />
              </Box>

              <Box role="tabpanel" hidden={state.currentTab !== TAB_INDICES.TOUCHPOINT_ANALYSIS}>
                <TouchpointAnalysis
                  dateRange={state.dateRange}
                  selectedChannels={state.selectedChannels}
                  onTouchpointSelect={() => {}}
                  refreshInterval={30000}
                  viewMode="detailed"
                />
              </Box>
            </Box>
          </Box>
        </Paper>

        {loadingState.isLoading && (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight={200}
            aria-label={ACCESSIBILITY_LABELS.LOADING_STATE}
          >
            <CircularProgress />
          </Box>
        )}

        {Object.entries(state.errors).map(([key, error]) => (
          error && (
            <Alert severity="error" key={key} sx={{ mt: 2 }}>
              {error.message}
            </Alert>
          )
        ))}
      </Container>
    </ErrorBoundary>
  );
};

export default Attribution;