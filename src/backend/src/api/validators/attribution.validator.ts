import Joi from 'joi'; // v17.9.0
import { ValidationService } from '../../lib/validation/validation.service';
import { AttributionModel } from '../../core/attribution/types/attribution.types';

/**
 * Schema names for attribution validation
 */
const SCHEMA_NAMES = {
  ATTRIBUTION_MODEL_CONFIG: 'attributionModelConfig',
  ATTRIBUTION_CALCULATION: 'attributionCalculation',
  ATTRIBUTION_PERIOD: 'attributionPeriod',
  CHANNEL_WEIGHTS: 'channelWeights',
  TOUCHPOINT_SEQUENCE: 'touchpointSequence'
} as const;

/**
 * Validation error messages
 */
const VALIDATION_MESSAGES = {
  INVALID_MODEL: 'Invalid attribution model type',
  INVALID_WINDOW: 'Attribution window must be between 1 and 90 days',
  INVALID_WEIGHTS: 'Channel weights must sum to 1',
  INVALID_DECAY: 'Decay half-life must be positive',
  INVALID_TOUCHPOINT: 'Invalid touchpoint data format',
  INVALID_CONVERSION: 'Conversion value must be positive',
  INVALID_TIMESTAMP: 'Timestamp must be within attribution window',
  INVALID_SEQUENCE: 'Touchpoint sequence is invalid'
} as const;

/**
 * Validation limits and constraints
 */
const VALIDATION_LIMITS = {
  MAX_WINDOW_DAYS: 90,
  MIN_WINDOW_DAYS: 1,
  MAX_CONVERSION_VALUE: 1000000,
  MIN_CONVERSION_VALUE: 0,
  MAX_TOUCHPOINTS: 100,
  MAX_CHANNELS: 20
} as const;

/**
 * Attribution model configuration validation schema
 */
export const attributionModelConfigSchema = Joi.object({
  model: Joi.string()
    .valid(...Object.values(AttributionModel))
    .required()
    .messages({
      'any.required': VALIDATION_MESSAGES.INVALID_MODEL,
      'any.only': VALIDATION_MESSAGES.INVALID_MODEL
    }),

  attributionWindow: Joi.object({
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
    days: Joi.number()
      .min(VALIDATION_LIMITS.MIN_WINDOW_DAYS)
      .max(VALIDATION_LIMITS.MAX_WINDOW_DAYS)
      .required()
  }).required(),

  channelWeights: Joi.object()
    .pattern(
      Joi.string(),
      Joi.number().min(0).max(1)
    )
    .custom((value, helpers) => {
      const sum = Object.values(value).reduce((acc, weight) => acc + weight, 0);
      if (Math.abs(sum - 1) > 0.0001) {
        return helpers.error('custom.weights');
      }
      return value;
    })
    .max(VALIDATION_LIMITS.MAX_CHANNELS)
    .messages({
      'custom.weights': VALIDATION_MESSAGES.INVALID_WEIGHTS
    }),

  decayParameters: Joi.object({
    halfLifeDays: Joi.number().positive().required(),
    minimumWeight: Joi.number().min(0).max(1).required()
  }).when('model', {
    is: AttributionModel.TIME_DECAY,
    then: Joi.required(),
    otherwise: Joi.forbidden()
  })
}).required();

/**
 * Attribution calculation request validation schema
 */
export const attributionCalculationSchema = Joi.object({
  touchpoints: Joi.array()
    .items(
      Joi.object({
        id: Joi.string().required(),
        channel: Joi.string().required(),
        timestamp: Joi.date().iso().required(),
        value: Joi.number().min(0).required(),
        metadata: Joi.object({
          source: Joi.string().required(),
          campaign: Joi.string(),
          medium: Joi.string(),
          content: Joi.string(),
          term: Joi.string(),
          position: Joi.number().integer().min(0).required()
        }).required()
      })
    )
    .min(1)
    .max(VALIDATION_LIMITS.MAX_TOUCHPOINTS)
    .required(),

  conversionValue: Joi.number()
    .min(VALIDATION_LIMITS.MIN_CONVERSION_VALUE)
    .max(VALIDATION_LIMITS.MAX_CONVERSION_VALUE)
    .required(),

  metadata: Joi.object({
    visitorId: Joi.string().required(),
    sessionId: Joi.string().required(),
    conversionId: Joi.string().required(),
    timestamp: Joi.date().iso().required()
  }).required()
}).required();

/**
 * Registers all attribution validation schemas with the validation service
 * @param validationService - Instance of ValidationService
 */
export function registerAttributionSchemas(validationService: ValidationService): void {
  // Register attribution model configuration schema
  validationService.registerSchema(SCHEMA_NAMES.ATTRIBUTION_MODEL_CONFIG, {
    schema: attributionModelConfigSchema,
    version: '1.0.0',
    cacheable: true,
    timeoutMs: 5000
  });

  // Register attribution calculation schema
  validationService.registerSchema(SCHEMA_NAMES.ATTRIBUTION_CALCULATION, {
    schema: attributionCalculationSchema,
    version: '1.0.0',
    cacheable: true,
    timeoutMs: 5000
  });

  // Register channel weights schema
  validationService.registerSchema(SCHEMA_NAMES.CHANNEL_WEIGHTS, {
    schema: Joi.object().pattern(
      Joi.string(),
      Joi.number().min(0).max(1)
    ).custom((value, helpers) => {
      const sum = Object.values(value).reduce((acc, weight) => acc + weight, 0);
      if (Math.abs(sum - 1) > 0.0001) {
        return helpers.error('custom.weights');
      }
      return value;
    }),
    version: '1.0.0',
    cacheable: true,
    timeoutMs: 3000
  });

  // Register attribution period schema
  validationService.registerSchema(SCHEMA_NAMES.ATTRIBUTION_PERIOD, {
    schema: Joi.object({
      startDate: Joi.date().iso().required(),
      endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
      days: Joi.number()
        .min(VALIDATION_LIMITS.MIN_WINDOW_DAYS)
        .max(VALIDATION_LIMITS.MAX_WINDOW_DAYS)
        .required()
    }),
    version: '1.0.0',
    cacheable: true,
    timeoutMs: 3000
  });

  // Register touchpoint sequence schema
  validationService.registerSchema(SCHEMA_NAMES.TOUCHPOINT_SEQUENCE, {
    schema: Joi.array()
      .items(
        Joi.object({
          id: Joi.string().required(),
          channel: Joi.string().required(),
          timestamp: Joi.date().iso().required(),
          position: Joi.number().integer().min(0).required()
        })
      )
      .min(1)
      .max(VALIDATION_LIMITS.MAX_TOUCHPOINTS),
    version: '1.0.0',
    cacheable: true,
    timeoutMs: 3000
  });
}