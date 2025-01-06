/**
 * Test fixtures for attribution modeling system
 * Provides comprehensive mock data for touchpoints, customer journeys, and attribution configurations
 * with enhanced validation coverage for 99.9% accuracy testing
 * @version 1.0.0
 */

import { faker } from '@faker-js/faker'; // v8.0.0
import { 
  AttributionModel,
  Touchpoint,
  TouchpointJourney,
  AttributionConfig,
  Channel,
  ValidationStatus
} from '../../src/core/attribution/types/attribution.types';
import { createMockEvent } from './event.fixtures';

// Constants for statistical validation and data quality
const VALIDATION_THRESHOLDS = {
  CONFIDENCE_SCORE: 0.999,
  DATA_QUALITY: 0.995,
  TEMPORAL_ACCURACY: 0.9999,
  VALUE_PRECISION: 0.9995
} as const;

// Channel weight distribution for realistic test data
const MOCK_CHANNEL_WEIGHTS = {
  [Channel.SOCIAL]: 0.25,
  [Channel.EMAIL]: 0.20,
  [Channel.PAID_SEARCH]: 0.20,
  [Channel.ORGANIC_SEARCH]: 0.15,
  [Channel.DIRECT]: 0.10,
  [Channel.REFERRAL]: 0.07,
  [Channel.DISPLAY]: 0.03
} as const;

// Attribution window periods for testing
const MOCK_ATTRIBUTION_PERIODS = {
  DEFAULT: '30d',
  SHORT: '7d',
  MEDIUM: '60d',
  LONG: '90d',
  CUSTOM: 'configurable'
} as const;

/**
 * Creates a mock touchpoint with enhanced validation metadata
 */
export const createMockTouchpoint = (
  overrides: Partial<Touchpoint> = {},
  validationOptions: {
    confidenceScore?: number;
    dataQuality?: number;
    temporalAccuracy?: number;
  } = {}
): Touchpoint => {
  const id = overrides.id || faker.string.uuid();
  const timestamp = overrides.timestamp || faker.date.recent({ days: 30 });
  const channel = overrides.channel || faker.helpers.weightedArrayElement(
    Object.keys(MOCK_CHANNEL_WEIGHTS).map(ch => ({
      value: ch,
      weight: MOCK_CHANNEL_WEIGHTS[ch as Channel]
    }))
  );

  const validationMetadata = {
    confidenceScore: validationOptions.confidenceScore || VALIDATION_THRESHOLDS.CONFIDENCE_SCORE,
    dataQuality: validationOptions.dataQuality || VALIDATION_THRESHOLDS.DATA_QUALITY,
    temporalAccuracy: validationOptions.temporalAccuracy || VALIDATION_THRESHOLDS.TEMPORAL_ACCURACY,
    validationStatus: ValidationStatus.VALID,
    lastValidated: new Date()
  };

  return {
    id,
    event: createMockEvent({
      timestamp,
      properties: {
        channel,
        campaign: faker.company.catchPhrase(),
        medium: faker.helpers.arrayElement(['cpc', 'email', 'social', 'organic']),
        source: faker.internet.domainName()
      }
    }),
    channel,
    timestamp,
    value: faker.number.float({ min: 0, max: 1000, precision: 0.01 }),
    metadata: {
      source: faker.helpers.arrayElement(['web', 'mobile', 'api']),
      campaign: faker.string.uuid(),
      medium: faker.helpers.arrayElement(['cpc', 'email', 'social']),
      content: faker.string.uuid(),
      term: faker.commerce.productName(),
      position: faker.number.int({ min: 1, max: 10 }),
      isFirstTouch: false,
      isLastTouch: false
    },
    validationMetadata,
    ...overrides
  };
};

/**
 * Creates a comprehensive mock customer journey with validated touchpoint sequence
 */
export const createMockTouchpointJourney = (
  options: {
    touchpointCount?: number;
    conversionProbability?: number;
    timeSpan?: number;
  } = {}
): TouchpointJourney => {
  const touchpointCount = options.touchpointCount || faker.number.int({ min: 2, max: 8 });
  const timeSpan = options.timeSpan || 30; // days
  const visitorId = faker.string.uuid();
  
  // Generate touchpoints with temporal sequence
  const touchpoints = Array.from({ length: touchpointCount }, (_, index) => {
    const daysAgo = faker.number.float({ 
      min: 0, 
      max: timeSpan,
      precision: 0.001 
    });
    
    return createMockTouchpoint({
      timestamp: faker.date.recent({ days: daysAgo }),
      metadata: {
        ...createMockTouchpoint().metadata,
        position: index + 1,
        isFirstTouch: index === 0,
        isLastTouch: index === touchpointCount - 1
      }
    });
  }).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const converted = faker.datatype.boolean(options.conversionProbability || 0.3);
  
  return {
    visitorId,
    touchpoints,
    converted,
    conversionValue: converted ? faker.number.float({ min: 50, max: 5000, precision: 0.01 }) : 0,
    metadata: {
      startDate: touchpoints[0].timestamp,
      endDate: touchpoints[touchpoints.length - 1].timestamp,
      firstChannel: touchpoints[0].channel as Channel,
      lastChannel: touchpoints[touchpoints.length - 1].channel as Channel,
      conversionPath: touchpoints.map(t => t.channel as Channel)
    },
    metrics: {
      touchpointCount,
      averageTimeGap: faker.number.float({ min: 1, max: 72, precision: 0.1 }), // hours
      totalDuration: faker.number.float({ min: 24, max: timeSpan * 24, precision: 0.1 }), // hours
      channelDiversity: faker.number.float({ min: 0.1, max: 1, precision: 0.01 })
    },
    validation: {
      valid: true,
      confidenceScore: VALIDATION_THRESHOLDS.CONFIDENCE_SCORE,
      dataQuality: VALIDATION_THRESHOLDS.DATA_QUALITY,
      temporalConsistency: true
    }
  };
};

/**
 * Creates a validated attribution model configuration with comprehensive settings
 */
export const createMockAttributionConfig = (
  model: AttributionModel = AttributionModel.MULTI_TOUCH,
  options: {
    customWeights?: Record<string, number>;
    timeDecay?: boolean;
    attributionWindow?: string;
  } = {}
): AttributionConfig => {
  const now = new Date();
  const windowDays = parseInt(
    (options.attributionWindow || MOCK_ATTRIBUTION_PERIODS.DEFAULT).replace('d', '')
  );

  return {
    model,
    attributionWindow: {
      startDate: new Date(now.getTime() - (windowDays * 24 * 60 * 60 * 1000)),
      endDate: now
    },
    channelWeights: options.customWeights || MOCK_CHANNEL_WEIGHTS,
    includeTimeDecay: options.timeDecay ?? model === AttributionModel.TIME_DECAY,
    decayHalfLife: 7, // days
    validation: {
      minWeight: 0,
      maxWeight: 1,
      requiredChannels: Object.keys(MOCK_CHANNEL_WEIGHTS),
      confidenceThreshold: VALIDATION_THRESHOLDS.CONFIDENCE_SCORE,
      qualityThreshold: VALIDATION_THRESHOLDS.DATA_QUALITY
    },
    metadata: {
      version: '1.0.0',
      lastUpdated: new Date(),
      createdBy: 'test-suite'
    }
  };
};

// Export common test scenarios
export const mockAttributionScenarios = {
  singleTouchpoint: createMockTouchpoint(),
  simpleJourney: createMockTouchpointJourney({ touchpointCount: 3 }),
  complexJourney: createMockTouchpointJourney({ 
    touchpointCount: 8,
    conversionProbability: 0.8 
  }),
  firstTouchConfig: createMockAttributionConfig(AttributionModel.FIRST_TOUCH),
  lastTouchConfig: createMockAttributionConfig(AttributionModel.LAST_TOUCH),
  timeDecayConfig: createMockAttributionConfig(AttributionModel.TIME_DECAY, { 
    timeDecay: true 
  })
};

// Export validation test cases
export const mockValidationScenarios = {
  highConfidence: createMockTouchpoint({}, { 
    confidenceScore: 0.9995 
  }),
  lowConfidence: createMockTouchpoint({}, { 
    confidenceScore: 0.95 
  }),
  perfectJourney: createMockTouchpointJourney({ 
    touchpointCount: 5,
    conversionProbability: 1 
  }),
  invalidJourney: {
    ...createMockTouchpointJourney(),
    validation: {
      valid: false,
      confidenceScore: 0.9,
      dataQuality: 0.9,
      temporalConsistency: false,
      errors: ['Temporal sequence violation', 'Missing channel data']
    }
  }
};