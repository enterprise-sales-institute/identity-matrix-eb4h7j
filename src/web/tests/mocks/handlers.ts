/**
 * @fileoverview Mock Service Worker (MSW) request handlers for frontend testing
 * @version 1.0.0
 */

// External imports - v1.2.1
import { rest, PathParams } from 'msw';
import { setupWorker } from 'msw';

// Internal imports
import { AnalyticsMetric } from '../../src/types/analytics.types';
import { ApiResponse, ValidationError } from '../../src/types/common.types';

// Constants for response simulation
const RESPONSE_DELAY = 200; // Simulated network delay in ms
const ERROR_PROBABILITY = 0.1; // 10% chance of error response

/**
 * Creates mock handlers for analytics API endpoints
 */
const createAnalyticsHandlers = () => [
  // GET /api/analytics/dashboard
  rest.get('/api/analytics/dashboard', (req, res, ctx) => {
    // Simulate random errors
    if (Math.random() < ERROR_PROBABILITY) {
      return res(
        ctx.delay(RESPONSE_DELAY),
        ctx.status(500),
        ctx.json<ApiResponse<null>>({
          success: false,
          data: null,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch dashboard data'
          }
        })
      );
    }

    return res(
      ctx.delay(RESPONSE_DELAY),
      ctx.json<ApiResponse<any>>({
        success: true,
        data: {
          metrics: {
            [AnalyticsMetric.CONVERSION_RATE]: 0.156,
            [AnalyticsMetric.REVENUE]: 125000,
            [AnalyticsMetric.TOUCHPOINTS]: 45678
          },
          trends: {
            conversion: 0.05,
            revenue: 0.12,
            touchpoints: -0.03
          }
        }
      })
    );
  }),

  // GET /api/analytics/channels
  rest.get('/api/analytics/channels', (req, res, ctx) => {
    const timeRange = req.url.searchParams.get('timeRange');
    
    if (!timeRange) {
      return res(
        ctx.status(400),
        ctx.json<ApiResponse<null>>({
          success: false,
          data: null,
          error: {
            code: 'INVALID_PARAMS',
            message: 'Missing required timeRange parameter'
          }
        })
      );
    }

    return res(
      ctx.delay(RESPONSE_DELAY),
      ctx.json<ApiResponse<any>>({
        success: true,
        data: {
          channels: [
            {
              id: 'social',
              name: 'Social Media',
              metrics: {
                [AnalyticsMetric.CONVERSION_RATE]: 0.12,
                [AnalyticsMetric.REVENUE]: 45000,
                [AnalyticsMetric.TOUCHPOINTS]: 15000
              }
            },
            {
              id: 'email',
              name: 'Email Marketing',
              metrics: {
                [AnalyticsMetric.CONVERSION_RATE]: 0.18,
                [AnalyticsMetric.REVENUE]: 65000,
                [AnalyticsMetric.TOUCHPOINTS]: 22000
              }
            }
          ]
        }
      })
    );
  })
];

/**
 * Creates mock handlers for attribution configuration endpoints
 */
const createAttributionHandlers = () => [
  // GET /api/attribution/models
  rest.get('/api/attribution/models', (req, res, ctx) => {
    return res(
      ctx.delay(RESPONSE_DELAY),
      ctx.json<ApiResponse<any>>({
        success: true,
        data: {
          models: [
            {
              id: 'first-touch',
              name: 'First Touch',
              weights: {
                social: 1.0,
                email: 0.0,
                search: 0.0
              }
            },
            {
              id: 'last-touch',
              name: 'Last Touch',
              weights: {
                social: 0.0,
                email: 0.0,
                search: 1.0
              }
            }
          ]
        }
      })
    );
  }),

  // PUT /api/attribution/models/:id
  rest.put('/api/attribution/models/:id', (req, res, ctx) => {
    const { id } = req.params;
    const body = req.body as any;

    if (!body.weights || Object.values(body.weights).reduce((a: number, b: number) => a + b, 0) !== 1) {
      return res(
        ctx.status(400),
        ctx.json<ApiResponse<null>>({
          success: false,
          data: null,
          error: {
            code: 'INVALID_WEIGHTS',
            message: 'Channel weights must sum to 1.0'
          }
        })
      );
    }

    return res(
      ctx.delay(RESPONSE_DELAY),
      ctx.json<ApiResponse<any>>({
        success: true,
        data: {
          id,
          ...body,
          updatedAt: new Date().toISOString()
        }
      })
    );
  })
];

/**
 * Creates mock handlers for authentication endpoints
 */
const createAuthHandlers = () => [
  // POST /api/auth/login
  rest.post('/api/auth/login', async (req, res, ctx) => {
    const body = await req.json();

    if (!body.email || !body.password) {
      return res(
        ctx.status(400),
        ctx.json<ApiResponse<null>>({
          success: false,
          data: null,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Email and password are required'
          }
        })
      );
    }

    return res(
      ctx.delay(RESPONSE_DELAY),
      ctx.json<ApiResponse<any>>({
        success: true,
        data: {
          token: 'mock-jwt-token',
          user: {
            id: 'user-1',
            email: body.email,
            role: 'admin'
          }
        }
      })
    );
  }),

  // POST /api/auth/logout
  rest.post('/api/auth/logout', (req, res, ctx) => {
    return res(
      ctx.delay(RESPONSE_DELAY),
      ctx.json<ApiResponse<null>>({
        success: true,
        data: null
      })
    );
  })
];

// Combine all handlers
export const handlers = [
  ...createAnalyticsHandlers(),
  ...createAttributionHandlers(),
  ...createAuthHandlers()
];