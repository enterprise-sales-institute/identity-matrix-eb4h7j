import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity } from '@nestjs/swagger';
import { RateLimit } from '@nestjs/throttler';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { JwtAuthGuard } from '@nestjs/passport';

import { AttributionService } from '../../core/attribution/services/attribution.service';
import { ModelService } from '../../core/attribution/services/model.service';
import { 
  AttributionModel,
  AttributionConfig,
  AttributionResult,
  ValidationStatus
} from '../../core/attribution/types/attribution.types';
import { TimeRange } from '../../types/common.types';
import { attributionModelConfigSchema } from '../validators/attribution.validator';

@Controller('api/v1/attribution')
@ApiTags('Attribution')
@ApiSecurity('bearer')
@UseGuards(JwtAuthGuard)
export class AttributionController {
  constructor(
    private readonly attributionService: AttributionService,
    private readonly modelService: ModelService
  ) {}

  @Post('calculate')
  @RateLimit({ ttl: 60, limit: 100 })
  @ApiOperation({ summary: 'Calculate attribution weights for touchpoints' })
  @ApiResponse({ status: 201, description: 'Attribution calculated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input parameters' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async calculateAttribution(
    @Body('visitorId') visitorId: string,
    @Body('model') model: AttributionModel,
    @Body('timeRange') timeRange: TimeRange,
    @Body('config') config: AttributionConfig
  ): Promise<AttributionResult[]> {
    try {
      // Validate model configuration
      const validationResult = await attributionModelConfigSchema.validateAsync(config);
      if (validationResult.error) {
        throw new Error(`Invalid configuration: ${validationResult.error.message}`);
      }

      // Calculate attribution
      const results = await this.attributionService.calculateAttribution(
        visitorId,
        model,
        timeRange
      );

      // Validate results
      const validResults = results.filter(result => 
        result.validationStatus === ValidationStatus.VALID &&
        result.confidenceScore >= 0.95
      );

      if (validResults.length === 0) {
        throw new Error('No valid attribution results generated');
      }

      return validResults;

    } catch (error) {
      throw new Error(`Attribution calculation failed: ${error.message}`);
    }
  }

  @Get('touchpoints/:visitorId')
  @UseInterceptors(CacheInterceptor)
  @RateLimit({ ttl: 60, limit: 200 })
  @ApiOperation({ summary: 'Get touchpoints for visitor' })
  @ApiResponse({ status: 200, description: 'Touchpoints retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Visitor not found' })
  async getTouchpoints(
    @Param('visitorId') visitorId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    try {
      const timeRange: TimeRange = {
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      };

      return await this.attributionService.getTouchpoints(visitorId, timeRange);

    } catch (error) {
      throw new Error(`Failed to retrieve touchpoints: ${error.message}`);
    }
  }

  @Put('model/config')
  @RateLimit({ ttl: 60, limit: 50 })
  @ApiOperation({ summary: 'Update attribution model configuration' })
  @ApiResponse({ status: 200, description: 'Model configuration updated' })
  @ApiResponse({ status: 400, description: 'Invalid configuration' })
  async updateModelConfig(
    @Body('model') model: AttributionModel,
    @Body('config') config: AttributionConfig
  ) {
    try {
      // Validate configuration
      const validationResult = await attributionModelConfigSchema.validateAsync(config);
      if (validationResult.error) {
        throw new Error(`Invalid configuration: ${validationResult.error.message}`);
      }

      // Validate model configuration
      if (!this.modelService.validateConfig(config)) {
        throw new Error('Invalid model configuration');
      }

      // Update model configuration
      const updatedConfig = await this.modelService.calculateAttribution(
        model,
        [],
        config
      );

      return {
        success: true,
        model,
        config: updatedConfig
      };

    } catch (error) {
      throw new Error(`Failed to update model configuration: ${error.message}`);
    }
  }
}