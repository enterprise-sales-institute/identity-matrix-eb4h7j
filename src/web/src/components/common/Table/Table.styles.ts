import { styled } from '@mui/material/styles'; // v5.0+
import { Table, TableHead, TableBody, TableRow, TableCell } from '@mui/material'; // v5.0+
import { SPACING, TYPOGRAPHY, BREAKPOINTS, COLORS } from '../../../styles/variables.styles';

// Constants for table styling
const TABLE_STYLES = {
  borderRadius: '4px',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  transition: 'all 0.2s ease-in-out',
  darkMode: {
    boxShadow: '0 2px 4px rgba(255,255,255,0.1)'
  }
};

const CELL_PADDING = {
  xs: SPACING.multiplier(1), // 8px
  sm: SPACING.multiplier(1.5), // 12px
  md: SPACING.multiplier(2), // 16px
  lg: SPACING.multiplier(3) // 24px
};

// Function to get responsive padding based on breakpoint and theme direction
const getResponsivePadding = (theme: any) => {
  const isRTL = theme.direction === 'rtl';
  return {
    [theme.breakpoints.up('xs')]: {
      paddingLeft: isRTL ? CELL_PADDING.xs : CELL_PADDING.xs,
      paddingRight: isRTL ? CELL_PADDING.xs : CELL_PADDING.xs,
    },
    [theme.breakpoints.up('sm')]: {
      paddingLeft: isRTL ? CELL_PADDING.sm : CELL_PADDING.sm,
      paddingRight: isRTL ? CELL_PADDING.sm : CELL_PADDING.sm,
    },
    [theme.breakpoints.up('md')]: {
      paddingLeft: isRTL ? CELL_PADDING.md : CELL_PADDING.md,
      paddingRight: isRTL ? CELL_PADDING.md : CELL_PADDING.md,
    },
    [theme.breakpoints.up('lg')]: {
      paddingLeft: isRTL ? CELL_PADDING.lg : CELL_PADDING.lg,
      paddingRight: isRTL ? CELL_PADDING.lg : CELL_PADDING.lg,
    }
  };
};

// Styled table container with responsive behavior and theme-aware styling
export const TableContainer = styled(Table)(({ theme }) => ({
  width: '100%',
  borderRadius: TABLE_STYLES.borderRadius,
  boxShadow: theme.palette.mode === 'dark' ? TABLE_STYLES.darkMode.boxShadow : TABLE_STYLES.boxShadow,
  backgroundColor: theme.palette.mode === 'dark' ? COLORS.dark.background.paper : COLORS.light.background.paper,
  transition: TABLE_STYLES.transition,
  minWidth: BREAKPOINTS.xs,
  overflowX: 'auto',
  '@media print': {
    boxShadow: 'none'
  },
  // Accessibility focus indicator
  '&:focus-within': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: '2px'
  }
}));

// Styled header with sticky positioning and proper ARIA attributes
export const TableHeader = styled(TableHead)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? COLORS.dark.background.elevated : COLORS.light.background.elevated,
  position: 'sticky',
  top: 0,
  zIndex: 1,
  '& th': {
    fontWeight: TYPOGRAPHY.h4.fontWeight,
    fontSize: TYPOGRAPHY.h4.fontSize,
    lineHeight: TYPOGRAPHY.h4.lineHeight,
    letterSpacing: TYPOGRAPHY.h4.letterSpacing,
    color: theme.palette.mode === 'dark' ? COLORS.dark.text.primary : COLORS.light.text.primary,
    borderBottom: `1px solid ${theme.palette.mode === 'dark' ? COLORS.dark.text.disabled : COLORS.light.text.disabled}`,
    whiteSpace: 'nowrap',
    ...getResponsivePadding(theme)
  },
  // Sort indicator styles
  '& .MuiTableSortLabel-root': {
    transition: 'color 0.2s ease-in-out',
    '&:hover': {
      color: theme.palette.primary.main
    },
    '&.Mui-active': {
      color: theme.palette.primary.main,
      '& .MuiTableSortLabel-icon': {
        color: theme.palette.primary.main
      }
    }
  }
}));

// Styled body with alternating row colors and theme-aware styling
export const TableBody = styled(TableBody)(({ theme }) => ({
  '& tr:nth-of-type(odd)': {
    backgroundColor: theme.palette.mode === 'dark' 
      ? COLORS.dark.background.default 
      : COLORS.light.background.default
  },
  '& tr:nth-of-type(even)': {
    backgroundColor: theme.palette.mode === 'dark' 
      ? COLORS.dark.background.paper 
      : COLORS.light.background.paper
  }
}));

// Styled row with hover states and keyboard navigation support
export const TableRow = styled(TableRow)(({ theme }) => ({
  height: SPACING.multiplier(6), // 48px for touch targets
  transition: 'background-color 0.2s ease-in-out',
  '&:hover': {
    backgroundColor: theme.palette.mode === 'dark' 
      ? COLORS.dark.primary.dark 
      : COLORS.light.primary.light,
    cursor: 'pointer'
  },
  // Keyboard focus styles
  '&:focus-within': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: '-2px'
  },
  // Selected state
  '&.Mui-selected': {
    backgroundColor: theme.palette.mode === 'dark' 
      ? COLORS.dark.primary.main 
      : COLORS.light.primary.light,
    '&:hover': {
      backgroundColor: theme.palette.mode === 'dark' 
        ? COLORS.dark.primary.dark 
        : COLORS.light.primary.main
    }
  }
}));

// Styled cell with responsive padding and RTL support
export const TableCell = styled(TableCell)(({ theme }) => ({
  ...getResponsivePadding(theme),
  fontSize: TYPOGRAPHY.body1.fontSize,
  lineHeight: TYPOGRAPHY.body1.lineHeight,
  color: theme.palette.mode === 'dark' ? COLORS.dark.text.primary : COLORS.light.text.primary,
  borderBottom: `1px solid ${theme.palette.mode === 'dark' ? COLORS.dark.text.disabled : COLORS.light.text.disabled}`,
  // Text truncation for overflow
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  maxWidth: '300px', // Maximum cell width before truncation
  // RTL support
  textAlign: theme.direction === 'rtl' ? 'right' : 'left',
  // Accessibility
  '&[role="checkbox"]': {
    padding: SPACING.multiplier(1),
    width: SPACING.multiplier(6), // 48px minimum touch target
    height: SPACING.multiplier(6)
  }
}));