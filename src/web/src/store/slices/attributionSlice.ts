/**
 * @fileoverview Redux slice for managing attribution state with enhanced validation and real-time updates
 * @version 1.0.0
 */

// External imports - v1.9.0
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Internal imports
import { 
  AttributionConfig, 
  AttributionResult,
  Channel,
  ValidationError,
  AttributionModelType
} from '../../types/attribution.types';
import {
  DEFAULT_ATTRIBUTION_WINDOW,
  DEFAULT_CHANNEL_WEIGHTS,
  MIN_ATTRIBUTION_WINDOW,
  MAX_ATTRIBUTION_WINDOW,
  MIN_CHANNEL_WEIGHT,
  MAX_CHANNEL_WEIGHT,
  TOTAL_WEIGHT_SUM
} from '../../constants/attribution.constants';

/**
 * Interface for attribution slice state
 */
interface AttributionState {
  config: AttributionConfig;
  results: AttributionResult[];
  loading: boolean;
  error: string | null;
  validationErrors: ValidationError[];
  isConfigValid: boolean;
  lastUpdated: Date | null;
}

/**
 * Initial state with default configuration
 */
const initialState: AttributionState = {
  config: {
    model: AttributionModelType.LINEAR,
    attributionWindowDays: DEFAULT_ATTRIBUTION_WINDOW,
    channelWeights: DEFAULT_CHANNEL_WEIGHTS,
    customRules: [],
  },
  results: [],
  loading: false,
  error: null,
  validationErrors: [],
  isConfigValid: true,
  lastUpdated: null,
};

/**
 * Validates channel weights sum to 100%
 */
const validateChannelWeights = (weights: Record<Channel, number>): ValidationError[] => {
  const errors: ValidationError[] = [];
  const sum = Object.values(weights).reduce((acc, weight) => acc + weight, 0);
  
  if (Math.abs(sum - TOTAL_WEIGHT_SUM) > 0.0001) {
    errors.push({
      field: 'channelWeights',
      messages: [`Channel weights must sum to 100%. Current sum: ${sum * 100}%`],
      code: 'INVALID_WEIGHT_SUM'
    });
  }

  Object.entries(weights).forEach(([channel, weight]) => {
    if (weight < MIN_CHANNEL_WEIGHT || weight > MAX_CHANNEL_WEIGHT) {
      errors.push({
        field: channel,
        messages: [`Weight must be between ${MIN_CHANNEL_WEIGHT * 100}% and ${MAX_CHANNEL_WEIGHT * 100}%`],
        code: 'INVALID_WEIGHT_RANGE'
      });
    }
  });

  return errors;
};

/**
 * Validates attribution window constraints
 */
const validateAttributionWindow = (days: number): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  if (days < MIN_ATTRIBUTION_WINDOW || days > MAX_ATTRIBUTION_WINDOW) {
    errors.push({
      field: 'attributionWindowDays',
      messages: [`Attribution window must be between ${MIN_ATTRIBUTION_WINDOW} and ${MAX_ATTRIBUTION_WINDOW} days`],
      code: 'INVALID_WINDOW_RANGE'
    });
  }

  return errors;
};

/**
 * Attribution slice with reducers for managing state
 */
const attributionSlice = createSlice({
  name: 'attribution',
  initialState,
  reducers: {
    setConfig: (state, action: PayloadAction<Partial<AttributionConfig>>) => {
      const newConfig = { ...state.config, ...action.payload };
      state.validationErrors = [];

      // Validate channel weights if updated
      if (action.payload.channelWeights) {
        state.validationErrors.push(...validateChannelWeights(newConfig.channelWeights));
      }

      // Validate attribution window if updated
      if (action.payload.attributionWindowDays) {
        state.validationErrors.push(...validateAttributionWindow(newConfig.attributionWindowDays));
      }

      state.config = newConfig;
      state.isConfigValid = state.validationErrors.length === 0;
      state.error = null;
      state.lastUpdated = new Date();
    },

    setResults: (state, action: PayloadAction<AttributionResult[]>) => {
      try {
        // Sort results by timestamp for consistent ordering
        const sortedResults = [...action.payload].sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        state.results = sortedResults;
        state.loading = false;
        state.error = null;
        state.lastUpdated = new Date();
      } catch (error) {
        state.error = 'Failed to process attribution results';
        state.loading = false;
      }
    },

    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
      if (action.payload) {
        state.error = null;
      }
    },

    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
      if (action.payload) {
        state.isConfigValid = false;
      }
    },

    resetState: (state) => {
      state.config = initialState.config;
      state.results = [];
      state.loading = false;
      state.error = null;
      state.validationErrors = [];
      state.isConfigValid = true;
      state.lastUpdated = null;
    }
  }
});

// Export actions and reducer
export const { 
  setConfig, 
  setResults, 
  setLoading, 
  setError, 
  resetState 
} = attributionSlice.actions;

// Memoized selectors
export const selectAttributionConfig = (state: { attribution: AttributionState }) => state.attribution.config;
export const selectAttributionResults = (state: { attribution: AttributionState }) => state.attribution.results;
export const selectValidationErrors = (state: { attribution: AttributionState }) => state.attribution.validationErrors;
export const selectIsConfigValid = (state: { attribution: AttributionState }) => state.attribution.isConfigValid;
export const selectAttributionError = (state: { attribution: AttributionState }) => state.attribution.error;
export const selectIsLoading = (state: { attribution: AttributionState }) => state.attribution.loading;

export default attributionSlice.reducer;