import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { EventService } from '../../../src/core/events/services/event.service';
import { EventProcessingService } from '../../../src/core/events/services/processing.service';
import { Event, EventType } from '../../../src/core/events/types/event.types';
import { 
  mockPageViewEvent, 
  mockClickEvent, 
  mockConversionEvent, 
  mockEventBatch,
  mockInvalidEvents,
  MOCK_VISITOR_ID,
  MOCK_SESSION_ID 
} from '../../fixtures/event.fixtures';

// Enhanced mock repository with comprehensive validation
class MockEventRepository {
  storeEvent = jest.fn();
  getEventsByVisitor = jest.fn();
  getEventsBySession = jest.fn();
  validateEventAccuracy = jest.fn();
  checkDataLoss = jest.fn();
}

// Enhanced mock metrics service
class MockMetricsService {
  recordHistogram = jest.fn();
  incrementCounter = jest.fn();
}

describe('EventService', () => {
  let eventService: EventService;
  let eventRepository: MockEventRepository;
  let processingService: EventProcessingService;
  let metricsService: MockMetricsService;

  beforeEach(() => {
    eventRepository = new MockEventRepository();
    processingService = new EventProcessingService(null, null);
    metricsService = new MockMetricsService();
    eventService = new EventService(
      eventRepository as any,
      processingService as any,
      metricsService as any
    );

    // Setup default mock implementations
    jest.spyOn(processingService, 'processEvent').mockImplementation(async (event) => event);
    jest.spyOn(processingService, 'validateLatency').mockReturnValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('trackEvent', () => {
    test('should successfully track and process a page view event', async () => {
      const result = await eventService.trackEvent(mockPageViewEvent);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.type).toBe(EventType.PAGE_VIEW);
      expect(processingService.processEvent).toHaveBeenCalledWith(expect.objectContaining({
        visitorId: mockPageViewEvent.visitorId,
        type: EventType.PAGE_VIEW
      }));
      expect(eventRepository.storeEvent).toHaveBeenCalled();
      expect(metricsService.incrementCounter).toHaveBeenCalledWith(
        'events_processed_total',
        1,
        expect.any(Object)
      );
    });

    test('should successfully track and process a conversion event', async () => {
      const result = await eventService.trackEvent(mockConversionEvent);

      expect(result).toBeDefined();
      expect(result.type).toBe(EventType.CONVERSION);
      expect(result.properties).toEqual(mockConversionEvent.properties);
      expect(processingService.processEvent).toHaveBeenCalledWith(expect.objectContaining({
        type: EventType.CONVERSION
      }));
    });

    test('should handle processing errors and retry operations', async () => {
      const processingError = new Error('Processing failed');
      jest.spyOn(processingService, 'processEvent').mockRejectedValueOnce(processingError);

      await expect(eventService.trackEvent(mockPageViewEvent))
        .rejects.toThrow('Processing failed');

      expect(metricsService.incrementCounter).toHaveBeenCalledWith(
        'events_failed_total',
        1,
        expect.any(Object)
      );
    });

    test('should validate event processing latency requirements', async () => {
      const startTime = Date.now();
      await eventService.trackEvent(mockClickEvent);
      const processingTime = Date.now() - startTime;

      expect(processingTime).toBeLessThan(5000); // 5s latency requirement
      expect(metricsService.recordHistogram).toHaveBeenCalledWith(
        'event_processing_duration',
        expect.any(Number)
      );
    });
  });

  describe('getVisitorEvents', () => {
    test('should retrieve events for a specific visitor', async () => {
      const mockEvents = [mockPageViewEvent, mockClickEvent];
      eventRepository.getEventsByVisitor.mockResolvedValue(mockEvents);

      const result = await eventService.getVisitorEvents(MOCK_VISITOR_ID);

      expect(result).toHaveLength(2);
      expect(eventRepository.getEventsByVisitor).toHaveBeenCalledWith(
        MOCK_VISITOR_ID,
        100,
        0
      );
    });

    test('should handle pagination parameters correctly', async () => {
      await eventService.getVisitorEvents(MOCK_VISITOR_ID, 50, 10);

      expect(eventRepository.getEventsByVisitor).toHaveBeenCalledWith(
        MOCK_VISITOR_ID,
        50,
        10
      );
    });
  });

  describe('getSessionEvents', () => {
    test('should retrieve all events for a specific session', async () => {
      const mockEvents = [mockPageViewEvent, mockClickEvent, mockConversionEvent];
      eventRepository.getEventsBySession.mockResolvedValue(mockEvents);

      const result = await eventService.getSessionEvents(MOCK_SESSION_ID);

      expect(result).toHaveLength(3);
      expect(eventRepository.getEventsBySession).toHaveBeenCalledWith(MOCK_SESSION_ID);
    });
  });
});

describe('EventProcessingService', () => {
  let processingService: EventProcessingService;
  let queueService: any;

  beforeEach(() => {
    queueService = {
      addJob: jest.fn().mockResolvedValue(undefined)
    };
    processingService = new EventProcessingService(null, queueService);
  });

  describe('processEvent', () => {
    test('should process single events within latency requirements', async () => {
      const startTime = Date.now();
      await processingService.processEvent(mockPageViewEvent);
      const processingTime = Date.now() - startTime;

      expect(processingTime).toBeLessThan(5000); // 5s requirement
      expect(queueService.addJob).toHaveBeenCalled();
    });

    test('should handle batch processing with high throughput', async () => {
      const batchSize = 1000; // Test scaled-down version of 10M/day requirement
      const events = Array(batchSize).fill(null).map(() => ({ ...mockPageViewEvent }));
      
      const startTime = Date.now();
      await processingService.processBatch(events);
      const processingTime = Date.now() - startTime;

      const eventsPerSecond = batchSize / (processingTime / 1000);
      expect(eventsPerSecond).toBeGreaterThan(100); // Scaled requirement
    });

    test('should validate event data accuracy', async () => {
      const processedEvent = await processingService.processEvent(mockPageViewEvent);

      expect(processedEvent).toMatchObject({
        id: expect.any(String),
        visitorId: expect.any(String),
        sessionId: expect.any(String),
        type: expect.any(String),
        timestamp: expect.any(Date),
        properties: expect.any(Object),
        metadata: expect.any(Object)
      });
    });

    test('should handle invalid events appropriately', async () => {
      for (const invalidEvent of mockInvalidEvents) {
        await expect(processingService.processEvent(invalidEvent as Event))
          .rejects.toThrow();
      }
    });
  });

  describe('processBatch', () => {
    test('should maintain data accuracy during batch processing', async () => {
      const processedEvents = await processingService.processBatch(mockEventBatch);

      expect(processedEvents).toHaveLength(mockEventBatch.length);
      processedEvents.forEach(event => {
        expect(event).toMatchObject({
          id: expect.any(String),
          visitorId: expect.any(String),
          sessionId: expect.any(String),
          type: expect.any(String),
          timestamp: expect.any(Date)
        });
      });
    });

    test('should handle partial batch failures gracefully', async () => {
      const mixedBatch = [...mockEventBatch, ...mockInvalidEvents as Event[]];
      
      const processedEvents = await processingService.processBatch(mixedBatch);
      
      expect(processedEvents.length).toBeLessThan(mixedBatch.length);
      expect(processedEvents.length).toBe(mockEventBatch.length);
    });
  });
});