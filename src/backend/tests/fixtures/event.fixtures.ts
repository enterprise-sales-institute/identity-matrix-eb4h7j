/**
 * Test fixtures for event tracking system
 * Provides mock event data for unit and integration testing with various scenarios
 * @version 1.0.0
 */

import { Event, EventType, EventMetadata } from '../../src/core/events/types/event.types';

// Constants for consistent test data
export const MOCK_VISITOR_ID = 'test-visitor-123';
export const MOCK_SESSION_ID = 'test-session-456';
export const MOCK_TIMESTAMP = new Date('2023-01-01T00:00:00Z');

// Standard metadata for test events
export const MOCK_METADATA: EventMetadata = {
  source: 'test-suite',
  version: '1.0.0',
  environment: 'test',
  tags: {
    browser: 'Chrome',
    version: '100.0.0',
    platform: 'Windows',
    screenResolution: '1920x1080'
  }
};

/**
 * Helper function to create mock events with consistent defaults
 */
const createMockEvent = (overrides: Partial<Event> = {}, includeMetadata = true): Event => ({
  id: 'test-event-' + Math.random().toString(36).substr(2, 9),
  visitorId: MOCK_VISITOR_ID,
  sessionId: MOCK_SESSION_ID,
  type: EventType.PAGE_VIEW,
  timestamp: MOCK_TIMESTAMP,
  properties: {},
  metadata: includeMetadata ? MOCK_METADATA : { source: '', version: '', environment: '', tags: {} },
  ...overrides
});

// Mock Page View Event
export const mockPageViewEvent: Event = createMockEvent({
  type: EventType.PAGE_VIEW,
  properties: {
    url: 'https://example.com/landing',
    referrer: 'https://google.com',
    title: 'Landing Page',
    loadTime: 1200
  }
});

// Mock Click Event
export const mockClickEvent: Event = createMockEvent({
  type: EventType.CLICK,
  properties: {
    elementId: 'cta-button',
    elementText: 'Sign Up Now',
    position: { x: 150, y: 300 },
    targetUrl: 'https://example.com/signup'
  }
});

// Mock Conversion Event
export const mockConversionEvent: Event = createMockEvent({
  type: EventType.CONVERSION,
  properties: {
    conversionType: 'purchase',
    orderId: 'ORDER-123',
    revenue: 99.99,
    currency: 'USD',
    products: [
      {
        id: 'PROD-1',
        name: 'Premium Plan',
        price: 99.99,
        quantity: 1
      }
    ]
  }
});

// Mock Custom Event
export const mockCustomEvent: Event = createMockEvent({
  type: EventType.CUSTOM,
  properties: {
    eventName: 'user_preference_update',
    category: 'settings',
    action: 'theme_change',
    value: 'dark_mode'
  }
});

// Mock Event Batch for testing batch processing
export const mockEventBatch: Event[] = [
  mockPageViewEvent,
  mockClickEvent,
  mockConversionEvent,
  mockCustomEvent
];

// Mock Invalid Events for negative testing
export const mockInvalidEvents: Partial<Event>[] = [
  {
    // Missing required fields
    id: 'invalid-1',
    type: EventType.PAGE_VIEW
  },
  {
    // Invalid event type
    id: 'invalid-2',
    visitorId: MOCK_VISITOR_ID,
    sessionId: MOCK_SESSION_ID,
    type: 'INVALID_TYPE' as EventType,
    timestamp: MOCK_TIMESTAMP,
    properties: {},
    metadata: MOCK_METADATA
  },
  {
    // Invalid timestamp
    id: 'invalid-3',
    visitorId: MOCK_VISITOR_ID,
    sessionId: MOCK_SESSION_ID,
    type: EventType.PAGE_VIEW,
    timestamp: 'invalid-date' as unknown as Date,
    properties: {},
    metadata: MOCK_METADATA
  }
];

/**
 * Helper function to create a batch of mock events
 */
export const createMockEventBatch = (count: number, template: Partial<Event> = {}): Event[] => {
  return Array.from({ length: count }, () => createMockEvent(template));
};

// Export additional test scenarios
export const mockEventsWithCustomMetadata = createMockEventBatch(3, {
  metadata: {
    ...MOCK_METADATA,
    tags: {
      ...MOCK_METADATA.tags,
      testCase: 'custom-metadata',
      customAttribute: 'test-value'
    }
  }
});

export const mockEventsWithoutMetadata = createMockEventBatch(3, {}, false);

export const mockLongSessionEvents = createMockEventBatch(5, {
  sessionId: 'long-session-789',
  properties: {
    sessionDuration: 3600,
    interactionCount: 25
  }
});