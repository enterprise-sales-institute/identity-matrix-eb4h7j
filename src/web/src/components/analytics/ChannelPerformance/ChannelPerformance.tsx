import React, { useEffect, useMemo, useCallback, memo } from 'react';
import { Typography, Box, CircularProgress, Alert, useTheme } from '@mui/material'; // v5.0.0
import { debounce } from 'lodash'; // v4.17.21
import { ErrorBoundary } from 'react-error-boundary'; // v4.0.11
import { usePerformanceMonitor } from '@performance-monitor/react'; // v1.0.0

import {
  Container,
  Header,
  ChartContainer,
  MetricsGrid,
  MetricCard
} from './ChannelPerformance.styles';

// Constants
const POLLING_INTERVAL = 5000;
const CHART_HEIGHT = '400px';
const DEBOUNCE_DELAY = 250;
const RETRY_ATTEMPTS = 3;

const METRIC_CARDS = [
  {
    id: 'conversion-rate',
    title: 'Conversion Rate',
    metric: 'AnalyticsMetric.CONVERSION_RATE',
    format: 'percentage',
    ariaLabel: 'Channel conversion rate metric'
  },
  {
    id: 'revenue',
    title: 'Revenue',
    metric: 'AnalyticsMetric.REVENUE',
    format: 'currency',
    ariaLabel: 'Channel revenue metric'
  },
  {
    id: 'touchpoints',
    title: 'Touchpoints',
    metric: 'AnalyticsMetric.TOUCHPOINTS',
    format: 'number',
    ariaLabel: 'Channel touchpoints metric'
  },
  {
    id: 'attribution',
    title: 'Attribution Weight',
    metric: 'AnalyticsMetric.ATTRIBUTION_WEIGHT',
    format: 'percentage',
    ariaLabel: 'Channel attribution weight metric'
  }
];

// Types
interface TimeRange {
  start: Date;
  end: Date;
}

interface AttributionModel {
  id: string;
  name: string;
  type: string;
}

interface PerformanceConfig {
  enableMonitoring: boolean;
  sampleRate: number;
}

interface ChannelPerformanceProps {
  timeRange: TimeRange;
  selectedModel: AttributionModel;
  onChannelSelect: (channelId: string) => void;
  accessibilityLabels: Record<string, string>;
  performanceConfig?: PerformanceConfig;
}

// Error Fallback Component
const ErrorFallback = ({ error, resetErrorBoundary }: any) => (
  <Alert 
    severity="error" 
    action={
      <Box onClick={resetErrorBoundary} role="button" tabIndex={0}>
        Retry
      </Box>
    }
  >
    {error.message}
  </Alert>
);

// Main Component
const ChannelPerformance: React.FC<ChannelPerformanceProps> = memo(({
  timeRange,
  selectedModel,
  onChannelSelect,
  accessibilityLabels,
  performanceConfig = { enableMonitoring: true, sampleRate: 0.1 }
}) => {
  const theme = useTheme();
  const { trackMetric } = usePerformanceMonitor(performanceConfig);

  // State management with Web Worker for heavy calculations
  const worker = useMemo(() => {
    if (typeof Worker !== 'undefined') {
      return new Worker(new URL('./channelCalculations.worker', import.meta.url));
    }
    return null;
  }, []);

  // Memoized data transformation
  const chartData = useMemo(() => {
    trackMetric('chartDataTransformation');
    // Transform data for visualization
    return {};
  }, [timeRange, selectedModel]);

  // Debounced API polling
  const pollData = useCallback(
    debounce(async () => {
      try {
        // Fetch updated data
        trackMetric('dataPolling');
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, DEBOUNCE_DELAY),
    [timeRange, selectedModel]
  );

  // Setup polling interval
  useEffect(() => {
    const pollingInterval = setInterval(pollData, POLLING_INTERVAL);
    return () => {
      clearInterval(pollingInterval);
      pollData.cancel();
    };
  }, [pollData]);

  // Cleanup worker
  useEffect(() => {
    return () => worker?.terminate();
  }, [worker]);

  // Handle metric card selection
  const handleMetricSelect = useCallback((metricId: string) => {
    trackMetric('metricSelection');
    onChannelSelect(metricId);
  }, [onChannelSelect, trackMetric]);

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Container role="region" aria-label={accessibilityLabels.container}>
        <Header>
          <Typography variant="h1" component="h1">
            {accessibilityLabels.title || 'Channel Performance'}
          </Typography>
          <Box display="flex" gap={2} alignItems="center">
            {/* Additional header controls can be added here */}
          </Box>
        </Header>

        <ChartContainer
          role="img"
          aria-label={accessibilityLabels.chart}
          height={CHART_HEIGHT}
        >
          {/* Chart implementation goes here */}
        </ChartContainer>

        <MetricsGrid
          role="list"
          aria-label={accessibilityLabels.metrics}
        >
          {METRIC_CARDS.map((card) => (
            <MetricCard
              key={card.id}
              role="listitem"
              onClick={() => handleMetricSelect(card.id)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleMetricSelect(card.id);
                }
              }}
              tabIndex={0}
              aria-label={card.ariaLabel}
            >
              <Typography variant="h3" component="h2">
                {card.title}
              </Typography>
              {/* Metric value and visualization */}
            </MetricCard>
          ))}
        </MetricsGrid>
      </Container>
    </ErrorBoundary>
  );
});

ChannelPerformance.displayName = 'ChannelPerformance';

export default ChannelPerformance;