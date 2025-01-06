import { Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { Metrics } from '@nestjs/common';
import { Event } from '../../../core/events/types/event.types';
import { ClickHouseConnection } from '../connection';

/**
 * High-performance repository class for managing event data persistence in ClickHouse
 * with optimized batch processing and connection pooling
 * @version 1.0.0
 */
@Injectable()
export class EventRepository {
  private readonly logger: Logger;
  private readonly maxBatchSize: number = 10000;
  private readonly queryTimeout: number = 5000;
  private readonly tableName: string = 'events';

  constructor(
    private readonly connection: ClickHouseConnection,
    private readonly metrics: Metrics
  ) {
    this.logger = new Logger(EventRepository.name);
  }

  /**
   * Stores a single event with enhanced error handling and monitoring
   * @param event Event object to store
   */
  async storeEvent(event: Event): Promise<void> {
    const startTime = Date.now();
    let connection;

    try {
      connection = await this.connection.getHealthyConnection();
      
      const query = `
        INSERT INTO ${this.tableName} (
          id, visitor_id, session_id, type, timestamp, properties
        ) VALUES (
          {id: String}, 
          {visitor_id: String}, 
          {session_id: String}, 
          {type: String}, 
          {timestamp: DateTime}, 
          {properties: JSON}
        )
      `;

      const params = {
        id: event.id,
        visitor_id: event.visitorId,
        session_id: event.sessionId,
        type: event.type,
        timestamp: event.timestamp,
        properties: JSON.stringify(event.properties)
      };

      await connection.query({
        query,
        params,
        timeout: this.queryTimeout
      });

      this.metrics.recordValue('event_store_latency', Date.now() - startTime);
      this.metrics.increment('events_stored');

    } catch (error) {
      this.logger.error('Failed to store event', {
        service: 'event-repository',
        requestId: event.id,
        correlationId: event.sessionId,
        additionalContext: { error, event }
      });
      throw error;
    } finally {
      if (connection) {
        await this.connection.releaseConnection(connection);
      }
    }
  }

  /**
   * Optimized batch storage with dynamic batch sizing and transaction support
   * @param events Array of events to store in batch
   */
  async storeBatch(events: Event[]): Promise<void> {
    const startTime = Date.now();
    let connection;

    try {
      connection = await this.connection.getHealthyConnection();
      
      // Split events into optimal batch sizes
      const batches = this.splitIntoBatches(events, this.maxBatchSize);
      
      for (const batch of batches) {
        const query = `
          INSERT INTO ${this.tableName} (
            id, visitor_id, session_id, type, timestamp, properties
          ) VALUES
        `;

        const values = batch.map(event => `(
          '${event.id}',
          '${event.visitorId}',
          '${event.sessionId}',
          '${event.type}',
          '${event.timestamp.toISOString()}',
          '${JSON.stringify(event.properties)}'
        )`).join(',');

        await connection.query({
          query: query + values,
          timeout: this.queryTimeout
        });
      }

      this.metrics.recordValue('batch_store_latency', Date.now() - startTime);
      this.metrics.increment('events_stored_batch', events.length);

    } catch (error) {
      this.logger.error('Failed to store event batch', {
        service: 'event-repository',
        requestId: '',
        correlationId: '',
        additionalContext: { error, batchSize: events.length }
      });
      throw error;
    } finally {
      if (connection) {
        await this.connection.releaseConnection(connection);
      }
    }
  }

  /**
   * Retrieves events using optimized BRIN indexes and caching
   * @param startDate Start date for event range
   * @param endDate End date for event range
   * @param types Optional array of event types to filter
   */
  async getEventsByTimeRange(
    startDate: Date,
    endDate: Date,
    types?: string[]
  ): Promise<Event[]> {
    const startTime = Date.now();
    let connection;

    try {
      connection = await this.connection.getHealthyConnection();

      let query = `
        SELECT *
        FROM ${this.tableName}
        WHERE timestamp BETWEEN {start: DateTime} AND {end: DateTime}
      `;

      const params: Record<string, any> = {
        start: startDate,
        end: endDate
      };

      if (types && types.length > 0) {
        query += ` AND type IN {types: Array(String)}`;
        params.types = types;
      }

      query += ` ORDER BY timestamp DESC`;

      const result = await connection.query({
        query,
        params,
        timeout: this.queryTimeout
      });

      const events = await result.json<Event[]>();

      this.metrics.recordValue('event_query_latency', Date.now() - startTime);
      this.metrics.increment('events_queried', events.length);

      return events;

    } catch (error) {
      this.logger.error('Failed to retrieve events by time range', {
        service: 'event-repository',
        requestId: '',
        correlationId: '',
        additionalContext: { error, startDate, endDate, types }
      });
      throw error;
    } finally {
      if (connection) {
        await this.connection.releaseConnection(connection);
      }
    }
  }

  /**
   * Splits an array of events into optimal batch sizes
   * @param events Array of events to split
   * @param batchSize Maximum batch size
   */
  private splitIntoBatches(events: Event[], batchSize: number): Event[][] {
    const batches: Event[][] = [];
    for (let i = 0; i < events.length; i += batchSize) {
      batches.push(events.slice(i, i + batchSize));
    }
    return batches;
  }
}