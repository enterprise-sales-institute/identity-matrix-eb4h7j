/**
 * @fileoverview Test utilities for React components with Redux store and theme provider integration
 * @version 1.0.0
 */

// External imports
import React, { FC, ReactElement } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react'; // v13.4+
import { Provider } from 'react-redux'; // v8.0+
import { ThemeProvider } from '@mui/material'; // v5.0+
import { PreloadedState } from '@reduxjs/toolkit'; // v1.9+
import { configureStore } from '@reduxjs/toolkit';

// Internal imports
import { store, RootState } from '../../src/store';
import { defaultTheme } from '../../src/config/theme.config';

/**
 * Interface for extended render options including preloaded state and provider configurations
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'queries'> {
  preloadedState?: PreloadedState<RootState>;
  withTheme?: boolean;
  withStore?: boolean;
}

/**
 * Creates a wrapper component with configured providers based on options
 * @param preloadedState - Optional preloaded state for Redux store
 * @param options - Configuration options for providers
 * @returns Memoized wrapper component
 */
export const createWrapper = (
  preloadedState?: PreloadedState<RootState>,
  options: { withTheme?: boolean; withStore?: boolean } = {}
): FC<{ children: React.ReactNode }> => {
  return React.memo(({ children }) => {
    // Create test store if preloaded state is provided
    const testStore = preloadedState
      ? configureStore({
          reducer: store.getState(),
          preloadedState,
          middleware: (getDefaultMiddleware) =>
            getDefaultMiddleware({
              serializableCheck: false,
              immutableCheck: { warnAfter: 128 }
            })
        })
      : store;

    let wrappedComponent = <>{children}</>;

    // Apply store provider if enabled
    if (options.withStore !== false) {
      wrappedComponent = (
        <Provider store={testStore}>
          {wrappedComponent}
        </Provider>
      );
    }

    // Apply theme provider if enabled
    if (options.withTheme !== false) {
      wrappedComponent = (
        <ThemeProvider theme={defaultTheme}>
          {wrappedComponent}
        </ThemeProvider>
      );
    }

    return wrappedComponent;
  });
};

/**
 * Enhanced render function that wraps components with required providers
 * @param ui - Component to render
 * @param options - Custom render options including provider configurations
 * @returns Enhanced render result with additional utilities
 */
export const customRender = (
  ui: ReactElement,
  {
    preloadedState,
    withTheme = true,
    withStore = true,
    ...renderOptions
  }: CustomRenderOptions = {}
): RenderResult => {
  // Create wrapper with configured providers
  const Wrapper = createWrapper(preloadedState, { withTheme, withStore });

  // Render with configured wrapper and options
  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Re-export everything from testing-library
export * from '@testing-library/react';

// Override render method
export { customRender as render };