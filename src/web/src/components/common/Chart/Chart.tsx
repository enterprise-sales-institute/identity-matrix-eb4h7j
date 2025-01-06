import React, { useEffect, useRef, useMemo, useCallback, Suspense } from 'react';
import { Box, CircularProgress, Typography, useTheme, Skeleton } from '@mui/material'; // v5.0.0
import { ChartContainer, ChartWrapper, ChartLegend, ChartErrorBoundary } from './Chart.styles';
import useChart from '../../../hooks/useChart';
import { CHART_TYPES, CHART_BREAKPOINTS } from '../../../constants/chart.constants';

// Chart component props interface with comprehensive options
interface ChartProps {
  chartType: typeof CHART_TYPES[keyof typeof CHART_TYPES];
  data: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      backgroundColor?: string | string[];
      borderColor?: string | string[];
      [key: string]: any;
    }>;
  };
  options?: {
    theme?: 'light' | 'dark';
    size?: 'SMALL' | 'MEDIUM' | 'LARGE';
    animate?: boolean;
    interactive?: boolean;
    performance?: {
      enableWebWorker?: boolean;
      progressiveRendering?: boolean;
      debounceDelay?: number;
    };
  };
  title?: string;
  loading?: boolean;
  height?: string;
  onChartClick?: (event: any, data: any) => void;
  ariaLabel?: string;
  errorFallback?: React.ReactNode;
}

// Error messages for different failure scenarios
const ERROR_MESSAGES = {
  INITIALIZATION: 'Failed to initialize chart',
  DATA_PROCESSING: 'Error processing chart data',
  RENDERING: 'Unable to render chart',
  ACCESSIBILITY: 'Accessibility features unavailable'
};

// Chart component with error boundary and performance monitoring
const Chart: React.FC<ChartProps> = ({
  chartType,
  data,
  options = {},
  title,
  loading = false,
  height = '300px',
  onChartClick,
  ariaLabel,
  errorFallback
}) => {
  const theme = useTheme();
  const chartContainerId = useRef(`chart-container-${Math.random().toString(36).substr(2, 9)}`);
  const containerRef = useRef<HTMLDivElement>(null);

  // Memoized chart options with theme integration
  const chartOptions = useMemo(() => ({
    theme: theme.palette.mode,
    size: options.size || 'MEDIUM',
    animate: options.animate !== false,
    interactive: options.interactive !== false,
    performance: {
      enableWebWorker: options.performance?.enableWebWorker || false,
      progressiveRendering: options.performance?.progressiveRendering || false,
      debounceDelay: options.performance?.debounceDelay || 150
    }
  }), [options, theme.palette.mode]);

  // Initialize chart with optimized hook
  const {
    chartInstance,
    updateChart,
    destroyChart,
    isLoading: hookLoading,
    error,
    performance: performanceMetrics
  } = useChart({
    chartType,
    data,
    containerId: chartContainerId.current,
    options: chartOptions
  });

  // Handle chart click events with analytics tracking
  const handleChartClick = useCallback((event: any) => {
    if (!onChartClick || !chartInstance) return;

    const activeElements = chartInstance.getElementsAtEventForMode(
      event,
      'nearest',
      { intersect: true },
      false
    );

    if (activeElements.length > 0) {
      const clickedElement = activeElements[0];
      const clickedData = {
        datasetIndex: clickedElement.datasetIndex,
        index: clickedElement.index,
        value: data.datasets[clickedElement.datasetIndex].data[clickedElement.index],
        label: data.labels[clickedElement.index]
      };
      onChartClick(event, clickedData);
    }
  }, [onChartClick, chartInstance, data]);

  // Update chart when data changes
  useEffect(() => {
    if (!loading && data && chartInstance) {
      updateChart(data);
    }
  }, [data, loading, chartInstance, updateChart]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      destroyChart();
    };
  }, [destroyChart]);

  // Render loading state
  if (loading || hookLoading) {
    return (
      <ChartContainer>
        <Box display="flex" alignItems="center" justifyContent="center" height={height}>
          <CircularProgress aria-label="Loading chart" />
        </Box>
      </ChartContainer>
    );
  }

  // Render error state
  if (error) {
    return (
      <ChartContainer>
        <Box display="flex" alignItems="center" justifyContent="center" height={height}>
          {errorFallback || (
            <Typography color="error" variant="body1">
              {ERROR_MESSAGES.RENDERING}
            </Typography>
          )}
        </Box>
      </ChartContainer>
    );
  }

  return (
    <ChartErrorBoundary fallback={errorFallback}>
      <ChartContainer>
        {title && (
          <Typography
            variant="h6"
            component="h2"
            gutterBottom
            align="center"
            aria-label={`${title} chart`}
          >
            {title}
          </Typography>
        )}
        <ChartWrapper
          ref={containerRef}
          height={height}
          onClick={handleChartClick}
          role="img"
          aria-label={ariaLabel || `${chartType} chart visualization`}
          tabIndex={0}
        >
          <Suspense
            fallback={
              <Skeleton
                variant="rectangular"
                width="100%"
                height={height}
                animation="wave"
              />
            }
          >
            <div
              id={chartContainerId.current}
              style={{ width: '100%', height: '100%' }}
              data-testid="chart-container"
              aria-hidden="true"
            />
          </Suspense>
        </ChartWrapper>
        {performanceMetrics.renderTime > 0 && (
          <Typography
            variant="caption"
            color="textSecondary"
            component="div"
            align="right"
          >
            Render time: {performanceMetrics.renderTime.toFixed(2)}ms
          </Typography>
        )}
      </ChartContainer>
    </ChartErrorBoundary>
  );
};

export default Chart;