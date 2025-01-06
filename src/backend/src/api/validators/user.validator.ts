import Joi from 'joi'; // v17.9.0
import { ValidationService } from '../../lib/validation/validation.service';
import { ValidationError } from '../../types/error.types';

/**
 * Constants for validation configuration
 */
const VALIDATION_TIMEOUT_MS = 5000;
const SCHEMA_VERSION = '1.0.0';
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

/**
 * User registration validation schema with enhanced security rules
 */
const USER_REGISTRATION_SCHEMA = Joi.object({
  email: Joi.string()
    .email({ minDomainSegments: 2, tlds: { allow: true } })
    .max(255)
    .lowercase()
    .trim()
    .required()
    .messages({
      'string.email': 'Email must be a valid email address',
      'string.max': 'Email cannot exceed 255 characters',
      'any.required': 'Email is required'
    }),

  password: Joi.string()
    .pattern(PASSWORD_REGEX)
    .min(8)
    .max(128)
    .required()
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password cannot exceed 128 characters',
      'any.required': 'Password is required'
    }),

  name: Joi.string()
    .min(2)
    .max(100)
    .trim()
    .required()
    .messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 100 characters',
      'any.required': 'Name is required'
    }),

  company: Joi.string()
    .min(2)
    .max(100)
    .trim()
    .optional()
    .messages({
      'string.min': 'Company name must be at least 2 characters long',
      'string.max': 'Company name cannot exceed 100 characters'
    }),

  role: Joi.string()
    .valid('admin', 'analyst', 'user')
    .default('user')
    .messages({
      'any.only': 'Role must be one of: admin, analyst, user'
    })
}).options({ stripUnknown: true, abortEarly: false });

/**
 * User profile update validation schema with preference validation
 */
const USER_PROFILE_UPDATE_SCHEMA = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .trim()
    .optional()
    .messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 100 characters'
    }),

  company: Joi.string()
    .min(2)
    .max(100)
    .trim()
    .optional()
    .messages({
      'string.min': 'Company name must be at least 2 characters long',
      'string.max': 'Company name cannot exceed 100 characters'
    }),

  role: Joi.string()
    .valid('admin', 'analyst', 'user')
    .optional()
    .messages({
      'any.only': 'Role must be one of: admin, analyst, user'
    }),

  preferences: Joi.object({
    theme: Joi.string()
      .valid('light', 'dark', 'system')
      .default('system'),
    notifications: Joi.object({
      email: Joi.boolean().default(true),
      push: Joi.boolean().default(true),
      frequency: Joi.string()
        .valid('immediate', 'daily', 'weekly')
        .default('immediate')
    }),
    timezone: Joi.string()
      .pattern(/^[A-Za-z]+\/[A-Za-z_]+$/)
      .default('UTC')
  }).optional()
}).options({ stripUnknown: true, abortEarly: false });

/**
 * Registers all user-related validation schemas with version tracking
 * @param validationService - Instance of ValidationService
 */
export async function registerUserValidationSchemas(
  validationService: ValidationService
): Promise<void> {
  // Register user registration schema
  validationService.registerSchema('userRegistration', {
    schema: USER_REGISTRATION_SCHEMA,
    version: SCHEMA_VERSION,
    cacheable: true,
    timeoutMs: VALIDATION_TIMEOUT_MS
  });

  // Register profile update schema
  validationService.registerSchema('userProfileUpdate', {
    schema: USER_PROFILE_UPDATE_SCHEMA,
    version: SCHEMA_VERSION,
    cacheable: true,
    timeoutMs: VALIDATION_TIMEOUT_MS
  });
}

/**
 * Validates user registration data with enhanced security checks
 * @param data - User registration data to validate
 * @throws ValidationError if validation fails
 */
export async function validateUserRegistration(
  data: unknown
): Promise<void> {
  try {
    const validationService = new ValidationService();
    const result = await validationService.validateSchema('userRegistration', data, {
      cache: true,
      allowUnknown: false,
      stripUnknown: true
    });

    if (!result.isValid) {
      throw new ValidationError('User registration validation failed', {
        errorCode: 'VALIDATION_ERROR',
        errorMessage: 'Invalid user registration data',
        category: 'VALIDATION',
        timestamp: new Date(),
        traceId: '',
        serviceName: 'validation-service',
        environment: process.env.NODE_ENV || 'development',
        additionalInfo: { validationErrors: result.errors },
        stackTrace: [],
        metadata: { schemaVersion: result.schemaVersion }
      });
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError('Validation service error', {
      errorCode: 'VALIDATION_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown validation error',
      category: 'VALIDATION',
      timestamp: new Date(),
      traceId: '',
      serviceName: 'validation-service',
      environment: process.env.NODE_ENV || 'development',
      additionalInfo: {},
      stackTrace: error instanceof Error ? error.stack?.split('\n') || [] : [],
      metadata: {}
    });
  }
}

/**
 * Validates profile update data with preference validation
 * @param data - Profile update data to validate
 * @throws ValidationError if validation fails
 */
export async function validateProfileUpdate(
  data: unknown
): Promise<void> {
  try {
    const validationService = new ValidationService();
    const result = await validationService.validateSchema('userProfileUpdate', data, {
      cache: true,
      allowUnknown: false,
      stripUnknown: true
    });

    if (!result.isValid) {
      throw new ValidationError('Profile update validation failed', {
        errorCode: 'VALIDATION_ERROR',
        errorMessage: 'Invalid profile update data',
        category: 'VALIDATION',
        timestamp: new Date(),
        traceId: '',
        serviceName: 'validation-service',
        environment: process.env.NODE_ENV || 'development',
        additionalInfo: { validationErrors: result.errors },
        stackTrace: [],
        metadata: { schemaVersion: result.schemaVersion }
      });
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError('Validation service error', {
      errorCode: 'VALIDATION_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown validation error',
      category: 'VALIDATION',
      timestamp: new Date(),
      traceId: '',
      serviceName: 'validation-service',
      environment: process.env.NODE_ENV || 'development',
      additionalInfo: {},
      stackTrace: error instanceof Error ? error.stack?.split('\n') || [] : [],
      metadata: {}
    });
  }
}