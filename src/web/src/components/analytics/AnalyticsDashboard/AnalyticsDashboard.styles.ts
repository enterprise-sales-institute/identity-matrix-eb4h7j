import { styled } from '@mui/material/styles'; // v5.0+
import { Box, Paper } from '@mui/material'; // v5.0+
import { SPACING, BREAKPOINTS, TYPOGRAPHY } from '../../../styles/variables.styles';

// Constants for component styling
const WIDGET_MIN_HEIGHT = '400px';
const GRID_GAP = SPACING.unit * 3;
const HEADER_HEIGHT = '72px';

// Responsive padding configuration
const CONTAINER_PADDING = {
  xs: SPACING.unit * 2,
  sm: SPACING.unit * 3,
  md: SPACING.unit * 4,
  lg: SPACING.unit * 5
};

// Widget elevation levels for different states
const WIDGET_ELEVATION_LEVELS = {
  default: 1,
  hover: 3,
  active: 2
};

// Helper function to create responsive spacing
const createResponsiveSpacing = (baseSpacing: number, multipliers: Record<string, number>) => {
  return Object.entries(multipliers).reduce((acc, [breakpoint, multiplier]) => ({
    ...acc,
    [breakpoint]: baseSpacing * multiplier
  }), {});
};

// Main dashboard container with responsive padding
export const DashboardContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  backgroundColor: theme.palette.background.default,
  padding: CONTAINER_PADDING.xs,
  transition: theme.transitions.create(['padding'], {
    duration: theme.transitions.duration.standard
  }),
  [theme.breakpoints.up('sm')]: {
    padding: CONTAINER_PADDING.sm
  },
  [theme.breakpoints.up('md')]: {
    padding: CONTAINER_PADDING.md
  },
  [theme.breakpoints.up('lg')]: {
    padding: CONTAINER_PADDING.lg
  }
}));

// Enhanced dashboard header with sticky positioning
export const DashboardHeader = styled(Box)(({ theme }) => ({
  height: HEADER_HEIGHT,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: SPACING.unit * 3,
  position: 'sticky',
  top: 0,
  zIndex: theme.zIndex.appBar,
  backgroundColor: theme.palette.background.default,
  borderBottom: `1px solid ${theme.palette.divider}`,
  padding: `0 ${SPACING.unit * 2}px`,
  ...TYPOGRAPHY.h1,
  [theme.breakpoints.up('sm')]: {
    padding: `0 ${SPACING.unit * 3}px`
  }
}));

// Responsive grid layout for dashboard widgets
export const DashboardGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  gap: GRID_GAP,
  gridTemplateColumns: '1fr',
  gridAutoRows: `minmax(${WIDGET_MIN_HEIGHT}, auto)`,
  [theme.breakpoints.up('sm')]: {
    gridTemplateColumns: 'repeat(2, 1fr)'
  },
  [theme.breakpoints.up('md')]: {
    gridTemplateColumns: 'repeat(3, 1fr)'
  },
  [theme.breakpoints.up('lg')]: {
    gridTemplateColumns: 'repeat(4, 1fr)'
  },
  '@supports (grid-template-rows: masonry)': {
    gridTemplateRows: 'masonry'
  }
}));

// Enhanced widget container with elevation and interaction states
export const WidgetContainer = styled(Paper)(({ theme }) => ({
  minHeight: WIDGET_MIN_HEIGHT,
  padding: SPACING.unit * 2,
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[WIDGET_ELEVATION_LEVELS.default],
  transition: theme.transitions.create(['box-shadow', 'transform'], {
    duration: theme.transitions.duration.shorter
  }),
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  overflow: 'hidden',

  '&:hover': {
    boxShadow: theme.shadows[WIDGET_ELEVATION_LEVELS.hover],
    transform: 'translateY(-2px)'
  },

  '&:active': {
    boxShadow: theme.shadows[WIDGET_ELEVATION_LEVELS.active],
    transform: 'translateY(0)'
  },

  // Enhanced accessibility
  '&:focus-visible': {
    outline: 'none',
    boxShadow: `${theme.shadows[WIDGET_ELEVATION_LEVELS.hover]}, 0 0 0 2px ${theme.palette.primary.main}`
  },

  // Responsive padding
  [theme.breakpoints.up('sm')]: {
    padding: SPACING.unit * 3
  },

  // High-contrast mode support
  '@media (forced-colors: active)': {
    border: '1px solid ButtonText'
  }
}));