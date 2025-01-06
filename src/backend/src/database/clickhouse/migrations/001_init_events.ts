import { ClickHouse } from '@clickhouse/client'; // v0.2.0
import { getConnection } from '../connection';
import { EventType } from '../../../core/events/types/event.types';

/**
 * Creates the events table schema with optimized settings for analytics
 */
export async function up(): Promise<void> {
  const client = await getConnection();

  try {
    // Create events table with optimized schema
    await client.query({
      query: `
        CREATE TABLE IF NOT EXISTS events (
          id UUID DEFAULT generateUUIDv4(),
          visitor_id String CODEC(ZSTD(3)),
          session_id String CODEC(ZSTD(3)),
          type Enum8(
            'PAGE_VIEW' = 1,
            'CLICK' = 2, 
            'CONVERSION' = 3,
            'CUSTOM' = 4,
            'FORM_SUBMIT' = 5,
            'SCROLL' = 6,
            'ENGAGEMENT' = 7
          ),
          timestamp DateTime64(3) DEFAULT now64(3),
          properties JSON CODEC(ZSTD(3)),
          metadata Nested(
            source String,
            version String,
            environment String,
            tags Map(String, String)
          ),
          created_date Date DEFAULT toDate(timestamp),
          _partition_key UInt32 DEFAULT toYYYYMM(timestamp)
        )
        ENGINE = MergeTree()
        PARTITION BY _partition_key
        ORDER BY (created_date, visitor_id, type)
        TTL timestamp + INTERVAL 90 DAY
        SETTINGS 
          index_granularity = 8192,
          storage_policy = 'hot_to_cold',
          merge_with_ttl_timeout = 3600,
          min_bytes_for_wide_part = 10485760,
          min_rows_for_wide_part = 100000
      `
    });

    // Create materialized view for real-time analytics
    await client.query({
      query: `
        CREATE MATERIALIZED VIEW IF NOT EXISTS events_daily_mv
        ENGINE = SummingMergeTree()
        PARTITION BY toYYYYMM(date)
        ORDER BY (date, type)
        POPULATE
        AS SELECT
          toDate(timestamp) as date,
          type,
          count() as event_count,
          uniqExact(visitor_id) as unique_visitors,
          uniqExact(session_id) as unique_sessions
        FROM events
        GROUP BY date, type
      `
    });

    // Create materialized view for conversion tracking
    await client.query({
      query: `
        CREATE MATERIALIZED VIEW IF NOT EXISTS conversion_tracking_mv
        ENGINE = AggregatingMergeTree()
        PARTITION BY toYYYYMM(date)
        ORDER BY (date, visitor_id)
        POPULATE
        AS SELECT
          toDate(timestamp) as date,
          visitor_id,
          groupArray(type) as event_sequence,
          max(if(type = 'CONVERSION', 1, 0)) as converted,
          count() as touchpoints
        FROM events
        GROUP BY date, visitor_id
      `
    });

    // Create composite indices for query optimization
    await client.query({
      query: `
        ALTER TABLE events
        ADD INDEX idx_visitor_session (visitor_id, session_id) TYPE minmax GRANULARITY 4,
        ADD INDEX idx_properties properties TYPE bloom_filter(0.01) GRANULARITY 1,
        ADD INDEX idx_timestamp (timestamp) TYPE minmax GRANULARITY 1
      `
    });

    // Create projection for common query patterns
    await client.query({
      query: `
        ALTER TABLE events
        ADD PROJECTION events_by_type (
          SELECT *
          ORDER BY (type, timestamp)
        )
      `
    });

  } catch (error) {
    console.error('Failed to create events schema:', error);
    throw error;
  }
}

/**
 * Removes the events table and related objects
 */
export async function down(): Promise<void> {
  const client = await getConnection();

  try {
    // Drop materialized views first
    await client.query({
      query: `DROP VIEW IF EXISTS events_daily_mv`
    });

    await client.query({
      query: `DROP VIEW IF EXISTS conversion_tracking_mv`
    });

    // Drop projections
    await client.query({
      query: `ALTER TABLE events DROP PROJECTION IF EXISTS events_by_type`
    });

    // Drop main events table
    await client.query({
      query: `DROP TABLE IF EXISTS events`
    });

  } catch (error) {
    console.error('Failed to drop events schema:', error);
    throw error;
  }
}