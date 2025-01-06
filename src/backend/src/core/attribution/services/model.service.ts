import { injectable, Logger } from '@nestjs/common';
import { Cache } from '@nestjs/cache-manager';
import { 
  AttributionModel,
  Touchpoint,
  AttributionResult,
  AttributionConfig,
  ValidationStatus
} from '../types/attribution.types';
import { FirstTouchModel } from '../models/firstTouch.model';
import { LastTouchModel } from '../models/lastTouch.model';
import { LinearTouchModel } from '../models/linearTouch.model';

/**
 * Service responsible for managing attribution model selection, configuration,
 * and calculation with enhanced validation and monitoring capabilities
 * @version 1.0.0
 */
@injectable()
export class ModelService {
  private readonly logger: Logger;
  private readonly modelRegistry: Map<AttributionModel, any>;
  private readonly CACHE_TTL = 3600; // 1 hour cache
  private readonly ACCURACY_THRESHOLD = 0.999; // 99.9% accuracy requirement
  private readonly PERFORMANCE_THRESHOLD = 5000; // 5s processing threshold

  constructor(
    private readonly firstTouchModel: FirstTouchModel,
    private readonly lastTouchModel: LastTouchModel,
    private readonly linearTouchModel: LinearTouchModel,
    private readonly cacheManager: Cache
  ) {
    this.logger = new Logger(ModelService.name);
    
    // Initialize model registry
    this.modelRegistry = new Map([
      [AttributionModel.FIRST_TOUCH, this.firstTouchModel],
      [AttributionModel.LAST_TOUCH, this.lastTouchModel],
      [AttributionModel.LINEAR, this.linearTouchModel]
    ]);

    this.logger.log(`Initialized ModelService with ${this.modelRegistry.size} attribution models`);
  }

  /**
   * Calculates attribution based on selected model with enhanced validation and monitoring
   * @param modelType Selected attribution model type
   * @param touchpoints Array of touchpoints to analyze
   * @param config Attribution configuration parameters
   * @returns Promise<AttributionResult[]> Calculated attribution results
   */
  public async calculateAttribution(
    modelType: AttributionModel,
    touchpoints: Touchpoint[],
    config: AttributionConfig
  ): Promise<AttributionResult[]> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(modelType, touchpoints, config);

    try {
      // Check cache first
      const cachedResults = await this.cacheManager.get<AttributionResult[]>(cacheKey);
      if (cachedResults) {
        this.logger.debug('Returning cached attribution results');
        return cachedResults;
      }

      // Validate inputs
      if (!this.validateInputs(modelType, touchpoints, config)) {
        throw new Error('Invalid input parameters for attribution calculation');
      }

      // Get appropriate model implementation
      const model = this.modelRegistry.get(modelType);
      if (!model) {
        throw new Error(`Unsupported attribution model: ${modelType}`);
      }

      // Calculate attribution
      const results = await model.calculateAttribution(touchpoints);

      // Validate results
      const validationStatus = this.validateResults(results);
      if (validationStatus !== ValidationStatus.VALID) {
        throw new Error(`Attribution results validation failed: ${validationStatus}`);
      }

      // Check accuracy
      const accuracy = this.calculateAccuracy(results);
      if (accuracy < this.ACCURACY_THRESHOLD) {
        this.logger.warn(`Attribution accuracy ${accuracy} below threshold ${this.ACCURACY_THRESHOLD}`);
      }

      // Cache successful results
      await this.cacheManager.set(cacheKey, results, this.CACHE_TTL);

      // Monitor performance
      const processingTime = Date.now() - startTime;
      if (processingTime > this.PERFORMANCE_THRESHOLD) {
        this.logger.warn(`Attribution calculation exceeded SLA: ${processingTime}ms`);
      }

      this.logger.log({
        message: 'Attribution calculation completed',
        modelType,
        touchpoints: touchpoints.length,
        processingTime,
        accuracy
      });

      return results;

    } catch (error) {
      this.logger.error('Attribution calculation failed', {
        error,
        modelType,
        touchpoints: touchpoints?.length,
        processingTime: Date.now() - startTime
      });
      throw error;
    }
  }

  /**
   * Validates attribution configuration parameters
   * @param config Attribution configuration to validate
   * @returns boolean indicating validation status
   */
  public validateConfig(config: AttributionConfig): boolean {
    try {
      if (!config) {
        this.logger.error('Missing attribution configuration');
        return false;
      }

      // Validate model type
      if (!Object.values(AttributionModel).includes(config.model)) {
        this.logger.error(`Invalid attribution model: ${config.model}`);
        return false;
      }

      // Validate attribution window
      if (!config.attributionWindow || 
          !config.attributionWindow.startDate ||
          !config.attributionWindow.endDate) {
        this.logger.error('Invalid attribution window');
        return false;
      }

      // Validate channel weights
      if (!config.channelWeights || 
          Object.values(config.channelWeights).some(weight => weight < 0 || weight > 1)) {
        this.logger.error('Invalid channel weights');
        return false;
      }

      // Validate weight distribution
      const totalWeight = Object.values(config.channelWeights)
        .reduce((sum, weight) => sum + weight, 0);
      if (Math.abs(1 - totalWeight) > 0.0001) {
        this.logger.error(`Invalid weight distribution: ${totalWeight}`);
        return false;
      }

      return true;

    } catch (error) {
      this.logger.error('Configuration validation failed', error);
      return false;
    }
  }

  /**
   * Generates cache key for attribution results
   */
  private generateCacheKey(
    modelType: AttributionModel,
    touchpoints: Touchpoint[],
    config: AttributionConfig
  ): string {
    return `attribution:${modelType}:${touchpoints.map(t => t.id).join(':')}:${JSON.stringify(config)}`;
  }

  /**
   * Validates input parameters for attribution calculation
   */
  private validateInputs(
    modelType: AttributionModel,
    touchpoints: Touchpoint[],
    config: AttributionConfig
  ): boolean {
    return (
      !!modelType &&
      Array.isArray(touchpoints) &&
      touchpoints.length > 0 &&
      touchpoints.every(t => t.id && t.timestamp && t.channel) &&
      this.validateConfig(config)
    );
  }

  /**
   * Validates attribution results
   */
  private validateResults(results: AttributionResult[]): ValidationStatus {
    if (!results?.length) return ValidationStatus.INVALID;

    const totalWeight = results.reduce((sum, result) => sum + result.weight, 0);
    if (Math.abs(1 - totalWeight) > 0.0001) return ValidationStatus.INVALID;

    const allValid = results.every(result => 
      result.touchpointId &&
      result.weight >= 0 &&
      result.weight <= 1 &&
      result.confidenceScore >= 0 &&
      result.confidenceScore <= 1
    );

    return allValid ? ValidationStatus.VALID : ValidationStatus.PARTIAL;
  }

  /**
   * Calculates accuracy of attribution results
   */
  private calculateAccuracy(results: AttributionResult[]): number {
    return results.reduce((sum, result) => sum + result.confidenceScore, 0) / results.length;
  }
}