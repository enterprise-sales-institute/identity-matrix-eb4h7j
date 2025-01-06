import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { vi } from 'vitest';
import { axe } from '@testing-library/jest-dom/extend-expect';
import { renderWithProviders } from '@testing-library/react-redux';
import JourneyVisualization from './JourneyVisualization';
import { AnalyticsMetric } from '../../../types/analytics.types';

// Mock hooks and utilities
vi.mock('@analytics/hooks', () => ({
  useAnalytics: () => ({
    trackEvent: vi.fn(),
  }),
  useVirtualization: () => ({
    virtualItems: [],
    totalSize: 1000,
  }),
  useResizeObserver: vi.fn(),
}));

// Test constants
const defaultProps = {
  timeRange: {
    start: new Date('2023-01-01'),
    end: new Date('2023-12-31'),
  },
  selectedChannels: ['social', 'email', 'ppc'],
  width: 800,
  height: 600,
  onTouchpointClick: vi.fn(),
  accessibilityLabel: 'Customer Journey Visualization',
};

const mockJourneyData = {
  nodes: [
    {
      id: 'social',
      channel: 'social',
      metrics: {
        conversionRate: 0.35,
        value: 45,
        timeToConvert: 172800000, // 48h in milliseconds
      },
    },
    {
      id: 'email',
      channel: 'email',
      metrics: {
        conversionRate: 0.28,
        value: 35,
        timeToConvert: 86400000, // 24h in milliseconds
      },
    },
    {
      id: 'ppc',
      channel: 'ppc',
      metrics: {
        conversionRate: 0.22,
        value: 20,
        timeToConvert: 43200000, // 12h in milliseconds
      },
    },
  ],
  paths: [
    {
      id: 'social-email',
      source: 'social',
      target: 'email',
      value: 35,
      conversionRate: 0.15,
    },
    {
      id: 'email-ppc',
      source: 'email',
      target: 'ppc',
      value: 25,
      conversionRate: 0.12,
    },
  ],
};

// Helper function to setup component with custom props
const setupJourneyVisualization = (customProps = {}, mockData = mockJourneyData) => {
  const props = { ...defaultProps, ...customProps };
  return renderWithProviders(<JourneyVisualization {...props} />);
};

describe('JourneyVisualization Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering and Layout', () => {
    test('renders journey visualization with correct touchpoints', async () => {
      const { container } = setupJourneyVisualization();
      
      await waitFor(() => {
        mockJourneyData.nodes.forEach(node => {
          expect(screen.getByTestId(`touchpoint-${node.id}`)).toBeInTheDocument();
        });
      });

      expect(container.querySelector('.journey-container')).toHaveAttribute(
        'aria-label',
        defaultProps.accessibilityLabel
      );
    });

    test('applies correct dimensions based on props', () => {
      const customDimensions = { width: 1000, height: 800 };
      const { container } = setupJourneyVisualization(customDimensions);
      
      const journeyContainer = container.querySelector('.journey-container');
      expect(journeyContainer).toHaveStyle({
        width: '1000px',
        height: '800px',
      });
    });

    test('renders loading skeleton when data is loading', () => {
      vi.mock('@analytics/hooks', () => ({
        useAnalytics: () => ({
          loading: true,
        }),
      }));

      setupJourneyVisualization();
      expect(screen.getByTestId('skeleton-ui')).toBeInTheDocument();
    });
  });

  describe('Interaction Handling', () => {
    test('handles touchpoint click events correctly', async () => {
      const onTouchpointClick = vi.fn();
      setupJourneyVisualization({ onTouchpointClick });

      const touchpoint = await screen.findByTestId('touchpoint-social');
      fireEvent.click(touchpoint);

      expect(onTouchpointClick).toHaveBeenCalledWith('social');
    });

    test('supports keyboard navigation between touchpoints', async () => {
      const { container } = setupJourneyVisualization();
      
      const firstTouchpoint = await screen.findByTestId('touchpoint-social');
      fireEvent.keyDown(firstTouchpoint, { key: 'ArrowRight' });
      
      expect(container.querySelector('[data-active="true"]')).toHaveAttribute(
        'data-testid',
        'touchpoint-email'
      );
    });

    test('updates active touchpoint on hover', async () => {
      const { container } = setupJourneyVisualization();
      
      const touchpoint = await screen.findByTestId('touchpoint-social');
      fireEvent.mouseEnter(touchpoint);
      
      expect(touchpoint).toHaveAttribute('data-highlighted', 'true');
      expect(container.querySelector('.metrics-container')).toBeInTheDocument();
    });
  });

  describe('Data Visualization', () => {
    test('renders correct metrics for each touchpoint', async () => {
      setupJourneyVisualization();
      
      await waitFor(() => {
        mockJourneyData.nodes.forEach(node => {
          const touchpoint = screen.getByTestId(`touchpoint-${node.id}`);
          const metrics = within(touchpoint).getByTestId('touchpoint-metrics');
          
          expect(metrics).toHaveTextContent(
            `${(node.metrics.conversionRate * 100).toFixed(1)}%`
          );
        });
      });
    });

    test('renders path connections between touchpoints', async () => {
      const { container } = setupJourneyVisualization();
      
      await waitFor(() => {
        mockJourneyData.paths.forEach(path => {
          expect(
            container.querySelector(`[data-testid="path-${path.id}"]`)
          ).toBeInTheDocument();
        });
      });
    });

    test('updates visualization when time range changes', async () => {
      const { rerender } = setupJourneyVisualization();
      
      const newTimeRange = {
        start: new Date('2023-06-01'),
        end: new Date('2023-06-30'),
      };
      
      rerender(<JourneyVisualization {...defaultProps} timeRange={newTimeRange} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('journey-container')).toHaveAttribute(
          'data-timerange',
          'Jun 2023'
        );
      });
    });
  });

  describe('Accessibility', () => {
    test('meets WCAG accessibility guidelines', async () => {
      const { container } = setupJourneyVisualization();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('supports screen reader navigation', async () => {
      setupJourneyVisualization();
      
      const touchpoints = await screen.findAllByRole('button');
      touchpoints.forEach(touchpoint => {
        expect(touchpoint).toHaveAttribute('aria-label');
        expect(touchpoint).toHaveAttribute('tabindex', '0');
      });
    });

    test('provides appropriate ARIA labels for interactive elements', async () => {
      setupJourneyVisualization();
      
      await waitFor(() => {
        expect(screen.getByRole('region')).toHaveAttribute(
          'aria-label',
          defaultProps.accessibilityLabel
        );
      });
    });
  });

  describe('Performance', () => {
    test('implements virtualization for large datasets', async () => {
      const largeDataset = {
        nodes: Array.from({ length: 1000 }, (_, i) => ({
          id: `node-${i}`,
          channel: `channel-${i}`,
          metrics: { conversionRate: 0.1, value: 10, timeToConvert: 3600000 },
        })),
      };

      setupJourneyVisualization({}, largeDataset);
      
      await waitFor(() => {
        const virtualizedContainer = screen.getByTestId('virtualized-container');
        expect(virtualizedContainer).toHaveAttribute('data-virtualized', 'true');
      });
    });

    test('handles window resize events efficiently', async () => {
      const { container } = setupJourneyVisualization();
      
      // Simulate resize event
      global.dispatchEvent(new Event('resize'));
      
      await waitFor(() => {
        expect(container.querySelector('.journey-container')).toHaveAttribute(
          'data-resized',
          'true'
        );
      });
    });
  });

  describe('Error Handling', () => {
    test('displays error message when data loading fails', async () => {
      const error = new Error('Failed to load journey data');
      vi.mock('@analytics/hooks', () => ({
        useAnalytics: () => ({
          error,
        }),
      }));

      setupJourneyVisualization();
      
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Error loading visualization'
      );
    });

    test('provides retry functionality on error', async () => {
      const onError = vi.fn();
      const { rerender } = setupJourneyVisualization({ onError });
      
      // Simulate error state
      rerender(
        <JourneyVisualization
          {...defaultProps}
          onError={onError}
          error={new Error('Test error')}
        />
      );
      
      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);
      
      expect(onError).toHaveBeenCalled();
    });
  });
});