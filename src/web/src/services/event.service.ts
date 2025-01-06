/**
 * @fileoverview Service class for managing event tracking with enhanced reliability and performance
 * @version 1.0.0
 */

// External imports
import { Observable, from, throwError } from 'rxjs'; // v7.8.0
import { retry, debounceTime, catchError } from 'rxjs/operators'; // v7.8.0

// Internal imports
import { Event, EventType } from '../types/event.types';
import { ApiService } from './api.service';
import { EventCollector } from '../tracking/collector';
import { API_CONFIG } from '../config/api.config';
import { TRACKING_CONFIG, STORAGE_CONFIG } from '../tracking/config';

/**
 * Configuration interface for EventService
 */
interface EventServiceConfig {
  batchSize: number;
  flushInterval: number;
  endpoint: string;
  retryAttempts: number;
  retryDelay: number;
  enableOfflineSupport: boolean;
  maxOfflineEvents: number;
}

/**
 * Service class for managing event tracking with comprehensive features
 */
export class EventService {
  private readonly apiService: ApiService;
  private readonly eventCollector: EventCollector;
  private readonly config: EventServiceConfig;
  private isOnline: boolean = navigator.onLine;

  /**
   * Creates an instance of EventService with enhanced configuration
   */
  constructor(
    apiService: ApiService,
    config: Partial<EventServiceConfig> = {}
  ) {
    this.apiService = apiService;
    this.config = {
      batchSize: config.batchSize || TRACKING_CONFIG.batchSize,
      flushInterval: config.flushInterval || TRACKING_CONFIG.flushInterval,
      endpoint: config.endpoint || API_CONFIG.ENDPOINTS.EVENTS.TRACK.path,
      retryAttempts: config.retryAttempts || TRACKING_CONFIG.retryConfig.maxRetries,
      retryDelay: config.retryDelay || TRACKING_CONFIG.retryConfig.delay,
      enableOfflineSupport: config.enableOfflineSupport ?? true,
      maxOfflineEvents: config.maxOfflineEvents || 1000
    };

    this.eventCollector = new EventCollector();
    this.initializeNetworkListeners();
  }

  /**
   * Tracks a new event with comprehensive error handling and offline support
   */
  public async trackEvent(event: Event): Promise<void> {
    try {
      // Validate event data
      this.validateEvent(event);

      // Add metadata and timestamps
      const enrichedEvent = this.enrichEventData(event);

      // Process event based on network status
      if (this.isOnline) {
        await this.eventCollector.track(enrichedEvent.type, enrichedEvent.properties);
      } else if (this.config.enableOfflineSupport) {
        await this.handleOfflineEvent(enrichedEvent);
      } else {
        throw new Error('Offline tracking is disabled and network is unavailable');
      }
    } catch (error) {
      console.error('Event tracking failed:', error);
      throw error;
    }
  }

  /**
   * Queries events with enhanced filtering and pagination
   */
  public async queryEvents(query: EventQuery): Promise<Event[]> {
    try {
      const response = await this.apiService.get<Event[]>(
        `${this.config.endpoint}/query`,
        {
          params: query,
          useCache: true,
          cacheTime: 300000, // 5 minutes
          retries: this.config.retryAttempts
        }
      );

      return response.data;
    } catch (error) {
      console.error('Event query failed:', error);
      throw error;
    }
  }

  /**
   * Creates a real-time event stream with automatic reconnection
   */
  public getEventStream(query: EventQuery): Observable<Event> {
    return new Observable<Event>(observer => {
      const eventSource = new EventSource(
        `${this.config.endpoint}/stream?${new URLSearchParams(query as any)}`
      );

      eventSource.onmessage = (event) => {
        observer.next(JSON.parse(event.data));
      };

      eventSource.onerror = (error) => {
        observer.error(error);
      };

      return () => {
        eventSource.close();
      };
    }).pipe(
      retry(this.config.retryAttempts),
      debounceTime(100),
      catchError(error => throwError(() => error))
    );
  }

  /**
   * Flushes offline events when connection is restored
   */
  public async flushOfflineEvents(): Promise<void> {
    if (!this.isOnline) {
      throw new Error('Cannot flush events while offline');
    }

    try {
      await this.eventCollector.flush();
    } catch (error) {
      console.error('Failed to flush offline events:', error);
      throw error;
    }
  }

  /**
   * Initializes network status listeners
   */
  private initializeNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flushOfflineEvents().catch(console.error);
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  /**
   * Validates event data against schema
   */
  private validateEvent(event: Event): void {
    if (!event.type || !Object.values(EventType).includes(event.type)) {
      throw new Error(`Invalid event type: ${event.type}`);
    }

    if (!event.visitorId || !event.sessionId) {
      throw new Error('Missing required visitor or session ID');
    }

    if (Object.keys(event.properties || {}).length > TRACKING_CONFIG.validationRules.maxCustomProperties) {
      throw new Error('Too many custom properties');
    }
  }

  /**
   * Enriches event data with metadata
   */
  private enrichEventData(event: Event): Event {
    return {
      ...event,
      timestamp: Date.now(),
      metadata: {
        ...event.metadata,
        userAgent: navigator.userAgent,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        networkStatus: this.isOnline ? 'online' : 'offline'
      }
    };
  }

  /**
   * Handles events during offline mode
   */
  private async handleOfflineEvent(event: Event): Promise<void> {
    const offlineEvents = JSON.parse(
      localStorage.getItem(STORAGE_CONFIG.eventsKey) || '[]'
    );

    if (offlineEvents.length >= this.config.maxOfflineEvents) {
      throw new Error('Offline event storage limit reached');
    }

    offlineEvents.push(event);
    localStorage.setItem(STORAGE_CONFIG.eventsKey, JSON.stringify(offlineEvents));
  }
}