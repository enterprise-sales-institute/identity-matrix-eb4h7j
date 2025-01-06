import { 
  Controller, 
  Post, 
  Get, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  UseGuards, 
  UseInterceptors,
  Logger,
  HttpStatus,
  HttpException
} from '@nestjs/common'; // v9.0.0
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiQuery, 
  ApiBody, 
  ApiParam 
} from '@nestjs/swagger'; // v6.0.0
import { RateLimit } from '@nestjs/throttler'; // v4.0.0
import { ModelService } from '../../core/attribution/services/model.service';
import { ValidationError } from '../../types/error.types';
import { 
  AttributionModel,
  AttributionConfig,
  Touchpoint,
  AttributionResult,
  ValidationStatus
} from '../../core/attribution/types/attribution.types';
import { CacheInterceptor, LoggingInterceptor, PerformanceInterceptor } from '../interceptors';
import { AuthGuard } from '../guards';
import { MetricsService } from '../../core/monitoring/metrics.service';

/**
 * Controller for managing attribution models and configurations with enhanced
 * performance monitoring and real-time processing capabilities
 * @version 1.0.0
 */
@Controller('api/v1/models')
@ApiTags('Attribution Models')
@UseGuards(AuthGuard)
@UseInterceptors(LoggingInterceptor, CacheInterceptor, PerformanceInterceptor)
export class ModelController {
  private readonly logger = new Logger(ModelController.name);
  private readonly PROCESSING_THRESHOLD_MS = 5000; // 5s SLA threshold

  constructor(
    private readonly modelService: ModelService,
    private readonly metricsService: MetricsService
  ) {
    this.logger.log('Initializing Attribution Model Controller');
  }

  /**
   * Retrieves attribution model configuration by ID
   */
  @Get(':modelId')
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({ summary: 'Get attribution model configuration' })
  @ApiParam({ name: 'modelId', description: 'Model identifier' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Model configuration retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Model not found' })
  async getModel(@Param('modelId') modelId: string): Promise<AttributionConfig> {
    const startTime = Date.now();

    try {
      const config = await this.modelService.getModelConfig(modelId);
      
      this.metricsService.recordLatency('model_config_retrieval', Date.now() - startTime);
      
      return config;

    } catch (error) {
      this.handleError('Failed to retrieve model configuration', error, modelId);
    }
  }

  /**
   * Creates a new attribution model configuration
   */
  @Post()
  @RateLimit({ ttl: 60, limit: 50 })
  @ApiOperation({ summary: 'Create new attribution model' })
  @ApiBody({ type: AttributionConfig })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Model created successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid model configuration' })
  async createModel(@Body() config: AttributionConfig): Promise<AttributionConfig> {
    const startTime = Date.now();

    try {
      // Validate model configuration
      if (!this.modelService.validateConfig(config)) {
        throw new ValidationError('Invalid model configuration');
      }

      const createdConfig = await this.modelService.createModel(config);
      
      this.metricsService.recordLatency('model_creation', Date.now() - startTime);
      this.metricsService.incrementCounter('models_created');

      return createdConfig;

    } catch (error) {
      this.handleError('Failed to create model', error, config);
    }
  }

  /**
   * Updates an existing attribution model configuration
   */
  @Put(':modelId')
  @RateLimit({ ttl: 60, limit: 50 })
  @ApiOperation({ summary: 'Update attribution model' })
  @ApiParam({ name: 'modelId', description: 'Model identifier' })
  @ApiBody({ type: AttributionConfig })
  @ApiResponse({ status: HttpStatus.OK, description: 'Model updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Model not found' })
  async updateModel(
    @Param('modelId') modelId: string,
    @Body() config: AttributionConfig
  ): Promise<AttributionConfig> {
    const startTime = Date.now();

    try {
      // Validate model configuration
      if (!this.modelService.validateConfig(config)) {
        throw new ValidationError('Invalid model configuration');
      }

      const updatedConfig = await this.modelService.updateModel(modelId, config);
      
      this.metricsService.recordLatency('model_update', Date.now() - startTime);
      
      return updatedConfig;

    } catch (error) {
      this.handleError('Failed to update model', error, { modelId, config });
    }
  }

  /**
   * Calculates attribution based on model configuration and touchpoint data
   */
  @Post(':modelId/calculate')
  @RateLimit({ ttl: 60, limit: 100 })
  @ApiOperation({ summary: 'Calculate attribution using model' })
  @ApiParam({ name: 'modelId', description: 'Model identifier' })
  @ApiBody({ type: [Touchpoint] })
  @ApiResponse({ status: HttpStatus.OK, description: 'Attribution calculated successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid touchpoint data' })
  async calculateAttribution(
    @Param('modelId') modelId: string,
    @Body() touchpoints: Touchpoint[]
  ): Promise<AttributionResult[]> {
    const startTime = Date.now();

    try {
      // Validate touchpoint data
      if (!Array.isArray(touchpoints) || touchpoints.length === 0) {
        throw new ValidationError('Invalid touchpoint data');
      }

      const results = await this.modelService.calculateAttribution(
        modelId,
        touchpoints,
        { timeout: this.PROCESSING_THRESHOLD_MS }
      );

      const processingTime = Date.now() - startTime;
      
      // Monitor processing time against SLA
      if (processingTime > this.PROCESSING_THRESHOLD_MS) {
        this.logger.warn(`Attribution calculation exceeded SLA: ${processingTime}ms`);
        this.metricsService.incrementCounter('sla_violations');
      }

      this.metricsService.recordLatency('attribution_calculation', processingTime);
      this.metricsService.recordGauge('touchpoints_processed', touchpoints.length);

      return results;

    } catch (error) {
      this.handleError('Attribution calculation failed', error, { modelId, touchpointCount: touchpoints?.length });
    }
  }

  /**
   * Calculates attribution for multiple touchpoint batches
   */
  @Post(':modelId/calculate-batch')
  @RateLimit({ ttl: 60, limit: 20 })
  @ApiOperation({ summary: 'Calculate attribution for multiple touchpoint batches' })
  @ApiParam({ name: 'modelId', description: 'Model identifier' })
  @ApiBody({ type: [[Touchpoint]] })
  @ApiResponse({ status: HttpStatus.OK, description: 'Batch attribution calculated successfully' })
  async calculateBatchAttribution(
    @Param('modelId') modelId: string,
    @Body() touchpointBatches: Touchpoint[][]
  ): Promise<AttributionResult[][]> {
    const startTime = Date.now();

    try {
      const results = await Promise.all(
        touchpointBatches.map(batch => 
          this.modelService.calculateAttribution(modelId, batch, { 
            timeout: this.PROCESSING_THRESHOLD_MS 
          })
        )
      );

      const processingTime = Date.now() - startTime;
      
      this.metricsService.recordLatency('batch_attribution_calculation', processingTime);
      this.metricsService.recordGauge('batches_processed', touchpointBatches.length);

      return results;

    } catch (error) {
      this.handleError('Batch attribution calculation failed', error, { 
        modelId, 
        batchCount: touchpointBatches?.length 
      });
    }
  }

  /**
   * Deletes an attribution model configuration
   */
  @Delete(':modelId')
  @RateLimit({ ttl: 60, limit: 20 })
  @ApiOperation({ summary: 'Delete attribution model' })
  @ApiParam({ name: 'modelId', description: 'Model identifier' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Model deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Model not found' })
  async deleteModel(@Param('modelId') modelId: string): Promise<void> {
    const startTime = Date.now();

    try {
      await this.modelService.deleteModel(modelId);
      
      this.metricsService.recordLatency('model_deletion', Date.now() - startTime);
      this.metricsService.incrementCounter('models_deleted');

    } catch (error) {
      this.handleError('Failed to delete model', error, modelId);
    }
  }

  /**
   * Handles errors with enhanced logging and monitoring
   */
  private handleError(message: string, error: any, context?: any): never {
    this.logger.error(message, { error, context });
    this.metricsService.incrementCounter('errors');

    if (error instanceof ValidationError) {
      throw new HttpException({
        status: HttpStatus.BAD_REQUEST,
        error: message,
        details: error.validationErrors
      }, HttpStatus.BAD_REQUEST);
    }

    throw new HttpException({
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      error: message
    }, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}