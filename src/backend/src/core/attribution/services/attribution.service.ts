import { Injectable } from '@nestjs/common'; // v9.0.0
import { Logger } from '@nestjs/common'; // v9.0.0
import { Cache } from '@nestjs/cache-manager'; // v1.0.0
import { CircuitBreaker } from '@nestjs/circuit-breaker'; // v1.0.0
import { MetricsService } from '@nestjs/metrics'; // v1.0.0

import { 
  AttributionModel, 
  Touchpoint,
  ValidationStatus,
  AttributionResult,
  TouchpointJourney,
  ValidationConfig
} from '../types/attribution.types';
import { EventService } from '../../events/services/event.service';
import { TimeRange } from '../../../types/common.types';

@Injectable()
@CircuitBreaker({
  timeout: 5000,
  maxFailures: 3,
  resetTimeout: 30000
})
export class AttributionService {
  private readonly logger: Logger;
  private readonly CACHE_TTL_SECONDS = 300; // 5 minutes
  private readonly MAX_PROCESSING_TIME_MS = 5000; // 5 seconds
  private readonly MIN_CONFIDENCE_SCORE = 0.95; // 95% minimum confidence
  private readonly attributionModels: Map<AttributionModel, (journey: TouchpointJourney) => Promise<AttributionResult[]>>;

  constructor(
    private readonly eventService: EventService,
    private readonly cacheManager: Cache,
    private readonly metricsService: MetricsService
  ) {
    this.logger = new Logger(AttributionService.name);
    this.initializeAttributionModels();
  }

  /**
   * Initializes attribution model calculation functions
   */
  private initializeAttributionModels(): void {
    this.attributionModels = new Map([
      [AttributionModel.FIRST_TOUCH, this.calculateFirstTouch.bind(this)],
      [AttributionModel.LAST_TOUCH, this.calculateLastTouch.bind(this)],
      [AttributionModel.LINEAR, this.calculateLinear.bind(this)],
      [AttributionModel.POSITION_BASED, this.calculatePositionBased.bind(this)],
      [AttributionModel.TIME_DECAY, this.calculateTimeDecay.bind(this)]
    ]);
  }

  /**
   * Calculates attribution for a visitor's touchpoint journey
   */
  public async calculateAttribution(
    visitorId: string,
    model: AttributionModel,
    timeRange: TimeRange
  ): Promise<AttributionResult[]> {
    const startTime = Date.now();
    const cacheKey = `attribution:${visitorId}:${model}:${timeRange.startDate}:${timeRange.endDate}`;

    try {
      // Check cache first
      const cachedResults = await this.cacheManager.get<AttributionResult[]>(cacheKey);
      if (cachedResults) {
        this.metricsService.incrementCounter('attribution_cache_hits');
        return cachedResults;
      }

      // Get visitor events and convert to touchpoints
      const events = await this.eventService.getVisitorEvents(visitorId);
      const touchpoints = events.map(event => ({
        id: event.id,
        event,
        channel: event.properties.channel as string,
        timestamp: event.timestamp,
        value: Number(event.properties.value) || 0,
        metadata: {
          source: event.properties.source as string,
          campaign: event.properties.campaign as string,
          medium: event.properties.medium as string,
          content: event.properties.content as string,
          term: event.properties.term as string,
          position: events.indexOf(event),
          isFirstTouch: events.indexOf(event) === 0,
          isLastTouch: events.indexOf(event) === events.length - 1
        }
      }));

      // Build journey object
      const journey: TouchpointJourney = {
        visitorId,
        touchpoints,
        converted: events.some(e => e.type === 'CONVERSION'),
        conversionValue: events
          .filter(e => e.type === 'CONVERSION')
          .reduce((sum, e) => sum + (Number(e.properties.value) || 0), 0),
        metadata: {
          startDate: events[0]?.timestamp || new Date(),
          endDate: events[events.length - 1]?.timestamp || new Date(),
          firstChannel: touchpoints[0]?.channel as any,
          lastChannel: touchpoints[touchpoints.length - 1]?.channel as any,
          conversionPath: touchpoints.map(t => t.channel as any)
        },
        metrics: {
          touchpointCount: touchpoints.length,
          averageTimeGap: this.calculateAverageTimeGap(touchpoints),
          totalDuration: this.calculateJourneyDuration(touchpoints),
          channelDiversity: new Set(touchpoints.map(t => t.channel)).size
        },
        validation: await this.validateJourney(touchpoints)
      };

      // Calculate attribution using selected model
      const modelFunction = this.attributionModels.get(model);
      if (!modelFunction) {
        throw new Error(`Unsupported attribution model: ${model}`);
      }

      const results = await modelFunction(journey);

      // Validate results
      const validationResult = await this.validateResults(results);
      if (validationResult.confidenceScore < this.MIN_CONFIDENCE_SCORE) {
        this.logger.warn('Low confidence attribution results', {
          visitorId,
          model,
          confidenceScore: validationResult.confidenceScore
        });
      }

      // Cache results if valid
      if (validationResult.validationStatus === ValidationStatus.VALID) {
        await this.cacheManager.set(cacheKey, results, this.CACHE_TTL_SECONDS);
      }

      // Record metrics
      const processingTime = Date.now() - startTime;
      this.metricsService.recordHistogram('attribution_calculation_duration', processingTime);
      this.metricsService.incrementCounter('attribution_calculations_total');

      return results;

    } catch (error) {
      this.logger.error('Attribution calculation failed', {
        visitorId,
        model,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      this.metricsService.incrementCounter('attribution_calculation_errors');
      throw error;
    }
  }

  /**
   * First-touch attribution model implementation
   */
  private async calculateFirstTouch(journey: TouchpointJourney): Promise<AttributionResult[]> {
    if (!journey.touchpoints.length) return [];

    const firstTouch = journey.touchpoints[0];
    return [{
      touchpointId: firstTouch.id,
      conversionId: journey.touchpoints.find(t => t.event.type === 'CONVERSION')?.id || '',
      weight: 1.0,
      model: AttributionModel.FIRST_TOUCH,
      calculatedAt: new Date(),
      confidenceScore: 1.0,
      validationStatus: ValidationStatus.VALID,
      metadata: {
        version: '1.0.0',
        parameters: {},
        timestamp: new Date()
      }
    }];
  }

  /**
   * Last-touch attribution model implementation
   */
  private async calculateLastTouch(journey: TouchpointJourney): Promise<AttributionResult[]> {
    if (!journey.touchpoints.length) return [];

    const lastTouch = journey.touchpoints[journey.touchpoints.length - 1];
    return [{
      touchpointId: lastTouch.id,
      conversionId: journey.touchpoints.find(t => t.event.type === 'CONVERSION')?.id || '',
      weight: 1.0,
      model: AttributionModel.LAST_TOUCH,
      calculatedAt: new Date(),
      confidenceScore: 1.0,
      validationStatus: ValidationStatus.VALID,
      metadata: {
        version: '1.0.0',
        parameters: {},
        timestamp: new Date()
      }
    }];
  }

  /**
   * Linear attribution model implementation
   */
  private async calculateLinear(journey: TouchpointJourney): Promise<AttributionResult[]> {
    if (!journey.touchpoints.length) return [];

    const weight = 1.0 / journey.touchpoints.length;
    return journey.touchpoints.map(touchpoint => ({
      touchpointId: touchpoint.id,
      conversionId: journey.touchpoints.find(t => t.event.type === 'CONVERSION')?.id || '',
      weight,
      model: AttributionModel.LINEAR,
      calculatedAt: new Date(),
      confidenceScore: 1.0,
      validationStatus: ValidationStatus.VALID,
      metadata: {
        version: '1.0.0',
        parameters: { weight },
        timestamp: new Date()
      }
    }));
  }

  /**
   * Position-based attribution model implementation
   */
  private async calculatePositionBased(journey: TouchpointJourney): Promise<AttributionResult[]> {
    if (!journey.touchpoints.length) return [];

    const firstTouchWeight = 0.4;
    const lastTouchWeight = 0.4;
    const middleWeight = 0.2;

    return journey.touchpoints.map((touchpoint, index) => {
      let weight = middleWeight / (journey.touchpoints.length - 2);
      if (index === 0) weight = firstTouchWeight;
      if (index === journey.touchpoints.length - 1) weight = lastTouchWeight;

      return {
        touchpointId: touchpoint.id,
        conversionId: journey.touchpoints.find(t => t.event.type === 'CONVERSION')?.id || '',
        weight,
        model: AttributionModel.POSITION_BASED,
        calculatedAt: new Date(),
        confidenceScore: 1.0,
        validationStatus: ValidationStatus.VALID,
        metadata: {
          version: '1.0.0',
          parameters: { position: index, totalTouchpoints: journey.touchpoints.length },
          timestamp: new Date()
        }
      };
    });
  }

  /**
   * Time-decay attribution model implementation
   */
  private async calculateTimeDecay(journey: TouchpointJourney): Promise<AttributionResult[]> {
    if (!journey.touchpoints.length) return [];

    const halfLifeDays = 7;
    const lastTouchTime = journey.touchpoints[journey.touchpoints.length - 1].timestamp.getTime();
    
    const weights = journey.touchpoints.map(touchpoint => {
      const daysFromConversion = (lastTouchTime - touchpoint.timestamp.getTime()) / (1000 * 60 * 60 * 24);
      return Math.pow(2, -daysFromConversion / halfLifeDays);
    });

    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    return journey.touchpoints.map((touchpoint, index) => ({
      touchpointId: touchpoint.id,
      conversionId: journey.touchpoints.find(t => t.event.type === 'CONVERSION')?.id || '',
      weight: weights[index] / totalWeight,
      model: AttributionModel.TIME_DECAY,
      calculatedAt: new Date(),
      confidenceScore: 1.0,
      validationStatus: ValidationStatus.VALID,
      metadata: {
        version: '1.0.0',
        parameters: { halfLifeDays, daysFromConversion: (lastTouchTime - touchpoint.timestamp.getTime()) / (1000 * 60 * 60 * 24) },
        timestamp: new Date()
      }
    }));
  }

  /**
   * Validates attribution results for accuracy and completeness
   */
  private async validateResults(results: AttributionResult[]): Promise<{
    validationStatus: ValidationStatus;
    confidenceScore: number;
  }> {
    if (!results.length) {
      return { validationStatus: ValidationStatus.INVALID, confidenceScore: 0 };
    }

    // Check weight distribution
    const totalWeight = results.reduce((sum, r) => sum + r.weight, 0);
    if (Math.abs(totalWeight - 1.0) > 0.0001) {
      return { validationStatus: ValidationStatus.INVALID, confidenceScore: 0 };
    }

    // Check temporal consistency
    const timestamps = results.map(r => r.calculatedAt.getTime());
    const isTemporallyConsistent = timestamps.every((t, i) => i === 0 || t >= timestamps[i - 1]);
    if (!isTemporallyConsistent) {
      return { validationStatus: ValidationStatus.INVALID, confidenceScore: 0.5 };
    }

    return {
      validationStatus: ValidationStatus.VALID,
      confidenceScore: 1.0
    };
  }

  /**
   * Validates touchpoint journey data
   */
  private async validateJourney(touchpoints: Touchpoint[]): Promise<{
    valid: boolean;
    errors?: string[];
  }> {
    const errors: string[] = [];

    if (!touchpoints.length) {
      errors.push('Empty touchpoint journey');
    }

    if (!touchpoints.every(t => t.channel && t.timestamp)) {
      errors.push('Invalid touchpoint data');
    }

    const timestamps = touchpoints.map(t => t.timestamp.getTime());
    if (!timestamps.every((t, i) => i === 0 || t >= timestamps[i - 1])) {
      errors.push('Invalid temporal sequence');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length ? errors : undefined
    };
  }

  /**
   * Calculates average time gap between touchpoints
   */
  private calculateAverageTimeGap(touchpoints: Touchpoint[]): number {
    if (touchpoints.length < 2) return 0;

    let totalGap = 0;
    for (let i = 1; i < touchpoints.length; i++) {
      totalGap += touchpoints[i].timestamp.getTime() - touchpoints[i - 1].timestamp.getTime();
    }
    return totalGap / (touchpoints.length - 1);
  }

  /**
   * Calculates total journey duration in milliseconds
   */
  private calculateJourneyDuration(touchpoints: Touchpoint[]): number {
    if (touchpoints.length < 2) return 0;
    return touchpoints[touchpoints.length - 1].timestamp.getTime() - touchpoints[0].timestamp.getTime();
  }
}