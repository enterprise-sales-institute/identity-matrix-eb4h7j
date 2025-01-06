import { Chart } from 'chart.js'; // v4.0+

// Interfaces for type safety
interface ChartSize {
  width: number;
  height: number;
}

interface ChartMargin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface ChartAnimation {
  duration: number;
  easing: string;
  delay: number;
  stagger: number;
}

/**
 * Available chart types for visualization components
 */
export enum CHART_TYPES {
  BAR = 'bar',
  LINE = 'line',
  SANKEY = 'sankey',
  PIE = 'pie',
  DOUGHNUT = 'doughnut'
}

/**
 * Standard chart size configurations for consistent layout
 */
export const CHART_SIZES: Record<string, ChartSize> = {
  SMALL: { width: 300, height: 200 },
  MEDIUM: { width: 600, height: 400 },
  LARGE: { width: 900, height: 600 }
} as const;

/**
 * Color palette configurations for different chart elements and states
 */
export const CHART_COLORS = {
  PRIMARY: ['#0066CC', '#3399FF', '#66B2FF', '#99CCFF', '#CCE5FF'],
  SUCCESS: ['#33CC33', '#66FF66', '#99FF99', '#CCFFCC'],
  WARNING: ['#FFCC00', '#FFD633', '#FFE066', '#FFEB99'],
  ERROR: ['#FF3333', '#FF6666', '#FF9999', '#FFCCCC'],
  NEUTRAL: ['#666666', '#999999', '#CCCCCC', '#EEEEEE']
} as const;

/**
 * Animation configurations for chart transitions and updates
 */
export const CHART_ANIMATION: ChartAnimation = {
  DURATION: 500,
  EASING: 'easeInOutQuart',
  DELAY: 50,
  STAGGER: 25
} as const;

/**
 * Margin configurations for different chart sizes
 */
export const CHART_MARGINS: Record<string, ChartMargin> = {
  SMALL: { top: 10, right: 10, bottom: 10, left: 10 },
  MEDIUM: { top: 20, right: 20, bottom: 20, left: 20 },
  LARGE: { top: 30, right: 30, bottom: 30, left: 30 }
} as const;

/**
 * Journey visualization specific configurations
 */
export const JOURNEY_CHART = {
  NODE_WIDTH: 15,
  NODE_PADDING: 10,
  LINK_OPACITY: 0.4,
  ANIMATION_DURATION: 750,
  NODE_COLORS: {
    ENTRY: '#0066CC',
    EXIT: '#33CC33',
    INTERMEDIATE: '#666666'
  },
  LINK_GRADIENT: {
    START_OPACITY: 0.8,
    END_OPACITY: 0.4
  }
} as const;

/**
 * Attribution chart specific configurations
 */
export const ATTRIBUTION_CHART = {
  MIN_HEIGHT: 300,
  BAR_THICKNESS: 20,
  MAX_BARS: 10,
  STACK_SPACING: 2,
  LABEL_PADDING: 4,
  VALUE_PRECISION: 2,
  PERCENTAGE_DISPLAY: true
} as const;

/**
 * Channel performance visualization configurations
 */
export const CHANNEL_PERFORMANCE = {
  LINE_TENSION: 0.4,
  POINT_RADIUS: 4,
  POINT_HOVER_RADIUS: 6,
  FILL_OPACITY: 0.2,
  GRID_LINES: {
    DISPLAY: true,
    COLOR: '#EEEEEE',
    ZERO_LINE_COLOR: '#666666'
  }
} as const;

/**
 * Default chart options that can be extended for specific use cases
 */
export const DEFAULT_CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  animation: CHART_ANIMATION,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        padding: 20,
        usePointStyle: true
      }
    },
    tooltip: {
      enabled: true,
      mode: 'index' as const,
      intersect: false,
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      titleColor: '#666666',
      bodyColor: '#333333',
      borderColor: '#EEEEEE',
      borderWidth: 1
    }
  }
} as const;

/**
 * Chart accessibility configurations
 */
export const CHART_ACCESSIBILITY = {
  ARIA_LABELS: {
    CHART_WRAPPER: 'Data visualization',
    BAR_GROUP: 'Bar chart showing attribution data',
    LINE_GROUP: 'Line chart showing performance trends',
    PIE_GROUP: 'Pie chart showing distribution',
    SANKEY_GROUP: 'Sankey diagram showing customer journey flow'
  }
} as const;