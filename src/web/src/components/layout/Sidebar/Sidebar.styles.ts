import { styled } from '@mui/material/styles';
import { Drawer } from '@mui/material';
import { SPACING, BREAKPOINTS, Z_INDEX, SHADOWS } from '../../../styles/variables.styles';

// Constants for sidebar dimensions and animations
const SIDEBAR_WIDTH = {
  DESKTOP: '280px',
  TABLET: '240px',
  MOBILE: '100%'
} as const;

const TRANSITION_DURATION = '0.3s';

// Interface for styled components props
interface SidebarStyleProps {
  isOpen?: boolean;
  isMobile?: boolean;
}

// Helper function for responsive width calculation
const getResponsiveWidth = (theme: any) => {
  if (theme.breakpoints.up('md')) {
    return SIDEBAR_WIDTH.DESKTOP;
  }
  if (theme.breakpoints.up('sm')) {
    return SIDEBAR_WIDTH.TABLET;
  }
  return SIDEBAR_WIDTH.MOBILE;
};

// Main sidebar container with responsive styles
export const SidebarContainer = styled('div')<SidebarStyleProps>(({ theme, isOpen }) => ({
  position: 'fixed',
  top: 0,
  left: 0,
  height: '100vh',
  width: getResponsiveWidth(theme),
  backgroundColor: theme.colors.background.paper,
  boxShadow: SHADOWS.low,
  zIndex: Z_INDEX.drawer,
  transition: `transform ${TRANSITION_DURATION} ${theme.transitions.easing.standard}`,
  transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
  
  [theme.breakpoints.up('md')]: {
    transform: 'translateX(0)',
    position: 'relative',
    height: '100%'
  }
}));

// Mobile drawer component with enhanced styles
export const SidebarDrawer = styled(Drawer)<SidebarStyleProps>(({ theme }) => ({
  '& .MuiDrawer-paper': {
    width: SIDEBAR_WIDTH.MOBILE,
    backgroundColor: theme.colors.background.paper,
    borderRight: `1px solid ${theme.colors.background.elevated}`,
    
    [theme.breakpoints.up('sm')]: {
      width: SIDEBAR_WIDTH.TABLET
    }
  }
}));

// Content container with proper spacing
export const SidebarContent = styled('div')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  padding: SPACING.multiplier(2),
  gap: SPACING.multiplier(2),
  
  [theme.breakpoints.up('sm')]: {
    padding: SPACING.multiplier(3)
  }
}));

// Header section with theme-aware styling
export const SidebarHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  height: SPACING.multiplier(7),
  padding: `${SPACING.multiplier(2)}px ${SPACING.multiplier(3)}px`,
  borderBottom: `1px solid ${theme.colors.background.elevated}`,
  
  '& .logo': {
    height: SPACING.multiplier(4),
    width: 'auto'
  },
  
  '& .close-button': {
    [theme.breakpoints.up('md')]: {
      display: 'none'
    }
  }
}));

// Navigation section with proper spacing and hover states
export const SidebarNavigation = styled('nav')(({ theme }) => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: SPACING.unit,
  overflowY: 'auto',
  
  '& .nav-item': {
    padding: SPACING.multiplier(1.5),
    borderRadius: SPACING.unit,
    color: theme.colors.text.primary,
    transition: `background-color ${TRANSITION_DURATION} ${theme.transitions.easing.standard}`,
    
    '&:hover': {
      backgroundColor: theme.colors.background.elevated
    },
    
    '&.active': {
      backgroundColor: theme.colors.primary.main,
      color: theme.colors.primary.contrastText,
      
      '&:hover': {
        backgroundColor: theme.colors.primary.hover
      }
    }
  },
  
  // Custom scrollbar styling
  '&::-webkit-scrollbar': {
    width: SPACING.unit
  },
  
  '&::-webkit-scrollbar-track': {
    backgroundColor: theme.colors.background.paper
  },
  
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: theme.colors.background.elevated,
    borderRadius: SPACING.unit / 2,
    
    '&:hover': {
      backgroundColor: theme.colors.text.disabled
    }
  }
}));