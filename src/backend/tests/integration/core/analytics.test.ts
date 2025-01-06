import { Test, TestingModule } from '@nestjs/testing'; // v9.0.0
import { describe, it, beforeEach, afterEach, beforeAll, afterAll } from 'jest'; // v29.0.0
import { PerformanceMonitor } from '@test/performance-monitor'; // v1.0.0
import { StatisticalValidator } from '@test/statistical-validator'; // v1.0.0
import { TestDataGenerator } from '@test/test-data-generator'; // v1.0.0
import { AnalyticsService } from '../../../src/core/analytics/services/analytics.service';
import { AnalyticsMetric } from '../../../src/core/analytics/types/analytics.types';
import { TimeRange } from '../../../src/types/common.types';

describe('Analytics Service Integration Tests', () => {
  let module: TestingModule;
  let analyticsService: AnalyticsService;
  let performanceMonitor: PerformanceMonitor;
  let statisticalValidator: StatisticalValidator;
  let testDataGenerator: TestDataGenerator;

  beforeAll(async () => {
    // Initialize test module with enhanced monitoring
    module = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        PerformanceMonitor,
        StatisticalValidator,
        TestDataGenerator
      ]
    }).compile();

    analyticsService = module.get<AnalyticsService>(AnalyticsService);
    performanceMonitor = module.get<PerformanceMonitor>(PerformanceMonitor);
    statisticalValidator = module.get<StatisticalValidator>(StatisticalValidator);
    testDataGenerator = module.get<TestDataGenerator>(TestDataGenerator);

    // Configure performance monitoring thresholds
    performanceMonitor.setLatencyThreshold(5000); // 5s max latency
    performanceMonitor.setThroughputTarget(10000000); // 10M events/day
  });

  afterAll(async () => {
    await module.close();
  });

  describe('Real-time Analytics Processing', () => {
    it('should process high volume events within latency requirements', async () => {
      // Generate test data for high volume scenario
      const testEvents = await testDataGenerator.generateEvents({
        count: 1000000, // 1M events for test batch
        channels: ['social', 'email', 'ppc'],
        timeRange: {
          start: new Date(Date.now() - 86400000), // Last 24 hours
          end: new Date()
        }
      });

      // Start performance monitoring
      performanceMonitor.startMeasurement('batch_processing');

      // Process events in batches
      const batchSize = 10000;
      const batches = Math.ceil(testEvents.length / batchSize);
      
      for (let i = 0; i < batches; i++) {
        const batch = testEvents.slice(i * batchSize, (i + 1) * batchSize);
        await analyticsService.queryAnalytics({
          timeRange: {
            start: new Date(Date.now() - 86400000),
            end: new Date()
          },
          metrics: [
            AnalyticsMetric.CONVERSION_RATE,
            AnalyticsMetric.REVENUE,
            AnalyticsMetric.TOUCHPOINTS
          ]
        });
      }

      // Get performance metrics
      const performanceMetrics = performanceMonitor.endMeasurement('batch_processing');

      // Validate performance requirements
      expect(performanceMetrics.averageLatency).toBeLessThan(5000);
      expect(performanceMetrics.throughput).toBeGreaterThan(10000000 / 86400); // Daily rate converted to per-second
      expect(performanceMetrics.errorRate).toBeLessThan(0.001); // 0.1% max error rate
    });

    it('should maintain 99.9% accuracy in metric calculations', async () => {
      // Generate test data with known metrics
      const testData = await testDataGenerator.generateTestData({
        scenario: 'multi_channel_attribution',
        knownMetrics: {
          [AnalyticsMetric.CONVERSION_RATE]: 0.15,
          [AnalyticsMetric.REVENUE]: 100000,
          [AnalyticsMetric.TOUCHPOINTS]: 50000
        }
      });

      // Process test data
      const results = await analyticsService.calculateMetrics(
        'test_channel',
        {
          start: new Date(Date.now() - 86400000),
          end: new Date()
        },
        [
          AnalyticsMetric.CONVERSION_RATE,
          AnalyticsMetric.REVENUE,
          AnalyticsMetric.TOUCHPOINTS
        ]
      );

      // Validate accuracy using statistical validation
      const accuracyResults = await statisticalValidator.validateMetrics({
        expected: testData.knownMetrics,
        actual: results,
        confidenceLevel: 0.999
      });

      expect(accuracyResults.overallAccuracy).toBeGreaterThanOrEqual(0.999);
      expect(accuracyResults.metricAccuracy).toEqual(
        expect.objectContaining({
          [AnalyticsMetric.CONVERSION_RATE]: expect.any(Number),
          [AnalyticsMetric.REVENUE]: expect.any(Number),
          [AnalyticsMetric.TOUCHPOINTS]: expect.any(Number)
        })
      );
    });

    it('should handle concurrent analytics requests efficiently', async () => {
      // Generate concurrent request scenarios
      const concurrentRequests = 50;
      const timeRanges: TimeRange[] = Array(concurrentRequests).fill(null).map((_, i) => ({
        start: new Date(Date.now() - (i + 1) * 86400000),
        end: new Date(Date.now() - i * 86400000)
      }));

      // Start performance monitoring
      performanceMonitor.startMeasurement('concurrent_processing');

      // Execute concurrent requests
      const results = await Promise.all(
        timeRanges.map(timeRange =>
          analyticsService.queryAnalytics({
            timeRange,
            metrics: [
              AnalyticsMetric.CONVERSION_RATE,
              AnalyticsMetric.REVENUE,
              AnalyticsMetric.TOUCHPOINTS
            ]
          })
        )
      );

      // Get concurrency metrics
      const concurrencyMetrics = performanceMonitor.endMeasurement('concurrent_processing');

      // Validate concurrent processing
      expect(results).toHaveLength(concurrentRequests);
      expect(concurrencyMetrics.averageLatency).toBeLessThan(5000);
      expect(concurrencyMetrics.maxConcurrentRequests).toBeGreaterThanOrEqual(concurrentRequests);
      expect(concurrencyMetrics.failedRequests).toBe(0);
    });

    it('should aggregate data by dimension with streaming support', async () => {
      const timeRange: TimeRange = {
        start: new Date(Date.now() - 86400000),
        end: new Date()
      };

      // Test streaming aggregation
      const aggregationStream = await analyticsService.aggregateByDimension(
        'CHANNEL',
        {
          timeRange,
          metrics: [
            AnalyticsMetric.CONVERSION_RATE,
            AnalyticsMetric.REVENUE,
            AnalyticsMetric.TOUCHPOINTS
          ]
        },
        { batchSize: 1000 }
      );

      // Collect streaming results
      const aggregationResults: any[] = [];
      await new Promise((resolve, reject) => {
        aggregationStream.subscribe({
          next: (result) => aggregationResults.push(result),
          error: (error) => reject(error),
          complete: () => resolve(undefined)
        });
      });

      // Validate aggregation results
      expect(aggregationResults.length).toBeGreaterThan(0);
      aggregationResults.forEach(result => {
        expect(result).toHaveProperty('dimension');
        expect(result).toHaveProperty('metrics');
        expect(result.metrics).toHaveProperty('conversionRate');
        expect(result.metrics).toHaveProperty('revenue');
        expect(result.metrics).toHaveProperty('touchpoints');
      });
    });
  });
});