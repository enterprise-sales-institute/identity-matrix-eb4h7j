/**
 * @fileoverview Test suite for AnalyticsDashboard component
 * @version 1.0.0
 */

// External imports
import React from 'react';
import { 
  render, 
  screen, 
  waitFor, 
  fireEvent, 
  within,
  act 
} from '@testing-library/react';
import { setupServer } from 'msw/node';
import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { axe, toHaveNoViolations } from '@testing-library/jest-axe';

// Internal imports
import { renderWithProviders } from '../../../tests/utils/test-utils';
import AnalyticsDashboard from './AnalyticsDashboard';
import { analyticsHandlers } from '../../../tests/mocks/handlers';
import { AnalyticsMetric } from '../../../types/analytics.types';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Setup MSW Server
const server = setupServer(...analyticsHandlers);

// Test IDs for component selection
const TEST_IDS = {
  dashboard: 'analytics-dashboard',
  loading: 'loading-spinner',
  error: 'error-alert',
  refresh: 'refresh-button',
  export: 'export-button',
  timeRange: 'time-range-selector',
  metrics: {
    revenue: 'metric-revenue',
    conversions: 'metric-conversions',
    roi: 'metric-roi',
    topChannel: 'metric-top-channel'
  }
};

// Mock time range for testing
const mockTimeRange = {
  startDate: new Date('2023-01-01'),
  endDate: new Date('2023-12-31'),
  timeZone: 'UTC'
};

describe('AnalyticsDashboard', () => {
  // Setup and teardown
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(() => {
    server.resetHandlers();
    jest.clearAllMocks();
  });

  // Test initial rendering and loading state
  it('should render loading state correctly', async () => {
    const { container } = renderWithProviders(
      <AnalyticsDashboard 
        timeRange={mockTimeRange}
        onTimeRangeChange={jest.fn()}
      />
    );

    // Check loading spinner visibility
    expect(screen.getByTestId(TEST_IDS.loading)).toBeInTheDocument();
    
    // Verify loading state accessibility
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  // Test successful data loading
  it('should display dashboard data when loaded', async () => {
    renderWithProviders(
      <AnalyticsDashboard 
        timeRange={mockTimeRange}
        onTimeRangeChange={jest.fn()}
      />
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByTestId(TEST_IDS.loading)).not.toBeInTheDocument();
    });

    // Verify metrics display
    expect(screen.getByTestId(TEST_IDS.metrics.revenue)).toHaveTextContent(/125,000/);
    expect(screen.getByTestId(TEST_IDS.metrics.conversions)).toHaveTextContent(/45,678/);
    expect(screen.getByTestId(TEST_IDS.metrics.roi)).toBeInTheDocument();
  });

  // Test error handling
  it('should handle and display error states appropriately', async () => {
    // Mock error response
    server.use(
      rest.get('/api/analytics/dashboard', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    renderWithProviders(
      <AnalyticsDashboard 
        timeRange={mockTimeRange}
        onTimeRangeChange={jest.fn()}
      />
    );

    // Verify error display
    await waitFor(() => {
      expect(screen.getByTestId(TEST_IDS.error)).toBeInTheDocument();
    });

    // Test error retry functionality
    const retryButton = within(screen.getByTestId(TEST_IDS.error))
      .getByRole('button', { name: /retry/i });
    fireEvent.click(retryButton);

    // Verify loading state after retry
    expect(screen.getByTestId(TEST_IDS.loading)).toBeInTheDocument();
  });

  // Test real-time updates
  it('should handle real-time data updates', async () => {
    jest.useFakeTimers();

    renderWithProviders(
      <AnalyticsDashboard 
        timeRange={mockTimeRange}
        onTimeRangeChange={jest.fn()}
        refreshInterval={5000}
      />
    );

    // Initial data load
    await waitFor(() => {
      expect(screen.queryByTestId(TEST_IDS.loading)).not.toBeInTheDocument();
    });

    // Simulate time passing and data update
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    // Verify data refresh
    await waitFor(() => {
      const revenueMetric = screen.getByTestId(TEST_IDS.metrics.revenue);
      expect(revenueMetric).toHaveTextContent(/125,000/);
    });

    jest.useRealTimers();
  });

  // Test user interactions
  it('should handle user interactions correctly', async () => {
    const onTimeRangeChange = jest.fn();
    const onExport = jest.fn();

    renderWithProviders(
      <AnalyticsDashboard 
        timeRange={mockTimeRange}
        onTimeRangeChange={onTimeRangeChange}
        onExport={onExport}
      />
    );

    // Test time range selection
    const timeRangeSelector = screen.getByTestId(TEST_IDS.timeRange);
    fireEvent.click(timeRangeSelector);
    expect(onTimeRangeChange).toHaveBeenCalledWith(mockTimeRange);

    // Test export functionality
    const exportButton = screen.getByTestId(TEST_IDS.export);
    fireEvent.click(exportButton);
    expect(onExport).toHaveBeenCalled();
  });

  // Test accessibility compliance
  it('should meet WCAG 2.1 Level AA standards', async () => {
    const { container } = renderWithProviders(
      <AnalyticsDashboard 
        timeRange={mockTimeRange}
        onTimeRangeChange={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.queryByTestId(TEST_IDS.loading)).not.toBeInTheDocument();
    });

    // Run accessibility tests
    const results = await axe(container);
    expect(results).toHaveNoViolations();

    // Verify keyboard navigation
    const interactiveElements = screen.getAllByRole('button');
    interactiveElements.forEach(element => {
      element.focus();
      expect(element).toHaveFocus();
    });
  });

  // Test performance monitoring
  it('should render and update within performance thresholds', async () => {
    const performanceNow = jest.spyOn(performance, 'now');
    const startTime = performanceNow();

    renderWithProviders(
      <AnalyticsDashboard 
        timeRange={mockTimeRange}
        onTimeRangeChange={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.queryByTestId(TEST_IDS.loading)).not.toBeInTheDocument();
    });

    const renderTime = performanceNow() - startTime;
    expect(renderTime).toBeLessThan(5000); // 5s threshold from requirements
  });
});