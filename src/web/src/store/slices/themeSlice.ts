import { createSlice, PayloadAction } from '@reduxjs/toolkit'; // v1.9+
import { ThemeMode } from '../../types/theme.types';

// Type-safe theme state interface
interface ThemeState {
  mode: ThemeMode | null;
  systemPreference: ThemeMode | null;
  lastError: string | null;
}

// Initial state with null safety
const initialState: ThemeState = {
  mode: null,
  systemPreference: null,
  lastError: null
};

// Create theme slice with enhanced type safety
export const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setThemeMode: (state, action: PayloadAction<ThemeMode | null>) => {
      // Validate theme mode value
      if (action.payload !== null && 
          ![ThemeMode.LIGHT, ThemeMode.DARK].includes(action.payload)) {
        state.lastError = 'Invalid theme mode specified';
        return;
      }
      
      state.mode = action.payload;
      state.lastError = null;
    },

    updateSystemPreference: (state, action: PayloadAction<ThemeMode>) => {
      // Validate system preference value
      if (![ThemeMode.LIGHT, ThemeMode.DARK].includes(action.payload)) {
        state.lastError = 'Invalid system preference specified';
        return;
      }

      state.systemPreference = action.payload;
      state.lastError = null;
    },

    setThemeError: (state, action: PayloadAction<string>) => {
      state.lastError = action.payload;
    }
  }
});

// Memoized selectors for optimal performance
export const themeSelectors = {
  // Select user theme mode preference
  selectThemeMode: (state: { theme: ThemeState }): ThemeMode | null => 
    state.theme.mode,

  // Select system theme preference
  selectSystemPreference: (state: { theme: ThemeState }): ThemeMode | null => 
    state.theme.systemPreference,

  // Select effective theme mode with fallback logic
  selectEffectiveThemeMode: (state: { theme: ThemeState }): ThemeMode => {
    const { mode, systemPreference } = state.theme;
    
    // Priority order:
    // 1. User preference (if set)
    // 2. System preference (if available)
    // 3. Light mode (default fallback)
    if (mode !== null) {
      return mode;
    }

    if (systemPreference !== null) {
      return systemPreference;
    }

    return ThemeMode.LIGHT;
  }
};

// Export actions for theme management
export const { 
  setThemeMode, 
  updateSystemPreference, 
  setThemeError 
} = themeSlice.actions;

// Export reducer for store configuration
export default themeSlice.reducer;