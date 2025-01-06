import { styled } from '@mui/material/styles';
import { Box, Card } from '@mui/material'; // v5.0+
import { SPACING, BREAKPOINTS, COLORS } from '../../../styles/variables.styles';

// Constants for styling
const CARD_SHADOW = {
  default: '0 4px 8px rgba(0,0,0,0.15)',
  hover: '0 6px 12px rgba(0,0,0,0.2)'
};

const TRANSITION = {
  default: 'all 0.2s ease-in-out',
  reduced: '@media (prefers-reduced-motion: reduce) { all 0.1s linear }'
};

const CHART_MIN_HEIGHT = {
  desktop: '400px',
  tablet: '300px',
  mobile: '250px'
};

// Main container with responsive padding and RTL support
export const Container = styled(Box)(({ theme }) => ({
  width: '100%',
  maxWidth: '1200px',
  margin: '0 auto',
  padding: SPACING.multiplier(2),
  direction: 'inherit',
  
  [theme.breakpoints.down('sm')]: {
    padding: SPACING.unit
  },
  
  [theme.breakpoints.between('sm', 'md')]: {
    padding: SPACING.multiplier(1.5)
  },
  
  '@media print': {
    padding: SPACING.unit,
    maxWidth: '100%'
  }
}));

// Header section with responsive flex layout
export const Header = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: SPACING.multiplier(3),
  gap: SPACING.unit,
  
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
    alignItems: 'stretch'
  },
  
  [theme.breakpoints.up('sm')]: {
    flexDirection: 'row',
    gap: SPACING.multiplier(2)
  }
}));

// Chart container with aspect ratio preservation
export const ChartContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  aspectRatio: '16/9',
  minHeight: CHART_MIN_HEIGHT.desktop,
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  padding: SPACING.multiplier(2),
  overflow: 'hidden',
  boxShadow: CARD_SHADOW.default,
  transition: TRANSITION.default,
  
  '&:hover': {
    boxShadow: CARD_SHADOW.hover
  },
  
  [theme.breakpoints.down('sm')]: {
    minHeight: CHART_MIN_HEIGHT.mobile,
    padding: SPACING.unit
  },
  
  [theme.breakpoints.between('sm', 'md')]: {
    minHeight: CHART_MIN_HEIGHT.tablet,
    padding: SPACING.multiplier(1.5)
  },
  
  '@media (prefers-reduced-motion: reduce)': {
    transition: TRANSITION.reduced
  }
}));

// Responsive grid for metrics display
export const MetricsGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  gap: SPACING.multiplier(2),
  marginTop: SPACING.multiplier(3),
  
  [theme.breakpoints.down('sm')]: {
    gridTemplateColumns: '1fr',
    gap: SPACING.unit
  },
  
  [theme.breakpoints.between('sm', 'md')]: {
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: SPACING.multiplier(1.5)
  },
  
  [theme.breakpoints.up('md')]: {
    gridTemplateColumns: 'repeat(3, 1fr)'
  },
  
  '@media print': {
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: SPACING.unit
  }
}));

// Enhanced metric card with accessibility features
export const MetricCard = styled(Card)(({ theme }) => ({
  padding: SPACING.multiplier(2),
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  backgroundColor: theme.palette.background.paper,
  boxShadow: CARD_SHADOW.default,
  transition: TRANSITION.default,
  cursor: 'pointer',
  
  '&:hover': {
    boxShadow: CARD_SHADOW.hover,
    transform: 'translateY(-2px)'
  },
  
  '&:focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: '2px'
  },
  
  [theme.breakpoints.down('sm')]: {
    padding: SPACING.multiplier(1.5)
  },
  
  '@media (prefers-reduced-motion: reduce)': {
    transition: TRANSITION.reduced,
    '&:hover': {
      transform: 'none'
    }
  },
  
  '@media print': {
    boxShadow: 'none',
    border: `1px solid ${theme.palette.divider}`
  }
}));