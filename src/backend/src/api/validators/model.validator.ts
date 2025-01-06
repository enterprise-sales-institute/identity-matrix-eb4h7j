import Joi from 'joi'; // v17.9.0
import { ValidationService } from '../../lib/validation/validation.service';
import { 
  AttributionModel,
  Channel
} from '../../core/attribution/types/attribution.types';

// Constants for validation rules
const MAX_ATTRIBUTION_WINDOW_DAYS = 90;
const MIN_WEIGHT = 0;
const MAX_WEIGHT = 1;
const WEIGHT_PRECISION = 4;
const MIN_DECAY_HALF_LIFE = 1;
const MAX_DECAY_HALF_LIFE = 30;
const WEIGHT_SUM_TOLERANCE = 0.0001;

/**
 * Schema for validating channel weights with precise sum validation
 */
const CHANNEL_WEIGHTS_SCHEMA = Joi.object().pattern(
  Joi.string().valid(...Object.values(Channel)),
  Joi.number()
    .min(MIN_WEIGHT)
    .max(MAX_WEIGHT)
    .precision(WEIGHT_PRECISION)
    .required()
).custom((value, helpers) => {
  const sum = Object.values(value).reduce((acc, weight) => acc + weight, 0);
  if (Math.abs(sum - 1) > WEIGHT_SUM_TOLERANCE) {
    return helpers.error('channelWeights.sumError');
  }
  return value;
}, 'channel weights sum validation').required()
.messages({
  'channelWeights.sumError': 'Channel weights must sum to exactly 1.0',
  'number.min': 'Weight must be greater than or equal to {{#limit}}',
  'number.max': 'Weight must be less than or equal to {{#limit}}',
  'number.precision': `Weight must have at most ${WEIGHT_PRECISION} decimal places`
});

/**
 * Schema for validating attribution window configuration
 */
const ATTRIBUTION_WINDOW_SCHEMA = Joi.object({
  startDate: Joi.date().iso().required()
    .messages({
      'date.base': 'Start date must be a valid date',
      'date.format': 'Start date must be in ISO format'
    }),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).required()
    .custom((value, helpers) => {
      const start = helpers.state.ancestors[0].startDate;
      const days = Math.ceil((value - start) / (1000 * 60 * 60 * 24));
      if (days > MAX_ATTRIBUTION_WINDOW_DAYS) {
        return helpers.error('date.range');
      }
      return value;
    })
    .messages({
      'date.base': 'End date must be a valid date',
      'date.format': 'End date must be in ISO format',
      'date.min': 'End date must be after start date',
      'date.range': `Attribution window cannot exceed ${MAX_ATTRIBUTION_WINDOW_DAYS} days`
    })
}).required();

/**
 * Schema for validating complete model configuration
 */
const MODEL_CONFIG_SCHEMA = Joi.object({
  model: Joi.string()
    .valid(...Object.values(AttributionModel))
    .required()
    .messages({
      'any.required': 'Attribution model type is required',
      'any.only': 'Invalid attribution model type'
    }),

  attributionWindow: ATTRIBUTION_WINDOW_SCHEMA,
  
  channelWeights: CHANNEL_WEIGHTS_SCHEMA,

  includeTimeDecay: Joi.boolean()
    .when('model', {
      is: AttributionModel.TIME_DECAY,
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'any.required': 'Time decay configuration is required for time decay model'
    }),

  decayHalfLife: Joi.number()
    .integer()
    .min(MIN_DECAY_HALF_LIFE)
    .max(MAX_DECAY_HALF_LIFE)
    .when('includeTimeDecay', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.forbidden()
    })
    .messages({
      'number.base': 'Decay half-life must be a number',
      'number.integer': 'Decay half-life must be an integer',
      'number.min': `Decay half-life must be at least ${MIN_DECAY_HALF_LIFE} day`,
      'number.max': `Decay half-life cannot exceed ${MAX_DECAY_HALF_LIFE} days`,
      'any.required': 'Decay half-life is required when time decay is enabled'
    }),

  customRules: Joi.object()
    .pattern(
      Joi.string(),
      Joi.object({
        condition: Joi.string().required(),
        weight: Joi.number()
          .min(MIN_WEIGHT)
          .max(MAX_WEIGHT)
          .precision(WEIGHT_PRECISION)
          .required()
      })
    )
    .optional()
}).required();

/**
 * Schema for validating model update requests
 */
const MODEL_UPDATE_SCHEMA = Joi.object({
  modelId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Invalid model ID format',
      'any.required': 'Model ID is required'
    }),

  updates: Joi.object({
    channelWeights: CHANNEL_WEIGHTS_SCHEMA.optional(),
    includeTimeDecay: Joi.boolean().optional(),
    decayHalfLife: Joi.number()
      .integer()
      .min(MIN_DECAY_HALF_LIFE)
      .max(MAX_DECAY_HALF_LIFE)
      .optional(),
    customRules: Joi.object().optional()
  }).min(1).required(),

  version: Joi.number()
    .integer()
    .min(1)
    .optional()
    .messages({
      'number.base': 'Version must be a number',
      'number.integer': 'Version must be an integer',
      'number.min': 'Version must be greater than 0'
    })
}).required();

/**
 * Registers all attribution model related validation schemas
 * @param validationService - Instance of ValidationService for schema registration
 */
export function registerModelValidators(validationService: ValidationService): void {
  // Register model configuration schema
  validationService.registerSchema('modelConfig', {
    schema: MODEL_CONFIG_SCHEMA,
    version: '1.0.0',
    cacheable: true,
    timeoutMs: 5000
  });

  // Register channel weights schema
  validationService.registerSchema('channelWeights', {
    schema: CHANNEL_WEIGHTS_SCHEMA,
    version: '1.0.0',
    cacheable: true,
    timeoutMs: 3000
  });

  // Register attribution window schema
  validationService.registerSchema('attributionWindow', {
    schema: ATTRIBUTION_WINDOW_SCHEMA,
    version: '1.0.0',
    cacheable: true,
    timeoutMs: 3000
  });

  // Register model update schema
  validationService.registerSchema('modelUpdate', {
    schema: MODEL_UPDATE_SCHEMA,
    version: '1.0.0',
    cacheable: true,
    timeoutMs: 5000
  });
}