import { styled } from '@mui/material/styles'; // v5.0+
import Box from '@mui/material/Box'; // v5.0+
import { SPACING, BREAKPOINTS } from '../../../styles/variables.styles';

// Helper function to generate responsive styles based on breakpoints
const getResponsiveStyles = (theme: any) => ({
  [theme.breakpoints.up('xs')]: {
    padding: `${SPACING.unit}px`,
    minHeight: '250px',
  },
  [theme.breakpoints.up('sm')]: {
    padding: `${SPACING.unit * 1.5}px`,
    minHeight: '300px',
  },
  [theme.breakpoints.up('md')]: {
    padding: `${SPACING.unit * 2}px`,
    minHeight: '350px',
  },
  [theme.breakpoints.up('lg')]: {
    padding: `${SPACING.unit * 2.5}px`,
    minHeight: '400px',
  },
});

// Main container for chart with responsive behavior and accessibility support
export const ChartContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  height: 'auto',
  minHeight: '300px',
  position: 'relative',
  marginBottom: `${SPACING.unit * 3}px`,
  zIndex: 1,
  willChange: 'transform',
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
  },
  '@media screen and (forced-colors: active)': {
    borderColor: 'ButtonText',
  },
  '@media (max-width: ${BREAKPOINTS.xs}px)': {
    minHeight: '250px',
  },
  ...getResponsiveStyles(theme),
}));

// Inner wrapper for chart with theme-aware styling and elevation
export const ChartWrapper = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  padding: `${SPACING.unit * 2}px`,
  boxShadow: theme.shadows[1],
  transition: theme.transitions.create(['box-shadow', 'transform'], {
    duration: theme.transitions.duration.short,
  }),
  transform: 'translate3d(0, 0, 0)',
  '&:hover': {
    boxShadow: theme.shadows[2],
  },
  '&:focus-within': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: '2px',
  },
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
  },
  '@media screen and (forced-colors: active)': {
    borderStyle: 'solid',
    borderWidth: '1px',
  },
  ...getResponsiveStyles(theme),
}));

// Styled component for chart legend with responsive layout
export const ChartLegend = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: `${SPACING.unit}px`,
  marginTop: `${SPACING.unit * 2}px`,
  justifyContent: 'center',
  alignItems: 'center',
  direction: 'inherit', // Supports RTL
  color: theme.palette.text.primary,
  '@media (forced-colors: active)': {
    forcedColorAdjust: 'auto',
  },
  [theme.breakpoints.up('xs')]: {
    flexDirection: 'column',
    gap: `${SPACING.unit / 2}px`,
  },
  [theme.breakpoints.up('sm')]: {
    flexDirection: 'row',
    gap: `${SPACING.unit}px`,
  },
  '& > *': {
    minWidth: '120px',
    '@media (max-width: ${BREAKPOINTS.xs}px)': {
      minWidth: '100px',
    },
  },
  '&:focus-within': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: '2px',
  },
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
  },
}));