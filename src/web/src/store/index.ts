/**
 * @fileoverview Root Redux store configuration with enterprise-grade features
 * @version 1.0.0
 */

// External imports - v1.9+
import { 
  configureStore, 
  combineReducers, 
  createListenerMiddleware,
  createSerializableStateInvariantMiddleware,
  isPlain,
  Middleware
} from '@reduxjs/toolkit';

// Internal imports - Reducers
import uiReducer from './slices/uiSlice';
import authReducer from './slices/authSlice';
import analyticsReducer from './slices/analyticsSlice';
import attributionReducer from './slices/attributionSlice';

// Define root state interface for type safety
export interface RootState {
  ui: ReturnType<typeof uiReducer>;
  auth: ReturnType<typeof authReducer>;
  analytics: ReturnType<typeof analyticsReducer>;
  attribution: ReturnType<typeof attributionReducer>;
}

// Initialize performance monitoring middleware
const listenerMiddleware = createListenerMiddleware({
  onError: (error, { type }) => {
    console.error(`Error in listener for action ${type}:`, error);
  }
});

// Configure serializable state check middleware with custom options
const serializableMiddleware = createSerializableStateInvariantMiddleware({
  ignoredActions: ['auth/loginSuccess', 'analytics/setDashboardData'],
  ignoredPaths: ['analytics.dashboardData.lastUpdated'],
  isSerializable: (value: unknown) => isPlain(value) || value instanceof Date,
});

// Configure environment-specific middleware
const getEnvironmentMiddleware = (): Middleware[] => {
  const middleware: Middleware[] = [
    listenerMiddleware.middleware,
    serializableMiddleware
  ];

  // Add development-only middleware
  if (process.env.NODE_ENV === 'development') {
    const { createLogger } = require('redux-logger');
    middleware.push(createLogger({
      collapsed: true,
      duration: true,
      timestamp: false,
      diff: true
    }));
  }

  return middleware;
};

// Combine reducers with type safety
const rootReducer = combineReducers<RootState>({
  ui: uiReducer,
  auth: authReducer,
  analytics: analyticsReducer,
  attribution: attributionReducer
});

// Configure store with performance optimizations
const configureAppStore = (preloadedState?: Partial<RootState>) => {
  const store = configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) => 
      getDefaultMiddleware({
        thunk: true,
        serializableCheck: false, // Handled by custom middleware
        immutableCheck: {
          warnAfter: 100
        }
      }).concat(getEnvironmentMiddleware()),
    preloadedState,
    devTools: process.env.NODE_ENV !== 'production' && {
      name: 'Attribution Analytics',
      maxAge: 50,
      latency: 250,
      trace: true,
      traceLimit: 25
    }
  });

  // Enable hot module replacement for reducers in development
  if (process.env.NODE_ENV === 'development' && module.hot) {
    module.hot.accept('./slices', () => {
      store.replaceReducer(rootReducer);
    });
  }

  // Setup performance monitoring
  setupStoreMonitoring(store);

  return store;
};

/**
 * Configures performance monitoring for state updates
 */
const setupStoreMonitoring = (store: ReturnType<typeof configureAppStore>) => {
  listenerMiddleware.startListening({
    predicate: (action, currentState, previousState) => {
      const start = performance.now();
      const shouldTrack = true; // Add custom logic if needed
      
      if (shouldTrack) {
        const duration = performance.now() - start;
        if (duration > 16.67) { // Longer than one frame (60fps)
          console.warn(`Slow state update detected for action ${action.type}: ${duration.toFixed(2)}ms`);
        }
      }
      
      return false; // Don't actually handle the action
    }
  });
};

// Create and export store instance
export const store = configureAppStore();

// Export useful types
export type AppDispatch = typeof store.dispatch;
export type AppStore = ReturnType<typeof configureAppStore>;

// Export store subscription utilities
export const { dispatch, getState, subscribe } = store;

export default store;