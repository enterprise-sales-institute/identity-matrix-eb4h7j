import { styled } from '@mui/material/styles'; // v5.0+
import { Box, Card, Paper, Grid } from '@mui/material'; // v5.0+
import { SPACING, TYPOGRAPHY, BREAKPOINTS, COLORS } from '../../../styles/variables.styles';

// Constants for styling configuration
const CARD_SHADOW = '0 2px 4px rgba(0,0,0,0.1)';
const TRANSITION_DURATION = '0.2s';
const SELECTED_BORDER_WIDTH = '2px';
const PATH_LINE_WIDTH = '2px';
const HOVER_ELEVATION = 4;
const DEFAULT_ELEVATION = 1;

// Main container with responsive grid layout
export const TouchpointContainer = styled(Grid)(({ theme }) => ({
  display: 'grid',
  gap: SPACING.multiplier(2),
  padding: SPACING.multiplier(2),
  width: '100%',
  backgroundColor: theme.palette.background.default,
  transition: `all ${TRANSITION_DURATION} ${theme.transitions.easing.standard}`,

  // Mobile-first responsive layout
  gridTemplateColumns: '1fr',
  [theme.breakpoints.up(BREAKPOINTS.sm)]: {
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: SPACING.multiplier(3),
  },
  [theme.breakpoints.up(BREAKPOINTS.md)]: {
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: SPACING.multiplier(4),
  },

  // RTL support
  direction: theme.direction,
}));

// Enhanced card component with Material elevation
export const TouchpointCard = styled(Card)(({ theme }) => ({
  position: 'relative',
  padding: SPACING.multiplier(2),
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  boxShadow: CARD_SHADOW,
  transition: `all ${TRANSITION_DURATION} ${theme.transitions.easing.standard}`,
  cursor: 'pointer',
  
  // Interactive states
  '&:hover': {
    elevation: HOVER_ELEVATION,
    transform: 'translateY(-2px)',
    backgroundColor: theme.palette.background.elevated,
  },

  '&.selected': {
    border: `${SELECTED_BORDER_WIDTH} solid ${theme.palette.primary.main}`,
    boxShadow: `0 0 0 ${SELECTED_BORDER_WIDTH} ${theme.palette.primary.main}`,
  },

  // Typography
  '& .title': {
    ...TYPOGRAPHY.h3,
    color: theme.palette.text.primary,
    marginBottom: SPACING.unit,
  },

  // Responsive padding
  [theme.breakpoints.down(BREAKPOINTS.sm)]: {
    padding: SPACING.multiplier(1.5),
  },
}));

// Themed container for metrics display
export const TouchpointMetrics = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: SPACING.unit,
  padding: SPACING.multiplier(1.5),
  backgroundColor: theme.palette.background.elevated,
  borderRadius: theme.shape.borderRadius,

  // Typography styles
  '& .metric-label': {
    ...TYPOGRAPHY.body2,
    color: theme.palette.text.secondary,
  },

  '& .metric-value': {
    ...TYPOGRAPHY.h4,
    color: theme.palette.text.primary,
  },

  // Responsive adjustments
  [theme.breakpoints.down(BREAKPOINTS.sm)]: {
    padding: SPACING.unit,
    gap: SPACING.unit / 2,
  },
}));

// Container for path visualization
export const TouchpointPath = styled(Paper)(({ theme }) => ({
  position: 'relative',
  padding: SPACING.multiplier(2),
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  overflow: 'hidden',

  // Path line styling
  '&::before': {
    content: '""',
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: PATH_LINE_WIDTH,
    backgroundColor: theme.palette.primary.main,
    opacity: 0.3,
  },

  // Path node styling
  '& .path-node': {
    width: SPACING.multiplier(4),
    height: SPACING.multiplier(4),
    borderRadius: '50%',
    backgroundColor: theme.palette.primary.main,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: theme.palette.primary.contrastText,
    ...TYPOGRAPHY.body2,
    
    '&.active': {
      backgroundColor: theme.palette.primary.dark,
      boxShadow: `0 0 0 ${PATH_LINE_WIDTH} ${theme.palette.primary.light}`,
    },
  },

  // Responsive adjustments
  [theme.breakpoints.down(BREAKPOINTS.sm)]: {
    padding: SPACING.multiplier(1.5),
    
    '& .path-node': {
      width: SPACING.multiplier(3),
      height: SPACING.multiplier(3),
    },
  },
}));