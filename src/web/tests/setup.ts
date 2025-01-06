/**
 * @fileoverview Global test setup configuration for Jest testing framework
 * @version 1.0.0
 */

// External imports
import '@testing-library/jest-dom'; // v5.16+
import { cleanup } from '@testing-library/react';
import 'jest-environment-jsdom'; // v29.0+

// Internal imports
import { server } from './mocks/server';

/**
 * Configure console error and warning handling for tests
 */
const setupConsoleHandling = (): void => {
  // Store original console methods
  const originalError = console.error;
  const originalWarn = console.warn;

  // Override console.error for test validation
  console.error = (...args: any[]): void => {
    const errorMessage = args.join(' ');
    
    // Ignore specific React internal warnings
    if (
      errorMessage.includes('React does not recognize the') ||
      errorMessage.includes('Warning: componentWillReceiveProps')
    ) {
      return;
    }
    
    // Fail tests on unhandled errors
    throw new Error(`Console error triggered during test: ${errorMessage}`);
  };

  // Override console.warn for test validation
  console.warn = (...args: any[]): void => {
    const warningMessage = args.join(' ');
    
    // Ignore specific React warnings
    if (warningMessage.includes('componentWillMount')) {
      return;
    }
    
    // Log warnings but don't fail tests
    originalWarn.apply(console, args);
  };

  // Store cleanup function
  (global as any).__cleanupConsole = () => {
    console.error = originalError;
    console.warn = originalWarn;
  };
};

/**
 * Configure all global mocks and polyfills required for testing environment
 */
const setupGlobalMocks = (): void => {
  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn()
    }))
  });

  // Mock ResizeObserver
  window.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn()
  }));

  // Mock IntersectionObserver
  window.IntersectionObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
    root: null,
    rootMargin: '',
    thresholds: []
  }));

  // Setup console error handling
  setupConsoleHandling();
};

/**
 * Clean up all global mocks and restore original implementations
 */
const cleanupGlobalMocks = (): void => {
  // Restore console handling
  if ((global as any).__cleanupConsole) {
    (global as any).__cleanupConsole();
  }

  // Clear all mocks
  jest.clearAllMocks();
};

// Configure global test setup
beforeAll(() => {
  // Start MSW server with strict validation
  server.listen({
    onUnhandledRequest: 'error',
    waitForRequestsToComplete: true
  });

  // Setup global mocks and browser environment
  setupGlobalMocks();
});

// Reset handlers after each test for isolation
afterEach(() => {
  server.resetHandlers();
  cleanup();
});

// Clean up after all tests complete
afterAll(() => {
  server.close();
  cleanupGlobalMocks();
});