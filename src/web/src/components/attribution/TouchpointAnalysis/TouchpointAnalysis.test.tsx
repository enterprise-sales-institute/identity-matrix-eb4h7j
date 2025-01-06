import React from 'react';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { axe } from 'jest-axe';
import ResizeObserver from 'resize-observer-polyfill';

// Internal imports
import { TouchpointAnalysis } from './TouchpointAnalysis';
import { renderWithProviders } from '../../../tests/utils/test-utils';
import { Channel } from '../../../types/attribution.types';

// Mock implementations
vi.mock('../../../hooks/useAttribution', () => ({
  default: () => ({
    currentModel: 'LINEAR',
    results: mockAttributionResults,
    touchpoints: mockTouchpointData,
    loadingState: { isLoading: false, error: '', isSuccess: true, progress: 100, stage: 'complete' }
  })
}));

// Mock WebSocket
const mockWebSocket = {
  send: vi.fn(),
  close: vi.fn()
};

// Mock data
const mockTouchpointData = [
  {
    id: '1',
    channel: Channel.SOCIAL_PAID,
    timestamp: new Date('2023-01-01T10:00:00'),
    value: 100,
    metadata: { campaign: 'Q1_Campaign' }
  },
  {
    id: '2',
    channel: Channel.EMAIL_MARKETING,
    timestamp: new Date('2023-01-01T11:00:00'),
    value: 150,
    metadata: { campaign: 'Newsletter_1' }
  }
];

const mockAttributionResults = [
  {
    touchpointId: '1',
    weight: 0.6,
    conversionId: 'conv1',
    model: 'LINEAR'
  },
  {
    touchpointId: '2',
    weight: 0.4,
    conversionId: 'conv1',
    model: 'LINEAR'
  }
];

// Test configuration constants
const TEST_CONFIG = {
  renderTimeout: 1000,
  dataProcessingTimeout: 5000,
  animationDuration: 500,
  chartLoadTimeout: 2000
};

describe('TouchpointAnalysis', () => {
  beforeEach(() => {
    // Setup ResizeObserver mock
    global.ResizeObserver = ResizeObserver;
    
    // Setup WebSocket mock
    global.WebSocket = vi.fn(() => mockWebSocket) as any;
    
    // Clear all mocks
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render loading state initially', () => {
      renderWithProviders(
        <TouchpointAnalysis
          dateRange={{ startDate: new Date(), endDate: new Date() }}
          selectedChannels={[Channel.SOCIAL_PAID, Channel.EMAIL_MARKETING]}
          onTouchpointSelect={() => {}}
        />
      );

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should render chart when data is available', async () => {
      renderWithProviders(
        <TouchpointAnalysis
          dateRange={{ startDate: new Date(), endDate: new Date() }}
          selectedChannels={[Channel.SOCIAL_PAID, Channel.EMAIL_MARKETING]}
          onTouchpointSelect={() => {}}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('img', { name: /touchpoint analysis chart/i })).toBeInTheDocument();
      }, { timeout: TEST_CONFIG.chartLoadTimeout });
    });

    it('should render error state when data fetch fails', async () => {
      vi.mocked(useAttribution).mockImplementationOnce(() => ({
        currentModel: 'LINEAR',
        results: [],
        touchpoints: [],
        loadingState: { isLoading: false, error: 'Failed to fetch data', isSuccess: false, progress: 0, stage: 'error' }
      }));

      renderWithProviders(
        <TouchpointAnalysis
          dateRange={{ startDate: new Date(), endDate: new Date() }}
          selectedChannels={[]}
          onTouchpointSelect={() => {}}
        />
      );

      expect(await screen.findByText('Failed to fetch data')).toBeInTheDocument();
    });

    it('should be responsive to viewport changes', async () => {
      const { container } = renderWithProviders(
        <TouchpointAnalysis
          dateRange={{ startDate: new Date(), endDate: new Date() }}
          selectedChannels={[Channel.SOCIAL_PAID]}
          onTouchpointSelect={() => {}}
        />
      );

      const resizeObserver = new ResizeObserver((entries) => {
        entries.forEach(entry => {
          expect(entry.contentRect.width).toBeGreaterThan(0);
        });
      });

      resizeObserver.observe(container);
    });
  });

  describe('Interactions', () => {
    it('should call onTouchpointSelect when clicking a chart element', async () => {
      const handleSelect = vi.fn();
      
      renderWithProviders(
        <TouchpointAnalysis
          dateRange={{ startDate: new Date(), endDate: new Date() }}
          selectedChannels={[Channel.SOCIAL_PAID, Channel.EMAIL_MARKETING]}
          onTouchpointSelect={handleSelect}
        />
      );

      const chart = await screen.findByRole('img', { name: /touchpoint analysis chart/i });
      fireEvent.click(chart);

      await waitFor(() => {
        expect(handleSelect).toHaveBeenCalledWith(expect.objectContaining({
          id: expect.any(String),
          channel: expect.any(String)
        }));
      });
    });

    it('should update when date range changes', async () => {
      const { rerender } = renderWithProviders(
        <TouchpointAnalysis
          dateRange={{ startDate: new Date('2023-01-01'), endDate: new Date('2023-01-31') }}
          selectedChannels={[Channel.SOCIAL_PAID]}
          onTouchpointSelect={() => {}}
        />
      );

      rerender(
        <TouchpointAnalysis
          dateRange={{ startDate: new Date('2023-02-01'), endDate: new Date('2023-02-28') }}
          selectedChannels={[Channel.SOCIAL_PAID]}
          onTouchpointSelect={() => {}}
        />
      );

      expect(mockWebSocket.send).toHaveBeenCalledWith(expect.stringContaining('request_update'));
    });
  });

  describe('Performance', () => {
    it('should process data within performance requirements', async () => {
      const startTime = performance.now();
      
      renderWithProviders(
        <TouchpointAnalysis
          dateRange={{ startDate: new Date(), endDate: new Date() }}
          selectedChannels={[Channel.SOCIAL_PAID, Channel.EMAIL_MARKETING]}
          onTouchpointSelect={() => {}}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('img', { name: /touchpoint analysis chart/i })).toBeInTheDocument();
      });

      const processingTime = performance.now() - startTime;
      expect(processingTime).toBeLessThan(TEST_CONFIG.dataProcessingTimeout);
    });

    it('should handle real-time updates efficiently', async () => {
      renderWithProviders(
        <TouchpointAnalysis
          dateRange={{ startDate: new Date(), endDate: new Date() }}
          selectedChannels={[Channel.SOCIAL_PAID]}
          onTouchpointSelect={() => {}}
        />
      );

      // Simulate WebSocket message
      const message = new MessageEvent('message', {
        data: JSON.stringify({
          type: 'touchpoint_update',
          touchpoint: {
            id: '3',
            channel: Channel.SOCIAL_PAID,
            timestamp: new Date(),
            value: 200
          }
        })
      });

      global.dispatchEvent(message);

      await waitFor(() => {
        expect(screen.getByRole('img', { name: /touchpoint analysis chart/i })).toBeInTheDocument();
      }, { timeout: TEST_CONFIG.renderTimeout });
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard navigable', async () => {
      renderWithProviders(
        <TouchpointAnalysis
          dateRange={{ startDate: new Date(), endDate: new Date() }}
          selectedChannels={[Channel.SOCIAL_PAID]}
          onTouchpointSelect={() => {}}
        />
      );

      const chart = await screen.findByRole('img', { name: /touchpoint analysis chart/i });
      expect(chart).toHaveAttribute('tabindex', '0');
    });

    it('should pass accessibility audit', async () => {
      const { container } = renderWithProviders(
        <TouchpointAnalysis
          dateRange={{ startDate: new Date(), endDate: new Date() }}
          selectedChannels={[Channel.SOCIAL_PAID]}
          onTouchpointSelect={() => {}}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});