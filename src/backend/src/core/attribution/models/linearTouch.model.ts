import { injectable, Logger } from '@nestjs/common';
import { AttributionModel, Touchpoint, AttributionResult, ValidationStatus } from '../types/attribution.types';

/**
 * Enhanced implementation of Linear Touch attribution model with accuracy tracking
 * and performance monitoring capabilities
 * @version 1.0.0
 */
@injectable()
export class LinearTouchModel {
  private readonly logger = new Logger(LinearTouchModel.name);
  private readonly ACCURACY_THRESHOLD = 99.9; // 99.9% accuracy requirement
  private readonly LATENCY_THRESHOLD = 5000; // 5s latency requirement
  private readonly MODEL_TYPE = AttributionModel.LINEAR;

  constructor() {
    this.logger.log(`Initializing Linear Touch Model with accuracy threshold: ${this.ACCURACY_THRESHOLD}%`);
  }

  /**
   * Calculates equal attribution weights across all touchpoints with enhanced validation
   * @param touchpoints Array of touchpoints in the customer journey
   * @returns Promise<AttributionResult[]> Attribution results with confidence scores
   */
  async calculateAttribution(touchpoints: Touchpoint[]): Promise<AttributionResult[]> {
    const startTime = Date.now();
    
    try {
      // Validate input touchpoints
      const validationResult = this.validateTouchpoints(touchpoints);
      if (!validationResult.valid) {
        throw new Error(`Touchpoint validation failed: ${validationResult.errors?.join(', ')}`);
      }

      // Calculate equal weight distribution
      const equalWeight = 1 / touchpoints.length;
      const confidenceScore = this.calculateConfidence(touchpoints, validationResult);

      // Generate attribution results
      const results: AttributionResult[] = touchpoints.map(touchpoint => ({
        touchpointId: touchpoint.id,
        conversionId: touchpoint.metadata.conversionId,
        weight: equalWeight,
        model: this.MODEL_TYPE,
        calculatedAt: new Date(),
        confidenceScore,
        validationStatus: ValidationStatus.VALID,
        metadata: {
          version: '1.0.0',
          parameters: {
            totalTouchpoints: touchpoints.length,
            equalWeight,
            processingTime: Date.now() - startTime
          },
          timestamp: new Date()
        }
      }));

      // Verify total weights sum to 100%
      const totalWeight = results.reduce((sum, result) => sum + result.weight, 0);
      if (Math.abs(1 - totalWeight) > 0.0001) {
        throw new Error(`Weight distribution error: total ${totalWeight} != 1`);
      }

      // Performance monitoring
      const processingTime = Date.now() - startTime;
      if (processingTime > this.LATENCY_THRESHOLD) {
        this.logger.warn(`Processing time ${processingTime}ms exceeded threshold ${this.LATENCY_THRESHOLD}ms`);
      }

      this.logger.log({
        message: 'Attribution calculation completed',
        processingTime,
        touchpoints: touchpoints.length,
        confidenceScore
      });

      return results;

    } catch (error) {
      this.logger.error('Attribution calculation failed', error);
      throw error;
    }
  }

  /**
   * Validates touchpoint data with enhanced error checking
   * @param touchpoints Array of touchpoints to validate
   * @returns ValidationResult with detailed error information
   */
  private validateTouchpoints(touchpoints: Touchpoint[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for empty touchpoint array
    if (!touchpoints?.length) {
      errors.push('Empty touchpoint array');
      return { valid: false, errors };
    }

    // Validate each touchpoint
    touchpoints.forEach((touchpoint, index) => {
      if (!touchpoint.id) errors.push(`Missing ID at index ${index}`);
      if (!touchpoint.timestamp) errors.push(`Missing timestamp at index ${index}`);
      if (!touchpoint.channel) errors.push(`Missing channel at index ${index}`);
      
      // Validate timestamp sequence
      if (index > 0 && touchpoint.timestamp < touchpoints[index - 1].timestamp) {
        warnings.push(`Non-chronological timestamp at index ${index}`);
      }
    });

    // Calculate validation confidence
    const validationScore = (touchpoints.length - errors.length) / touchpoints.length * 100;
    
    this.logger.debug({
      message: 'Touchpoint validation completed',
      validationScore,
      errors: errors.length,
      warnings: warnings.length
    });

    return {
      valid: errors.length === 0,
      errors: errors.length ? errors : undefined,
      warnings: warnings.length ? warnings : undefined
    };
  }

  /**
   * Calculates confidence score for attribution results
   * @param touchpoints Validated touchpoints
   * @param validationResult Validation results
   * @returns number Confidence score between 0 and 1
   */
  private calculateConfidence(touchpoints: Touchpoint[], validationResult: ValidationResult): number {
    let confidence = 1.0;

    // Reduce confidence based on validation warnings
    if (validationResult.warnings?.length) {
      confidence -= validationResult.warnings.length * 0.1;
    }

    // Check temporal consistency
    const timeGaps = touchpoints.slice(1).map((t, i) => 
      t.timestamp.getTime() - touchpoints[i].timestamp.getTime()
    );
    const avgTimeGap = timeGaps.reduce((sum, gap) => sum + gap, 0) / timeGaps.length;
    const timeConsistency = Math.min(1, 24 * 60 * 60 * 1000 / avgTimeGap);
    confidence *= timeConsistency;

    // Ensure minimum confidence threshold
    confidence = Math.max(0.5, Math.min(1, confidence));

    this.logger.debug({
      message: 'Confidence calculation completed',
      confidence,
      timeConsistency,
      warningCount: validationResult.warnings?.length ?? 0
    });

    return confidence;
  }
}