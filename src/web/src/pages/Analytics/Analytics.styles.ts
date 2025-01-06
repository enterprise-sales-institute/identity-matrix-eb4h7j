import { styled } from '@mui/material/styles'; // v5.0+
import { Box, Container } from '@mui/material'; // v5.0+
import { SPACING, BREAKPOINTS } from '../../styles/variables.styles';

// Responsive spacing constants based on 8px grid system
const CONTAINER_SPACING = {
  xs: SPACING.unit * 2, // 16px
  sm: SPACING.unit * 3, // 24px
  md: SPACING.unit * 4, // 32px
  lg: SPACING.unit * 5  // 40px
};

const SECTION_MARGIN = {
  xs: SPACING.unit * 2, // 16px
  sm: SPACING.unit * 3, // 24px
  md: SPACING.unit * 4  // 32px
};

// Material Design elevation levels
const ELEVATION_LEVELS = {
  header: 2,
  section: 1,
  overlay: 4
};

// Helper function to create responsive spacing values
const createResponsiveSpacing = (baseSpacing: number) => ({
  xs: `${baseSpacing}px`,
  sm: `${baseSpacing * 1.5}px`,
  md: `${baseSpacing * 2}px`,
  lg: `${baseSpacing * 2.5}px`
});

// Main container component with responsive padding and theme support
export const PageContainer = styled(Container)(({ theme }) => ({
  padding: CONTAINER_SPACING.xs,
  backgroundColor: theme.colors.background.default,
  minHeight: '100vh',
  width: '100%',
  maxWidth: '100%',

  [theme.breakpoints.up('sm')]: {
    padding: CONTAINER_SPACING.sm,
    maxWidth: BREAKPOINTS.sm
  },

  [theme.breakpoints.up('md')]: {
    padding: CONTAINER_SPACING.md,
    maxWidth: BREAKPOINTS.md
  },

  [theme.breakpoints.up('lg')]: {
    padding: CONTAINER_SPACING.lg,
    maxWidth: BREAKPOINTS.lg
  }
}));

// Header component with elevation and responsive spacing
export const PageHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: SPACING.unit * 2,
  marginBottom: SECTION_MARGIN.xs,
  padding: `${SPACING.unit * 2}px`,
  backgroundColor: theme.colors.background.paper,
  borderRadius: SPACING.unit,
  boxShadow: theme.elevation.low,
  zIndex: ELEVATION_LEVELS.header,

  [theme.breakpoints.up('sm')]: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SECTION_MARGIN.sm,
    padding: `${SPACING.unit * 3}px`
  },

  [theme.breakpoints.up('md')]: {
    marginBottom: SECTION_MARGIN.md,
    padding: `${SPACING.unit * 4}px`
  }
}));

// Content section component with theme-based styling and elevation
export const ContentSection = styled(Box)(({ theme }) => ({
  backgroundColor: theme.colors.background.paper,
  borderRadius: SPACING.unit,
  boxShadow: theme.elevation.low,
  padding: createResponsiveSpacing(SPACING.unit * 2),
  marginBottom: SECTION_MARGIN.xs,
  transition: theme.transitions.create(['box-shadow']),

  '&:hover': {
    boxShadow: theme.elevation.medium
  },

  [theme.breakpoints.up('sm')]: {
    marginBottom: SECTION_MARGIN.sm
  },

  [theme.breakpoints.up('md')]: {
    marginBottom: SECTION_MARGIN.md
  }
}));

// Grid container for analytics widgets
export const AnalyticsGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  gap: SPACING.unit * 2,
  gridTemplateColumns: '1fr',
  width: '100%',

  [theme.breakpoints.up('sm')]: {
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: SPACING.unit * 3
  },

  [theme.breakpoints.up('md')]: {
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: SPACING.unit * 4
  }
}));

// Chart container with responsive dimensions
export const ChartContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  height: '300px',
  padding: SPACING.unit * 2,
  backgroundColor: theme.colors.background.elevated,
  borderRadius: SPACING.unit,
  
  [theme.breakpoints.up('sm')]: {
    height: '400px'
  },
  
  [theme.breakpoints.up('md')]: {
    height: '500px'
  }
}));

// Journey visualization container with specific styling
export const JourneyContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  minHeight: '400px',
  padding: SPACING.unit * 2,
  backgroundColor: theme.colors.background.elevated,
  borderRadius: SPACING.unit,
  overflowX: 'auto',
  
  [theme.breakpoints.up('md')]: {
    minHeight: '600px'
  }
}));