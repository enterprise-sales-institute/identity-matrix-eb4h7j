import { createSlice, PayloadAction } from '@reduxjs/toolkit'; // v1.9+
import { ThemeMode } from '../types/theme.types';
import { LoadingState } from '../types/common.types';
import { v4 as uuidv4 } from 'uuid'; // v9.0+

// Notification types enum with default durations
export enum NotificationType {
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  WARNING = 'WARNING',
  INFO = 'INFO'
}

// Default notification durations in milliseconds
const DEFAULT_NOTIFICATION_DURATIONS: Record<NotificationType, number> = {
  [NotificationType.SUCCESS]: 3000,
  [NotificationType.ERROR]: 5000,
  [NotificationType.WARNING]: 4000,
  [NotificationType.INFO]: 3000
};

// Interface for notifications
export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration: number;
  createdAt: number;
  autoRemove: boolean;
}

// Interface for UI preferences with persistence
export interface UIPreferences {
  denseMode: boolean;
  tablePageSize: number;
  chartAnimations: boolean;
  sidebarPinned: boolean;
  notificationDuration: Record<NotificationType, number>;
}

// Interface for UI state
export interface UIState {
  themeMode: ThemeMode;
  sidebarOpen: boolean;
  loadingStates: Record<string, LoadingState>;
  notifications: Notification[];
  preferences: UIPreferences;
}

// Default preferences
const defaultPreferences: UIPreferences = {
  denseMode: false,
  tablePageSize: 10,
  chartAnimations: true,
  sidebarPinned: true,
  notificationDuration: DEFAULT_NOTIFICATION_DURATIONS
};

// Load persisted preferences from localStorage
const loadPersistedPreferences = (): UIPreferences => {
  try {
    const stored = localStorage.getItem('uiPreferences');
    return stored ? { ...defaultPreferences, ...JSON.parse(stored) } : defaultPreferences;
  } catch {
    return defaultPreferences;
  }
};

// Load persisted theme from localStorage
const loadPersistedTheme = (): ThemeMode => {
  try {
    const stored = localStorage.getItem('themeMode');
    return stored === ThemeMode.DARK ? ThemeMode.DARK : ThemeMode.LIGHT;
  } catch {
    return ThemeMode.LIGHT;
  }
};

// Initial state
const initialState: UIState = {
  themeMode: loadPersistedTheme(),
  sidebarOpen: true,
  loadingStates: {},
  notifications: [],
  preferences: loadPersistedPreferences()
};

// Create the UI slice
export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setThemeMode: (state, action: PayloadAction<ThemeMode>) => {
      state.themeMode = action.payload;
      localStorage.setItem('themeMode', action.payload);
      document.documentElement.setAttribute('data-theme', action.payload);
    },

    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
      if (state.preferences.sidebarPinned) {
        const preferences = { ...state.preferences };
        preferences.sidebarPinned = state.sidebarOpen;
        localStorage.setItem('uiPreferences', JSON.stringify(preferences));
        state.preferences = preferences;
      }
    },

    setLoadingState: (
      state,
      action: PayloadAction<{ key: string; loadingState: Partial<LoadingState> }>
    ) => {
      const { key, loadingState } = action.payload;
      state.loadingStates[key] = {
        ...state.loadingStates[key],
        ...loadingState
      };
    },

    addNotification: (
      state,
      action: PayloadAction<Omit<Notification, 'id' | 'createdAt'>>
    ) => {
      const notification: Notification = {
        ...action.payload,
        id: uuidv4(),
        createdAt: Date.now()
      };

      // Maintain maximum of 5 notifications
      if (state.notifications.length >= 5) {
        state.notifications.shift();
      }

      state.notifications.push(notification);
    },

    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(
        (notification) => notification.id !== action.payload
      );
    },

    updatePreferences: (state, action: PayloadAction<Partial<UIPreferences>>) => {
      const updatedPreferences = {
        ...state.preferences,
        ...action.payload
      };

      // Validate table page size
      if (updatedPreferences.tablePageSize < 5) {
        updatedPreferences.tablePageSize = 5;
      } else if (updatedPreferences.tablePageSize > 100) {
        updatedPreferences.tablePageSize = 100;
      }

      state.preferences = updatedPreferences;
      localStorage.setItem('uiPreferences', JSON.stringify(updatedPreferences));
    },

    clearNotifications: (state) => {
      state.notifications = [];
    }
  }
});

// Export actions
export const {
  setThemeMode,
  toggleSidebar,
  setLoadingState,
  addNotification,
  removeNotification,
  updatePreferences,
  clearNotifications
} = uiSlice.actions;

// Export reducer
export default uiSlice.reducer;