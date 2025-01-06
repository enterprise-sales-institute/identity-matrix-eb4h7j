/**
 * @fileoverview Test suite for ModelConfiguration component
 * @version 1.0.0
 */

// External imports
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Provider } from 'react-redux';
import { ThemeProvider } from '@mui/material';

// Internal imports
import ModelConfiguration from './ModelConfiguration';
import { Channel, AttributionModelType } from '../../../types/attribution.types';
import { createTestStore } from '../../../utils/test-utils';
import { theme } from '../../../styles/theme';
import {
  MODEL_LABELS,
  CHANNEL_LABELS,
  DEFAULT_CHANNEL_WEIGHTS,
  ATTRIBUTION_PERIODS
} from '../../../constants/attribution.constants';

// Test IDs for component elements
const TEST_IDS = {
  modelTypeSelect: 'model-type-select',
  channelWeightInputs: 'channel-weight-input',
  attributionWindowSelect: 'attribution-window-select',
  submitButton: 'submit-button',
  cancelButton: 'cancel-button',
  errorMessage: 'error-message'
};

// Mock initial state for tests
const mockInitialState = {
  attribution: {
    currentModel: {
      type: AttributionModelType.LINEAR,
      channelWeights: DEFAULT_CHANNEL_WEIGHTS,
      attributionWindowDays: 30,
      customRules: {
        includeTimeDecay: false,
        decayHalfLife: 7
      }
    },
    validationErrors: [],
    isConfigValid: true,
    loading: false
  }
};

// Mock handlers for component props
const mockHandlers = {
  onSave: vi.fn(),
  onCancel: vi.fn(),
  onError: vi.fn()
};

describe('ModelConfiguration', () => {
  let store: any;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    store = createTestStore(mockInitialState);
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  it('should render model configuration form with all elements', async () => {
    const { container } = render(
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <ModelConfiguration {...mockHandlers} />
        </ThemeProvider>
      </Provider>
    );

    // Check model type select
    expect(screen.getByLabelText(/attribution model/i)).toBeInTheDocument();
    Object.entries(MODEL_LABELS).forEach(([_, label]) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });

    // Check channel weight inputs
    Object.entries(CHANNEL_LABELS).forEach(([_, label]) => {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    });

    // Check attribution window select
    expect(screen.getByLabelText(/attribution window/i)).toBeInTheDocument();
    Object.entries(ATTRIBUTION_PERIODS).forEach(([_, days]) => {
      expect(screen.getByText(`${days} Days`)).toBeInTheDocument();
    });

    // Check buttons
    expect(screen.getByText(/save configuration/i)).toBeInTheDocument();
    expect(screen.getByText(/cancel/i)).toBeInTheDocument();

    // Check accessibility
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should handle model type changes and update form accordingly', async () => {
    render(
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <ModelConfiguration {...mockHandlers} />
        </ThemeProvider>
      </Provider>
    );

    const modelSelect = screen.getByLabelText(/attribution model/i);

    // Change to Time Decay model
    await user.click(modelSelect);
    await user.click(screen.getByText(MODEL_LABELS[AttributionModelType.TIME_DECAY]));

    // Check if decay half-life input appears
    expect(screen.getByLabelText(/decay half-life/i)).toBeInTheDocument();

    // Change to Linear model
    await user.click(modelSelect);
    await user.click(screen.getByText(MODEL_LABELS[AttributionModelType.LINEAR]));

    // Check if decay half-life input disappears
    expect(screen.queryByLabelText(/decay half-life/i)).not.toBeInTheDocument();
  });

  it('should validate channel weights and show errors for invalid values', async () => {
    render(
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <ModelConfiguration {...mockHandlers} />
        </ThemeProvider>
      </Provider>
    );

    // Input invalid weight
    const socialInput = screen.getByLabelText(CHANNEL_LABELS[Channel.SOCIAL_ORGANIC]);
    await user.clear(socialInput);
    await user.type(socialInput, '200');

    // Try to save
    await user.click(screen.getByText(/save configuration/i));

    // Check error message
    await waitFor(() => {
      expect(screen.getByText(/weights must sum to 100%/i)).toBeInTheDocument();
    });

    expect(mockHandlers.onError).toHaveBeenCalled();
  });

  it('should handle form submission with valid data', async () => {
    render(
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <ModelConfiguration {...mockHandlers} />
        </ThemeProvider>
      </Provider>
    );

    // Set valid weights
    const inputs = Object.values(Channel).map(channel => 
      screen.getByLabelText(CHANNEL_LABELS[channel])
    );

    // Set equal weights for all channels
    const equalWeight = (100 / inputs.length).toFixed(2);
    for (const input of inputs) {
      await user.clear(input);
      await user.type(input, equalWeight);
    }

    // Submit form
    await user.click(screen.getByText(/save configuration/i));

    await waitFor(() => {
      expect(mockHandlers.onSave).toHaveBeenCalled();
    });
  });

  it('should handle cancellation', async () => {
    render(
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <ModelConfiguration {...mockHandlers} />
        </ThemeProvider>
      </Provider>
    );

    await user.click(screen.getByText(/cancel/i));
    expect(mockHandlers.onCancel).toHaveBeenCalled();
  });

  it('should disable form elements while submitting', async () => {
    mockHandlers.onSave.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

    render(
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <ModelConfiguration {...mockHandlers} />
        </ThemeProvider>
      </Provider>
    );

    // Start submission
    await user.click(screen.getByText(/save configuration/i));

    // Check if form elements are disabled
    expect(screen.getByLabelText(/attribution model/i)).toBeDisabled();
    Object.values(Channel).forEach(channel => {
      expect(screen.getByLabelText(CHANNEL_LABELS[channel])).toBeDisabled();
    });
    expect(screen.getByLabelText(/attribution window/i)).toBeDisabled();
    expect(screen.getByText(/save configuration/i)).toBeDisabled();
  });
});