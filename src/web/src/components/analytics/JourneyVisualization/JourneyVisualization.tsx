import React, { useEffect, useCallback, useState, memo, useRef, forwardRef } from 'react';
import * as d3 from 'd3'; // v7.0.0
import { useIntersectionObserver } from 'react-intersection-observer'; // v9.0.0
import { useAnalytics, useVirtualization, useResizeObserver } from '@analytics/hooks'; // v1.0.0
import {
  JourneyContainer,
  PathContainer,
  TouchpointNode,
  PathConnection,
  TouchpointLabel,
  MetricsContainer,
  SkeletonUI,
  ErrorBoundary
} from './JourneyVisualization.styles';

// Types and Interfaces
interface TouchpointData {
  id: string;
  channel: string;
  timestamp: number;
  metrics: {
    conversionRate: number;
    value: number;
    timeToConvert: number;
  };
}

interface PathLayout {
  nodes: Array<{
    id: string;
    x: number;
    y: number;
    data: TouchpointData;
  }>;
  paths: Array<{
    id: string;
    d: string;
    source: string;
    target: string;
  }>;
}

interface JourneyVisualizationProps {
  timeRange: { start: Date; end: Date };
  selectedChannels: string[];
  onTouchpointClick?: (touchpointId: string) => void;
  width?: number;
  height?: number;
  virtualScrollEnabled?: boolean;
  accessibilityLabel?: string;
  onError?: (error: Error) => void;
}

// Constants
const VIRTUAL_ITEM_SIZE = 80;
const DEBOUNCE_DELAY = 150;
const MIN_CONTAINER_HEIGHT = 500;

// Utility Functions
const calculatePathLayout = (
  touchpoints: TouchpointData[],
  dimensions: { width: number; height: number },
  virtualItems: Array<{ index: number; start: number; size: number }> = []
): PathLayout => {
  const layout = d3.dagStratify()(touchpoints);
  const { width, height } = dimensions;

  // Create D3 layout with optimized settings
  const dag = d3
    .sugiyama()
    .size([width * 0.9, height * 0.9])
    .layering(d3.layeringLongestPath())
    .decross(d3.decrossOpt())
    .coord(d3.coordCenter())
    (layout);

  // Calculate node positions with virtualization support
  const nodes = dag.descendants().map((node, index) => ({
    id: node.data.id,
    x: node.x,
    y: virtualItems.length ? virtualItems[index]?.start || node.y : node.y,
    data: node.data
  }));

  // Generate optimized SVG paths
  const paths = dag.links().map((link) => ({
    id: `${link.source.data.id}-${link.target.data.id}`,
    d: d3.line().curve(d3.curveBasis)([
      [link.source.x, link.source.y],
      [link.target.x, link.target.y]
    ]),
    source: link.source.data.id,
    target: link.target.data.id
  }));

  return { nodes, paths };
};

// Main Component
export const JourneyVisualization = memo(forwardRef<HTMLDivElement, JourneyVisualizationProps>(
  (
    {
      timeRange,
      selectedChannels,
      onTouchpointClick,
      width = 800,
      height = 600,
      virtualScrollEnabled = true,
      accessibilityLabel = 'Customer Journey Visualization',
      onError
    },
    ref
  ) => {
    // Refs and State
    const containerRef = useRef<HTMLDivElement>(null);
    const [layout, setLayout] = useState<PathLayout | null>(null);
    const [activeNode, setActiveNode] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // Custom Hooks
    const { trackEvent } = useAnalytics();
    const { inView, ref: intersectionRef } = useIntersectionObserver();
    const { virtualItems, totalSize } = useVirtualization({
      itemCount: layout?.nodes.length || 0,
      itemSize: VIRTUAL_ITEM_SIZE,
      overscan: 5,
      enabled: virtualScrollEnabled
    });

    // Resize Observer
    const handleResize = useCallback(
      (entries: ResizeObserverEntry[]) => {
        const entry = entries[0];
        if (entry) {
          const { width, height } = entry.contentRect;
          try {
            const newLayout = calculatePathLayout(
              layout?.nodes.map((n) => n.data) || [],
              { width, height },
              virtualItems
            );
            setLayout(newLayout);
          } catch (err) {
            setError(err as Error);
            onError?.(err as Error);
          }
        }
      },
      [layout, virtualItems, onError]
    );

    useResizeObserver(containerRef, handleResize);

    // Event Handlers
    const handleTouchpointClick = useCallback(
      (touchpointId: string) => {
        setActiveNode(touchpointId);
        onTouchpointClick?.(touchpointId);
        trackEvent('touchpoint_click', { touchpointId });
      },
      [onTouchpointClick, trackEvent]
    );

    const handleKeyboardNavigation = useCallback(
      (event: React.KeyboardEvent) => {
        if (!layout) return;

        const currentIndex = layout.nodes.findIndex((n) => n.id === activeNode);
        let newIndex = currentIndex;

        switch (event.key) {
          case 'ArrowRight':
            newIndex = Math.min(currentIndex + 1, layout.nodes.length - 1);
            break;
          case 'ArrowLeft':
            newIndex = Math.max(currentIndex - 1, 0);
            break;
          default:
            return;
        }

        const newNode = layout.nodes[newIndex];
        if (newNode) {
          setActiveNode(newNode.id);
          onTouchpointClick?.(newNode.id);
        }
      },
      [layout, activeNode, onTouchpointClick]
    );

    // Effects
    useEffect(() => {
      const initializeVisualization = async () => {
        try {
          setIsLoading(true);
          // Initial layout calculation would go here
          setIsLoading(false);
        } catch (err) {
          setError(err as Error);
          onError?.(err as Error);
        }
      };

      if (inView) {
        initializeVisualization();
      }
    }, [timeRange, selectedChannels, inView, onError]);

    // Render Methods
    const renderTouchpoints = () => {
      if (!layout) return null;

      return layout.nodes.map((node) => (
        <TouchpointNode
          key={node.id}
          style={{ transform: `translate(${node.x}px, ${node.y}px)` }}
          isActive={node.id === activeNode}
          onClick={() => handleTouchpointClick(node.id)}
          onKeyDown={handleKeyboardNavigation}
          tabIndex={0}
          role="button"
          aria-label={`Touchpoint ${node.data.channel}`}
          data-testid={`touchpoint-${node.id}`}
        >
          <TouchpointLabel position="bottom">
            {node.data.channel}
          </TouchpointLabel>
        </TouchpointNode>
      ));
    };

    const renderPaths = () => {
      if (!layout) return null;

      return layout.paths.map((path) => (
        <PathConnection
          key={path.id}
          style={{
            transform: `translate(${path.d})`,
          }}
          isActive={path.source === activeNode || path.target === activeNode}
          aria-hidden="true"
        />
      ));
    };

    // Main Render
    if (error) {
      return (
        <ErrorBoundary>
          <div role="alert">Error loading visualization: {error.message}</div>
        </ErrorBoundary>
      );
    }

    return (
      <JourneyContainer
        ref={mergeRefs([ref, containerRef, intersectionRef])}
        role="region"
        aria-label={accessibilityLabel}
        style={{ width, height: Math.max(height, MIN_CONTAINER_HEIGHT) }}
      >
        {isLoading ? (
          <SkeletonUI />
        ) : (
          <>
            <PathContainer>{renderPaths()}</PathContainer>
            {renderTouchpoints()}
            {activeNode && layout && (
              <MetricsContainer
                isExpanded={!!activeNode}
                role="complementary"
                aria-label="Touchpoint metrics"
              >
                {/* Metrics content would go here */}
              </MetricsContainer>
            )}
          </>
        )}
      </JourneyContainer>
    );
  }
));

// Utility for merging refs
const mergeRefs = (refs: Array<React.Ref<any>>) => {
  return (node: any) => {
    refs.forEach((ref) => {
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        (ref as React.MutableRefObject<any>).current = node;
      }
    });
  };
};

JourneyVisualization.displayName = 'JourneyVisualization';

export default JourneyVisualization;