import { describe, beforeAll, afterAll, it, expect } from '@jest/globals';
import { AttributionService } from '../../../src/core/attribution/services/attribution.service';
import { AttributionModel } from '../../../src/core/attribution/types/attribution.types';
import { TestDataGenerator } from '../../fixtures/attribution.fixtures';
import supertest from 'supertest';

describe('Attribution Service Integration Tests', () => {
  let attributionService: AttributionService;
  let testDataGenerator: TestDataGenerator;
  let performanceMetrics: { [key: string]: number[] } = {};

  beforeAll(async () => {
    // Initialize services and test data
    attributionService = new AttributionService();
    testDataGenerator = new TestDataGenerator();

    // Initialize performance tracking
    performanceMetrics = {
      processingTimes: [],
      accuracyScores: [],
      validationResults: []
    };
  });

  afterAll(async () => {
    // Clean up test data and connections
    performanceMetrics = {};
  });

  describe('Attribution Model Calculations', () => {
    it('should calculate first-touch attribution with 99.9% accuracy', async () => {
      // Generate test journey with known first touch
      const journey = await testDataGenerator.createMockTouchpointJourney({
        touchpointCount: 5,
        conversionProbability: 1
      });

      const results = await attributionService.calculateAttribution(
        journey.visitorId,
        AttributionModel.FIRST_TOUCH,
        { startDate: journey.metadata.startDate, endDate: journey.metadata.endDate }
      );

      // Validate first touch attribution
      expect(results).toHaveLength(1);
      expect(results[0].touchpointId).toBe(journey.touchpoints[0].id);
      expect(results[0].weight).toBe(1.0);
      expect(results[0].confidenceScore).toBeGreaterThanOrEqual(0.999);
    });

    it('should calculate last-touch attribution with 99.9% accuracy', async () => {
      const journey = await testDataGenerator.createMockTouchpointJourney({
        touchpointCount: 5,
        conversionProbability: 1
      });

      const results = await attributionService.calculateAttribution(
        journey.visitorId,
        AttributionModel.LAST_TOUCH,
        { startDate: journey.metadata.startDate, endDate: journey.metadata.endDate }
      );

      expect(results).toHaveLength(1);
      expect(results[0].touchpointId).toBe(journey.touchpoints[journey.touchpoints.length - 1].id);
      expect(results[0].weight).toBe(1.0);
      expect(results[0].confidenceScore).toBeGreaterThanOrEqual(0.999);
    });

    it('should calculate linear attribution with correct weight distribution', async () => {
      const journey = await testDataGenerator.createMockTouchpointJourney({
        touchpointCount: 4,
        conversionProbability: 1
      });

      const results = await attributionService.calculateAttribution(
        journey.visitorId,
        AttributionModel.LINEAR,
        { startDate: journey.metadata.startDate, endDate: journey.metadata.endDate }
      );

      expect(results).toHaveLength(4);
      const totalWeight = results.reduce((sum, r) => sum + r.weight, 0);
      expect(totalWeight).toBeCloseTo(1.0, 6);
      results.forEach(result => {
        expect(result.weight).toBeCloseTo(0.25, 6);
        expect(result.confidenceScore).toBeGreaterThanOrEqual(0.999);
      });
    });

    it('should calculate position-based attribution with correct weight distribution', async () => {
      const journey = await testDataGenerator.createMockTouchpointJourney({
        touchpointCount: 5,
        conversionProbability: 1
      });

      const results = await attributionService.calculateAttribution(
        journey.visitorId,
        AttributionModel.POSITION_BASED,
        { startDate: journey.metadata.startDate, endDate: journey.metadata.endDate }
      );

      expect(results).toHaveLength(5);
      const totalWeight = results.reduce((sum, r) => sum + r.weight, 0);
      expect(totalWeight).toBeCloseTo(1.0, 6);
      
      // First and last touch should have 40% each
      expect(results[0].weight).toBeCloseTo(0.4, 6);
      expect(results[results.length - 1].weight).toBeCloseTo(0.4, 6);
      
      // Middle touchpoints should share remaining 20%
      const middlePoints = results.slice(1, -1);
      middlePoints.forEach(result => {
        expect(result.weight).toBeCloseTo(0.2 / (results.length - 2), 6);
      });
    });

    it('should calculate time-decay attribution with correct decay factors', async () => {
      const journey = await testDataGenerator.createMockTouchpointJourney({
        touchpointCount: 5,
        timeSpan: 14, // 14 days
        conversionProbability: 1
      });

      const results = await attributionService.calculateAttribution(
        journey.visitorId,
        AttributionModel.TIME_DECAY,
        { startDate: journey.metadata.startDate, endDate: journey.metadata.endDate }
      );

      expect(results).toHaveLength(5);
      const totalWeight = results.reduce((sum, r) => sum + r.weight, 0);
      expect(totalWeight).toBeCloseTo(1.0, 6);

      // Verify weights increase over time
      for (let i = 1; i < results.length; i++) {
        expect(results[i].weight).toBeGreaterThan(results[i-1].weight);
      }
    });
  });

  describe('Performance Requirements', () => {
    it('should process attribution calculations within 5 seconds', async () => {
      // Generate large dataset for performance testing
      const largeDataset = await testDataGenerator.createLargeDataset({
        journeyCount: 1000,
        touchpointsPerJourney: 10
      });

      const startTime = Date.now();

      // Process all journeys
      const promises = largeDataset.map(journey => 
        attributionService.calculateAttribution(
          journey.visitorId,
          AttributionModel.MULTI_TOUCH,
          { startDate: journey.metadata.startDate, endDate: journey.metadata.endDate }
        )
      );

      await Promise.all(promises);
      const processingTime = Date.now() - startTime;

      expect(processingTime).toBeLessThan(5000); // Less than 5 seconds
      performanceMetrics.processingTimes.push(processingTime);
    });

    it('should maintain performance under concurrent load', async () => {
      const concurrentRequests = 50;
      const journey = await testDataGenerator.createMockTouchpointJourney({
        touchpointCount: 5
      });

      const startTime = Date.now();
      
      const promises = Array.from({ length: concurrentRequests }, () =>
        attributionService.calculateAttribution(
          journey.visitorId,
          AttributionModel.MULTI_TOUCH,
          { startDate: journey.metadata.startDate, endDate: journey.metadata.endDate }
        )
      );

      await Promise.all(promises);
      const processingTime = Date.now() - startTime;

      expect(processingTime / concurrentRequests).toBeLessThan(100); // Average < 100ms per request
    });
  });

  describe('Data Accuracy Requirements', () => {
    it('should achieve 99.9% accuracy in attribution calculations', async () => {
      const testCases = await Promise.all([
        testDataGenerator.createMockTouchpointJourney({ touchpointCount: 3 }),
        testDataGenerator.createMockTouchpointJourney({ touchpointCount: 5 }),
        testDataGenerator.createMockTouchpointJourney({ touchpointCount: 7 })
      ]);

      for (const journey of testCases) {
        const results = await attributionService.calculateAttribution(
          journey.visitorId,
          AttributionModel.MULTI_TOUCH,
          { startDate: journey.metadata.startDate, endDate: journey.metadata.endDate }
        );

        const validationResult = await attributionService.validateResults(results);
        expect(validationResult.confidenceScore).toBeGreaterThanOrEqual(0.999);
        performanceMetrics.accuracyScores.push(validationResult.confidenceScore);
      }
    });

    it('should validate temporal consistency of attribution results', async () => {
      const journey = await testDataGenerator.createMockTouchpointJourney({
        touchpointCount: 5,
        timeSpan: 7
      });

      const results = await attributionService.calculateAttribution(
        journey.visitorId,
        AttributionModel.TIME_DECAY,
        { startDate: journey.metadata.startDate, endDate: journey.metadata.endDate }
      );

      // Verify temporal sequence
      const timestamps = results.map(r => r.calculatedAt.getTime());
      const isTemporallyConsistent = timestamps.every((t, i) => 
        i === 0 || t >= timestamps[i - 1]
      );

      expect(isTemporallyConsistent).toBe(true);
    });

    it('should maintain data consistency across different attribution models', async () => {
      const journey = await testDataGenerator.createMockTouchpointJourney({
        touchpointCount: 5
      });

      const models = [
        AttributionModel.FIRST_TOUCH,
        AttributionModel.LAST_TOUCH,
        AttributionModel.LINEAR,
        AttributionModel.POSITION_BASED,
        AttributionModel.TIME_DECAY
      ];

      const results = await Promise.all(models.map(model =>
        attributionService.calculateAttribution(
          journey.visitorId,
          model,
          { startDate: journey.metadata.startDate, endDate: journey.metadata.endDate }
        )
      ));

      results.forEach(modelResults => {
        const totalWeight = modelResults.reduce((sum, r) => sum + r.weight, 0);
        expect(totalWeight).toBeCloseTo(1.0, 6);
      });
    });
  });
});