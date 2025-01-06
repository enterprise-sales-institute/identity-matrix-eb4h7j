import styled, { css } from 'styled-components';
import { SPACING, BREAKPOINTS, COLORS, TRANSITIONS, ELEVATION } from '../../../styles/variables.styles';

// Type definitions for styled-component props
interface TouchpointProps {
  isActive?: boolean;
  isHighlighted?: boolean;
  size?: 'small' | 'medium' | 'large';
}

interface PathProps {
  isActive?: boolean;
  isHighlighted?: boolean;
  direction?: 'horizontal' | 'vertical';
}

interface LabelProps {
  position?: 'top' | 'bottom' | 'left' | 'right';
  isHighlighted?: boolean;
}

interface MetricsProps {
  isExpanded?: boolean;
}

// Constants for styling
const NODE_SIZE = {
  DEFAULT: '64px',
  TABLET: '56px',
  MOBILE: '48px'
};

const CONNECTION_WIDTH = {
  DEFAULT: '2px',
  HIGHLIGHTED: '3px',
  ACTIVE: '4px'
};

const Z_INDEX = {
  CONTAINER: 1,
  PATHS: 2,
  NODES: 3,
  LABELS: 4,
  TOOLTIPS: 5
};

// Helper function for responsive styles
const getResponsiveStyles = (styles: Record<keyof typeof BREAKPOINTS, string>) => {
  return Object.entries(BREAKPOINTS)
    .sort(([, a], [, b]) => a - b)
    .map(([breakpoint, value]) => {
      return `
        @media (min-width: ${value}px) {
          ${styles[breakpoint as keyof typeof BREAKPOINTS]}
        }
      `;
    })
    .join('');
};

// Main container for journey visualization
export const JourneyContainer = styled.div`
  width: 100%;
  height: 100%;
  min-height: 500px;
  padding: ${SPACING.unit * 3}px;
  position: relative;
  background-color: ${({ theme }) => theme.mode === 'light' ? COLORS.light.background.paper : COLORS.dark.background.paper};
  border-radius: ${SPACING.unit}px;
  box-shadow: ${ELEVATION.low};
  overflow: hidden;
  z-index: ${Z_INDEX.CONTAINER};
  contain: layout size;

  @media (prefers-reduced-motion: reduce) {
    * {
      transition: none !important;
    }
  }
`;

// Container for SVG paths
export const PathContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: ${Z_INDEX.PATHS};
  pointer-events: none;
  transform: translateZ(0);
  will-change: transform;
`;

// Interactive touchpoint node
export const TouchpointNode = styled.div<TouchpointProps>`
  position: absolute;
  width: ${({ size }) => size === 'small' ? NODE_SIZE.MOBILE : size === 'medium' ? NODE_SIZE.TABLET : NODE_SIZE.DEFAULT};
  height: ${({ size }) => size === 'small' ? NODE_SIZE.MOBILE : size === 'medium' ? NODE_SIZE.TABLET : NODE_SIZE.DEFAULT};
  border-radius: 50%;
  background-color: ${({ theme, isActive, isHighlighted }) => 
    isActive ? COLORS[theme.mode].primary.main :
    isHighlighted ? COLORS[theme.mode].primary.light :
    COLORS[theme.mode].secondary.main
  };
  box-shadow: ${({ isActive }) => isActive ? ELEVATION.medium : ELEVATION.low};
  transition: all ${TRANSITIONS.duration.medium} ${TRANSITIONS.easing.standard};
  z-index: ${Z_INDEX.NODES};
  cursor: pointer;
  transform: translateZ(0);
  will-change: transform, background-color, box-shadow;

  &:hover {
    transform: scale(1.05);
    box-shadow: ${ELEVATION.medium};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${ELEVATION.focusRing};
  }

  ${getResponsiveStyles({
    xs: `
      width: ${NODE_SIZE.MOBILE};
      height: ${NODE_SIZE.MOBILE};
    `,
    sm: `
      width: ${NODE_SIZE.TABLET};
      height: ${NODE_SIZE.TABLET};
    `,
    md: `
      width: ${NODE_SIZE.DEFAULT};
      height: ${NODE_SIZE.DEFAULT};
    `
  })}
`;

// Path connection between nodes
export const PathConnection = styled.div<PathProps>`
  position: absolute;
  background-color: ${({ theme, isActive, isHighlighted }) => 
    isActive ? COLORS[theme.mode].primary.main :
    isHighlighted ? COLORS[theme.mode].primary.light :
    COLORS[theme.mode].secondary.light
  };
  transition: all ${TRANSITIONS.duration.medium} ${TRANSITIONS.easing.standard};
  z-index: ${Z_INDEX.PATHS};
  transform-origin: left center;
  
  ${({ direction = 'horizontal' }) => direction === 'horizontal' ? css`
    height: ${CONNECTION_WIDTH.DEFAULT};
    &[data-active="true"] { height: ${CONNECTION_WIDTH.ACTIVE}; }
    &[data-highlighted="true"] { height: ${CONNECTION_WIDTH.HIGHLIGHTED}; }
  ` : css`
    width: ${CONNECTION_WIDTH.DEFAULT};
    &[data-active="true"] { width: ${CONNECTION_WIDTH.ACTIVE}; }
    &[data-highlighted="true"] { width: ${CONNECTION_WIDTH.HIGHLIGHTED}; }
  `}
`;

// Touchpoint label
export const TouchpointLabel = styled.span<LabelProps>`
  position: absolute;
  ${({ position = 'bottom' }) => {
    switch (position) {
      case 'top': return 'bottom: 100%; left: 50%; transform: translateX(-50%);';
      case 'bottom': return 'top: 100%; left: 50%; transform: translateX(-50%);';
      case 'left': return 'right: 100%; top: 50%; transform: translateY(-50%);';
      case 'right': return 'left: 100%; top: 50%; transform: translateY(-50%);';
    }
  }}
  margin: ${SPACING.unit}px;
  color: ${({ theme, isHighlighted }) => 
    isHighlighted ? COLORS[theme.mode].primary.main : COLORS[theme.mode].text.primary
  };
  font-size: ${({ theme }) => theme.typography.body2.fontSize}px;
  font-weight: ${({ isHighlighted }) => isHighlighted ? 500 : 400};
  white-space: nowrap;
  z-index: ${Z_INDEX.LABELS};
  transition: all ${TRANSITIONS.duration.medium} ${TRANSITIONS.easing.standard};
`;

// Metrics container
export const MetricsContainer = styled.div<MetricsProps>`
  position: absolute;
  right: ${SPACING.unit * 2}px;
  top: ${SPACING.unit * 2}px;
  padding: ${SPACING.unit * 2}px;
  background-color: ${({ theme }) => theme.mode === 'light' ? COLORS.light.background.elevated : COLORS.dark.background.elevated};
  border-radius: ${SPACING.unit}px;
  box-shadow: ${ELEVATION.medium};
  z-index: ${Z_INDEX.TOOLTIPS};
  transition: all ${TRANSITIONS.duration.medium} ${TRANSITIONS.easing.standard};
  transform: translateZ(0);
  will-change: transform;
  
  ${({ isExpanded }) => isExpanded && css`
    width: 300px;
    transform: translateX(0);
  `}

  ${getResponsiveStyles({
    xs: `
      width: calc(100% - ${SPACING.unit * 4}px);
      transform: translateX(${SPACING.unit * 2}px);
    `,
    sm: `
      width: 280px;
      transform: translateX(0);
    `,
    md: `
      width: 300px;
    `
  })}
`;