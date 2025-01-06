import { createTheme, Theme } from '@mui/material'; // v5.0+
import { ThemeMode, CustomTheme } from '../types/theme.types';
import { SPACING, TYPOGRAPHY, BREAKPOINTS, COLORS } from '../styles/variables.styles';

// Cache for memoizing theme instances
const themeCache = new Map<ThemeMode, Theme>();

/**
 * Creates a custom Material-UI theme with Material Design 3.0 principles
 * @param mode - Theme mode (light/dark)
 * @param customConfig - Optional custom theme overrides
 * @returns Material-UI theme object with custom configuration
 */
const createCustomTheme = (
  mode: ThemeMode = ThemeMode.LIGHT,
  customConfig: Partial<CustomTheme> = {}
): Theme => {
  // Check cache first
  const cachedTheme = themeCache.get(mode);
  if (cachedTheme && Object.keys(customConfig).length === 0) {
    return cachedTheme;
  }

  // Base theme configuration
  const baseTheme = {
    palette: {
      mode: mode,
      ...COLORS[mode],
      background: {
        ...COLORS[mode].background,
        default: mode === ThemeMode.LIGHT ? '#FFFFFF' : '#1E1E1E',
      },
    },
    typography: {
      ...TYPOGRAPHY,
      fontFamily: TYPOGRAPHY.fontFamily,
      htmlFontSize: 16,
      pxToRem: (size: number) => `${size / 16}rem`,
    },
    spacing: (factor: number) => SPACING.multiplier(factor),
    breakpoints: {
      values: BREAKPOINTS,
    },
    shape: {
      borderRadius: 8,
    },
    shadows: [
      'none',
      '0 1px 2px rgba(0,0,0,0.12)',
      '0 2px 4px rgba(0,0,0,0.12)',
      '0 4px 8px rgba(0,0,0,0.12)',
      '0 8px 16px rgba(0,0,0,0.12)',
      // Additional shadow levels...
      '0 24px 48px rgba(0,0,0,0.12)',
    ],
    transitions: {
      easing: {
        easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
        easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
        easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
        sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
      },
      duration: {
        shortest: 150,
        shorter: 200,
        short: 250,
        standard: 300,
        complex: 375,
        enteringScreen: 225,
        leavingScreen: 195,
      },
    },
    zIndex: {
      mobileStepper: 1000,
      appBar: 1100,
      drawer: 1200,
      modal: 1300,
      snackbar: 1400,
      tooltip: 1500,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          '@media (prefers-reduced-motion: reduce)': {
            '*': {
              animationDuration: '0.01ms !important',
              animationIterationCount: '1 !important',
              transitionDuration: '0.01ms !important',
              scrollBehavior: 'auto !important',
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: '8px',
            fontWeight: TYPOGRAPHY.button.fontWeight,
            padding: `${SPACING.multiplier(1.5)}px ${SPACING.multiplier(3)}px`,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
    },
  };

  // Create theme with base configuration
  const theme = createTheme({
    ...baseTheme,
    ...customConfig,
  });

  // Cache the theme if no custom config
  if (Object.keys(customConfig).length === 0) {
    themeCache.set(mode, theme);
  }

  return theme;
};

// Default theme instance
const defaultTheme = createCustomTheme(ThemeMode.LIGHT);

export const themeConfig = {
  createCustomTheme,
  defaultTheme,
};