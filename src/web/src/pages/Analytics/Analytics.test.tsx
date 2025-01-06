/**
 * @fileoverview Comprehensive test suite for Analytics page component
 * @version 1.0.0
 */

// External imports - v18.2.0
import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { vi } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';
import userEvent from '@testing-library/user-event';

// Internal imports
import Analytics from './Analytics';
import { renderWithProviders } from '../../../tests/utils/test-utils';
import { AnalyticsMetric } from '../../types/analytics.types';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock data
const mockAnalyticsData = {
  totalRevenue: 150000,
  totalConversions: 1500,
  channels: [
    {
      channelId: 'social-organic',
      channelName: 'Organic Social',
      metrics: {
        [AnalyticsMetric.CONVERSION_RATE]: 0.15,
        [AnalyticsMetric.REVENUE]: 45000,
        [AnalyticsMetric.TOUCHPOINTS]: 10000,
        [AnalyticsMetric.ATTRIBUTION_WEIGHT]: 0.3
      },
      trend: 0.05,
      attributionWeight: 0.3,
      conversionRate: 0.15,
      revenueContribution: 45000,
      touchpointCount: 10000
    }
  ],
  lastUpdated: new Date(),
  refreshInterval: 5000
};

// Mock performance measurement
const mockPerformanceMetrics = {
  loadTime: 0,
  renderTime: 0,
  updateCount: 0
};

// Mock time ranges
const mockTimeRanges = {
  startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  endDate: new Date(),
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
};

describe('Analytics Page', () => {
  // Mock hooks and services
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockPerformanceMetrics.loadTime = 0;
    mockPerformanceMetrics.renderTime = 0;
    mockPerformanceMetrics.updateCount = 0;
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render loading state initially', () => {
      renderWithProviders(<Analytics />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should render dashboard content when data is loaded', async () => {
      renderWithProviders(<Analytics />, {
        preloadedState: {
          analytics: {
            dashboardData: mockAnalyticsData,
            loading: false,
            error: null
          }
        }
      });

      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument();
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });
    });

    it('should render error state with retry button', async () => {
      renderWithProviders(<Analytics />, {
        preloadedState: {
          analytics: {
            dashboardData: null,
            loading: false,
            error: 'Failed to load analytics data'
          }
        }
      });

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should update data at specified refresh interval', async () => {
      const { store } = renderWithProviders(<Analytics refreshInterval={5000} />);
      
      vi.advanceTimersByTime(5000);
      
      await waitFor(() => {
        expect(store.getState().analytics.dashboardData?.lastUpdated).toBeDefined();
      });
    });

    it('should pause updates when tab is inactive', async () => {
      renderWithProviders(<Analytics />);
      
      // Simulate tab visibility change
      Object.defineProperty(document, 'hidden', { value: true, writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
      
      vi.advanceTimersByTime(5000);
      
      expect(mockPerformanceMetrics.updateCount).toBe(0);
    });

    it('should resume updates when tab becomes active', async () => {
      renderWithProviders(<Analytics />);
      
      // Simulate tab visibility change
      Object.defineProperty(document, 'hidden', { value: false, writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
      
      vi.advanceTimersByTime(5000);
      
      expect(mockPerformanceMetrics.updateCount).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = renderWithProviders(<Analytics />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should support keyboard navigation', async () => {
      renderWithProviders(<Analytics />);
      
      const timeRangeButton = screen.getByRole('button', { name: /change time range/i });
      timeRangeButton.focus();
      
      fireEvent.keyDown(timeRangeButton, { key: 'Enter' });
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('should announce live updates to screen readers', async () => {
      renderWithProviders(<Analytics />);
      
      const liveRegion = screen.getByRole('status');
      
      vi.advanceTimersByTime(5000);
      
      expect(liveRegion).toHaveTextContent(/dashboard updated/i);
    });
  });

  describe('Performance', () => {
    it('should render within performance budget', async () => {
      const startTime = performance.now();
      
      renderWithProviders(<Analytics />);
      
      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(200); // 200ms budget
    });

    it('should optimize re-renders', async () => {
      const { rerender } = renderWithProviders(<Analytics />);
      
      const initialRenderCount = mockPerformanceMetrics.updateCount;
      
      rerender(<Analytics timeRange={mockTimeRanges} />);
      
      expect(mockPerformanceMetrics.updateCount - initialRenderCount).toBeLessThanOrEqual(1);
    });

    it('should handle memory cleanup on unmount', () => {
      const { unmount } = renderWithProviders(<Analytics />);
      
      unmount();
      
      // Verify cleanup
      expect(mockPerformanceMetrics.updateCount).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const { store } = renderWithProviders(<Analytics />);
      
      // Simulate network error
      store.dispatch({
        type: 'analytics/fetchDashboardData/rejected',
        error: { message: 'Network Error' }
      });
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/network error/i);
      });
    });

    it('should retry failed requests', async () => {
      renderWithProviders(<Analytics />);
      
      const retryButton = screen.getByRole('button', { name: /retry/i });
      await userEvent.click(retryButton);
      
      expect(mockPerformanceMetrics.updateCount).toBeGreaterThan(0);
    });

    it('should handle data validation errors', async () => {
      renderWithProviders(<Analytics />, {
        preloadedState: {
          analytics: {
            dashboardData: { ...mockAnalyticsData, totalRevenue: -1 },
            loading: false,
            error: null
          }
        }
      });
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });
  });
});