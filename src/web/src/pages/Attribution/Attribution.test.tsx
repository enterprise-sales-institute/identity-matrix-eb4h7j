/**
 * @fileoverview Test suite for Attribution page component
 * @version 1.0.0
 */

// External imports
import React from 'react';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { axe, toHaveNoViolations } from '@axe-core/react';
import WS from 'jest-websocket-mock';

// Internal imports
import Attribution from './Attribution';
import { renderWithProviders } from '../../../tests/utils/test-utils';
import { Channel, AttributionModel } from '../../types/attribution.types';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock WebSocket URL
const WS_URL = `${process.env.VITE_WS_URL}/attribution/realtime`;

// Test state setup
const TEST_STATE = {
  attribution: {
    currentModel: null,
    touchpoints: [],
    loading: false,
    error: null,
    websocketStatus: 'disconnected'
  }
};

// Mock model configuration
const MOCK_MODEL = {
  type: AttributionModel.FIRST_TOUCH,
  weights: {
    [Channel.SOCIAL_ORGANIC]: 0.4,
    [Channel.EMAIL_MARKETING]: 0.3,
    [Channel.DIRECT]: 0.3
  },
  validationRules: {
    weightSum: 1.0,
    minWeight: 0.0,
    maxWeight: 1.0
  }
};

describe('Attribution Page', () => {
  let wsServer: WS;

  beforeEach(() => {
    // Setup WebSocket mock server
    wsServer = new WS(WS_URL);
  });

  afterEach(() => {
    // Cleanup WebSocket server
    WS.clean();
  });

  it('meets accessibility standards', async () => {
    const { container } = renderWithProviders(<Attribution />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();

    // Test keyboard navigation
    const modelConfigTab = screen.getByRole('tab', { name: /model configuration/i });
    fireEvent.keyDown(modelConfigTab, { key: 'Enter' });
    expect(modelConfigTab).toHaveAttribute('aria-selected', 'true');

    // Verify ARIA labels
    expect(screen.getByLabelText(/date range selection/i)).toBeInTheDocument();
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby');
  });

  it('handles real-time updates via WebSocket', async () => {
    renderWithProviders(<Attribution />);

    // Wait for WebSocket connection
    await waitFor(() => {
      expect(wsServer.connected).toBe(true);
    });

    // Test touchpoint update
    const mockUpdate = {
      type: 'attribution_update',
      data: {
        touchpoints: [
          {
            id: '1',
            channel: Channel.SOCIAL_ORGANIC,
            value: 100
          }
        ]
      }
    };

    wsServer.send(JSON.stringify(mockUpdate));

    await waitFor(() => {
      expect(screen.getByText(/social organic/i)).toBeInTheDocument();
    });

    // Test WebSocket reconnection
    wsServer.close();
    await waitFor(() => {
      expect(wsServer.connected).toBe(false);
    });

    // Server comes back online
    wsServer = new WS(WS_URL);
    await waitFor(() => {
      expect(wsServer.connected).toBe(true);
    });
  });

  it('validates model configuration inputs', async () => {
    renderWithProviders(<Attribution />);

    // Navigate to model configuration
    const modelConfigTab = screen.getByRole('tab', { name: /model configuration/i });
    userEvent.click(modelConfigTab);

    // Test invalid weights
    const socialInput = screen.getByLabelText(/social organic/i);
    userEvent.clear(socialInput);
    userEvent.type(socialInput, '150');

    const saveButton = screen.getByRole('button', { name: /save configuration/i });
    userEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/weights must sum to 100%/i)).toBeInTheDocument();
    });

    // Test valid configuration
    userEvent.clear(socialInput);
    userEvent.type(socialInput, '40');

    const emailInput = screen.getByLabelText(/email marketing/i);
    userEvent.clear(emailInput);
    userEvent.type(emailInput, '30');

    const directInput = screen.getByLabelText(/direct traffic/i);
    userEvent.clear(directInput);
    userEvent.type(directInput, '30');

    userEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.queryByText(/weights must sum to 100%/i)).not.toBeInTheDocument();
    });
  });

  it('displays loading states correctly', async () => {
    renderWithProviders(<Attribution />, {
      preloadedState: {
        attribution: {
          ...TEST_STATE.attribution,
          loading: true
        }
      }
    });

    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });

  it('handles error states appropriately', async () => {
    const errorMessage = 'Failed to load attribution data';
    renderWithProviders(<Attribution />, {
      preloadedState: {
        attribution: {
          ...TEST_STATE.attribution,
          error: errorMessage
        }
      }
    });

    expect(screen.getByText(errorMessage)).toBeInTheDocument();

    // Test error dismissal
    const dismissButton = screen.getByRole('button', { name: /close/i });
    userEvent.click(dismissButton);

    await waitFor(() => {
      expect(screen.queryByText(errorMessage)).not.toBeInTheDocument();
    });
  });

  it('updates date range and refreshes data', async () => {
    renderWithProviders(<Attribution />);

    const datePicker = screen.getByLabelText(/date range selection/i);
    userEvent.click(datePicker);

    // Select new date range
    const startDate = screen.getByLabelText(/start date/i);
    userEvent.clear(startDate);
    userEvent.type(startDate, '2023-01-01');

    const endDate = screen.getByLabelText(/end date/i);
    userEvent.clear(endDate);
    userEvent.type(endDate, '2023-01-31');

    // Verify data refresh
    await waitFor(() => {
      expect(screen.getByText(/loading attribution data/i)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.queryByText(/loading attribution data/i)).not.toBeInTheDocument();
    });
  });

  it('switches between attribution models', async () => {
    renderWithProviders(<Attribution />);

    const modelSelect = screen.getByLabelText(/attribution model/i);
    userEvent.click(modelSelect);

    // Select different model
    const timeDecayOption = screen.getByText(/time decay/i);
    userEvent.click(timeDecayOption);

    // Verify additional fields appear
    await waitFor(() => {
      expect(screen.getByLabelText(/decay half-life/i)).toBeInTheDocument();
    });

    // Test decay half-life validation
    const halfLifeInput = screen.getByLabelText(/decay half-life/i);
    userEvent.clear(halfLifeInput);
    userEvent.type(halfLifeInput, '0');

    await waitFor(() => {
      expect(screen.getByText(/must be between 1 and 30 days/i)).toBeInTheDocument();
    });
  });
});