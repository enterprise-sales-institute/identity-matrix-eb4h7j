import { Theme } from '@mui/material'; // v5.0+

// Theme mode constants
export enum ThemeMode {
  LIGHT = 'light',
  DARK = 'dark'
}

// Color palette interfaces
export interface ColorPalette {
  main: string;
  light: string;
  dark: string;
  contrastText: string;
  alpha: number;
  hover: string;
}

export interface BackgroundColors {
  default: string;
  paper: string;
  elevated: string;
}

export interface TextColors {
  primary: string;
  secondary: string;
  disabled: string;
  hint: string;
}

// Theme colors interface
export interface ThemeColors {
  primary: ColorPalette;
  secondary: ColorPalette;
  error: ColorPalette;
  warning: ColorPalette;
  info: ColorPalette;
  success: ColorPalette;
  background: BackgroundColors;
  text: TextColors;
}

// Typography style interface
export interface TypographyStyle {
  fontSize: number;
  lineHeight: number;
  fontWeight: number;
  letterSpacing: string;
  textTransform?: string;
}

// Typography system interface
export interface Typography {
  fontFamily: string;
  h1: TypographyStyle;
  h2: TypographyStyle;
  h3: TypographyStyle;
  h4: TypographyStyle;
  body1: TypographyStyle;
  body2: TypographyStyle;
  button: TypographyStyle;
  caption: TypographyStyle;
  overline: TypographyStyle;
}

// Spacing system interface based on 8px grid
export interface Spacing {
  unit: number; // 8px base unit
  multiplier: (factor: number) => number;
}

// Responsive breakpoint interface
export interface Breakpoints {
  xs: number; // 320px
  sm: number; // 768px
  md: number; // 1024px
  lg: number; // 1440px
  xl: number; // 1920px
}

// Material Design elevation interface
export interface Elevation {
  low: string;    // Low elevation shadow
  medium: string; // Medium elevation shadow
  high: string;   // High elevation shadow
}

// Z-index layering interface
export interface ZIndex {
  appBar: number;
  drawer: number;
  modal: number;
  snackbar: number;
  tooltip: number;
}

// Custom theme configuration extending Material-UI Theme
export interface CustomTheme extends Theme {
  mode: ThemeMode;
  colors: ThemeColors;
  typography: Typography;
  spacing: Spacing;
  breakpoints: Breakpoints;
  elevation: Elevation;
  zIndex: ZIndex;
}