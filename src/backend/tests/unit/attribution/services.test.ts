import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { AttributionService } from '../../../src/core/attribution/services/attribution.service';
import { ModelService } from '../../../src/core/attribution/services/model.service';
import { TestDataGenerator } from '../../fixtures/attribution.fixtures';
import { 
  AttributionModel, 
  ValidationStatus,
  Channel 
} from '../../../src/core/attribution/types/attribution.types';

// Constants for test validation
const ACCURACY_THRESHOLD = 0.999; // 99.9% accuracy requirement
const PERFORMANCE_THRESHOLD_MS = 5000; // 5s processing requirement
const TEST_SAMPLE_SIZE = 10000; // Large sample size for statistical validation

describe('Attribution Service Tests', () => {
  let attributionService: AttributionService;
  let modelService: ModelService;
  let testDataGenerator: TestDataGenerator;

  beforeEach(() => {
    attributionService = new AttributionService();
    modelService = new ModelService();
    testDataGenerator = new TestDataGenerator();
  });

  describe('Attribution Calculation Tests', () => {
    test('should calculate first-touch attribution with 99.9% accuracy', async () => {
      // Generate test journey with known first touch
      const journey = testDataGenerator.createMockTouchpointJourney({
        touchpointCount: 5,
        conversionProbability: 1
      });
      const firstTouch = journey.touchpoints[0];

      const results = await attributionService.calculateAttribution(
        journey.visitorId,
        AttributionModel.FIRST_TOUCH,
        { startDate: journey.metadata.startDate, endDate: journey.metadata.endDate }
      );

      // Validate results
      expect(results).toBeDefined();
      expect(results.length).toBe(journey.touchpoints.length);
      expect(results[0].touchpointId).toBe(firstTouch.id);
      expect(results[0].weight).toBe(1);
      expect(results[0].confidenceScore).toBeGreaterThanOrEqual(ACCURACY_THRESHOLD);
    });

    test('should calculate last-touch attribution within performance SLA', async () => {
      const startTime = Date.now();
      const journey = testDataGenerator.createMockTouchpointJourney({
        touchpointCount: 10,
        timeSpan: 30
      });

      const results = await attributionService.calculateAttribution(
        journey.visitorId,
        AttributionModel.LAST_TOUCH,
        { startDate: journey.metadata.startDate, endDate: journey.metadata.endDate }
      );

      const processingTime = Date.now() - startTime;
      expect(processingTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
      expect(results).toBeDefined();
      expect(results.some(r => r.weight === 1)).toBe(true);
    });

    test('should handle complex multi-touch attribution scenarios', async () => {
      const journey = testDataGenerator.createMockTouchpointJourney({
        touchpointCount: 8,
        conversionProbability: 1
      });

      const results = await attributionService.calculateAttribution(
        journey.visitorId,
        AttributionModel.LINEAR,
        { startDate: journey.metadata.startDate, endDate: journey.metadata.endDate }
      );

      // Validate weight distribution
      const totalWeight = results.reduce((sum, r) => sum + r.weight, 0);
      expect(Math.abs(1 - totalWeight)).toBeLessThan(0.0001);
      expect(results.every(r => r.validationStatus === ValidationStatus.VALID)).toBe(true);
    });
  });

  describe('Model Service Tests', () => {
    test('should validate attribution model configuration', async () => {
      const config = testDataGenerator.createMockAttributionConfig(
        AttributionModel.POSITION_BASED,
        {
          customWeights: {
            [Channel.SOCIAL]: 0.4,
            [Channel.EMAIL]: 0.3,
            [Channel.PAID_SEARCH]: 0.3
          }
        }
      );

      const isValid = await modelService.validateConfig(config);
      expect(isValid).toBe(true);
    });

    test('should detect invalid model configurations', async () => {
      const invalidConfig = testDataGenerator.createMockAttributionConfig();
      invalidConfig.channelWeights = {
        [Channel.SOCIAL]: 0.5,
        [Channel.EMAIL]: 0.6 // Invalid total weight > 1
      };

      const isValid = await modelService.validateConfig(invalidConfig);
      expect(isValid).toBe(false);
    });

    test('should maintain accuracy across large datasets', async () => {
      const journeys = Array.from({ length: TEST_SAMPLE_SIZE }, () =>
        testDataGenerator.createMockTouchpointJourney({
          touchpointCount: Math.floor(Math.random() * 10) + 2
        })
      );

      let validResults = 0;
      for (const journey of journeys) {
        const results = await attributionService.calculateAttribution(
          journey.visitorId,
          AttributionModel.TIME_DECAY,
          { startDate: journey.metadata.startDate, endDate: journey.metadata.endDate }
        );
        
        if (results.every(r => r.validationStatus === ValidationStatus.VALID)) {
          validResults++;
        }
      }

      const accuracy = validResults / TEST_SAMPLE_SIZE;
      expect(accuracy).toBeGreaterThanOrEqual(ACCURACY_THRESHOLD);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle empty touchpoint sequences', async () => {
      const journey = testDataGenerator.createMockTouchpointJourney({
        touchpointCount: 0
      });

      await expect(
        attributionService.calculateAttribution(
          journey.visitorId,
          AttributionModel.FIRST_TOUCH,
          { startDate: new Date(), endDate: new Date() }
        )
      ).rejects.toThrow();
    });

    test('should handle invalid temporal sequences', async () => {
      const journey = testDataGenerator.createMockTouchpointJourney({
        touchpointCount: 3
      });
      
      // Invalidate temporal sequence
      journey.touchpoints[1].timestamp = new Date(
        journey.touchpoints[0].timestamp.getTime() - 1000
      );

      const results = await attributionService.calculateAttribution(
        journey.visitorId,
        AttributionModel.LINEAR,
        { startDate: journey.metadata.startDate, endDate: journey.metadata.endDate }
      );

      expect(results.every(r => r.confidenceScore < ACCURACY_THRESHOLD)).toBe(true);
    });

    test('should handle missing channel data', async () => {
      const journey = testDataGenerator.createMockTouchpointJourney({
        touchpointCount: 3
      });
      
      // @ts-ignore - Intentionally break channel data for testing
      journey.touchpoints[1].channel = undefined;

      const results = await attributionService.calculateAttribution(
        journey.visitorId,
        AttributionModel.LAST_TOUCH,
        { startDate: journey.metadata.startDate, endDate: journey.metadata.endDate }
      );

      expect(results.some(r => r.validationStatus === ValidationStatus.INVALID)).toBe(true);
    });
  });

  describe('Performance and Scaling Tests', () => {
    test('should handle concurrent attribution calculations', async () => {
      const journeys = Array.from({ length: 100 }, () =>
        testDataGenerator.createMockTouchpointJourney()
      );

      const startTime = Date.now();
      const results = await Promise.all(
        journeys.map(journey =>
          attributionService.calculateAttribution(
            journey.visitorId,
            AttributionModel.LINEAR,
            { startDate: journey.metadata.startDate, endDate: journey.metadata.endDate }
          )
        )
      );

      const processingTime = Date.now() - startTime;
      expect(processingTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS * 2);
      expect(results).toHaveLength(journeys.length);
    });

    test('should maintain performance under load', async () => {
      const largeJourney = testDataGenerator.createMockTouchpointJourney({
        touchpointCount: 1000,
        timeSpan: 90
      });

      const startTime = Date.now();
      const results = await attributionService.calculateAttribution(
        largeJourney.visitorId,
        AttributionModel.TIME_DECAY,
        { startDate: largeJourney.metadata.startDate, endDate: largeJourney.metadata.endDate }
      );

      const processingTime = Date.now() - startTime;
      expect(processingTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
      expect(results).toHaveLength(largeJourney.touchpoints.length);
    });
  });
});