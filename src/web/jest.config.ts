import type { Config } from '@jest/types'; // v29.0+

const config: Config.InitialOptions = {
  // Test environment configuration
  testEnvironment: 'jsdom',
  
  // Source file locations
  roots: ['<rootDir>/src'],
  
  // Test setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  
  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)'
  ],
  
  // TypeScript transformation
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  
  // Module path mappings
  moduleNameMapper: {
    // Alias mappings
    '^@/(.*)$': '<rootDir>/src/$1',
    
    // Style file mocks
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    
    // Asset file mocks
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': 
      '<rootDir>/tests/__mocks__/fileMock.ts'
  },
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/vite-env.d.ts',
    '!src/main.tsx'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Watch plugins for better development experience
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],
  
  // Additional configuration options
  verbose: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // Timing configuration
  testTimeout: 10000,
  
  // Error handling
  bail: 1,
  
  // Reporting configuration
  reporters: ['default'],
  
  // Cache configuration
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // Global configuration
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json',
      diagnostics: true
    }
  }
};

export default config;