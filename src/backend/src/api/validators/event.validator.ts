/**
 * Enhanced validator module for event-related API requests implementing strict Joi schemas
 * with comprehensive validation rules, security checks, and detailed error messaging
 * @version 1.0.0
 */

import Joi from 'joi'; // v17.9.0
import { Event, EventType } from '../../core/events/types/event.types';
import { ValidationService } from '../../lib/validation/validation.service';

// Schema names for registration
const EVENT_SCHEMA_NAME = 'event';
const EVENT_BATCH_SCHEMA_NAME = 'eventBatch';
const EVENT_QUERY_SCHEMA_NAME = 'eventQuery';

// Validation constraints
const MAX_BATCH_SIZE = 1000;
const MAX_QUERY_LIMIT = 100;
const MAX_STRING_LENGTH = 1024;

/**
 * Creates and registers enhanced Joi validation schema for single event validation
 * with strict type checking and security rules
 */
const createEventSchema = (): Joi.ObjectSchema => {
  const schema = Joi.object({
    id: Joi.string()
      .uuid()
      .required()
      .description('Unique event identifier'),

    visitorId: Joi.string()
      .max(MAX_STRING_LENGTH)
      .pattern(/^[a-zA-Z0-9-_]+$/)
      .required()
      .description('Unique visitor identifier'),

    sessionId: Joi.string()
      .max(MAX_STRING_LENGTH)
      .pattern(/^[a-zA-Z0-9-_]+$/)
      .required()
      .description('Session identifier'),

    type: Joi.string()
      .valid(...Object.values(EventType))
      .required()
      .description('Event type'),

    timestamp: Joi.date()
      .iso()
      .max('now')
      .required()
      .description('Event timestamp in ISO8601 format'),

    properties: Joi.object()
      .pattern(
        Joi.string().max(50), // Key length limit
        Joi.alternatives().try(
          Joi.string().max(MAX_STRING_LENGTH),
          Joi.number(),
          Joi.boolean(),
          Joi.array().items(Joi.string().max(MAX_STRING_LENGTH)).max(100)
        )
      )
      .max(50) // Max number of properties
      .required()
      .description('Event properties'),

    metadata: Joi.object({
      source: Joi.string().max(100).required(),
      version: Joi.string().max(20).required(),
      environment: Joi.string().max(50).required(),
      tags: Joi.object()
        .pattern(
          Joi.string().max(50),
          Joi.string().max(100)
        )
        .max(20)
    }).required()
  })
    .required()
    .strict();

  ValidationService.registerSchema(EVENT_SCHEMA_NAME, {
    schema,
    version: '1.0.0',
    cacheable: true,
    timeoutMs: 5000
  });

  return schema;
};

/**
 * Creates and registers enhanced Joi validation schema for batch event validation
 * with size limits and performance optimization
 */
const createEventBatchSchema = (): Joi.ObjectSchema => {
  const eventSchema = createEventSchema();

  const schema = Joi.object({
    events: Joi.array()
      .items(eventSchema)
      .min(1)
      .max(MAX_BATCH_SIZE)
      .required()
      .description('Array of events'),

    batchId: Joi.string()
      .uuid()
      .required()
      .description('Unique batch identifier'),

    metadata: Joi.object({
      source: Joi.string().max(100).required(),
      timestamp: Joi.date().iso().max('now').required(),
      totalEvents: Joi.number().integer().min(1).max(MAX_BATCH_SIZE).required()
    }).required()
  })
    .required()
    .strict();

  ValidationService.registerSchema(EVENT_BATCH_SCHEMA_NAME, {
    schema,
    version: '1.0.0',
    cacheable: true,
    timeoutMs: 10000
  });

  return schema;
};

/**
 * Creates and registers enhanced Joi validation schema for event query parameters
 * with comprehensive validation rules
 */
const createEventQuerySchema = (): Joi.ObjectSchema => {
  const schema = Joi.object({
    timeRange: Joi.object({
      start: Joi.date().iso().required(),
      end: Joi.date().iso().max('now').required()
    })
      .required()
      .custom((value, helpers) => {
        if (value.end <= value.start) {
          return helpers.error('End date must be after start date');
        }
        return value;
      }),

    visitorIds: Joi.array()
      .items(
        Joi.string()
          .max(MAX_STRING_LENGTH)
          .pattern(/^[a-zA-Z0-9-_]+$/)
      )
      .max(100)
      .unique(),

    types: Joi.array()
      .items(Joi.string().valid(...Object.values(EventType)))
      .max(20)
      .unique(),

    filters: Joi.object()
      .pattern(
        Joi.string().max(50),
        Joi.alternatives().try(
          Joi.string().max(MAX_STRING_LENGTH),
          Joi.number(),
          Joi.boolean(),
          Joi.array().items(Joi.string().max(MAX_STRING_LENGTH)).max(50)
        )
      )
      .max(20),

    pagination: Joi.object({
      limit: Joi.number()
        .integer()
        .min(1)
        .max(MAX_QUERY_LIMIT)
        .default(20),
      offset: Joi.number()
        .integer()
        .min(0)
        .default(0),
      sortBy: Joi.string()
        .valid('timestamp', 'type', 'visitorId')
        .default('timestamp'),
      sortOrder: Joi.string()
        .valid('asc', 'desc')
        .default('desc')
    }).default()
  })
    .required()
    .strict();

  ValidationService.registerSchema(EVENT_QUERY_SCHEMA_NAME, {
    schema,
    version: '1.0.0',
    cacheable: true,
    timeoutMs: 3000
  });

  return schema;
};

// Create and export validation schemas
export const eventSchema = createEventSchema();
export const eventBatchSchema = createEventBatchSchema();
export const eventQuerySchema = createEventQuerySchema();