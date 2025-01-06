import type { Config } from '@jest/types'; // v29.0.0

const config: Config.InitialOptions = {
  // Use ts-jest preset for TypeScript support
  preset: 'ts-jest',

  // Set Node.js as the test environment
  testEnvironment: 'node',

  // Define root directories for test discovery
  roots: [
    '<rootDir>/src',
    '<rootDir>/tests'
  ],

  // Setup file to run after Jest is loaded
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.ts'
  ],

  // Path mapping for @ alias to match tsconfig
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },

  // Enable code coverage collection
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'json-summary'
  ],

  // Set strict coverage thresholds for security and quality
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx)',
    '**/?(*.)+(spec|test).+(ts|tsx)'
  ],

  // TypeScript transformation configuration
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },

  // Supported file extensions
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json'
  ],

  // Test timeout setting
  testTimeout: 30000,

  // Enable verbose test output
  verbose: true,

  // Paths to ignore during testing
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/'
  ],

  // Paths to ignore during watch mode
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/dist/'
  ]
};

export default config;