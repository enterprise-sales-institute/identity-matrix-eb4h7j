import { useRef, useEffect, useState, useCallback, useMemo } from 'react'; // v18.2.0
import { Chart } from 'chart.js'; // v4.0.0
import { select, scaleLinear, axisBottom, axisLeft } from 'd3'; // v7.0.0
import { ThemeMode } from '../types/theme.types';
import { 
  CHART_TYPES, 
  CHART_SIZES, 
  CHART_COLORS, 
  CHART_MARGINS 
} from '../constants/chart.constants';
import { 
  formatChartData, 
  createJourneyChart, 
  ChartOptions as ChartUtilOptions 
} from '../utils/chart.utils';

// Performance optimization options
interface PerformanceOptions {
  enableWebWorker?: boolean;
  progressiveRendering?: boolean;
  debounceDelay?: number;
  virtualizedData?: boolean;
  batchSize?: number;
}

// Accessibility configuration
interface AccessibilityOptions {
  enableKeyboardNav?: boolean;
  ariaLabels?: Record<string, string>;
  highContrastMode?: boolean;
  textDescriptions?: boolean;
}

// Chart data structure
interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    [key: string]: any;
  }>;
}

// Performance metrics tracking
interface PerformanceMetrics {
  renderTime: number;
  updateTime: number;
  memoryUsage: number;
  frameRate: number;
}

// Main hook props interface
interface UseChartProps {
  chartType: CHART_TYPES;
  data: ChartData;
  containerId: string;
  options?: Partial<ChartUtilOptions>;
  performance?: PerformanceOptions;
  accessibility?: AccessibilityOptions;
}

// Hook return type
interface UseChartReturn {
  chartInstance: Chart | null;
  updateChart: (newData: ChartData) => void;
  destroyChart: () => void;
  isLoading: boolean;
  error: Error | null;
  performance: PerformanceMetrics;
}

// Web Worker for heavy computations
const createChartWorker = () => {
  const workerCode = `
    self.onmessage = function(e) {
      const { data, type } = e.data;
      try {
        const processedData = processChartData(data, type);
        self.postMessage({ type: 'SUCCESS', data: processedData });
      } catch (error) {
        self.postMessage({ type: 'ERROR', error: error.message });
      }
    };

    function processChartData(data, type) {
      // Heavy data processing logic here
      return data;
    }
  `;
  const blob = new Blob([workerCode], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob));
};

// Main chart hook
export const useChart = ({
  chartType,
  data,
  containerId,
  options = {},
  performance = {},
  accessibility = {}
}: UseChartProps): UseChartReturn => {
  const chartRef = useRef<Chart | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    updateTime: 0,
    memoryUsage: 0,
    frameRate: 0
  });

  // Memoized theme configuration
  const themeConfig = useMemo(() => {
    const isDark = options.theme === ThemeMode.DARK;
    return {
      backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
      textColor: isDark ? '#FFFFFF' : '#333333',
      gridColor: isDark ? '#333333' : '#EEEEEE',
      colors: CHART_COLORS
    };
  }, [options.theme]);

  // Initialize chart with performance monitoring
  const initializeChart = useCallback(async () => {
    const startTime = performance.now();
    try {
      containerRef.current = document.getElementById(containerId);
      if (!containerRef.current) throw new Error('Container not found');

      // Initialize Web Worker if enabled
      if (performance.enableWebWorker) {
        workerRef.current = createChartWorker();
      }

      // Process data based on chart type
      let processedData = data;
      if (chartType === CHART_TYPES.SANKEY) {
        const journeyChart = createJourneyChart(data, containerId, {
          theme: options.theme || ThemeMode.LIGHT,
          size: options.size || 'MEDIUM',
          animate: true,
          interactive: true,
          accessibility: true
        });
        await journeyChart.create();
        return;
      } else {
        if (performance.enableWebWorker && workerRef.current) {
          processedData = await new Promise((resolve, reject) => {
            if (!workerRef.current) return reject('Worker not initialized');
            
            workerRef.current.onmessage = (e) => {
              if (e.data.type === 'ERROR') reject(e.data.error);
              else resolve(e.data.data);
            };
            
            workerRef.current.postMessage({ data, type: chartType });
          });
        }

        // Create Chart.js instance
        chartRef.current = new Chart(containerId, {
          type: chartType,
          data: processedData,
          options: {
            ...options,
            responsive: true,
            maintainAspectRatio: false,
            animation: {
              duration: performance.progressiveRendering ? 0 : 750
            },
            plugins: {
              legend: {
                display: true,
                labels: {
                  color: themeConfig.textColor,
                  font: {
                    size: 12
                  }
                }
              },
              tooltip: {
                enabled: true,
                backgroundColor: themeConfig.backgroundColor,
                titleColor: themeConfig.textColor,
                bodyColor: themeConfig.textColor
              }
            },
            scales: {
              x: {
                grid: {
                  color: themeConfig.gridColor
                },
                ticks: {
                  color: themeConfig.textColor
                }
              },
              y: {
                grid: {
                  color: themeConfig.gridColor
                },
                ticks: {
                  color: themeConfig.textColor
                }
              }
            }
          }
        });
      }

      // Set accessibility attributes
      if (accessibility.enableKeyboardNav) {
        containerRef.current.setAttribute('tabindex', '0');
        containerRef.current.setAttribute('role', 'img');
        containerRef.current.setAttribute('aria-label', 
          accessibility.ariaLabels?.chart || 'Data visualization chart'
        );
      }

      const endTime = performance.now();
      setPerformanceMetrics(prev => ({
        ...prev,
        renderTime: endTime - startTime
      }));

    } catch (err) {
      setError(err instanceof Error ? err : new Error('Chart initialization failed'));
    } finally {
      setIsLoading(false);
    }
  }, [chartType, data, containerId, options, performance, accessibility, themeConfig]);

  // Update chart with new data
  const updateChart = useCallback((newData: ChartData) => {
    const startTime = performance.now();
    try {
      if (chartRef.current) {
        chartRef.current.data = newData;
        chartRef.current.update('active');
        
        const endTime = performance.now();
        setPerformanceMetrics(prev => ({
          ...prev,
          updateTime: endTime - startTime
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Chart update failed'));
    }
  }, []);

  // Cleanup resources
  const destroyChart = useCallback(() => {
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }, []);

  // Handle resize events
  useEffect(() => {
    let resizeObserver: ResizeObserver;
    if (containerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (chartRef.current) {
          chartRef.current.resize();
        }
      });
      resizeObserver.observe(containerRef.current);
    }
    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, []);

  // Initialize chart on mount
  useEffect(() => {
    initializeChart();
    return () => {
      destroyChart();
    };
  }, [initializeChart, destroyChart]);

  return {
    chartInstance: chartRef.current,
    updateChart,
    destroyChart,
    isLoading,
    error,
    performance: performanceMetrics
  };
};

export default useChart;