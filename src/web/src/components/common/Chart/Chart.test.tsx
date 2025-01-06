import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { axe, toHaveNoViolations } from '@testing-library/jest-dom';
import Chart from './Chart';
import { renderWithProviders } from '../../../tests/utils/test-utils';
import { CHART_TYPES } from '../../../constants/chart.constants';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Performance threshold in milliseconds
const PERFORMANCE_THRESHOLD = 100;

// Mock data for different chart types
const mockBarData = {
  labels: ['Channel 1', 'Channel 2', 'Channel 3'],
  datasets: [{
    label: 'Revenue',
    data: [1000, 2000, 3000],
    backgroundColor: ['#0066CC', '#3399FF', '#66B2FF'],
    borderColor: ['#004C99', '#0052A3', '#0066CC'],
  }]
};

const mockLineData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
  datasets: [{
    label: 'Conversions',
    data: [10, 20, 15, 25, 30],
    borderColor: '#0066CC',
    fill: false,
  }]
};

const mockSankeyData = {
  labels: ['Source', 'Medium', 'Conversion'],
  datasets: [{
    label: 'Customer Journey',
    data: [
      { from: 'Social', to: 'Email', value: 100 },
      { from: 'Email', to: 'Conversion', value: 50 },
    ],
  }]
};

// Default test props
const defaultTestProps = {
  height: '300px',
  loading: false,
  ariaLabel: 'Test chart',
  onChartClick: jest.fn(),
  options: {
    theme: 'light',
    animate: true,
    interactive: true,
  }
};

describe('Chart Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Rendering', () => {
    it('renders bar chart with correct data and accessibility features', async () => {
      const { container } = renderWithProviders(
        <Chart
          {...defaultTestProps}
          chartType={CHART_TYPES.BAR}
          data={mockBarData}
          title="Revenue by Channel"
        />
      );

      // Check basic rendering
      expect(screen.getByRole('img')).toBeInTheDocument();
      expect(screen.getByText('Revenue by Channel')).toBeInTheDocument();

      // Check accessibility
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('renders line chart with time series data', async () => {
      renderWithProviders(
        <Chart
          {...defaultTestProps}
          chartType={CHART_TYPES.LINE}
          data={mockLineData}
          title="Conversion Trend"
        />
      );

      expect(screen.getByText('Conversion Trend')).toBeInTheDocument();
      expect(screen.getByTestId('chart-container')).toBeInTheDocument();
    });

    it('renders sankey diagram for customer journey visualization', async () => {
      renderWithProviders(
        <Chart
          {...defaultTestProps}
          chartType={CHART_TYPES.SANKEY}
          data={mockSankeyData}
          title="Customer Journey Flow"
        />
      );

      expect(screen.getByText('Customer Journey Flow')).toBeInTheDocument();
      expect(screen.getByTestId('chart-container')).toBeInTheDocument();
    });
  });

  describe('Loading and Error States', () => {
    it('displays loading indicator when loading prop is true', () => {
      renderWithProviders(
        <Chart
          {...defaultTestProps}
          loading={true}
          chartType={CHART_TYPES.BAR}
          data={mockBarData}
        />
      );

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('displays error message when chart fails to render', async () => {
      const errorProps = {
        ...defaultTestProps,
        data: { labels: [], datasets: [] }, // Invalid data
        chartType: CHART_TYPES.BAR,
      };

      renderWithProviders(<Chart {...errorProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Unable to render chart/i)).toBeInTheDocument();
      });
    });
  });

  describe('Interactions', () => {
    it('handles click events on chart elements', async () => {
      const onChartClick = jest.fn();
      renderWithProviders(
        <Chart
          {...defaultTestProps}
          chartType={CHART_TYPES.BAR}
          data={mockBarData}
          onChartClick={onChartClick}
        />
      );

      const chartContainer = screen.getByTestId('chart-container');
      fireEvent.click(chartContainer);

      expect(onChartClick).toHaveBeenCalled();
    });

    it('supports keyboard navigation', () => {
      renderWithProviders(
        <Chart
          {...defaultTestProps}
          chartType={CHART_TYPES.BAR}
          data={mockBarData}
        />
      );

      const chartWrapper = screen.getByRole('img');
      expect(chartWrapper).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('Performance', () => {
    it('renders within performance threshold', async () => {
      const startTime = performance.now();

      renderWithProviders(
        <Chart
          {...defaultTestProps}
          chartType={CHART_TYPES.BAR}
          data={mockBarData}
        />
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(PERFORMANCE_THRESHOLD);
    });

    it('handles large datasets efficiently', async () => {
      const largeData = {
        labels: Array.from({ length: 1000 }, (_, i) => `Label ${i}`),
        datasets: [{
          label: 'Large Dataset',
          data: Array.from({ length: 1000 }, () => Math.random() * 1000),
          backgroundColor: '#0066CC',
        }]
      };

      const startTime = performance.now();

      renderWithProviders(
        <Chart
          {...defaultTestProps}
          chartType={CHART_TYPES.BAR}
          data={largeData}
          options={{
            ...defaultTestProps.options,
            performance: {
              enableWebWorker: true,
              progressiveRendering: true,
            }
          }}
        />
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(PERFORMANCE_THRESHOLD * 2);
    });
  });

  describe('Real-time Updates', () => {
    it('updates chart when data changes', async () => {
      const { rerender } = renderWithProviders(
        <Chart
          {...defaultTestProps}
          chartType={CHART_TYPES.BAR}
          data={mockBarData}
        />
      );

      const updatedData = {
        ...mockBarData,
        datasets: [{
          ...mockBarData.datasets[0],
          data: [1500, 2500, 3500],
        }]
      };

      rerender(
        <Chart
          {...defaultTestProps}
          chartType={CHART_TYPES.BAR}
          data={updatedData}
        />
      );

      // Wait for chart update
      await waitFor(() => {
        expect(screen.getByTestId('chart-container')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('provides appropriate ARIA labels and roles', () => {
      renderWithProviders(
        <Chart
          {...defaultTestProps}
          chartType={CHART_TYPES.BAR}
          data={mockBarData}
          title="Accessible Chart"
        />
      );

      const chart = screen.getByRole('img');
      expect(chart).toHaveAttribute('aria-label', 'Test chart');
    });

    it('maintains color contrast requirements', async () => {
      const { container } = renderWithProviders(
        <Chart
          {...defaultTestProps}
          chartType={CHART_TYPES.BAR}
          data={mockBarData}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Error Boundaries', () => {
    it('catches and handles rendering errors gracefully', () => {
      const errorFallback = <div>Error rendering chart</div>;
      
      renderWithProviders(
        <Chart
          {...defaultTestProps}
          chartType={CHART_TYPES.BAR}
          data={{ labels: [], datasets: [] }} // Invalid data
          errorFallback={errorFallback}
        />
      );

      expect(screen.getByText(/Error rendering chart/i)).toBeInTheDocument();
    });
  });
});