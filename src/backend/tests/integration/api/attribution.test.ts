/**
 * Integration tests for attribution API endpoints
 * Validates attribution calculations, data accuracy, and performance requirements
 * @version 1.0.0
 */

import { describe, test, expect, beforeAll, afterAll, jest } from '@jest/globals';
import supertest from 'supertest';
import { 
  createMockTouchpoint, 
  createMockTouchpointJourney, 
  createMockAttributionConfig,
  mockAttributionScenarios,
  mockValidationScenarios 
} from '../../fixtures/attribution.fixtures';
import { AttributionModel } from '../../../src/core/attribution/types/attribution.types';

// Constants for test validation
const ACCURACY_THRESHOLD = 0.999; // 99.9% accuracy requirement
const PERFORMANCE_THRESHOLD = 5000; // 5s latency requirement
const WARM_UP_ITERATIONS = 3; // Number of warm-up calls before performance testing

let testServer: supertest.SuperTest<supertest.Test>;
let testToken: string;

beforeAll(async () => {
  // Initialize test environment
  const app = await initializeTestServer();
  testServer = supertest(app);
  testToken = await generateTestToken();

  // Warm up the system
  for (let i = 0; i < WARM_UP_ITERATIONS; i++) {
    await testServer
      .post('/api/v1/attribution/calculate')
      .set('Authorization', `Bearer ${testToken}`)
      .send(mockAttributionScenarios.simpleJourney);
  }
});

afterAll(async () => {
  await cleanupTestEnvironment();
});

describe('POST /api/v1/attribution/calculate', () => {
  test('should calculate first-touch attribution with 99.9% accuracy', async () => {
    const journey = mockAttributionScenarios.simpleJourney;
    const config = mockAttributionScenarios.firstTouchConfig;

    const response = await testServer
      .post('/api/v1/attribution/calculate')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ journey, config });

    expect(response.status).toBe(200);
    expect(response.body.data.confidenceScore).toBeGreaterThanOrEqual(ACCURACY_THRESHOLD);
    expect(response.body.data.results[0].weight).toBe(1);
    expect(response.body.data.results[0].touchpointId).toBe(journey.touchpoints[0].id);
  });

  test('should calculate last-touch attribution with 99.9% accuracy', async () => {
    const journey = mockAttributionScenarios.simpleJourney;
    const config = mockAttributionScenarios.lastTouchConfig;

    const response = await testServer
      .post('/api/v1/attribution/calculate')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ journey, config });

    expect(response.status).toBe(200);
    expect(response.body.data.confidenceScore).toBeGreaterThanOrEqual(ACCURACY_THRESHOLD);
    expect(response.body.data.results[0].weight).toBe(1);
    expect(response.body.data.results[0].touchpointId).toBe(
      journey.touchpoints[journey.touchpoints.length - 1].id
    );
  });

  test('should calculate linear attribution with equal weights', async () => {
    const journey = mockAttributionScenarios.simpleJourney;
    const config = createMockAttributionConfig(AttributionModel.LINEAR);
    const expectedWeight = 1 / journey.touchpoints.length;

    const response = await testServer
      .post('/api/v1/attribution/calculate')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ journey, config });

    expect(response.status).toBe(200);
    expect(response.body.data.results).toHaveLength(journey.touchpoints.length);
    response.body.data.results.forEach(result => {
      expect(result.weight).toBeCloseTo(expectedWeight, 6);
    });
  });

  test('should calculate time-decay attribution with correct decay', async () => {
    const journey = mockAttributionScenarios.complexJourney;
    const config = mockAttributionScenarios.timeDecayConfig;

    const response = await testServer
      .post('/api/v1/attribution/calculate')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ journey, config });

    expect(response.status).toBe(200);
    expect(response.body.data.results).toHaveLength(journey.touchpoints.length);
    
    // Verify weights decrease over time
    const weights = response.body.data.results.map(r => r.weight);
    for (let i = 1; i < weights.length; i++) {
      expect(weights[i]).toBeGreaterThan(weights[i - 1]);
    }
  });

  test('should meet 5s performance requirement for complex journeys', async () => {
    const journey = mockAttributionScenarios.complexJourney;
    const config = mockAttributionScenarios.timeDecayConfig;
    
    const startTime = Date.now();
    const response = await testServer
      .post('/api/v1/attribution/calculate')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ journey, config });
    const endTime = Date.now();

    expect(response.status).toBe(200);
    expect(endTime - startTime).toBeLessThan(PERFORMANCE_THRESHOLD);
  });

  test('should handle invalid journey data appropriately', async () => {
    const invalidJourney = mockValidationScenarios.invalidJourney;
    const config = mockAttributionScenarios.firstTouchConfig;

    const response = await testServer
      .post('/api/v1/attribution/calculate')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ journey: invalidJourney, config });

    expect(response.status).toBe(400);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/v1/attribution/touchpoints', () => {
  test('should retrieve touchpoints with correct pagination', async () => {
    const limit = 10;
    const page = 1;

    const response = await testServer
      .get('/api/v1/attribution/touchpoints')
      .set('Authorization', `Bearer ${testToken}`)
      .query({ limit, page });

    expect(response.status).toBe(200);
    expect(response.body.data.touchpoints).toHaveLength(limit);
    expect(response.body.data.pagination).toBeDefined();
    expect(response.body.data.pagination.currentPage).toBe(page);
  });

  test('should filter touchpoints by date range', async () => {
    const startDate = new Date('2023-01-01').toISOString();
    const endDate = new Date('2023-12-31').toISOString();

    const response = await testServer
      .get('/api/v1/attribution/touchpoints')
      .set('Authorization', `Bearer ${testToken}`)
      .query({ startDate, endDate });

    expect(response.status).toBe(200);
    response.body.data.touchpoints.forEach(touchpoint => {
      const timestamp = new Date(touchpoint.timestamp);
      expect(timestamp >= new Date(startDate)).toBe(true);
      expect(timestamp <= new Date(endDate)).toBe(true);
    });
  });
});

describe('PUT /api/v1/attribution/model-config', () => {
  test('should update attribution model configuration', async () => {
    const config = createMockAttributionConfig(AttributionModel.POSITION_BASED, {
      customWeights: { first: 0.4, middle: 0.2, last: 0.4 }
    });

    const response = await testServer
      .put('/api/v1/attribution/model-config')
      .set('Authorization', `Bearer ${testToken}`)
      .send(config);

    expect(response.status).toBe(200);
    expect(response.body.data.model).toBe(AttributionModel.POSITION_BASED);
    expect(response.body.data.channelWeights).toEqual(config.channelWeights);
  });

  test('should validate configuration constraints', async () => {
    const invalidConfig = {
      ...createMockAttributionConfig(AttributionModel.LINEAR),
      channelWeights: { social: 1.5 } // Invalid weight > 1
    };

    const response = await testServer
      .put('/api/v1/attribution/model-config')
      .set('Authorization', `Bearer ${testToken}`)
      .send(invalidConfig);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});