/**
 * @fileoverview Enhanced event collector implementation with security, compression, and performance features
 * @version 1.0.0
 */

// External imports
import axios, { AxiosError } from 'axios'; // v1.4.0
import pako from 'pako'; // v2.1.0
import CryptoJS from 'crypto-js'; // v4.1.1

// Internal imports
import { 
  TrackingEvent, 
  TrackingEventType,
  EventProperties,
  EventMetadata,
  TrackingStatus,
  BatchPayload,
  BatchMetadata 
} from './types';
import { TRACKING_CONFIG, STORAGE_CONFIG } from './config';

/**
 * Interface for collector performance metrics
 */
interface CollectorMetrics {
  eventsProcessed: number;
  eventsSent: number;
  failedAttempts: number;
  averageProcessingTime: number;
  compressionRatio: number;
  lastFlushTime: number;
}

/**
 * Enhanced EventCollector class with security and performance features
 */
export class EventCollector {
  private eventQueue: TrackingEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private isSending: boolean = false;
  private metrics: CollectorMetrics;
  private readonly encryptionKey: string;
  private readonly visitorId: string;
  private readonly sessionId: string;

  constructor() {
    this.initializeCollector();
    this.metrics = this.initializeMetrics();
    this.encryptionKey = TRACKING_CONFIG.security.encryptionKey;
    this.visitorId = this.generateOrRetrieveVisitorId();
    this.sessionId = this.generateSessionId();
    this.startFlushTimer();
  }

  /**
   * Tracks a new event with validation and encryption
   */
  public async track(type: TrackingEventType, properties: EventProperties): Promise<void> {
    try {
      this.validateEventData(type, properties);

      const event: TrackingEvent = {
        id: this.generateEventId(),
        visitorId: this.visitorId,
        sessionId: this.sessionId,
        type,
        properties: this.sanitizeProperties(properties),
        metadata: this.generateEventMetadata(),
        status: TrackingStatus.QUEUED,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      if (TRACKING_CONFIG.security.encryptionEnabled) {
        event.properties = this.encryptSensitiveData(event.properties);
      }

      this.eventQueue.push(event);
      this.updateMetrics('eventsProcessed');

      if (this.eventQueue.length >= TRACKING_CONFIG.batchSize) {
        await this.flush();
      }

      this.persistQueueToStorage();
    } catch (error) {
      this.handleError('Track Error', error);
    }
  }

  /**
   * Flushes queued events with retry logic and compression
   */
  public async flush(): Promise<void> {
    if (this.isSending || this.eventQueue.length === 0) return;

    try {
      this.isSending = true;
      const events = [...this.eventQueue];
      const batchMetadata = this.createBatchMetadata(events);
      
      let payload: BatchPayload = { events, metadata: batchMetadata };
      
      if (events.length >= STORAGE_CONFIG.compression.threshold) {
        payload = this.compressPayload(payload);
      }

      await this.sendBatchWithRetry(payload);
      
      this.eventQueue = this.eventQueue.slice(events.length);
      this.updateMetrics('eventsSent', events.length);
      this.persistQueueToStorage();
    } catch (error) {
      this.handleError('Flush Error', error);
      this.updateMetrics('failedAttempts');
    } finally {
      this.isSending = false;
    }
  }

  /**
   * Returns current collector metrics
   */
  public getMetrics(): CollectorMetrics {
    return { ...this.metrics };
  }

  /**
   * Initializes the collector with storage and configuration
   */
  private initializeCollector(): void {
    this.loadQueueFromStorage();
    window.addEventListener('beforeunload', () => {
      if (this.eventQueue.length > 0) {
        this.persistQueueToStorage();
      }
    });
  }

  /**
   * Initializes performance metrics
   */
  private initializeMetrics(): CollectorMetrics {
    return {
      eventsProcessed: 0,
      eventsSent: 0,
      failedAttempts: 0,
      averageProcessingTime: 0,
      compressionRatio: 0,
      lastFlushTime: Date.now()
    };
  }

  /**
   * Starts the flush timer based on configuration
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(
      () => this.flush(),
      TRACKING_CONFIG.flushInterval
    );
  }

  /**
   * Sends batch with retry logic
   */
  private async sendBatchWithRetry(payload: BatchPayload, attempt: number = 1): Promise<void> {
    try {
      const response = await axios.post(
        TRACKING_CONFIG.endpoint,
        payload,
        {
          headers: {
            ...TRACKING_CONFIG.security.headers,
            'Content-Type': payload.metadata.compressed ? 'application/octet-stream' : 'application/json'
          },
          timeout: TRACKING_CONFIG.retryConfig.delay
        }
      );

      if (!response.data.success) {
        throw new Error('API Error: Batch processing failed');
      }
    } catch (error) {
      if (
        attempt < TRACKING_CONFIG.retryConfig.maxRetries &&
        this.isRetryableError(error as AxiosError)
      ) {
        const delay = this.calculateRetryDelay(attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.sendBatchWithRetry(payload, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Compresses payload for efficient transmission
   */
  private compressPayload(payload: BatchPayload): BatchPayload {
    const compressed = pako.deflate(JSON.stringify(payload.events));
    return {
      events: compressed as any,
      metadata: {
        ...payload.metadata,
        compressed: true,
        originalSize: JSON.stringify(payload.events).length,
        compressedSize: compressed.length
      }
    };
  }

  /**
   * Encrypts sensitive data fields
   */
  private encryptSensitiveData(data: EventProperties): EventProperties {
    const sensitiveFields = ['email', 'phone', 'userId'];
    const encrypted = { ...data };

    for (const field of sensitiveFields) {
      if (field in encrypted && typeof encrypted[field] === 'string') {
        encrypted[field] = CryptoJS.AES.encrypt(
          encrypted[field] as string,
          this.encryptionKey,
          STORAGE_CONFIG.encryption.encryptionOptions
        ).toString();
      }
    }

    return encrypted;
  }

  /**
   * Validates event data against configuration rules
   */
  private validateEventData(type: TrackingEventType, properties: EventProperties): void {
    if (!TRACKING_CONFIG.validationRules.allowedEventTypes.includes(type)) {
      throw new Error(`Invalid event type: ${type}`);
    }

    if (Object.keys(properties).length > TRACKING_CONFIG.validationRules.maxCustomProperties) {
      throw new Error('Too many custom properties');
    }

    for (const [key, value] of Object.entries(properties)) {
      if (String(value).length > TRACKING_CONFIG.validationRules.maxPropertyLength) {
        throw new Error(`Property value too long: ${key}`);
      }
    }
  }

  /**
   * Generates event metadata
   */
  private generateEventMetadata(): EventMetadata {
    return {
      source: 'web',
      version: TRACKING_CONFIG.security.headers['X-Tracking-Version'],
      custom: {
        userAgent: navigator.userAgent,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    };
  }

  /**
   * Utility methods for error handling and retry logic
   */
  private isRetryableError(error: AxiosError): boolean {
    return error.response
      ? TRACKING_CONFIG.retryConfig.retryableStatusCodes.includes(error.response.status)
      : true;
  }

  private calculateRetryDelay(attempt: number): number {
    return TRACKING_CONFIG.retryConfig.delay * Math.pow(TRACKING_CONFIG.retryConfig.backoffFactor, attempt - 1);
  }

  private handleError(context: string, error: unknown): void {
    console.error(`${context}:`, error);
    if (TRACKING_CONFIG.debug) {
      console.debug('Event Queue State:', this.eventQueue);
      console.debug('Collector Metrics:', this.metrics);
    }
  }

  /**
   * Storage management methods
   */
  private persistQueueToStorage(): void {
    try {
      const serialized = JSON.stringify(this.eventQueue);
      localStorage.setItem(STORAGE_CONFIG.eventsKey, serialized);
    } catch (error) {
      this.handleError('Storage Error', error);
    }
  }

  private loadQueueFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_CONFIG.eventsKey);
      if (stored) {
        this.eventQueue = JSON.parse(stored);
      }
    } catch (error) {
      this.handleError('Storage Load Error', error);
    }
  }

  /**
   * Identifier generation methods
   */
  private generateEventId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateOrRetrieveVisitorId(): string {
    const stored = localStorage.getItem(STORAGE_CONFIG.visitorIdKey);
    if (stored) return stored;

    const newId = CryptoJS.SHA256(Date.now().toString()).toString().substr(0, 32);
    localStorage.setItem(STORAGE_CONFIG.visitorIdKey, newId);
    return newId;
  }

  private generateSessionId(): string {
    return CryptoJS.SHA256(Date.now().toString() + Math.random()).toString().substr(0, 16);
  }

  /**
   * Updates collector metrics
   */
  private updateMetrics(metric: keyof CollectorMetrics, value: number = 1): void {
    if (metric in this.metrics) {
      (this.metrics[metric] as number) += value;
    }
  }

  /**
   * Creates batch metadata for payload
   */
  private createBatchMetadata(events: TrackingEvent[]): BatchMetadata {
    return {
      batchId: this.generateEventId(),
      timestamp: new Date(),
      eventCount: events.length,
      metrics: {
        averageSize: JSON.stringify(events).length / events.length,
        processingTime: Date.now() - this.metrics.lastFlushTime
      }
    };
  }

  /**
   * Sanitizes event properties
   */
  private sanitizeProperties(properties: EventProperties): EventProperties {
    const sanitized: EventProperties = {};
    for (const [key, value] of Object.entries(properties)) {
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  private sanitizeString(value: string): string {
    return value
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .trim();
  }
}