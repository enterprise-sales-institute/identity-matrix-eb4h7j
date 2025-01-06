import { injectable, Logger } from '@nestjs/common';
import { AttributionModel, Touchpoint, AttributionResult } from '../types/attribution.types';

/**
 * Enhanced implementation of Last Touch attribution model with performance optimizations
 * and comprehensive validation for real-time processing requirements.
 * @version 1.0.0
 */
@injectable()
export class LastTouchModel {
  private readonly logger: Logger;
  private readonly processingTimeThreshold: number = 5000; // 5 second SLA threshold
  private readonly confidenceThreshold: number = 0.999; // 99.9% accuracy requirement
  private readonly modelType: AttributionModel = AttributionModel.LAST_TOUCH;

  constructor() {
    this.logger = new Logger(LastTouchModel.name);
  }

  /**
   * Calculates attribution weights using the Last Touch model with performance monitoring
   * and enhanced validation.
   * @param touchpoints Array of touchpoints in the customer journey
   * @returns Promise<AttributionResult[]> Attribution results with weights and metadata
   */
  public async calculateAttribution(touchpoints: Touchpoint[]): Promise<AttributionResult[]> {
    const startTime = Date.now();

    try {
      // Validate input touchpoints
      if (!this.validateTouchpoints(touchpoints)) {
        throw new Error('Invalid touchpoint data structure');
      }

      // Sort touchpoints by timestamp for accurate last touch identification
      const sortedTouchpoints = [...touchpoints].sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
      );

      // Get the last touchpoint (most recent)
      const lastTouchpoint = sortedTouchpoints[0];

      // Calculate confidence score based on data quality
      const confidenceScore = this.calculateConfidenceScore(lastTouchpoint);

      if (confidenceScore < this.confidenceThreshold) {
        this.logger.warn(`Confidence score ${confidenceScore} below threshold ${this.confidenceThreshold}`);
      }

      // Create attribution results
      const results: AttributionResult[] = sortedTouchpoints.map((touchpoint) => ({
        touchpointId: touchpoint.id,
        weight: touchpoint === lastTouchpoint ? 1 : 0,
        confidence: confidenceScore,
        processingTime: Date.now() - startTime,
        model: this.modelType,
        calculatedAt: new Date(),
        metadata: {
          version: '1.0.0',
          parameters: {
            modelType: this.modelType,
            touchpointCount: touchpoints.length,
            processingTimeMs: Date.now() - startTime
          },
          timestamp: new Date()
        }
      }));

      // Validate processing time against SLA
      const processingTime = Date.now() - startTime;
      if (processingTime > this.processingTimeThreshold) {
        this.logger.warn(
          `Processing time ${processingTime}ms exceeded threshold ${this.processingTimeThreshold}ms`
        );
      }

      // Log performance metrics
      this.logger.log({
        message: 'Attribution calculation completed',
        processingTime,
        touchpointCount: touchpoints.length,
        confidenceScore
      });

      return results;

    } catch (error) {
      this.logger.error('Attribution calculation failed', {
        error,
        touchpointCount: touchpoints?.length,
        processingTime: Date.now() - startTime
      });
      throw error;
    }
  }

  /**
   * Validates touchpoint data structure and quality
   * @param touchpoints Array of touchpoints to validate
   * @returns boolean Validation result
   */
  private validateTouchpoints(touchpoints: Touchpoint[]): boolean {
    try {
      // Check for empty or invalid array
      if (!Array.isArray(touchpoints) || touchpoints.length === 0) {
        this.logger.error('Invalid touchpoints array');
        return false;
      }

      // Validate each touchpoint
      for (const touchpoint of touchpoints) {
        // Required fields validation
        if (!touchpoint.id || !touchpoint.timestamp || !touchpoint.channel) {
          this.logger.error('Missing required touchpoint fields', { touchpoint });
          return false;
        }

        // Timestamp validation
        if (!(touchpoint.timestamp instanceof Date) || isNaN(touchpoint.timestamp.getTime())) {
          this.logger.error('Invalid timestamp format', { touchpoint });
          return false;
        }

        // Future timestamp check
        if (touchpoint.timestamp > new Date()) {
          this.logger.error('Future timestamp detected', { touchpoint });
          return false;
        }
      }

      // Check for duplicate touchpoints
      const uniqueIds = new Set(touchpoints.map(t => t.id));
      if (uniqueIds.size !== touchpoints.length) {
        this.logger.error('Duplicate touchpoint IDs detected');
        return false;
      }

      return true;

    } catch (error) {
      this.logger.error('Touchpoint validation failed', { error });
      return false;
    }
  }

  /**
   * Calculates confidence score based on data quality metrics
   * @param touchpoint Touchpoint to evaluate
   * @returns number Confidence score between 0 and 1
   */
  private calculateConfidenceScore(touchpoint: Touchpoint): number {
    let score = 1.0;

    // Reduce confidence for missing optional fields
    if (!touchpoint.metadata) score *= 0.95;
    if (!touchpoint.value) score *= 0.98;

    // Reduce confidence for old data
    const ageInHours = (Date.now() - touchpoint.timestamp.getTime()) / (1000 * 60 * 60);
    if (ageInHours > 24) score *= 0.99;
    if (ageInHours > 168) score *= 0.95; // Older than 1 week

    return Math.max(0, Math.min(1, score));
  }
}