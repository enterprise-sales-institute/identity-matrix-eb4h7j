import { injectable, Logger } from '@nestjs/common';
import { AttributionModel, Touchpoint, AttributionResult } from '../types/attribution.types';

/**
 * Implementation of position-based attribution model that assigns different weights
 * to touchpoints based on their position in the customer journey
 * @version 1.0.0
 */
@injectable()
export class PositionBasedModel {
  private readonly logger = new Logger(PositionBasedModel.name);
  private firstTouchWeight: number;
  private lastTouchWeight: number;
  private middleTouchWeight: number;

  constructor() {
    // Initialize with default weight distribution
    this.firstTouchWeight = 40; // 40% weight to first touch
    this.lastTouchWeight = 40;  // 40% weight to last touch
    this.middleTouchWeight = 20; // 20% weight distributed among middle touches
    
    this.logger.log(`Initialized position-based model with weights: first=${this.firstTouchWeight}%, last=${this.lastTouchWeight}%, middle=${this.middleTouchWeight}%`);
  }

  /**
   * Calculates attribution weights for touchpoints based on their position in the journey
   * @param touchpoints Array of chronologically ordered touchpoints
   * @returns Promise<AttributionResult[]> Array of attribution results with calculated weights
   * @throws Error if touchpoints array is empty or invalid
   */
  async calculateAttribution(touchpoints: Touchpoint[]): Promise<AttributionResult[]> {
    try {
      // Validate input
      if (!touchpoints?.length) {
        throw new Error('Touchpoints array cannot be empty');
      }

      // Sort touchpoints by timestamp to ensure chronological order
      const sortedTouchpoints = [...touchpoints].sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
      );

      // Validate timestamp sorting
      if (sortedTouchpoints.some((tp, i) => 
        i > 0 && tp.timestamp.getTime() <= sortedTouchpoints[i-1].timestamp.getTime()
      )) {
        throw new Error('Invalid touchpoint timestamp sequence detected');
      }

      const results: AttributionResult[] = [];
      const totalTouchpoints = sortedTouchpoints.length;

      // Calculate middle touch weight distribution if there are middle touchpoints
      const middleTouchpoints = totalTouchpoints - 2; // Excluding first and last
      const weightPerMiddleTouch = middleTouchpoints > 0 
        ? this.middleTouchWeight / middleTouchpoints 
        : 0;

      // Process each touchpoint
      sortedTouchpoints.forEach((touchpoint, index) => {
        let weight = 0;

        // Assign weights based on position
        if (index === 0) {
          // First touch
          weight = this.firstTouchWeight;
        } else if (index === totalTouchpoints - 1) {
          // Last touch
          weight = this.lastTouchWeight;
        } else {
          // Middle touches
          weight = weightPerMiddleTouch;
        }

        results.push({
          touchpointId: touchpoint.id,
          conversionId: '', // Set by the attribution service
          weight,
          model: AttributionModel.POSITION_BASED,
          calculatedAt: new Date(),
          confidenceScore: 1.0,
          validationStatus: 'VALID',
          metadata: {
            version: '1.0.0',
            parameters: {
              position: index,
              totalTouchpoints,
              isFirst: index === 0,
              isLast: index === totalTouchpoints - 1
            },
            timestamp: new Date()
          }
        });
      });

      // Validate total weight distribution
      const totalWeight = results.reduce((sum, result) => sum + result.weight, 0);
      if (Math.abs(totalWeight - 100) > 0.01) { // Allow for small floating point differences
        throw new Error(`Invalid weight distribution. Total weight: ${totalWeight}%`);
      }

      this.logger.debug(
        `Attribution calculated for ${totalTouchpoints} touchpoints: first=${this.firstTouchWeight}%, ` +
        `last=${this.lastTouchWeight}%, middle=${this.middleTouchWeight}% (${weightPerMiddleTouch}% per middle touch)`
      );

      return results;
    } catch (error) {
      this.logger.error(`Attribution calculation failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Configures the position weights for the attribution model
   * @param weights Record containing first_touch, last_touch, and middle_touch weights
   * @throws Error if weights are invalid or don't sum to 100%
   */
  configure(weights: Record<string, number>): void {
    try {
      if (!this.validateWeights(weights)) {
        throw new Error('Invalid weight configuration');
      }

      this.firstTouchWeight = weights.first_touch;
      this.lastTouchWeight = weights.last_touch;
      this.middleTouchWeight = weights.middle_touch;

      this.logger.log(
        `Position-based model configured with weights: first=${this.firstTouchWeight}%, ` +
        `last=${this.lastTouchWeight}%, middle=${this.middleTouchWeight}%`
      );
    } catch (error) {
      this.logger.error(`Configuration failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Validates weight configuration
   * @param weights Record containing weight values to validate
   * @returns boolean indicating if weights are valid
   */
  private validateWeights(weights: Record<string, number>): boolean {
    // Check if all required weights are present and are numbers
    const requiredWeights = ['first_touch', 'last_touch', 'middle_touch'];
    if (!requiredWeights.every(weight => 
      typeof weights[weight] === 'number' && 
      !isNaN(weights[weight])
    )) {
      this.logger.error('Invalid weight values provided');
      return false;
    }

    // Validate weight ranges
    if (!Object.values(weights).every(weight => weight >= 0 && weight <= 100)) {
      this.logger.error('Weights must be between 0 and 100');
      return false;
    }

    // Validate total equals 100%
    const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    if (Math.abs(totalWeight - 100) > 0.01) { // Allow for small floating point differences
      this.logger.error(`Total weight must equal 100%. Current total: ${totalWeight}%`);
      return false;
    }

    return true;
  }
}