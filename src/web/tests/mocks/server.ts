/**
 * @fileoverview Mock Service Worker (MSW) server configuration for frontend testing
 * @version 1.0.0
 */

// External imports
import { setupServer } from 'msw/node'; // v1.2.1

// Internal imports - Request handlers for different API endpoints
import { 
  analyticsHandlers, 
  attributionHandlers, 
  authHandlers 
} from './handlers';

/**
 * Configure and export MSW server instance with combined request handlers
 * Provides comprehensive API mocking support for:
 * - Analytics endpoints
 * - Attribution endpoints
 * - Authentication endpoints
 * 
 * The server supports:
 * - Request interception
 * - Response mocking
 * - Error simulation
 * - Test isolation through handler reset
 */
export const server = setupServer(
  ...analyticsHandlers,
  ...attributionHandlers,
  ...authHandlers
);

/**
 * Server instance provides the following methods:
 * - listen(): Start the request interception
 * - close(): Stop the request interception
 * - resetHandlers(): Reset handlers to initial state for test isolation
 * - use(): Add runtime request handlers
 */