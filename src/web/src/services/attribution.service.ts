/**
 * @fileoverview Service class for managing attribution model configurations, calculations, and analysis
 * @version 1.0.0
 */

// External imports
import { Observable, BehaviorSubject, from, throwError } from 'rxjs'; // v7.8.0
import { debounceTime, retry, catchError, map } from 'rxjs/operators'; // v7.8.0

// Internal imports
import { ApiService } from './api.service';
import { 
  AttributionModel,
  Channel,
  ModelConfiguration,
  ModelStatus,
  ValidationRules 
} from '../types/model.types';
import { 
  AttributionResult,
  Touchpoint,
  TouchpointSequence,
  ModelPerformanceMetrics,
  ChannelWeights 
} from '../types/attribution.types';
import { API_CONFIG } from '../config/api.config';
import { ApiResponse, TimeRange } from '../types/common.types';

/**
 * Interface for attribution service configuration
 */
interface AttributionServiceConfig {
  updateInterval: number;
  cacheTimeout: number;
  maxRetries: number;
  validationRules: ValidationRules;
  enableRealtime: boolean;
}

/**
 * Service class for managing attribution configurations and calculations with real-time updates
 */
export class AttributionService {
  private readonly configSubject: BehaviorSubject<ModelConfiguration>;
  private readonly resultsSubject: BehaviorSubject<AttributionResult[]>;
  private readonly touchpointSubject: BehaviorSubject<TouchpointSequence[]>;
  private webSocket: WebSocket | null = null;
  private readonly cache: Map<string, { data: any; timestamp: number }>;

  /**
   * Default configuration for attribution service
   */
  private static readonly DEFAULT_CONFIG: AttributionServiceConfig = {
    updateInterval: 30000,
    cacheTimeout: 300000,
    maxRetries: 3,
    enableRealtime: true,
    validationRules: {
      minChannelWeight: 0,
      maxChannelWeight: 100,
      totalWeightSum: 100,
      minDecayHalfLife: 1,
      maxDecayHalfLife: 90
    }
  };

  constructor(
    private readonly apiService: ApiService,
    private readonly config: AttributionServiceConfig = AttributionService.DEFAULT_CONFIG
  ) {
    this.configSubject = new BehaviorSubject<ModelConfiguration>(this.getDefaultModelConfig());
    this.resultsSubject = new BehaviorSubject<AttributionResult[]>([]);
    this.touchpointSubject = new BehaviorSubject<TouchpointSequence[]>([]);
    this.cache = new Map();

    if (this.config.enableRealtime) {
      this.initializeWebSocket();
    }
  }

  /**
   * Initializes WebSocket connection for real-time updates
   */
  private initializeWebSocket(): void {
    const wsUrl = API_CONFIG.BASE_URL.replace('http', 'ws') + '/attribution/realtime';
    this.webSocket = new WebSocket(wsUrl);

    this.webSocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'attribution_update') {
        this.resultsSubject.next(data.results);
      }
    };

    this.webSocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.reconnectWebSocket();
    };
  }

  /**
   * Handles WebSocket reconnection with exponential backoff
   */
  private reconnectWebSocket(attempt: number = 0): void {
    const maxAttempts = 5;
    const backoffTime = Math.min(1000 * Math.pow(2, attempt), 30000);

    if (attempt < maxAttempts) {
      setTimeout(() => {
        this.initializeWebSocket();
        if (this.webSocket?.readyState === WebSocket.CLOSED) {
          this.reconnectWebSocket(attempt + 1);
        }
      }, backoffTime);
    }
  }

  /**
   * Returns default model configuration
   */
  private getDefaultModelConfig(): ModelConfiguration {
    return {
      id: '',
      model: AttributionModel.LINEAR,
      name: 'Default Attribution Model',
      channelWeights: Object.values(Channel).reduce((acc, channel) => ({
        ...acc,
        [channel]: 100 / Object.keys(Channel).length
      }), {} as ChannelWeights),
      attributionWindow: {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      customRules: {
        applyFirstTouchBonus: false,
        includeTimeDecay: false,
        decayHalfLife: 7,
        customChannelGrouping: false,
        channelGroups: [],
        customWeights: {}
      },
      status: ModelStatus.DRAFT,
      validationRules: this.config.validationRules,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: ModelStatus.ACTIVE
    };
  }

  /**
   * Retrieves current attribution configuration
   */
  public getAttributionConfig(): Observable<ModelConfiguration> {
    const cacheKey = 'attribution_config';
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.config.cacheTimeout) {
      return from([cached.data]);
    }

    return from(this.apiService.get<ModelConfiguration>(
      API_CONFIG.ENDPOINTS.ATTRIBUTION.MODELS.path
    )).pipe(
      map(response => response.data),
      retry(this.config.maxRetries),
      catchError(error => throwError(() => error))
    );
  }

  /**
   * Updates attribution configuration with validation
   */
  public async updateAttributionConfig(
    config: Partial<ModelConfiguration>
  ): Promise<ApiResponse<ModelConfiguration>> {
    const currentConfig = this.configSubject.value;
    const updatedConfig = { ...currentConfig, ...config };

    const validationResult = this.validateConfiguration(updatedConfig);
    if (!validationResult.isValid) {
      throw new Error(`Invalid configuration: ${validationResult.errors.join(', ')}`);
    }

    try {
      const response = await this.apiService.put<ModelConfiguration>(
        API_CONFIG.ENDPOINTS.ATTRIBUTION.MODELS.path,
        updatedConfig
      );

      this.configSubject.next(response.data);
      this.cache.set('attribution_config', {
        data: response.data,
        timestamp: Date.now()
      });

      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Validates attribution configuration
   */
  private validateConfiguration(config: ModelConfiguration): { 
    isValid: boolean; 
    errors: string[] 
  } {
    const errors: string[] = [];
    const rules = this.config.validationRules;

    // Validate channel weights
    const totalWeight = Object.values(config.channelWeights).reduce((sum, weight) => sum + weight, 0);
    if (Math.abs(totalWeight - rules.totalWeightSum) > 0.01) {
      errors.push(`Total channel weights must equal ${rules.totalWeightSum}`);
    }

    // Validate individual channel weights
    Object.entries(config.channelWeights).forEach(([channel, weight]) => {
      if (weight < rules.minChannelWeight || weight > rules.maxChannelWeight) {
        errors.push(
          `Channel ${channel} weight must be between ${rules.minChannelWeight} and ${rules.maxChannelWeight}`
        );
      }
    });

    // Validate decay half-life if time decay is enabled
    if (config.customRules.includeTimeDecay) {
      const { decayHalfLife } = config.customRules;
      if (decayHalfLife < rules.minDecayHalfLife || decayHalfLife > rules.maxDecayHalfLife) {
        errors.push(
          `Decay half-life must be between ${rules.minDecayHalfLife} and ${rules.maxDecayHalfLife} days`
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Retrieves attribution results with caching
   */
  public getAttributionResults(timeRange: TimeRange): Observable<AttributionResult[]> {
    const cacheKey = `attribution_results_${timeRange.startDate}_${timeRange.endDate}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.config.cacheTimeout) {
      return from([cached.data]);
    }

    return from(this.apiService.get<AttributionResult[]>(
      API_CONFIG.ENDPOINTS.ATTRIBUTION.ANALYSIS.path,
      { params: timeRange }
    )).pipe(
      map(response => response.data),
      retry(this.config.maxRetries),
      catchError(error => throwError(() => error))
    );
  }

  /**
   * Retrieves touchpoint sequences for journey analysis
   */
  public getTouchpointSequences(timeRange: TimeRange): Observable<TouchpointSequence[]> {
    return from(this.apiService.get<TouchpointSequence[]>(
      API_CONFIG.ENDPOINTS.ATTRIBUTION.TOUCHPOINTS.path,
      { params: timeRange }
    )).pipe(
      map(response => response.data),
      retry(this.config.maxRetries),
      debounceTime(300),
      catchError(error => throwError(() => error))
    );
  }

  /**
   * Calculates model performance metrics
   */
  public async calculateModelPerformance(
    modelId: string,
    timeRange: TimeRange
  ): Promise<ModelPerformanceMetrics> {
    try {
      const response = await this.apiService.post<ModelPerformanceMetrics>(
        `${API_CONFIG.ENDPOINTS.ATTRIBUTION.ANALYSIS.path}/performance`,
        { modelId, timeRange }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Cleanup method to close WebSocket connection
   */
  public dispose(): void {
    if (this.webSocket) {
      this.webSocket.close();
    }
    this.configSubject.complete();
    this.resultsSubject.complete();
    this.touchpointSubject.complete();
  }
}