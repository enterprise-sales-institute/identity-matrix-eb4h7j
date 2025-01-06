import { describe, beforeAll, afterAll, it, expect, jest } from '@jest/globals'; // v29.0.0
import supertest from 'supertest'; // v6.3.0
import { firstValueFrom } from 'rxjs'; // v7.8.0
import { faker } from '@faker-js/faker'; // v8.0.0
import { setupTestEnvironment, cleanupTestEnvironment, setupTestCache, setupTestAuth } from '../../setup';
import { AnalyticsController } from '../../../src/api/controllers/analytics.controller';
import { AnalyticsService } from '../../../core/analytics/services/analytics.service';
import { AnalyticsMetric, AnalyticsFilter, PerformanceMetrics } from '../../../core/analytics/types/analytics.types';
import { Express } from 'express';

describe('Analytics API Integration Tests', () => {
  let app: Express;
  let analyticsController: AnalyticsController;
  let analyticsService: AnalyticsService;
  let testCache: any;
  let testAuth: any;
  let performanceMetrics: PerformanceMetrics;
  let testToken: string;

  beforeAll(async () => {
    // Initialize test environment with enhanced setup
    const testEnv = await setupTestEnvironment();
    app = testEnv.app;
    analyticsController = testEnv.analyticsController;
    analyticsService = testEnv.analyticsService;

    // Setup test cache and auth
    testCache = await setupTestCache();
    testAuth = await setupTestAuth();
    testToken = await testAuth.generateTestToken({
      userId: faker.string.uuid(),
      role: 'analyst'
    });

    // Initialize performance metrics collection
    performanceMetrics = {
      requestCount: 0,
      averageLatency: 0,
      errorCount: 0,
      cacheHitRate: 0
    };
  });

  afterAll(async () => {
    await cleanupTestEnvironment();
    await testCache.clear();
    await testAuth.cleanup();
  });

  describe('GET /analytics/query', () => {
    it('should return analytics data within 5s latency requirement', async () => {
      // Prepare test data
      const timeRange = {
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endDate: new Date()
      };

      const metrics = [
        AnalyticsMetric.CONVERSION_RATE,
        AnalyticsMetric.REVENUE,
        AnalyticsMetric.TOUCHPOINTS
      ];

      // Execute request with timing
      const startTime = Date.now();
      const response = await supertest(app)
        .get('/analytics/query')
        .query({
          timeRange: JSON.stringify(timeRange),
          metrics: metrics.join(',')
        })
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      const latency = Date.now() - startTime;

      // Validate response timing
      expect(latency).toBeLessThan(5000);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('channelMetrics');
    });

    it('should properly cache and return analytics results', async () => {
      const queryParams = {
        timeRange: {
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          endDate: new Date()
        },
        metrics: [AnalyticsMetric.CONVERSION_RATE]
      };

      // First request - should hit database
      const firstResponse = await supertest(app)
        .get('/analytics/query')
        .query(queryParams)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      // Second request - should hit cache
      const secondResponse = await supertest(app)
        .get('/analytics/query')
        .query(queryParams)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(firstResponse.body).toEqual(secondResponse.body);
      expect(secondResponse.headers['x-cache-hit']).toBe('true');
    });

    it('should validate data accuracy across all metrics', async () => {
      const response = await supertest(app)
        .get('/analytics/query')
        .query({
          timeRange: JSON.stringify({
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            endDate: new Date()
          }),
          metrics: Object.values(AnalyticsMetric).join(',')
        })
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      const { data } = response.body;

      // Validate metric calculations
      expect(data.channelMetrics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            conversionRate: expect.any(Number),
            revenue: expect.any(Number),
            touchpoints: expect.any(Number),
            attributionWeight: expect.any(Number)
          })
        ])
      );

      // Validate totals consistency
      const totalRevenue = data.channelMetrics.reduce(
        (sum: number, metric: any) => sum + metric.revenue,
        0
      );
      expect(data.totals.REVENUE).toBeCloseTo(totalRevenue, 2);
    });

    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 10;
      const requests = Array(concurrentRequests).fill(null).map(() =>
        supertest(app)
          .get('/analytics/query')
          .query({
            timeRange: JSON.stringify({
              startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
              endDate: new Date()
            })
          })
          .set('Authorization', `Bearer ${testToken}`)
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('data');
      });
    });
  });

  describe('GET /analytics/metrics/channel/:channelId', () => {
    it('should return accurate channel-specific metrics', async () => {
      const channelId = faker.string.uuid();
      
      const response = await supertest(app)
        .get(`/analytics/metrics/channel/${channelId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        channelId,
        conversionRate: expect.any(Number),
        revenue: expect.any(Number),
        touchpoints: expect.any(Number)
      });
    });

    it('should handle invalid channel IDs appropriately', async () => {
      await supertest(app)
        .get('/analytics/metrics/channel/invalid-id')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(400);
    });
  });

  describe('POST /analytics/aggregate', () => {
    it('should correctly aggregate data by dimension', async () => {
      const aggregationRequest = {
        dimension: 'CHANNEL',
        timeRange: {
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          endDate: new Date()
        },
        metrics: [AnalyticsMetric.CONVERSION_RATE, AnalyticsMetric.REVENUE]
      };

      const response = await supertest(app)
        .post('/analytics/aggregate')
        .send(aggregationRequest)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            dimension: expect.any(String),
            metrics: expect.objectContaining({
              conversionRate: expect.any(Number),
              revenue: expect.any(Number)
            })
          })
        ])
      );
    });
  });

  describe('Security and Error Handling', () => {
    it('should require authentication for all endpoints', async () => {
      await supertest(app)
        .get('/analytics/query')
        .expect(401);

      await supertest(app)
        .get('/analytics/metrics/channel/test-channel')
        .expect(401);

      await supertest(app)
        .post('/analytics/aggregate')
        .expect(401);
    });

    it('should handle invalid time ranges appropriately', async () => {
      const invalidTimeRange = {
        startDate: new Date(),
        endDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // End before start
      };

      await supertest(app)
        .get('/analytics/query')
        .query({ timeRange: JSON.stringify(invalidTimeRange) })
        .set('Authorization', `Bearer ${testToken}`)
        .expect(400);
    });

    it('should enforce rate limiting', async () => {
      const requests = Array(100).fill(null).map(() =>
        supertest(app)
          .get('/analytics/query')
          .set('Authorization', `Bearer ${testToken}`)
      );

      const responses = await Promise.all(requests);
      expect(responses.some(r => r.status === 429)).toBe(true);
    });
  });
});