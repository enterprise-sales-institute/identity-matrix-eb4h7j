import { jest } from '@jest/globals';
import { Event, EventType, EventStatus } from '../../src/core/events/types/event.types';
import { EventService } from '../../src/core/events/services/event.service';
import { LoggerService } from '../../src/lib/logger/logger.service';
import { MetricsService } from '../../src/lib/metrics/metrics.service';
import { QueueService } from '../../src/lib/queue/queue.service';
import { KafkaConsumer } from '../../src/lib/kafka/consumer';
import { faker } from '@faker-js/faker';

describe('Event Integration Tests', () => {
  let eventService: EventService;
  let loggerService: LoggerService;
  let metricsService: MetricsService;
  let queueService: QueueService;
  let kafkaConsumer: KafkaConsumer;

  // Test data generation utilities
  const generateTestEvent = (): Omit<Event, 'id' | 'timestamp'> => ({
    visitorId: faker.string.uuid(),
    sessionId: faker.string.uuid(),
    type: EventType.PAGE_VIEW,
    properties: {
      url: faker.internet.url(),
      referrer: faker.internet.url(),
      userAgent: faker.internet.userAgent()
    },
    metadata: {
      source: 'test',
      version: '1.0.0',
      environment: 'test',
      tags: {
        testId: faker.string.uuid()
      }
    }
  });

  const generateTestEvents = (count: number): Array<Omit<Event, 'id' | 'timestamp'>> => {
    return Array.from({ length: count }, () => generateTestEvent());
  };

  beforeAll(async () => {
    // Initialize services with test configuration
    loggerService = new LoggerService({
      level: 'error',
      prettyPrint: false,
      destination: 'stdout',
      redaction: { paths: [], censor: '[REDACTED]', remove: false },
      rotation: { size: '10M', interval: '1d', compress: false },
      performance: { batchSize: 100, flushInterval: 1000, compression: false }
    });

    metricsService = new MetricsService(loggerService);

    queueService = new QueueService();
    await queueService.initializeQueues();

    kafkaConsumer = new KafkaConsumer(loggerService, metricsService, {
      groupId: 'test-group',
      topics: ['test-events'],
      maxBatchSize: 100,
      readBatchTimeout: 1000,
      autoCommit: true,
      maxRetries: 3,
      retryBackoff: 1000,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
      enableDeadLetterQueue: true,
      compression: 'gzip'
    });

    eventService = new EventService(loggerService, metricsService, queueService, kafkaConsumer);
  });

  afterAll(async () => {
    await queueService.clearAllQueues();
    await kafkaConsumer.stop();
  });

  describe('Event Collection Tests', () => {
    it('should track a single event with latency under 5s', async () => {
      const startTime = Date.now();
      const testEvent = generateTestEvent();

      const result = await eventService.trackEvent(testEvent);

      const processingTime = Date.now() - startTime;
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.visitorId).toBe(testEvent.visitorId);
      expect(result.type).toBe(testEvent.type);
      expect(processingTime).toBeLessThan(5000);
    });

    it('should handle batch event processing with high throughput', async () => {
      const batchSize = 1000; // Test with 1000 events
      const testEvents = generateTestEvents(batchSize);
      const startTime = Date.now();

      const results = await Promise.all(
        testEvents.map(event => eventService.trackEvent(event))
      );

      const processingTime = Date.now() - startTime;
      const eventsPerSecond = (batchSize / processingTime) * 1000;

      expect(results).toHaveLength(batchSize);
      expect(eventsPerSecond).toBeGreaterThan(100); // Minimum 100 events/second
      results.forEach(result => {
        expect(result.id).toBeDefined();
        expect(result.timestamp).toBeDefined();
      });
    });

    it('should maintain data accuracy under concurrent load', async () => {
      const concurrentEvents = 100;
      const testEvents = generateTestEvents(concurrentEvents);
      const processedIds = new Set<string>();

      const results = await Promise.all(
        testEvents.map(event => eventService.trackEvent(event))
      );

      results.forEach(result => {
        expect(processedIds.has(result.id)).toBeFalsy();
        processedIds.add(result.id);
      });

      expect(processedIds.size).toBe(concurrentEvents);
    });
  });

  describe('Event Processing Tests', () => {
    it('should process events with correct metadata enrichment', async () => {
      const testEvent = generateTestEvent();
      const result = await eventService.trackEvent(testEvent);

      expect(result.metadata).toMatchObject({
        source: expect.any(String),
        version: expect.any(String),
        environment: expect.any(String),
        processedAt: expect.any(String),
        tags: expect.any(Object)
      });
    });

    it('should handle event validation and error cases', async () => {
      const invalidEvent = {
        ...generateTestEvent(),
        type: 'INVALID_TYPE' as EventType
      };

      await expect(
        eventService.trackEvent(invalidEvent)
      ).rejects.toThrow();
    });

    it('should maintain processing order for sequential events', async () => {
      const sequentialEvents = 5;
      const timestamps: Date[] = [];

      for (let i = 0; i < sequentialEvents; i++) {
        const result = await eventService.trackEvent(generateTestEvent());
        timestamps.push(result.timestamp);
      }

      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i].getTime()).toBeGreaterThanOrEqual(timestamps[i-1].getTime());
      }
    });
  });

  describe('Performance and Reliability Tests', () => {
    it('should handle sustained high throughput', async () => {
      const duration = 5000; // 5 second test
      const startTime = Date.now();
      const results: Promise<Event>[] = [];

      while (Date.now() - startTime < duration) {
        results.push(eventService.trackEvent(generateTestEvent()));
      }

      const processed = await Promise.all(results);
      const totalEvents = processed.length;
      const throughput = (totalEvents / duration) * 1000;

      expect(throughput).toBeGreaterThan(50); // Minimum 50 events/second
      expect(processed).toHaveLength(totalEvents);
    });

    it('should recover from processing failures', async () => {
      // Mock a temporary processing failure
      const originalProcessEvent = eventService['processEvent'];
      let failureCount = 0;
      
      eventService['processEvent'] = jest.fn().mockImplementation(async (event: Event) => {
        if (failureCount < 2) {
          failureCount++;
          throw new Error('Simulated processing failure');
        }
        return originalProcessEvent.call(eventService, event);
      });

      const testEvent = generateTestEvent();
      const result = await eventService.trackEvent(testEvent);

      expect(result).toBeDefined();
      expect(failureCount).toBe(2);

      // Restore original implementation
      eventService['processEvent'] = originalProcessEvent;
    });

    it('should maintain performance under memory pressure', async () => {
      const largeDataSize = 1000;
      const largeEvents = generateTestEvents(largeDataSize).map(event => ({
        ...event,
        properties: {
          ...event.properties,
          largeData: Buffer.alloc(1024).toString('hex') // 1KB of data per event
        }
      }));

      const startHeap = process.memoryUsage().heapUsed;
      
      await Promise.all(
        largeEvents.map(event => eventService.trackEvent(event))
      );

      const endHeap = process.memoryUsage().heapUsed;
      const heapGrowth = (endHeap - startHeap) / 1024 / 1024; // MB

      expect(heapGrowth).toBeLessThan(100); // Less than 100MB heap growth
    });
  });
});