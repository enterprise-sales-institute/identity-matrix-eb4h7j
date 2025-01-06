import { styled } from '@mui/material/styles';
import { Box, Paper, Grid } from '@mui/material';
import { SPACING, BREAKPOINTS, COLORS, SHADOWS, TYPOGRAPHY } from '../../styles/variables.styles';

// Responsive padding calculations
const CONTAINER_PADDING = {
  xs: SPACING.unit,
  sm: SPACING.unit * 2,
  md: SPACING.unit * 3,
  lg: SPACING.unit * 4,
};

// Section margin and padding calculations
const SECTION_MARGIN = {
  xs: SPACING.unit * 2,
  sm: SPACING.unit * 3,
  md: SPACING.unit * 4,
};

const SECTION_PADDING = {
  xs: SPACING.unit * 2,
  sm: SPACING.unit * 3,
  md: SPACING.unit * 4,
};

// Main container with responsive layout
export const AttributionContainer = styled(Box)(({ theme }) => ({
  padding: CONTAINER_PADDING.xs,
  maxWidth: BREAKPOINTS.lg,
  margin: '0 auto',
  width: '100%',
  transition: 'all 0.3s ease-in-out',

  [theme.breakpoints.up('sm')]: {
    padding: CONTAINER_PADDING.sm,
  },

  [theme.breakpoints.up('md')]: {
    padding: CONTAINER_PADDING.md,
  },

  [theme.breakpoints.up('lg')]: {
    padding: CONTAINER_PADDING.lg,
  },
}));

// Model configuration section with elevation
export const ModelSection = styled(Paper)(({ theme }) => ({
  marginBottom: SECTION_MARGIN.xs,
  padding: SECTION_PADDING.xs,
  borderRadius: 8,
  boxShadow: SHADOWS.medium,
  backgroundColor: theme.palette.background.paper,
  transition: 'all 0.3s ease-in-out',
  zIndex: 1,

  '&:hover': {
    boxShadow: SHADOWS.high,
    transform: 'translateY(-2px)',
  },

  [theme.breakpoints.up('sm')]: {
    marginBottom: SECTION_MARGIN.sm,
    padding: SECTION_PADDING.sm,
  },

  [theme.breakpoints.up('md')]: {
    marginBottom: SECTION_MARGIN.md,
    padding: SECTION_PADDING.md,
  },
}));

// Analysis section with enhanced elevation
export const AnalysisSection = styled(Paper)(({ theme }) => ({
  padding: SECTION_PADDING.xs,
  borderRadius: 8,
  boxShadow: SHADOWS.medium,
  backgroundColor: theme.palette.background.paper,
  transition: 'all 0.3s ease-in-out',
  zIndex: 1,

  '&:hover': {
    boxShadow: SHADOWS.high,
    transform: 'translateY(-2px)',
  },

  [theme.breakpoints.up('sm')]: {
    padding: SECTION_PADDING.sm,
  },

  [theme.breakpoints.up('md')]: {
    padding: SECTION_PADDING.md,
  },
}));

// Section title with typography scale
export const SectionTitle = styled('h2')(({ theme }) => ({
  ...TYPOGRAPHY.h2,
  marginBottom: SPACING.unit * 2,
  color: theme.palette.text.primary,
  transition: 'color 0.3s ease-in-out',
}));

// Grid container for form elements
export const FormGrid = styled(Grid)(({ theme }) => ({
  marginTop: SPACING.unit * 2,
  gap: SPACING.unit * 2,
}));

// Form section wrapper
export const FormSection = styled(Box)(({ theme }) => ({
  marginBottom: SPACING.unit * 3,
  
  '&:last-child': {
    marginBottom: 0,
  },
}));

// Channel weight input container
export const ChannelWeightContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: SPACING.unit * 2,
  marginBottom: SPACING.unit * 2,
  
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
}));

// Rules configuration container
export const RulesContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: SPACING.unit * 2,
  padding: SPACING.unit * 2,
  backgroundColor: theme.palette.background.default,
  borderRadius: 4,
  border: `1px solid ${theme.palette.divider}`,
}));

// Action buttons container
export const ActionButtonsContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: SPACING.unit * 2,
  marginTop: SPACING.unit * 4,
  
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
  },
}));

// Analysis chart container
export const ChartContainer = styled(Box)(({ theme }) => ({
  height: 400,
  marginTop: SPACING.unit * 3,
  padding: SPACING.unit * 2,
  backgroundColor: theme.palette.background.default,
  borderRadius: 4,
  border: `1px solid ${theme.palette.divider}`,
  
  [theme.breakpoints.up('md')]: {
    height: 500,
  },
}));

// Results table container
export const TableContainer = styled(Box)(({ theme }) => ({
  marginTop: SPACING.unit * 3,
  overflow: 'auto',
  maxHeight: 400,
  
  '& .MuiTable-root': {
    borderCollapse: 'separate',
    borderSpacing: `${SPACING.unit}px 0`,
  },
}));