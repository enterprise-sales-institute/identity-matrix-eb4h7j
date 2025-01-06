import { select, sankeyLinkHorizontal, sankey, zoom, drag } from 'd3'; // v7.0+
import { Chart } from 'chart.js'; // v4.0+
import { ThemeMode } from '../types/theme.types';
import {
  CHART_TYPES,
  CHART_SIZES,
  CHART_COLORS,
  CHART_MARGINS,
  JOURNEY_CHART,
  ATTRIBUTION_CHART,
  CHANNEL_PERFORMANCE,
  DEFAULT_CHART_OPTIONS,
  CHART_ACCESSIBILITY
} from '../constants/chart.constants';

// Interfaces
export interface ChartOptions {
  theme: ThemeMode;
  size?: keyof typeof CHART_SIZES;
  animate?: boolean;
  interactive?: boolean;
  accessibility?: boolean;
}

export interface JourneyNode {
  id: string;
  name: string;
  value: number;
  ariaLabel: string;
  interactionState: InteractionState;
  metadata: NodeMetadata;
}

interface InteractionState {
  isHovered: boolean;
  isSelected: boolean;
  isFocused: boolean;
}

interface NodeMetadata {
  conversionRate: number;
  timeToConvert: number;
  revenue: number;
}

interface WorkerMessage {
  type: 'LAYOUT_COMPLETE' | 'ERROR';
  data?: any;
  error?: string;
}

// Performance monitoring decorator
function performanceMonitor(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  descriptor.value = function (...args: any[]) {
    const start = performance.now();
    const result = originalMethod.apply(this, args);
    const end = performance.now();
    console.debug(`${propertyKey} execution time: ${end - start}ms`);
    return result;
  };
  return descriptor;
}

// Error boundary decorator
function errorBoundary(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  descriptor.value = function (...args: any[]) {
    try {
      return originalMethod.apply(this, args);
    } catch (error) {
      console.error(`Error in ${propertyKey}:`, error);
      return null;
    }
  };
  return descriptor;
}

// Chart theme utility
const getThemeColors = (theme: ThemeMode) => {
  return {
    background: theme === ThemeMode.LIGHT ? '#FFFFFF' : '#1E1E1E',
    text: theme === ThemeMode.LIGHT ? '#333333' : '#FFFFFF',
    grid: theme === ThemeMode.LIGHT ? '#EEEEEE' : '#333333',
    ...CHART_COLORS
  };
};

// WebWorker for heavy calculations
const createLayoutWorker = () => {
  const workerCode = `
    self.onmessage = function(e) {
      const { data, dimensions } = e.data;
      try {
        const layout = d3.sankey()
          .nodeWidth(dimensions.nodeWidth)
          .nodePadding(dimensions.nodePadding)
          .extent([[0, 0], [dimensions.width, dimensions.height]])
          (data);
        self.postMessage({ type: 'LAYOUT_COMPLETE', data: layout });
      } catch (error) {
        self.postMessage({ type: 'ERROR', error: error.message });
      }
    };
  `;
  const blob = new Blob([workerCode], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob));
};

// Main journey chart creation function
export class JourneyChartBuilder {
  private svg: any;
  private worker: Worker;
  private container: HTMLElement;
  private data: any;
  private options: ChartOptions;
  private dimensions: any;
  private interactionHandlers: Map<string, Function>;

  constructor(containerId: string, data: any, options: ChartOptions) {
    this.container = document.getElementById(containerId)!;
    this.data = data;
    this.options = options;
    this.worker = createLayoutWorker();
    this.interactionHandlers = new Map();
    this.dimensions = this.calculateDimensions();
  }

  @performanceMonitor
  @errorBoundary
  public async create(): Promise<void> {
    this.initializeSVG();
    this.setupAccessibility();
    await this.calculateLayout();
    this.renderProgressively();
    this.setupInteractions();
    this.setupCleanup();
  }

  private initializeSVG(): void {
    const { width, height } = this.dimensions;
    this.svg = select(this.container)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('role', 'img')
      .attr('aria-label', CHART_ACCESSIBILITY.ARIA_LABELS.SANKEY_GROUP);
  }

  private setupAccessibility(): void {
    if (!this.options.accessibility) return;
    
    this.svg
      .append('title')
      .text('Customer Journey Visualization')
      .append('desc')
      .text('Interactive visualization showing customer paths through marketing touchpoints');
  }

  private calculateDimensions() {
    const size = CHART_SIZES[this.options.size || 'MEDIUM'];
    const margin = CHART_MARGINS[this.options.size || 'MEDIUM'];
    return {
      width: size.width - margin.left - margin.right,
      height: size.height - margin.top - margin.bottom,
      nodeWidth: JOURNEY_CHART.NODE_WIDTH,
      nodePadding: JOURNEY_CHART.NODE_PADDING
    };
  }

  private async calculateLayout(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
        if (e.data.type === 'LAYOUT_COMPLETE') {
          this.data = e.data.data;
          resolve();
        } else if (e.data.type === 'ERROR') {
          reject(new Error(e.data.error));
        }
      };
      this.worker.postMessage({
        data: this.data,
        dimensions: this.dimensions
      });
    });
  }

  private renderProgressively(): void {
    const colors = getThemeColors(this.options.theme);
    const chunkSize = 50;
    let rendered = 0;

    const renderChunk = () => {
      const nodes = this.data.nodes.slice(rendered, rendered + chunkSize);
      const links = this.data.links.slice(rendered, rendered + chunkSize);

      this.renderNodes(nodes, colors);
      this.renderLinks(links, colors);

      rendered += chunkSize;
      if (rendered < this.data.nodes.length) {
        requestAnimationFrame(renderChunk);
      }
    };

    requestAnimationFrame(renderChunk);
  }

  private renderNodes(nodes: JourneyNode[], colors: any): void {
    const nodeGroup = this.svg.append('g')
      .attr('class', 'nodes')
      .attr('role', 'group')
      .attr('aria-label', 'Journey nodes');

    nodeGroup.selectAll('.node')
      .data(nodes)
      .enter()
      .append('rect')
      .attr('class', 'node')
      .attr('x', (d: any) => d.x0)
      .attr('y', (d: any) => d.y0)
      .attr('width', (d: any) => d.x1 - d.x0)
      .attr('height', (d: any) => d.y1 - d.y0)
      .attr('fill', (d: any) => this.getNodeColor(d, colors))
      .attr('aria-label', (d: any) => d.ariaLabel)
      .attr('tabindex', 0);
  }

  private renderLinks(links: any[], colors: any): void {
    const linkGroup = this.svg.append('g')
      .attr('class', 'links')
      .attr('role', 'group')
      .attr('aria-label', 'Journey connections');

    linkGroup.selectAll('.link')
      .data(links)
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', sankeyLinkHorizontal())
      .attr('stroke', colors.NEUTRAL[0])
      .attr('stroke-width', (d: any) => Math.max(1, d.width))
      .attr('fill', 'none')
      .attr('opacity', JOURNEY_CHART.LINK_OPACITY);
  }

  private setupInteractions(): void {
    if (!this.options.interactive) return;

    // Zoom behavior
    const zoomBehavior = zoom()
      .scaleExtent([0.5, 2])
      .on('zoom', (event) => {
        this.svg.selectAll('g').attr('transform', event.transform);
      });

    this.svg.call(zoomBehavior);

    // Node interactions
    this.svg.selectAll('.node')
      .on('mouseover', this.handleNodeHover.bind(this))
      .on('mouseout', this.handleNodeUnhover.bind(this))
      .on('click', this.handleNodeClick.bind(this))
      .on('keydown', this.handleKeyboardNavigation.bind(this));
  }

  private handleNodeHover(event: any, d: JourneyNode): void {
    select(event.currentTarget)
      .transition()
      .duration(200)
      .attr('opacity', 0.8);

    this.showTooltip(d, event.pageX, event.pageY);
  }

  private handleNodeUnhover(): void {
    select(this.container).selectAll('.node')
      .transition()
      .duration(200)
      .attr('opacity', 1);

    this.hideTooltip();
  }

  private handleNodeClick(event: any, d: JourneyNode): void {
    const isSelected = !d.interactionState.isSelected;
    this.updateNodeSelection(d, isSelected);
    this.highlightConnectedPaths(d, isSelected);
  }

  private handleKeyboardNavigation(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const d = select(event.currentTarget).datum();
      this.handleNodeClick(event, d);
    }
  }

  private setupCleanup(): void {
    const cleanup = () => {
      this.worker.terminate();
      this.interactionHandlers.clear();
      select(this.container).selectAll('*').remove();
    };

    this.container.addEventListener('remove', cleanup);
  }

  private getNodeColor(node: JourneyNode, colors: any): string {
    if (node.metadata.conversionRate > 0.5) {
      return colors.SUCCESS[0];
    } else if (node.metadata.conversionRate > 0.2) {
      return colors.PRIMARY[0];
    }
    return colors.NEUTRAL[0];
  }

  private showTooltip(node: JourneyNode, x: number, y: number): void {
    select(this.container)
      .append('div')
      .attr('class', 'journey-tooltip')
      .style('position', 'absolute')
      .style('left', `${x + 10}px`)
      .style('top', `${y - 10}px`)
      .html(`
        <div role="tooltip">
          <strong>${node.name}</strong><br/>
          Conversion Rate: ${(node.metadata.conversionRate * 100).toFixed(1)}%<br/>
          Time to Convert: ${node.metadata.timeToConvert}hrs<br/>
          Revenue: $${node.metadata.revenue.toFixed(2)}
        </div>
      `);
  }

  private hideTooltip(): void {
    select(this.container).selectAll('.journey-tooltip').remove();
  }

  private updateNodeSelection(node: JourneyNode, isSelected: boolean): void {
    node.interactionState.isSelected = isSelected;
    select(this.container)
      .selectAll('.node')
      .filter((d: any) => d.id === node.id)
      .classed('selected', isSelected)
      .attr('aria-selected', isSelected);
  }

  private highlightConnectedPaths(node: JourneyNode, highlight: boolean): void {
    const opacity = highlight ? 1 : JOURNEY_CHART.LINK_OPACITY;
    select(this.container)
      .selectAll('.link')
      .filter((d: any) => d.source.id === node.id || d.target.id === node.id)
      .transition()
      .duration(200)
      .attr('opacity', opacity);
  }
}

// Export chart creation factory function
export const createJourneyChart = (
  journeyData: any,
  containerId: string,
  options: ChartOptions
): JourneyChartBuilder => {
  return new JourneyChartBuilder(containerId, journeyData, options);
};