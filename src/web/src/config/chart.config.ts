import { Chart } from 'chart.js'; // v4.0+
import { select, sankeyLinkHorizontal, sankey } from 'd3'; // v7.0+
import { ThemeMode } from '../types/theme.types';

// Chart theme interface with accessibility support
interface ChartTheme {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  gridColor: string;
  tooltip: {
    backgroundColor: string;
    titleColor: string;
    bodyColor: string;
    borderColor: string;
  };
  animation: {
    duration: number;
    easing: string;
  };
}

// Default chart configuration with performance optimizations
const DEFAULT_CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  animation: {
    duration: 500,
    easing: 'easeInOutQuart',
    mode: 'progressive'
  },
  plugins: {
    legend: {
      position: 'bottom' as const,
      align: 'center' as const,
      labels: {
        usePointStyle: true,
        padding: 20
      }
    },
    tooltip: {
      enabled: true,
      mode: 'index' as const,
      intersect: false,
      position: 'nearest' as const,
      backgroundColor: 'rgba(0,0,0,0.8)',
      padding: 12,
      cornerRadius: 4
    }
  },
  devicePixelRatio: 2,
  resizeDelay: 100
};

// Attribution chart specific configuration
const ATTRIBUTION_CHART_OPTIONS = {
  type: 'bar',
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        callback: (value: number) => `${value}%`,
        maxTicksLimit: 8
      },
      grid: {
        drawBorder: false,
        display: true
      }
    },
    x: {
      grid: {
        display: false
      }
    }
  },
  plugins: {
    tooltip: {
      callbacks: {
        label: (context: any) => `Attribution: ${context.raw}%`
      }
    }
  }
};

// Journey visualization configuration using D3.js Sankey
const JOURNEY_CHART_OPTIONS = {
  type: 'sankey',
  nodeWidth: 15,
  nodePadding: 10,
  margin: {
    top: 20,
    right: 20,
    bottom: 20,
    left: 20
  },
  iterations: 32,
  nodeAlign: 'justify',
  linkOpacity: 0.5,
  nodeOpacity: 0.8,
  interactive: true,
  tooltips: true,
  animations: {
    duration: 750,
    ease: 'cubic-out'
  }
};

// Channel performance chart configuration
const CHANNEL_CHART_OPTIONS = {
  type: 'line',
  tension: 0.4,
  fill: false,
  interaction: {
    mode: 'index' as const,
    intersect: false
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        callback: (value: number) => `$${value.toLocaleString()}`,
        maxTicksLimit: 6
      },
      grid: {
        drawBorder: false,
        color: 'rgba(0,0,0,0.05)'
      }
    },
    x: {
      type: 'time',
      time: {
        unit: 'day',
        tooltipFormat: 'MMM D, YYYY'
      }
    }
  }
};

// Theme-specific chart configuration with accessibility support
const getChartTheme = (mode: ThemeMode): ChartTheme => {
  const themes: Record<ThemeMode, ChartTheme> = {
    [ThemeMode.LIGHT]: {
      backgroundColor: '#ffffff',
      borderColor: '#e0e0e0',
      textColor: '#333333',
      gridColor: 'rgba(0,0,0,0.1)',
      tooltip: {
        backgroundColor: 'rgba(255,255,255,0.95)',
        titleColor: '#333333',
        bodyColor: '#666666',
        borderColor: '#e0e0e0'
      },
      animation: {
        duration: 750,
        easing: 'easeOutQuart'
      }
    },
    [ThemeMode.DARK]: {
      backgroundColor: '#1e1e1e',
      borderColor: '#404040',
      textColor: '#ffffff',
      gridColor: 'rgba(255,255,255,0.1)',
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.95)',
        titleColor: '#ffffff',
        bodyColor: '#cccccc',
        borderColor: '#404040'
      },
      animation: {
        duration: 750,
        easing: 'easeOutQuart'
      }
    }
  };

  return themes[mode];
};

// Deep merge utility for chart options
const mergeChartOptions = (defaultOptions: object, chartOptions: object): object => {
  return Chart.helpers.merge({}, defaultOptions, chartOptions);
};

// Export chart configuration with theme support
export const chartConfig = {
  defaults: DEFAULT_CHART_OPTIONS,
  attribution: ATTRIBUTION_CHART_OPTIONS,
  journey: JOURNEY_CHART_OPTIONS,
  channel: CHANNEL_CHART_OPTIONS,
  getTheme: getChartTheme,
  mergeOptions: mergeChartOptions
};

// Configure Chart.js defaults for optimal performance
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.responsive = true;
Chart.defaults.maintainAspectRatio = false;
Chart.defaults.plugins.tooltip.enabled = true;
Chart.defaults.plugins.legend.display = true;

// Export chart configuration
export default chartConfig;