import { ThemeColors, Typography, Spacing, Breakpoints } from '../types/theme.types';

// Color palettes implementing Material Design 3.0 principles
export const COLORS: Record<'light' | 'dark', ThemeColors> = {
  light: {
    primary: {
      main: '#0066CC',
      light: '#3399FF',
      dark: '#004C99',
      contrastText: '#FFFFFF',
      alpha: 0.9,
      hover: '#0052A3'
    },
    secondary: {
      main: '#666666',
      light: '#808080',
      dark: '#4D4D4D',
      contrastText: '#FFFFFF',
      alpha: 0.9,
      hover: '#595959'
    },
    error: {
      main: '#FF3333',
      light: '#FF6666',
      dark: '#CC0000',
      contrastText: '#FFFFFF',
      alpha: 0.9,
      hover: '#E60000'
    },
    warning: {
      main: '#FFA500',
      light: '#FFC04D',
      dark: '#CC8400',
      contrastText: '#000000',
      alpha: 0.9,
      hover: '#E69400'
    },
    info: {
      main: '#0288D1',
      light: '#03A9F4',
      dark: '#01579B',
      contrastText: '#FFFFFF',
      alpha: 0.9,
      hover: '#0277BD'
    },
    success: {
      main: '#33CC33',
      light: '#66FF66',
      dark: '#269926',
      contrastText: '#FFFFFF',
      alpha: 0.9,
      hover: '#2DB92D'
    },
    background: {
      default: '#FFFFFF',
      paper: '#F5F5F5',
      elevated: '#FAFAFA'
    },
    text: {
      primary: '#333333',
      secondary: '#666666',
      disabled: '#999999',
      hint: '#999999'
    }
  },
  dark: {
    primary: {
      main: '#3399FF',
      light: '#66B2FF',
      dark: '#0066CC',
      contrastText: '#FFFFFF',
      alpha: 0.9,
      hover: '#1A8CFF'
    },
    secondary: {
      main: '#999999',
      light: '#B3B3B3',
      dark: '#808080',
      contrastText: '#FFFFFF',
      alpha: 0.9,
      hover: '#8C8C8C'
    },
    error: {
      main: '#FF6666',
      light: '#FF9999',
      dark: '#FF3333',
      contrastText: '#FFFFFF',
      alpha: 0.9,
      hover: '#FF4D4D'
    },
    warning: {
      main: '#FFB84D',
      light: '#FFCC80',
      dark: '#FFA500',
      contrastText: '#000000',
      alpha: 0.9,
      hover: '#FFA31A'
    },
    info: {
      main: '#29B6F6',
      light: '#4FC3F7',
      dark: '#0288D1',
      contrastText: '#000000',
      alpha: 0.9,
      hover: '#0DABF4'
    },
    success: {
      main: '#66FF66',
      light: '#99FF99',
      dark: '#33CC33',
      contrastText: '#000000',
      alpha: 0.9,
      hover: '#4DFF4D'
    },
    background: {
      default: '#1E1E1E',
      paper: '#2D2D2D',
      elevated: '#383838'
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#CCCCCC',
      disabled: '#808080',
      hint: '#808080'
    }
  }
};

// Typography system based on Material Design type scale
export const TYPOGRAPHY: Typography = {
  fontFamily: 'Inter, system-ui, sans-serif',
  h1: {
    fontSize: 24,
    fontWeight: 600,
    lineHeight: 1.2,
    letterSpacing: '-0.01em'
  },
  h2: {
    fontSize: 20,
    fontWeight: 600,
    lineHeight: 1.3,
    letterSpacing: '-0.005em'
  },
  h3: {
    fontSize: 18,
    fontWeight: 500,
    lineHeight: 1.4,
    letterSpacing: '0'
  },
  h4: {
    fontSize: 16,
    fontWeight: 500,
    lineHeight: 1.4,
    letterSpacing: '0.005em'
  },
  body1: {
    fontSize: 16,
    fontWeight: 400,
    lineHeight: 1.5,
    letterSpacing: '0'
  },
  body2: {
    fontSize: 14,
    fontWeight: 400,
    lineHeight: 1.5,
    letterSpacing: '0.01em'
  },
  button: {
    fontSize: 16,
    fontWeight: 600,
    lineHeight: 1.4,
    letterSpacing: '0.02em',
    textTransform: 'none'
  },
  caption: {
    fontSize: 12,
    fontWeight: 400,
    lineHeight: 1.4,
    letterSpacing: '0.02em'
  },
  overline: {
    fontSize: 10,
    fontWeight: 500,
    lineHeight: 1.4,
    letterSpacing: '0.05em',
    textTransform: 'uppercase'
  }
};

// 8px grid spacing system
export const SPACING: Spacing = {
  unit: 8,
  multiplier: (factor: number) => factor * 8
};

// Responsive breakpoints for mobile-first design
export const BREAKPOINTS: Breakpoints = {
  xs: 320,  // Mobile
  sm: 768,  // Tablet
  md: 1024, // Small desktop
  lg: 1440, // Large desktop
  xl: 1920  // Extra large displays
};

// Material Design elevation system with consistent shadow values
export const SHADOWS = {
  low: '0 2px 4px rgba(0,0,0,0.1)',
  medium: '0 4px 8px rgba(0,0,0,0.15)',
  high: '0 8px 16px rgba(0,0,0,0.2)',
  focusRing: '0 0 0 2px rgba(0,102,204,0.4)'
};

// Animation and transition system
export const TRANSITIONS = {
  duration: {
    short: '150ms',
    medium: '300ms',
    long: '500ms'
  },
  easing: {
    standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
    accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
    decelerate: 'cubic-bezier(0, 0, 0.2, 1)'
  },
  create: (property: string, duration: string, easing: string) =>
    `${property} ${duration} ${easing}`
};

// Z-axis layering system
export const Z_INDEX = {
  appBar: 1100,
  drawer: 1200,
  modal: 1300,
  snackbar: 1400,
  tooltip: 1500
};