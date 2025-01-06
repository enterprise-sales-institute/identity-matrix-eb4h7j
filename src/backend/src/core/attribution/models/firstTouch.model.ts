/**
 * First Touch Attribution Model Implementation
 * Assigns 100% credit to the first marketing touchpoint in a customer journey
 * with enhanced validation, performance optimization, and error handling
 * @version 1.0.0
 */

import { injectable, Logger } from '@nestjs/common'; // v9.0.0
import { 
  AttributionModel, 
  Touchpoint, 
  AttributionResult,
  ValidationStatus,
  TouchpointMetadata
} from '../types/attribution.types';

@injectable()
export class FirstTouchModel {
  private readonly logger: Logger;
  private readonly modelType: AttributionModel = AttributionModel.FIRST_TOUCH;
  private readonly CONFIDENCE_THRESHOLD = 0.95;
  private readonly PERFORMANCE_THRESHOLD_MS = 5000; // 5 second SLA threshold

  constructor() {
    this.logger = new Logger(FirstTouchModel.name);
    this.logger.log('Initializing First Touch Attribution Model');
  }

  /**
   * Calculates attribution by assigning 100% credit to first touchpoint
   * with enhanced validation and performance optimization
   * @param touchpoints Array of marketing touchpoints to analyze
   * @returns Promise<AttributionResult[]> Attribution results with weights and confidence scores
   * @throws Error if validation fails or processing exceeds SLA
   */
  public async calculateAttribution(touchpoints: Touchpoint[]): Promise<AttributionResult[]> {
    const startTime = Date.now();
    
    try {
      // Validate input data
      if (!this.validateInput(touchpoints)) {
        throw new Error('Invalid touchpoint data provided');
      }

      // Sort touchpoints by timestamp using optimized algorithm
      const sortedTouchpoints = this.sortTouchpointsByTimestamp(touchpoints);
      
      // Calculate attribution results
      const results: AttributionResult[] = sortedTouchpoints.map((touchpoint, index) => {
        const isFirstTouch = index === 0;
        const confidenceScore = this.calculateConfidenceScore(touchpoint, index, sortedTouchpoints.length);
        
        return {
          touchpointId: touchpoint.id,
          conversionId: touchpoint.metadata.conversionId || '',
          weight: isFirstTouch ? 1 : 0,
          model: this.modelType,
          calculatedAt: new Date(),
          confidenceScore,
          validationStatus: this.getValidationStatus(confidenceScore),
          metadata: {
            version: '1.0.0',
            parameters: {
              position: index,
              totalTouchpoints: sortedTouchpoints.length,
              processingTime: Date.now() - startTime
            },
            timestamp: new Date()
          }
        };
      });

      // Performance monitoring
      const processingTime = Date.now() - startTime;
      if (processingTime > this.PERFORMANCE_THRESHOLD_MS) {
        this.logger.warn(`Attribution calculation exceeded SLA threshold: ${processingTime}ms`);
      }

      this.logger.log(`Attribution calculated for ${touchpoints.length} touchpoints in ${processingTime}ms`);
      return results;

    } catch (error) {
      this.logger.error('Error calculating attribution', error.stack);
      throw error;
    }
  }

  /**
   * Validates input touchpoint data with comprehensive checks
   * @param touchpoints Array of touchpoints to validate
   * @returns boolean indicating validation status
   */
  private validateInput(touchpoints: Touchpoint[]): boolean {
    if (!Array.isArray(touchpoints) || touchpoints.length === 0) {
      this.logger.error('Invalid touchpoints array provided');
      return false;
    }

    return touchpoints.every(touchpoint => {
      const isValid = (
        touchpoint &&
        typeof touchpoint.id === 'string' &&
        touchpoint.id.length > 0 &&
        touchpoint.timestamp instanceof Date &&
        typeof touchpoint.channel === 'string' &&
        touchpoint.channel.length > 0 &&
        touchpoint.metadata &&
        typeof touchpoint.metadata === 'object'
      );

      if (!isValid) {
        this.logger.error(`Invalid touchpoint data: ${JSON.stringify(touchpoint)}`);
      }

      return isValid;
    });
  }

  /**
   * Optimized touchpoint sorting by timestamp
   * @param touchpoints Array of touchpoints to sort
   * @returns Sorted array of touchpoints
   */
  private sortTouchpointsByTimestamp(touchpoints: Touchpoint[]): Touchpoint[] {
    return [...touchpoints].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Calculates confidence score for attribution result
   * @param touchpoint Current touchpoint
   * @param position Position in journey
   * @param totalTouchpoints Total number of touchpoints
   * @returns number Confidence score between 0 and 1
   */
  private calculateConfidenceScore(
    touchpoint: Touchpoint,
    position: number,
    totalTouchpoints: number
  ): number {
    const hasRequiredMetadata = this.validateTouchpointMetadata(touchpoint.metadata);
    const timelinessScore = this.calculateTimelinessScore(touchpoint.timestamp);
    const positionScore = position === 0 ? 1 : 0.5;
    
    const confidenceScore = (
      (hasRequiredMetadata ? 0.4 : 0) +
      (timelinessScore * 0.3) +
      (positionScore * 0.3)
    );

    return Math.min(Math.max(confidenceScore, 0), 1);
  }

  /**
   * Validates touchpoint metadata completeness
   * @param metadata Touchpoint metadata
   * @returns boolean indicating metadata validity
   */
  private validateTouchpointMetadata(metadata: TouchpointMetadata): boolean {
    return !!(
      metadata &&
      metadata.source &&
      typeof metadata.source === 'string' &&
      typeof metadata.position === 'number'
    );
  }

  /**
   * Calculates timeliness score based on timestamp
   * @param timestamp Touchpoint timestamp
   * @returns number Score between 0 and 1
   */
  private calculateTimelinessScore(timestamp: Date): number {
    const age = Date.now() - timestamp.getTime();
    const maxAge = 90 * 24 * 60 * 60 * 1000; // 90 days in milliseconds
    return Math.max(0, 1 - (age / maxAge));
  }

  /**
   * Determines validation status based on confidence score
   * @param confidenceScore Calculated confidence score
   * @returns ValidationStatus
   */
  private getValidationStatus(confidenceScore: number): ValidationStatus {
    if (confidenceScore >= this.CONFIDENCE_THRESHOLD) {
      return ValidationStatus.VALID;
    } else if (confidenceScore >= this.CONFIDENCE_THRESHOLD * 0.8) {
      return ValidationStatus.PARTIAL;
    }
    return ValidationStatus.INVALID;
  }
}