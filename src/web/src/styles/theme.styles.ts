import { createTheme, Theme } from '@mui/material'; // v5.0+
import { ThemeMode, CustomTheme, ThemeColors } from '../types/theme.types';
import { COLORS, TYPOGRAPHY, SPACING, BREAKPOINTS, SHADOWS, TRANSITIONS } from './variables.styles';

/**
 * Creates a customized Material-UI theme with application-specific configurations
 * including semantic colors, elevation system, and accessibility improvements.
 */
export const createAppTheme = (mode: ThemeMode, customConfig?: Partial<CustomTheme>): Theme => {
  // Select base color palette based on theme mode
  const colors = COLORS[mode.toLowerCase() as keyof typeof COLORS];

  // Create base theme configuration
  const baseTheme = {
    palette: {
      mode,
      primary: {
        main: colors.primary.main,
        light: colors.primary.light,
        dark: colors.primary.dark,
        contrastText: colors.primary.contrastText,
      },
      secondary: {
        main: colors.secondary.main,
        light: colors.secondary.light,
        dark: colors.secondary.dark,
        contrastText: colors.secondary.contrastText,
      },
      error: {
        main: colors.error.main,
        light: colors.error.light,
        dark: colors.error.dark,
        contrastText: colors.error.contrastText,
      },
      warning: {
        main: colors.warning.main,
        light: colors.warning.light,
        dark: colors.warning.dark,
        contrastText: colors.warning.contrastText,
      },
      info: {
        main: colors.info.main,
        light: colors.info.light,
        dark: colors.info.dark,
        contrastText: colors.info.contrastText,
      },
      success: {
        main: colors.success.main,
        light: colors.success.light,
        dark: colors.success.dark,
        contrastText: colors.success.contrastText,
      },
      background: {
        default: colors.background.default,
        paper: colors.background.paper,
      },
      text: {
        primary: colors.text.primary,
        secondary: colors.text.secondary,
        disabled: colors.text.disabled,
      },
    },
    typography: {
      fontFamily: TYPOGRAPHY.fontFamily,
      h1: {
        ...TYPOGRAPHY.h1,
        color: colors.text.primary,
      },
      h2: {
        ...TYPOGRAPHY.h2,
        color: colors.text.primary,
      },
      h3: {
        ...TYPOGRAPHY.h3,
        color: colors.text.primary,
      },
      h4: {
        ...TYPOGRAPHY.h4,
        color: colors.text.primary,
      },
      body1: {
        ...TYPOGRAPHY.body1,
        color: colors.text.primary,
      },
      body2: {
        ...TYPOGRAPHY.body2,
        color: colors.text.secondary,
      },
      button: {
        ...TYPOGRAPHY.button,
      },
      caption: {
        ...TYPOGRAPHY.caption,
        color: colors.text.secondary,
      },
      overline: {
        ...TYPOGRAPHY.overline,
        color: colors.text.secondary,
      },
    },
    spacing: SPACING.unit,
    breakpoints: {
      values: {
        xs: BREAKPOINTS.xs,
        sm: BREAKPOINTS.sm,
        md: BREAKPOINTS.md,
        lg: BREAKPOINTS.lg,
        xl: BREAKPOINTS.xl,
      },
    },
    shadows: [
      'none',
      SHADOWS.low,
      SHADOWS.medium,
      SHADOWS.high,
      SHADOWS.focusRing,
      ...Array(20).fill(SHADOWS.high), // Fill remaining shadow slots
    ],
    transitions: {
      duration: {
        shortest: TRANSITIONS.duration.short,
        shorter: TRANSITIONS.duration.short,
        short: TRANSITIONS.duration.short,
        standard: TRANSITIONS.duration.medium,
        complex: TRANSITIONS.duration.long,
        enteringScreen: TRANSITIONS.duration.medium,
        leavingScreen: TRANSITIONS.duration.medium,
      },
      easing: {
        easeInOut: TRANSITIONS.easing.standard,
        easeOut: TRANSITIONS.easing.decelerate,
        easeIn: TRANSITIONS.easing.accelerate,
        sharp: TRANSITIONS.easing.accelerate,
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: colors.background.default,
            color: colors.text.primary,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: SPACING.unit,
            padding: `${SPACING.unit}px ${SPACING.unit * 2}px`,
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
      MuiInputBase: {
        styleOverrides: {
          root: {
            fontSize: TYPOGRAPHY.body1.fontSize,
          },
        },
      },
    },
  };

  // Create theme with base configuration and any custom overrides
  const theme = createTheme({
    ...baseTheme,
    ...customConfig,
  });

  return theme;
};

/**
 * Default theme configuration with light mode
 */
export const defaultTheme = createAppTheme(ThemeMode.LIGHT);