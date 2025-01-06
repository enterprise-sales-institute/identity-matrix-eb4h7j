import { injectable, Logger } from '@nestjs/common';
import { 
  AttributionModel, 
  Touchpoint, 
  TouchpointJourney, 
  AttributionResult,
  ValidationStatus
} from '../types/attribution.types';

/**
 * Implementation of time decay attribution model that assigns credit to touchpoints
 * based on their temporal proximity to conversion using exponential decay
 * @version 1.0.0
 */
@injectable()
export class TimeDecayModel {
  private readonly logger = new Logger(TimeDecayModel.name);
  private readonly halfLifeDays: number;
  private readonly decayRate: number;
  private readonly minConfidenceThreshold: number;
  private readonly maxTimeWindowDays: number;

  constructor(
    halfLifeDays: number = 7,
    minConfidenceThreshold: number = 0.7,
    maxTimeWindowDays: number = 90
  ) {
    this.halfLifeDays = halfLifeDays;
    this.minConfidenceThreshold = minConfidenceThreshold;
    this.maxTimeWindowDays = maxTimeWindowDays;
    this.decayRate = Math.log(2) / this.halfLifeDays;

    this.validateConfiguration();
    this.logger.log(`Initialized TimeDecayModel with half-life: ${halfLifeDays} days`);
  }

  /**
   * Validates the journey data before attribution calculation
   */
  public validateInput(journey: TouchpointJourney): boolean {
    if (!journey?.touchpoints?.length) {
      this.logger.warn('Invalid journey: No touchpoints found');
      return false;
    }

    if (journey.conversionValue <= 0) {
      this.logger.warn('Invalid journey: Conversion value must be positive');
      return false;
    }

    const touchpoints = journey.touchpoints;
    const conversionTime = journey.metadata.endDate;
    
    // Validate touchpoint timestamps
    for (let i = 0; i < touchpoints.length - 1; i++) {
      if (touchpoints[i].timestamp >= touchpoints[i + 1].timestamp) {
        this.logger.warn('Invalid journey: Touchpoints must be in chronological order');
        return false;
      }
    }

    // Validate time window
    const journeyDuration = Math.abs(
      (conversionTime.getTime() - touchpoints[0].timestamp.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (journeyDuration > this.maxTimeWindowDays) {
      this.logger.warn(`Invalid journey: Duration exceeds maximum time window of ${this.maxTimeWindowDays} days`);
      return false;
    }

    return true;
  }

  /**
   * Calculates attribution weights using time decay model
   */
  public async calculateAttribution(journey: TouchpointJourney): Promise<AttributionResult[]> {
    if (!this.validateInput(journey)) {
      throw new Error('Invalid journey data for attribution calculation');
    }

    const { touchpoints, conversionValue } = journey;
    const conversionTime = journey.metadata.endDate;
    
    try {
      // Calculate raw weights using decay function
      const rawWeights = touchpoints.map(touchpoint => {
        const timeDiffDays = (conversionTime.getTime() - touchpoint.timestamp.getTime()) 
          / (1000 * 60 * 60 * 24);
        return this.calculateDecayWeight(timeDiffDays);
      });

      // Normalize weights
      const normalizedWeights = this.normalizeWeights(rawWeights);

      // Calculate confidence scores based on time distribution
      const confidenceScores = this.calculateConfidenceScores(touchpoints, conversionTime);

      // Generate attribution results
      return touchpoints.map((touchpoint, index) => {
        const weight = normalizedWeights[index];
        const attributedValue = weight * conversionValue;
        
        return {
          touchpointId: touchpoint.id,
          conversionId: journey.visitorId,
          weight,
          model: AttributionModel.TIME_DECAY,
          calculatedAt: new Date(),
          confidenceScore: confidenceScores[index],
          validationStatus: confidenceScores[index] >= this.minConfidenceThreshold 
            ? ValidationStatus.VALID 
            : ValidationStatus.PARTIAL,
          metadata: {
            version: '1.0.0',
            parameters: {
              halfLifeDays: this.halfLifeDays,
              decayRate: this.decayRate,
              timeDifference: (conversionTime.getTime() - touchpoint.timestamp.getTime()) 
                / (1000 * 60 * 60 * 24)
            },
            timestamp: new Date()
          }
        };
      });

    } catch (error) {
      this.logger.error('Error calculating time decay attribution', error);
      throw error;
    }
  }

  /**
   * Calculates decay weight for a given time difference
   */
  private calculateDecayWeight(timeDifferenceInDays: number): number {
    if (timeDifferenceInDays < 0) {
      throw new Error('Time difference cannot be negative');
    }
    return Math.exp(-this.decayRate * timeDifferenceInDays);
  }

  /**
   * Normalizes weights to sum to 1.0
   */
  private normalizeWeights(weights: number[]): number[] {
    if (!weights.length) {
      throw new Error('Cannot normalize empty weights array');
    }

    const sum = weights.reduce((acc, weight) => acc + weight, 0);
    if (sum === 0) {
      throw new Error('Sum of weights cannot be zero');
    }

    return weights.map(weight => weight / sum);
  }

  /**
   * Calculates confidence scores based on temporal distribution
   */
  private calculateConfidenceScores(
    touchpoints: Touchpoint[], 
    conversionTime: Date
  ): number[] {
    const maxTimeDiff = this.maxTimeWindowDays * 24 * 60 * 60 * 1000; // in milliseconds
    
    return touchpoints.map(touchpoint => {
      const timeDiff = conversionTime.getTime() - touchpoint.timestamp.getTime();
      const normalizedTimeDiff = Math.min(timeDiff / maxTimeDiff, 1);
      return 1 - (normalizedTimeDiff * (1 - this.minConfidenceThreshold));
    });
  }

  /**
   * Validates model configuration parameters
   */
  private validateConfiguration(): void {
    if (this.halfLifeDays <= 0) {
      throw new Error('Half-life must be positive');
    }
    if (this.minConfidenceThreshold < 0 || this.minConfidenceThreshold > 1) {
      throw new Error('Confidence threshold must be between 0 and 1');
    }
    if (this.maxTimeWindowDays <= 0) {
      throw new Error('Maximum time window must be positive');
    }
  }
}