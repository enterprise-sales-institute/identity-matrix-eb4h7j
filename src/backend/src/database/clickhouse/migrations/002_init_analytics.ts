import { ClickHouse } from '@clickhouse/client'; // v0.2.0
import { getConnection } from '../connection';
import { AnalyticsMetric } from '../../../core/analytics/types/analytics.types';

/**
 * Creates analytics tables, materialized views and indices with enhanced error handling and validation
 */
export async function up(): Promise<void> {
  const client = await getConnection();

  try {
    // Create metrics table with optimized settings and partitioning
    await client.query({
      query: `
        CREATE TABLE IF NOT EXISTS metrics (
          id UUID DEFAULT generateUUIDv4(),
          metric_type Enum8(
            '${AnalyticsMetric.CONVERSION_RATE}' = 1,
            '${AnalyticsMetric.REVENUE}' = 2,
            '${AnalyticsMetric.TOUCHPOINTS}' = 3,
            '${AnalyticsMetric.ATTRIBUTION_WEIGHT}' = 4
          ),
          value Float64,
          channel_id String,
          timestamp DateTime64(3) DEFAULT now64(3),
          created_date Date DEFAULT toDate(timestamp),
          visitor_id String,
          session_id String,
          campaign_id String,
          source String,
          metadata JSON
        )
        ENGINE = MergeTree()
        PARTITION BY toYYYYMM(timestamp)
        ORDER BY (created_date, channel_id, metric_type)
        TTL timestamp + INTERVAL 365 DAY TO VOLUME 'cold'
        SETTINGS 
          index_granularity = 8192,
          storage_policy = 'hot_to_cold'
      `
    });

    // Create dimensions table for efficient analytics querying
    await client.query({
      query: `
        CREATE TABLE IF NOT EXISTS dimensions (
          id UUID DEFAULT generateUUIDv4(),
          dimension_type Enum8(
            'CHANNEL' = 1,
            'CAMPAIGN' = 2,
            'TIME' = 3,
            'SOURCE' = 4
          ),
          dimension_key String,
          dimension_value String,
          parent_dimension_id UUID,
          metadata JSON,
          created_at DateTime64(3) DEFAULT now64(3)
        )
        ENGINE = MergeTree()
        ORDER BY (dimension_type, dimension_key)
        SETTINGS index_granularity = 8192
      `
    });

    // Create attribution results table with performance optimization
    await client.query({
      query: `
        CREATE TABLE IF NOT EXISTS attribution_results (
          id UUID DEFAULT generateUUIDv4(),
          conversion_id UUID,
          touchpoint_id UUID,
          channel_id String,
          attribution_model String,
          weight Float64,
          revenue Float64,
          timestamp DateTime64(3) DEFAULT now64(3),
          created_date Date DEFAULT toDate(timestamp),
          metadata JSON
        )
        ENGINE = MergeTree()
        PARTITION BY toYYYYMM(timestamp)
        ORDER BY (created_date, channel_id, attribution_model)
        TTL timestamp + INTERVAL 365 DAY TO VOLUME 'cold'
        SETTINGS 
          index_granularity = 8192,
          storage_policy = 'hot_to_cold'
      `
    });

    // Create materialized view for real-time channel performance
    await client.query({
      query: `
        CREATE MATERIALIZED VIEW IF NOT EXISTS channel_performance_mv
        ENGINE = SummingMergeTree()
        PARTITION BY toYYYYMM(timestamp)
        ORDER BY (channel_id, metric_type)
        POPULATE
        AS SELECT
          channel_id,
          metric_type,
          sum(value) as total_value,
          count() as event_count,
          min(timestamp) as first_seen,
          max(timestamp) as last_seen
        FROM metrics
        GROUP BY channel_id, metric_type
      `
    });

    // Create materialized view for attribution analysis
    await client.query({
      query: `
        CREATE MATERIALIZED VIEW IF NOT EXISTS attribution_analysis_mv
        ENGINE = SummingMergeTree()
        PARTITION BY toYYYYMM(timestamp)
        ORDER BY (channel_id, attribution_model)
        POPULATE
        AS SELECT
          channel_id,
          attribution_model,
          sum(weight) as total_weight,
          sum(revenue) as total_revenue,
          count() as conversion_count,
          min(timestamp) as first_conversion,
          max(timestamp) as last_conversion
        FROM attribution_results
        GROUP BY channel_id, attribution_model
      `
    });

    // Create indices for performance optimization
    await client.query({
      query: `
        ALTER TABLE metrics
        ADD INDEX metrics_channel_idx channel_id TYPE minmax,
        ADD INDEX metrics_timestamp_idx timestamp TYPE minmax,
        ADD INDEX metrics_value_idx value TYPE minmax
      `
    });

    await client.query({
      query: `
        ALTER TABLE attribution_results
        ADD INDEX attribution_channel_idx channel_id TYPE minmax,
        ADD INDEX attribution_weight_idx weight TYPE minmax,
        ADD INDEX attribution_revenue_idx revenue TYPE minmax
      `
    });

  } catch (error) {
    throw new Error(`Failed to create analytics tables: ${error.message}`);
  }
}

/**
 * Removes analytics tables and related objects with enhanced rollback capabilities
 */
export async function down(): Promise<void> {
  const client = await getConnection();

  try {
    // Drop materialized views first to remove dependencies
    await client.query({
      query: `DROP VIEW IF EXISTS channel_performance_mv`
    });

    await client.query({
      query: `DROP VIEW IF EXISTS attribution_analysis_mv`
    });

    // Drop main tables
    await client.query({
      query: `DROP TABLE IF EXISTS metrics`
    });

    await client.query({
      query: `DROP TABLE IF EXISTS dimensions`
    });

    await client.query({
      query: `DROP TABLE IF EXISTS attribution_results`
    });

  } catch (error) {
    throw new Error(`Failed to drop analytics tables: ${error.message}`);
  }
}