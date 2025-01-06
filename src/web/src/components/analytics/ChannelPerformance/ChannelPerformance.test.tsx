/**
 * @fileoverview Test suite for ChannelPerformance component
 * @version 1.0.0
 */

// External imports
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { axe, toHaveNoViolations } from 'jest-axe';

// Internal imports
import { renderWithProviders } from '../../../tests/utils/test-utils';
import ChannelPerformance from './ChannelPerformance';
import { analyticsHandlers } from '../../../tests/mocks/handlers';

// Performance monitoring mock
jest.mock('@performance-monitor/react', () => ({
  usePerformanceMonitor: () => ({
    trackMetric: jest.fn()
  })
}));

// Mock data
const mockTimeRange = {
  start: new Date('2023-01-01'),
  end: new Date('2023-12-31')
};

const mockAttributionModel = {
  id: 'first-touch',
  name: 'First Touch',
  type: 'FIRST_TOUCH'
};

const mockAccessibilityLabels = {
  container: 'Channel performance dashboard',
  title: 'Channel Performance',
  chart: 'Channel performance visualization',
  metrics: 'Performance metrics'
};

const mockChannelData = {
  channels: [
    {
      id: 'social',
      name: 'Social Media',
      metrics: {
        CONVERSION_RATE: 0.156,
        REVENUE: 125000,
        TOUCHPOINTS: 45678,
        ATTRIBUTION_WEIGHT: 0.35
      }
    }
  ]
};

// Server setup
const server = setupServer(...analyticsHandlers);

// Test suite
describe('ChannelPerformance', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
    expect.extend(toHaveNoViolations);
  });

  afterAll(() => server.close());

  beforeEach(() => {
    server.resetHandlers();
    jest.clearAllMocks();
  });

  it('should render loading state correctly', async () => {
    // Render component
    renderWithProviders(
      <ChannelPerformance
        timeRange={mockTimeRange}
        selectedModel={mockAttributionModel}
        onChannelSelect={jest.fn()}
        accessibilityLabels={mockAccessibilityLabels}
      />
    );

    // Verify loading indicator presence
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    // Wait for data load
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('should display channel metrics accurately', async () => {
    const onChannelSelect = jest.fn();

    renderWithProviders(
      <ChannelPerformance
        timeRange={mockTimeRange}
        selectedModel={mockAttributionModel}
        onChannelSelect={onChannelSelect}
        accessibilityLabels={mockAccessibilityLabels}
      />
    );

    // Wait for data load
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    // Verify metric cards
    const metricsList = screen.getByRole('list', { name: mockAccessibilityLabels.metrics });
    const metricCards = within(metricsList).getAllByRole('listitem');
    expect(metricCards).toHaveLength(4);

    // Verify individual metrics
    expect(screen.getByText('15.6%')).toBeInTheDocument(); // Conversion Rate
    expect(screen.getByText('$125,000')).toBeInTheDocument(); // Revenue
    expect(screen.getByText('45,678')).toBeInTheDocument(); // Touchpoints
    expect(screen.getByText('35%')).toBeInTheDocument(); // Attribution Weight
  });

  it('should handle real-time updates', async () => {
    jest.useFakeTimers();

    renderWithProviders(
      <ChannelPerformance
        timeRange={mockTimeRange}
        selectedModel={mockAttributionModel}
        onChannelSelect={jest.fn()}
        accessibilityLabels={mockAccessibilityLabels}
      />
    );

    // Wait for initial data load
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    // Simulate time passing and data update
    jest.advanceTimersByTime(5000);

    // Verify update reflection
    await waitFor(() => {
      expect(screen.getByText('15.6%')).toBeInTheDocument();
    }, { timeout: 5000 });

    jest.useRealTimers();
  });

  it('should be accessible', async () => {
    const { container } = renderWithProviders(
      <ChannelPerformance
        timeRange={mockTimeRange}
        selectedModel={mockAttributionModel}
        onChannelSelect={jest.fn()}
        accessibilityLabels={mockAccessibilityLabels}
      />
    );

    // Run accessibility tests
    const results = await axe(container);
    expect(results).toHaveNoViolations();

    // Verify ARIA attributes
    expect(screen.getByRole('region')).toHaveAttribute('aria-label', mockAccessibilityLabels.container);
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', mockAccessibilityLabels.chart);
    expect(screen.getByRole('list')).toHaveAttribute('aria-label', mockAccessibilityLabels.metrics);

    // Test keyboard navigation
    const firstMetricCard = screen.getAllByRole('listitem')[0];
    firstMetricCard.focus();
    expect(document.activeElement).toBe(firstMetricCard);

    // Test keyboard interaction
    fireEvent.keyPress(firstMetricCard, { key: 'Enter', code: 'Enter' });
    expect(screen.getByText('15.6%')).toBeInTheDocument();
  });

  it('should handle error states gracefully', async () => {
    // Mock error response
    server.use(
      rest.get('/api/analytics/channels', (req, res, ctx) =>
        res(ctx.status(500))
      )
    );

    renderWithProviders(
      <ChannelPerformance
        timeRange={mockTimeRange}
        selectedModel={mockAttributionModel}
        onChannelSelect={jest.fn()}
        accessibilityLabels={mockAccessibilityLabels}
      />
    );

    // Verify error display
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    // Test error retry functionality
    const retryButton = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  it('should maintain performance thresholds', async () => {
    const performanceMonitor = jest.spyOn(global.performance, 'now');
    const startTime = performanceMonitor.mock.results[0].value;

    renderWithProviders(
      <ChannelPerformance
        timeRange={mockTimeRange}
        selectedModel={mockAttributionModel}
        onChannelSelect={jest.fn()}
        accessibilityLabels={mockAccessibilityLabels}
      />
    );

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    const endTime = performanceMonitor.mock.results[0].value;
    expect(endTime - startTime).toBeLessThan(5000); // 5s threshold
  });
});