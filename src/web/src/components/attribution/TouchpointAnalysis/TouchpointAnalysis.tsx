import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Box, Card, CardContent, Typography, CircularProgress, Tooltip, Zoom } from '@mui/material';
import { format, differenceInHours } from 'date-fns';
import { debounce } from 'lodash';
import useWebSocket from 'react-use-websocket';

// Internal imports
import Chart from '../../common/Chart/Chart';
import useAttribution from '../../../hooks/useAttribution';
import { Channel, TouchpointSequence, Touchpoint } from '../../../types/attribution.types';
import { LoadingState } from '../../../types/common.types';

// Constants
const CHART_HEIGHT = '400px';
const MIN_TOUCHPOINTS_FOR_ANALYSIS = 2;
const MAX_PATH_SEGMENTS = 5;
const WEBSOCKET_RETRY_DELAY = 5000;
const UPDATE_DEBOUNCE_TIME = 250;

interface TouchpointAnalysisProps {
  dateRange: { startDate: Date; endDate: Date };
  selectedChannels: Channel[];
  onTouchpointSelect: (touchpoint: Touchpoint) => void;
  refreshInterval?: number;
  viewMode?: 'simple' | 'detailed';
}

const TouchpointAnalysis: React.FC<TouchpointAnalysisProps> = ({
  dateRange,
  selectedChannels,
  onTouchpointSelect,
  refreshInterval = 30000,
  viewMode = 'detailed'
}) => {
  // Hooks
  const { currentModel, results, touchpoints } = useAttribution();
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: true,
    error: '',
    isSuccess: false,
    progress: 0,
    stage: 'initializing'
  });

  // WebSocket setup for real-time updates
  const { sendMessage, lastMessage, readyState } = useWebSocket(
    `${process.env.VITE_WS_URL}/attribution/touchpoints`,
    {
      reconnectAttempts: 5,
      reconnectInterval: WEBSOCKET_RETRY_DELAY,
      shouldReconnect: true
    }
  );

  // Refs for performance optimization
  const chartRef = useRef<any>(null);
  const touchpointCache = useRef<Map<string, TouchpointSequence>>(new Map());

  // Memoized data processing
  const processedTouchpoints = useMemo(() => {
    if (!touchpoints || !selectedChannels.length) return [];

    return touchpoints
      .filter(tp => selectedChannels.includes(tp.channel))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [touchpoints, selectedChannels]);

  // Journey path analysis
  const journeyPaths = useMemo(() => {
    if (processedTouchpoints.length < MIN_TOUCHPOINTS_FOR_ANALYSIS) return [];

    return processedTouchpoints.reduce((paths: any[], touchpoint) => {
      const path = touchpointCache.current.get(touchpoint.id);
      if (path) {
        paths.push({
          sequence: path.touchpoints.slice(0, MAX_PATH_SEGMENTS),
          metrics: {
            conversionRate: path.sequenceMetrics.contributionScore,
            timeToConversion: path.sequenceMetrics.timeToConversion,
            value: path.totalValue
          }
        });
      }
      return paths;
    }, []);
  }, [processedTouchpoints]);

  // Chart data preparation
  const chartData = useMemo(() => {
    return {
      labels: journeyPaths.map(path => 
        path.sequence.map(tp => format(new Date(tp.timestamp), 'MMM dd HH:mm')).join(' → ')
      ),
      datasets: [{
        label: 'Conversion Rate',
        data: journeyPaths.map(path => path.metrics.conversionRate * 100),
        backgroundColor: 'rgba(0, 102, 204, 0.2)',
        borderColor: 'rgba(0, 102, 204, 1)',
        borderWidth: 1
      }, {
        label: 'Time to Convert (hours)',
        data: journeyPaths.map(path => path.metrics.timeToConversion),
        backgroundColor: 'rgba(51, 204, 51, 0.2)',
        borderColor: 'rgba(51, 204, 51, 1)',
        borderWidth: 1
      }]
    };
  }, [journeyPaths]);

  // Real-time update handling
  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage.data);
        if (data.type === 'touchpoint_update') {
          touchpointCache.current.set(data.touchpoint.id, data.touchpoint);
        }
      } catch (error) {
        console.error('Failed to process WebSocket message:', error);
      }
    }
  }, [lastMessage]);

  // Debounced update function
  const debouncedUpdate = useCallback(
    debounce(() => {
      if (readyState === WebSocket.OPEN) {
        sendMessage(JSON.stringify({
          type: 'request_update',
          dateRange,
          channels: selectedChannels
        }));
      }
    }, UPDATE_DEBOUNCE_TIME),
    [readyState, dateRange, selectedChannels]
  );

  // Periodic refresh
  useEffect(() => {
    if (!refreshInterval) return;

    const intervalId = setInterval(debouncedUpdate, refreshInterval);
    return () => clearInterval(intervalId);
  }, [refreshInterval, debouncedUpdate]);

  // Loading state management
  useEffect(() => {
    setLoadingState(prev => ({
      ...prev,
      isLoading: !processedTouchpoints.length,
      isSuccess: Boolean(processedTouchpoints.length),
      stage: processedTouchpoints.length ? 'complete' : 'loading'
    }));
  }, [processedTouchpoints]);

  // Chart click handler
  const handleChartClick = useCallback((event: any, data: any) => {
    if (data.datasetIndex === 0 && journeyPaths[data.index]) {
      const selectedPath = journeyPaths[data.index];
      onTouchpointSelect(selectedPath.sequence[0]);
    }
  }, [journeyPaths, onTouchpointSelect]);

  if (loadingState.isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={CHART_HEIGHT}>
        <CircularProgress />
      </Box>
    );
  }

  if (loadingState.error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={CHART_HEIGHT}>
        <Typography color="error" variant="body1">
          {loadingState.error}
        </Typography>
      </Box>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box mb={2}>
          <Typography variant="h6" component="h2">
            Touchpoint Analysis
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {`Analyzing ${processedTouchpoints.length} touchpoints across ${selectedChannels.length} channels`}
          </Typography>
        </Box>

        <Chart
          chartType="bar"
          data={chartData}
          height={CHART_HEIGHT}
          onChartClick={handleChartClick}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            animation: {
              duration: 500
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  callback: (value) => `${value}%`
                }
              }
            },
            plugins: {
              tooltip: {
                enabled: true,
                mode: 'index',
                intersect: false
              },
              legend: {
                position: 'bottom'
              }
            }
          }}
          ariaLabel="Touchpoint analysis chart showing conversion rates and time to convert"
        />

        {viewMode === 'detailed' && (
          <Box mt={2}>
            <Typography variant="body2" color="textSecondary">
              {`Last updated: ${format(new Date(), 'MMM dd, yyyy HH:mm:ss')}`}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default TouchpointAnalysis;