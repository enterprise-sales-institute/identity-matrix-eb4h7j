/**
 * Attribution Repository Implementation
 * Manages attribution data persistence and retrieval with high-performance patterns
 * @version 1.0.0
 */

import { Pool } from 'pg'; // v8.11.0
import { format } from 'sql-template-strings'; // v2.4.0
import retry from 'retry'; // v0.13.0
import winston from 'winston'; // v3.8.2
import { PostgresConnection } from '../connection';
import { DatabaseError, ErrorCode, ErrorCategory } from '../../../types/error.types';

// Constants for query optimization and performance tuning
const BATCH_SIZE = 1000;
const QUERY_TIMEOUT = 30000;
const MAX_RETRIES = 3;
const RETRY_BASE_TIMEOUT = 1000;

/**
 * Interface for attribution result data
 */
interface AttributionResult {
  attributionId: string;
  touchpointId: string;
  conversionId: string;
  weight: number;
  modelType: string;
  metadata: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Interface for pagination options
 */
interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * Interface for time range filtering
 */
interface TimeRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Interface for attribution model configuration
 */
interface AttributionModel {
  modelType: string;
  parameters: Record<string, unknown>;
}

/**
 * Repository class for managing attribution data persistence
 */
export class AttributionRepository {
  private readonly connection: PostgresConnection;
  private readonly logger: winston.Logger;
  private readonly retryConfig: retry.OperationOptions;

  /**
   * Initialize attribution repository with connection management
   */
  constructor(connection: PostgresConnection, logger: winston.Logger) {
    this.connection = connection;
    this.logger = logger;
    
    // Configure retry mechanism
    this.retryConfig = {
      retries: MAX_RETRIES,
      factor: 2,
      minTimeout: RETRY_BASE_TIMEOUT,
      maxTimeout: RETRY_BASE_TIMEOUT * 4,
      randomize: true
    };
  }

  /**
   * Save attribution results with transaction support
   */
  public async saveAttributionResult(result: AttributionResult): Promise<void> {
    const client = await this.connection.connect();
    
    try {
      await client.query('BEGIN');

      const query = format(`
        INSERT INTO attribution_results (
          attribution_id,
          touchpoint_id,
          conversion_id,
          weight,
          model_type,
          metadata,
          created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7
        )
      `);

      const values = [
        result.attributionId,
        result.touchpointId,
        result.conversionId,
        result.weight,
        result.modelType,
        result.metadata,
        result.timestamp
      ];

      await client.query(query, values);
      await client.query('COMMIT');

      this.logger.info('Attribution result saved successfully', {
        attributionId: result.attributionId,
        modelType: result.modelType
      });
    } catch (error) {
      await client.query('ROLLBACK');
      
      throw new DatabaseError(
        'Failed to save attribution result',
        {
          errorCode: ErrorCode.DATABASE_ERROR,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          category: ErrorCategory.DATA,
          timestamp: new Date(),
          traceId: '',
          serviceName: 'attribution-service',
          environment: process.env.NODE_ENV || 'development',
          additionalInfo: { result },
          stackTrace: error instanceof Error ? error.stack?.split('\n') || [] : [],
          metadata: {}
        },
        ErrorCategory.DATA
      );
    } finally {
      client.release();
    }
  }

  /**
   * Retrieve attribution results with pagination and filtering
   */
  public async getAttributionResults(
    timeRange: TimeRange,
    model: AttributionModel,
    pagination: PaginationOptions
  ): Promise<{
    results: AttributionResult[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const operation = retry.operation(this.retryConfig);

    return new Promise((resolve, reject) => {
      operation.attempt(async (currentAttempt) => {
        const client = await this.connection.connect();
        
        try {
          const offset = (pagination.page - 1) * pagination.limit;
          
          const query = format(`
            SELECT 
              ar.attribution_id,
              ar.touchpoint_id,
              ar.conversion_id,
              ar.weight,
              ar.model_type,
              ar.metadata,
              ar.created_at as timestamp
            FROM attribution_results ar
            WHERE ar.created_at BETWEEN $1 AND $2
              AND ar.model_type = $3
            ORDER BY ${pagination.sortBy || 'created_at'} ${pagination.sortOrder || 'DESC'}
            LIMIT $4 OFFSET $5
          `);

          const countQuery = format(`
            SELECT COUNT(*) as total
            FROM attribution_results ar
            WHERE ar.created_at BETWEEN $1 AND $2
              AND ar.model_type = $3
          `);

          const values = [
            timeRange.startDate,
            timeRange.endDate,
            model.modelType,
            pagination.limit,
            offset
          ];

          const [results, count] = await Promise.all([
            client.query(query, values),
            client.query(countQuery, [timeRange.startDate, timeRange.endDate, model.modelType])
          ]);

          const total = parseInt(count.rows[0].total);
          const totalPages = Math.ceil(total / pagination.limit);

          resolve({
            results: results.rows,
            total,
            page: pagination.page,
            totalPages
          });

        } catch (error) {
          if (operation.retry(error as Error)) {
            this.logger.warn('Retrying attribution results query', {
              attempt: currentAttempt,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
            return;
          }

          reject(new DatabaseError(
            'Failed to retrieve attribution results',
            {
              errorCode: ErrorCode.DATABASE_ERROR,
              errorMessage: error instanceof Error ? error.message : 'Unknown error',
              category: ErrorCategory.DATA,
              timestamp: new Date(),
              traceId: '',
              serviceName: 'attribution-service',
              environment: process.env.NODE_ENV || 'development',
              additionalInfo: { timeRange, model, pagination },
              stackTrace: error instanceof Error ? error.stack?.split('\n') || [] : [],
              metadata: {}
            },
            ErrorCategory.DATA
          ));
        } finally {
          client.release();
        }
      });
    });
  }

  /**
   * Batch update attribution weights with optimistic locking
   */
  public async updateAttributionWeights(
    updates: Array<{ attributionId: string; weight: number }>
  ): Promise<void> {
    const client = await this.connection.connect();
    
    try {
      await client.query('BEGIN');

      for (let i = 0; i < updates.length; i += BATCH_SIZE) {
        const batch = updates.slice(i, i + BATCH_SIZE);
        
        const query = format(`
          UPDATE attribution_results
          SET 
            weight = tmp.weight,
            updated_at = NOW(),
            version = version + 1
          FROM (
            SELECT unnest($1::uuid[]) as attribution_id,
                   unnest($2::decimal[]) as weight
          ) tmp
          WHERE attribution_results.attribution_id = tmp.attribution_id
          AND NOT EXISTS (
            SELECT 1
            FROM attribution_results ar2
            WHERE ar2.attribution_id = attribution_results.attribution_id
            AND ar2.version > attribution_results.version
          )
        `);

        const attributionIds = batch.map(u => u.attributionId);
        const weights = batch.map(u => u.weight);

        await client.query(query, [attributionIds, weights]);
      }

      await client.query('COMMIT');

    } catch (error) {
      await client.query('ROLLBACK');
      
      throw new DatabaseError(
        'Failed to update attribution weights',
        {
          errorCode: ErrorCode.DATABASE_ERROR,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          category: ErrorCategory.DATA,
          timestamp: new Date(),
          traceId: '',
          serviceName: 'attribution-service',
          environment: process.env.NODE_ENV || 'development',
          additionalInfo: { updateCount: updates.length },
          stackTrace: error instanceof Error ? error.stack?.split('\n') || [] : [],
          metadata: {}
        },
        ErrorCategory.DATA
      );
    } finally {
      client.release();
    }
  }
}