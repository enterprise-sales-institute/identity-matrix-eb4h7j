import { describe, beforeAll, afterAll, beforeEach, afterEach, it, expect } from '@jest/globals';
import request from 'supertest';
import { faker } from '@faker-js/faker';
import { Event, EventType, EventStatus, ValidationResult } from '../../../src/core/events/types/event.types';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const API_VERSION = '1.0.0';

// Test configuration constants
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 1000;
const TEST_TIMEOUT = 30000;

// Mock valid authentication token
const VALID_API_KEY = 'test-api-key-12345';
const INVALID_API_KEY = 'invalid-api-key';

describe('Event API Integration Tests', () => {
  let testVisitorId: string;
  let testSessionId: string;

  // Helper function to generate valid test event
  const createTestEvent = (): Event => ({
    id: faker.string.uuid(),
    visitorId: testVisitorId,
    sessionId: testSessionId,
    type: EventType.PAGE_VIEW,
    timestamp: new Date(),
    properties: {
      url: faker.internet.url(),
      referrer: faker.internet.url(),
      userAgent: faker.internet.userAgent()
    },
    metadata: {
      source: 'integration-test',
      version: API_VERSION,
      environment: 'test',
      tags: {
        testId: faker.string.uuid()
      }
    }
  });

  beforeAll(async () => {
    // Setup test environment
    testVisitorId = faker.string.uuid();
    testSessionId = faker.string.uuid();
  });

  afterAll(async () => {
    // Cleanup test data
  });

  beforeEach(async () => {
    // Reset rate limiters and temporary test state
  });

  afterEach(async () => {
    // Clean up after each test
  });

  describe('POST /events', () => {
    it('should successfully track a valid single event', async () => {
      const testEvent = createTestEvent();
      
      const response = await request(API_BASE_URL)
        .post('/events')
        .set('Authorization', `Bearer ${VALID_API_KEY}`)
        .set('Content-Type', 'application/json')
        .send(testEvent)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBeDefined();
      expect(response.body.metadata.apiVersion).toBe(API_VERSION);
    }, TEST_TIMEOUT);

    it('should successfully process batch events', async () => {
      const batchEvents = Array.from({ length: 5 }, () => createTestEvent());
      
      const response = await request(API_BASE_URL)
        .post('/events/batch')
        .set('Authorization', `Bearer ${VALID_API_KEY}`)
        .send({ events: batchEvents })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.processedCount).toBe(batchEvents.length);
      expect(response.body.data.status).toBe(EventStatus.PROCESSED);
    }, TEST_TIMEOUT);

    it('should validate all required event fields', async () => {
      const invalidEvent = {
        // Missing required fields
        visitorId: testVisitorId,
        timestamp: new Date()
      };

      const response = await request(API_BASE_URL)
        .post('/events')
        .set('Authorization', `Bearer ${VALID_API_KEY}`)
        .send(invalidEvent)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details.missingFields).toContain('type');
      expect(response.body.error.details.missingFields).toContain('sessionId');
    });

    it('should enforce rate limiting with configurable thresholds', async () => {
      const testEvent = createTestEvent();
      const requests = Array.from({ length: RATE_LIMIT_MAX_REQUESTS + 1 }, 
        () => request(API_BASE_URL)
          .post('/events')
          .set('Authorization', `Bearer ${VALID_API_KEY}`)
          .send(testEvent)
      );

      const responses = await Promise.all(requests);
      const rateLimitedResponse = responses[responses.length - 1];

      expect(rateLimitedResponse.status).toBe(429);
      expect(rateLimitedResponse.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    }, TEST_TIMEOUT);

    it('should handle concurrent event submissions', async () => {
      const concurrentEvents = Array.from({ length: 10 }, () => createTestEvent());
      const concurrentRequests = concurrentEvents.map(event => 
        request(API_BASE_URL)
          .post('/events')
          .set('Authorization', `Bearer ${VALID_API_KEY}`)
          .send(event)
      );

      const responses = await Promise.all(concurrentRequests);
      
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });
    }, TEST_TIMEOUT);
  });

  describe('GET /events/visitor/:visitorId', () => {
    it('should retrieve events for valid visitor ID with pagination', async () => {
      // First create some test events
      const testEvents = Array.from({ length: 5 }, () => createTestEvent());
      await Promise.all(testEvents.map(event => 
        request(API_BASE_URL)
          .post('/events')
          .set('Authorization', `Bearer ${VALID_API_KEY}`)
          .send(event)
      ));

      const response = await request(API_BASE_URL)
        .get(`/events/visitor/${testVisitorId}`)
        .set('Authorization', `Bearer ${VALID_API_KEY}`)
        .query({
          limit: 2,
          offset: 0,
          sortBy: 'timestamp',
          sortOrder: 'desc'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.events).toHaveLength(2);
      expect(response.body.data.pagination.total).toBeGreaterThanOrEqual(5);
      expect(response.body.data.events[0].timestamp).toBeGreaterThan(response.body.data.events[1].timestamp);
    });

    it('should filter events by date range accurately', async () => {
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + 3600000); // 1 hour later

      const response = await request(API_BASE_URL)
        .get(`/events/visitor/${testVisitorId}`)
        .set('Authorization', `Bearer ${VALID_API_KEY}`)
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.events.forEach((event: Event) => {
        const eventDate = new Date(event.timestamp);
        expect(eventDate >= startDate && eventDate <= endDate).toBe(true);
      });
    });

    it('should handle invalid visitor ID with proper error', async () => {
      const invalidVisitorId = 'invalid-visitor-id';

      const response = await request(API_BASE_URL)
        .get(`/events/visitor/${invalidVisitorId}`)
        .set('Authorization', `Bearer ${VALID_API_KEY}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('Invalid visitor ID format');
    });

    it('should enforce access control policies', async () => {
      const response = await request(API_BASE_URL)
        .get(`/events/visitor/${testVisitorId}`)
        .set('Authorization', `Bearer ${INVALID_API_KEY}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTHENTICATION_ERROR');
    });

    it('should handle large result sets efficiently', async () => {
      // Create 100 test events
      const largeEventSet = Array.from({ length: 100 }, () => createTestEvent());
      await Promise.all(largeEventSet.map(event => 
        request(API_BASE_URL)
          .post('/events')
          .set('Authorization', `Bearer ${VALID_API_KEY}`)
          .send(event)
      ));

      const response = await request(API_BASE_URL)
        .get(`/events/visitor/${testVisitorId}`)
        .set('Authorization', `Bearer ${VALID_API_KEY}`)
        .query({
          limit: 50,
          offset: 0
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.events).toHaveLength(50);
      expect(response.body.data.pagination.total).toBeGreaterThanOrEqual(100);
      expect(response.body.metadata.timestamp).toBeDefined();
    }, TEST_TIMEOUT);
  });
});