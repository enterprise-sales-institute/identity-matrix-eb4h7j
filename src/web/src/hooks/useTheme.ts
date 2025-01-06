import { useEffect, useCallback } from 'react'; // v18.2+
import { useDispatch, useSelector } from 'react-redux'; // v8.0+
import { Theme, useTheme as useMuiTheme } from '@mui/material'; // v5.0+

import { ThemeMode, CustomTheme } from '../types/theme.types';
import { themeConfig } from '../config/theme.config';
import {
  setThemeMode,
  updateSystemPreference,
  themeSelectors,
} from '../store/slices/themeSlice';

// Type-safe interface for hook return value
interface UseThemeReturn {
  theme: Theme;
  themeMode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  isSystemPreference: boolean;
}

/**
 * Custom hook for managing theme state and operations with enhanced type safety
 * and performance optimizations
 */
export const useTheme = (): UseThemeReturn => {
  const dispatch = useDispatch();
  
  // Select theme states with type safety
  const userThemeMode = useSelector(themeSelectors.selectThemeMode);
  const effectiveThemeMode = useSelector(themeSelectors.selectEffectiveThemeMode);

  // Get MUI theme instance
  const muiTheme = useMuiTheme();

  // Create memoized theme instance with current mode
  const theme = useCallback(() => {
    try {
      return themeConfig.createCustomTheme(effectiveThemeMode);
    } catch (error) {
      console.error('Error creating theme:', error);
      return muiTheme;
    }
  }, [effectiveThemeMode, muiTheme])();

  // System preference media query setup
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Handle system preference changes
    const handleSystemPreference = (e: MediaQueryListEvent | MediaQueryList) => {
      const systemMode = e.matches ? ThemeMode.DARK : ThemeMode.LIGHT;
      dispatch(updateSystemPreference(systemMode));
    };

    // Initial system preference check
    handleSystemPreference(mediaQuery);

    // Add listener for system preference changes
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemPreference);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleSystemPreference);
    }

    // Cleanup listener
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleSystemPreference);
      } else {
        // Fallback cleanup
        mediaQuery.removeListener(handleSystemPreference);
      }
    };
  }, [dispatch]);

  // Memoized theme mode setter with validation
  const setMode = useCallback((mode: ThemeMode) => {
    if (![ThemeMode.LIGHT, ThemeMode.DARK].includes(mode)) {
      console.error('Invalid theme mode:', mode);
      return;
    }
    dispatch(setThemeMode(mode));
  }, [dispatch]);

  // Optimized theme toggle function
  const toggleTheme = useCallback(() => {
    const newMode = effectiveThemeMode === ThemeMode.LIGHT 
      ? ThemeMode.DARK 
      : ThemeMode.LIGHT;
    dispatch(setThemeMode(newMode));
  }, [effectiveThemeMode, dispatch]);

  return {
    theme,
    themeMode: effectiveThemeMode,
    setMode,
    toggleTheme,
    isSystemPreference: userThemeMode === null,
  };
};