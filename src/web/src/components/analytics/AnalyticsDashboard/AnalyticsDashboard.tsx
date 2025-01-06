import React, { useEffect, useMemo, useCallback, useState } from 'react';
import { 
  Card, 
  CircularProgress, 
  Typography, 
  Grid, 
  IconButton, 
  Skeleton, 
  Alert,
  Box
} from '@mui/material'; // v5.0.0
import { 
  DateRange, 
  Settings, 
  Download, 
  Refresh 
} from '@mui/icons-material'; // v5.0.0

import { 
  Container, 
  Header, 
  DashboardGrid, 
  MetricsContainer 
} from './AnalyticsDashboard.styles';
import ChannelPerformance from '../ChannelPerformance/ChannelPerformance';
import { useAnalytics } from '../../../hooks/useAnalytics';

// Constants
const REFRESH_INTERVAL = 5000; // 5 seconds
const LOADING_STATES = {
  INITIAL: 'initial',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error'
};

// Types
interface AnalyticsDashboardProps {
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  onExport?: () => Promise<void>;
  refreshInterval?: number;
  theme?: Theme;
}

interface DashboardMetrics {
  totalRevenue: number;
  totalConversions: number;
  averageROI: number;
  topChannel: string;
  revenueChange: number;
  conversionRate: number;
}

// Main Component
const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  timeRange,
  onTimeRangeChange,
  onExport,
  refreshInterval = REFRESH_INTERVAL,
  theme
}) => {
  // State and hooks
  const [loadingState, setLoadingState] = useState(LOADING_STATES.INITIAL);
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

  // Memoized metrics calculation
  const metrics = useMemo<DashboardMetrics>(() => {
    if (!dashboardData) return {
      totalRevenue: 0,
      totalConversions: 0,
      averageROI: 0,
      topChannel: '',
      revenueChange: 0,
      conversionRate: 0
    };

    const channels = dashboardData.channels || [];
    const topChannel = channels.reduce((prev, current) => 
      current.revenueContribution > prev.revenueContribution ? current : prev
    );

    return {
      totalRevenue: dashboardData.totalRevenue,
      totalConversions: dashboardData.totalConversions,
      averageROI: channels.reduce((sum, channel) => sum + channel.metrics.RETURN_ON_INVESTMENT, 0) / channels.length,
      topChannel: topChannel.channelName,
      revenueChange: ((dashboardData.totalRevenue - (dashboardData.comparisonPeriod?.totalRevenue || 0)) / 
        (dashboardData.comparisonPeriod?.totalRevenue || 1)) * 100,
      conversionRate: (dashboardData.totalConversions / channels.reduce((sum, channel) => 
        sum + channel.touchpointCount, 0)) * 100
    };
  }, [dashboardData]);

  // Handlers
  const handleRefresh = useCallback(async () => {
    setLoadingState(LOADING_STATES.LOADING);
    try {
      await fetchDashboard({ timeRange });
      setLoadingState(LOADING_STATES.SUCCESS);
    } catch (err) {
      setLoadingState(LOADING_STATES.ERROR);
    }
  }, [fetchDashboard, timeRange]);

  const handleExport = useCallback(async () => {
    if (onExport) {
      setLoadingState(LOADING_STATES.LOADING);
      try {
        await onExport();
        setLoadingState(LOADING_STATES.SUCCESS);
      } catch (err) {
        setLoadingState(LOADING_STATES.ERROR);
      }
    }
  }, [onExport]);

  // Effects
  useEffect(() => {
    handleRefresh();
  }, [handleRefresh]);

  useEffect(() => {
    resumePolling();
    return () => pausePolling();
  }, [resumePolling, pausePolling]);

  // Render helpers
  const renderMetricCard = (title: string, value: number | string, trend?: number) => (
    <Card 
      sx={{ 
        p: 2, 
        height: '100%',
        minHeight: '120px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}
    >
      <Typography variant="h6" color="textSecondary">
        {title}
      </Typography>
      {loading ? (
        <Skeleton variant="text" width="60%" height={40} />
      ) : (
        <Typography variant="h4">
          {typeof value === 'number' ? value.toLocaleString() : value}
          {trend && (
            <Typography 
              component="span" 
              color={trend > 0 ? 'success.main' : 'error.main'}
              sx={{ ml: 1, fontSize: '0.8em' }}
            >
              {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
            </Typography>
          )}
        </Typography>
      )}
    </Card>
  );

  return (
    <Container>
      <Header>
        <Typography variant="h1">Analytics Dashboard</Typography>
        <Box display="flex" gap={2}>
          <IconButton 
            onClick={() => onTimeRangeChange(timeRange)}
            aria-label="Change time range"
          >
            <DateRange />
          </IconButton>
          <IconButton 
            onClick={handleRefresh}
            aria-label="Refresh dashboard"
            disabled={loading}
          >
            <Refresh />
          </IconButton>
          <IconButton 
            onClick={handleExport}
            aria-label="Export dashboard data"
            disabled={!onExport || loading}
          >
            <Download />
          </IconButton>
          <IconButton aria-label="Dashboard settings">
            <Settings />
          </IconButton>
        </Box>
      </Header>

      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          action={
            <IconButton 
              color="inherit" 
              size="small" 
              onClick={handleRefresh}
            >
              <Refresh />
            </IconButton>
          }
        >
          {error}
        </Alert>
      )}

      <DashboardGrid>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6} lg={3}>
            {renderMetricCard('Total Revenue', metrics.totalRevenue, metrics.revenueChange)}
          </Grid>
          <Grid item xs={12} md={6} lg={3}>
            {renderMetricCard('Conversions', metrics.totalConversions)}
          </Grid>
          <Grid item xs={12} md={6} lg={3}>
            {renderMetricCard('Average ROI', `${metrics.averageROI.toFixed(2)}%`)}
          </Grid>
          <Grid item xs={12} md={6} lg={3}>
            {renderMetricCard('Top Channel', metrics.topChannel)}
          </Grid>
        </Grid>
      </DashboardGrid>

      <MetricsContainer>
        {loading && loadingState === LOADING_STATES.INITIAL ? (
          <CircularProgress />
        ) : (
          <ChannelPerformance
            timeRange={timeRange}
            selectedModel={dashboardData?.selectedModel}
            onChannelSelect={() => {}}
            accessibilityLabels={{
              container: 'Channel performance section',
              title: 'Channel Performance',
              chart: 'Channel performance visualization',
              metrics: 'Channel metrics'
            }}
            performanceConfig={{
              enableMonitoring: true,
              sampleRate: 0.1
            }}
          />
        )}
      </MetricsContainer>
    </Container>
  );
};

export default AnalyticsDashboard;