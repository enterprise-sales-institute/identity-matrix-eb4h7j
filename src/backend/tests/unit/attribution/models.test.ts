import { describe, it, expect, beforeEach, jest } from 'jest'; // v29.0.0
import { FirstTouchModel } from '../../../src/core/attribution/models/firstTouch.model';
import { LastTouchModel } from '../../../src/core/attribution/models/lastTouch.model';
import { LinearTouchModel } from '../../../src/core/attribution/models/linearTouch.model';
import { 
  createMockTouchpoint, 
  createMockTouchpointJourney 
} from '../../fixtures/attribution.fixtures';
import { 
  AttributionModel, 
  ValidationStatus 
} from '../../../src/core/attribution/types/attribution.types';

// Constants for test configuration
const PERFORMANCE_THRESHOLD_MS = 5000; // 5 second SLA requirement
const ACCURACY_THRESHOLD = 0.999; // 99.9% accuracy requirement
const TEST_TIMEOUT = 10000; // 10 second test timeout

describe('Attribution Models Unit Tests', () => {
  let firstTouchModel: FirstTouchModel;
  let lastTouchModel: LastTouchModel;
  let linearTouchModel: LinearTouchModel;
  let performanceTimer: number;

  beforeEach(() => {
    firstTouchModel = new FirstTouchModel();
    lastTouchModel = new LastTouchModel();
    linearTouchModel = new LinearTouchModel();
    performanceTimer = Date.now();
    jest.clearAllMocks();
  });

  describe('FirstTouchModel Tests', () => {
    it('should assign 100% weight to first touchpoint with performance validation', async () => {
      // Create test journey with multiple touchpoints
      const journey = createMockTouchpointJourney({ touchpointCount: 5 });
      const touchpoints = journey.touchpoints;

      // Start performance measurement
      const startTime = Date.now();

      // Calculate attribution
      const results = await firstTouchModel.calculateAttribution(touchpoints);

      // Verify performance
      const processingTime = Date.now() - startTime;
      expect(processingTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);

      // Verify attribution weights
      expect(results).toHaveLength(touchpoints.length);
      expect(results[0].weight).toBe(1);
      expect(results.slice(1).every(r => r.weight === 0)).toBe(true);

      // Verify confidence scores
      results.forEach(result => {
        expect(result.confidenceScore).toBeGreaterThanOrEqual(ACCURACY_THRESHOLD);
        expect(result.validationStatus).toBe(ValidationStatus.VALID);
      });

      // Verify metadata
      results.forEach(result => {
        expect(result.metadata).toMatchObject({
          version: expect.any(String),
          parameters: expect.any(Object),
          timestamp: expect.any(Date)
        });
      });
    }, TEST_TIMEOUT);

    it('should handle invalid touchpoint data appropriately', async () => {
      const invalidTouchpoints = [
        createMockTouchpoint({ id: '' }), // Invalid ID
        createMockTouchpoint({ timestamp: undefined as any }) // Invalid timestamp
      ];

      await expect(firstTouchModel.calculateAttribution(invalidTouchpoints))
        .rejects.toThrow('Invalid touchpoint data');
    });

    it('should maintain accuracy with large touchpoint sets', async () => {
      const largeJourney = createMockTouchpointJourney({ touchpointCount: 100 });
      const startTime = Date.now();
      
      const results = await firstTouchModel.calculateAttribution(largeJourney.touchpoints);
      
      const processingTime = Date.now() - startTime;
      expect(processingTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
      expect(results[0].confidenceScore).toBeGreaterThanOrEqual(ACCURACY_THRESHOLD);
    }, TEST_TIMEOUT);
  });

  describe('LastTouchModel Tests', () => {
    it('should assign 100% weight to last touchpoint with performance validation', async () => {
      const journey = createMockTouchpointJourney({ touchpointCount: 5 });
      const touchpoints = journey.touchpoints;
      const startTime = Date.now();

      const results = await lastTouchModel.calculateAttribution(touchpoints);

      // Performance validation
      const processingTime = Date.now() - startTime;
      expect(processingTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);

      // Weight validation
      expect(results).toHaveLength(touchpoints.length);
      expect(results[results.length - 1].weight).toBe(1);
      expect(results.slice(0, -1).every(r => r.weight === 0)).toBe(true);

      // Accuracy validation
      results.forEach(result => {
        expect(result.confidenceScore).toBeGreaterThanOrEqual(ACCURACY_THRESHOLD);
      });
    }, TEST_TIMEOUT);

    it('should handle temporal edge cases correctly', async () => {
      const journey = createMockTouchpointJourney({
        touchpointCount: 3,
        timeSpan: 1 // 1 day span for close timestamps
      });

      const results = await lastTouchModel.calculateAttribution(journey.touchpoints);
      
      expect(results[results.length - 1].weight).toBe(1);
      expect(results[results.length - 1].confidenceScore)
        .toBeGreaterThanOrEqual(ACCURACY_THRESHOLD);
    });
  });

  describe('LinearTouchModel Tests', () => {
    it('should distribute weight equally with performance validation', async () => {
      const journey = createMockTouchpointJourney({ touchpointCount: 5 });
      const touchpoints = journey.touchpoints;
      const startTime = Date.now();

      const results = await linearTouchModel.calculateAttribution(touchpoints);

      // Performance validation
      const processingTime = Date.now() - startTime;
      expect(processingTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);

      // Equal weight validation
      const expectedWeight = 1 / touchpoints.length;
      results.forEach(result => {
        expect(result.weight).toBeCloseTo(expectedWeight, 6);
      });

      // Total weight validation
      const totalWeight = results.reduce((sum, r) => sum + r.weight, 0);
      expect(totalWeight).toBeCloseTo(1, 6);

      // Accuracy validation
      results.forEach(result => {
        expect(result.confidenceScore).toBeGreaterThanOrEqual(ACCURACY_THRESHOLD);
      });
    }, TEST_TIMEOUT);

    it('should handle single touchpoint edge case', async () => {
      const singleTouchpoint = [createMockTouchpoint()];
      
      const results = await linearTouchModel.calculateAttribution(singleTouchpoint);
      
      expect(results).toHaveLength(1);
      expect(results[0].weight).toBe(1);
      expect(results[0].confidenceScore).toBeGreaterThanOrEqual(ACCURACY_THRESHOLD);
    });
  });

  describe('Cross-Model Validation Tests', () => {
    it('should maintain consistent total attribution across models', async () => {
      const journey = createMockTouchpointJourney({ touchpointCount: 5 });
      const touchpoints = journey.touchpoints;

      const [firstResults, lastResults, linearResults] = await Promise.all([
        firstTouchModel.calculateAttribution(touchpoints),
        lastTouchModel.calculateAttribution(touchpoints),
        linearTouchModel.calculateAttribution(touchpoints)
      ]);

      // Verify total weights sum to 1 for each model
      const getTotalWeight = (results: any[]) => 
        results.reduce((sum, r) => sum + r.weight, 0);

      expect(getTotalWeight(firstResults)).toBeCloseTo(1, 6);
      expect(getTotalWeight(lastResults)).toBeCloseTo(1, 6);
      expect(getTotalWeight(linearResults)).toBeCloseTo(1, 6);
    });

    it('should handle concurrent attribution calculations', async () => {
      const journeys = Array.from({ length: 5 }, () => 
        createMockTouchpointJourney({ touchpointCount: 5 })
      );

      const startTime = Date.now();

      const results = await Promise.all(journeys.flatMap(journey => [
        firstTouchModel.calculateAttribution(journey.touchpoints),
        lastTouchModel.calculateAttribution(journey.touchpoints),
        linearTouchModel.calculateAttribution(journey.touchpoints)
      ]));

      const processingTime = Date.now() - startTime;
      expect(processingTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);

      results.forEach(modelResults => {
        const totalWeight = modelResults.reduce((sum, r) => sum + r.weight, 0);
        expect(totalWeight).toBeCloseTo(1, 6);
      });
    }, TEST_TIMEOUT);
  });
});