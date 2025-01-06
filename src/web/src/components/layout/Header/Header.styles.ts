import styled from 'styled-components'; // v5.3+
import { AppBar, Toolbar } from '@mui/material'; // v5.0+
import { SPACING, BREAKPOINTS, Z_INDEX } from '../../../styles/variables.styles';

// Constants for header dimensions
const HEADER_HEIGHT = {
  mobile: '56px',
  desktop: '64px'
};

const LOGO_SIZE = {
  width: '120px',
  height: '32px'
};

// Styled header container with elevation and theme support
export const HeaderContainer = styled(AppBar)`
  position: fixed;
  z-index: ${Z_INDEX.appBar};
  height: ${HEADER_HEIGHT.mobile};
  background-color: ${({ theme }) => theme.colors.background.paper};
  box-shadow: ${({ theme }) => theme.elevation.low};
  transition: ${({ theme }) => theme.transitions.create(['background-color', 'box-shadow'], theme.transitions.duration.short)};
  contain: layout size;

  @media (min-width: ${BREAKPOINTS.md}px) {
    height: ${HEADER_HEIGHT.desktop};
  }

  &[data-theme="dark"] {
    background-color: ${({ theme }) => theme.colors.background.elevated};
  }
`;

// Styled header content with responsive padding and flex layout
export const HeaderContent = styled(Toolbar)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${SPACING.unit}px;
  height: 100%;
  max-width: ${BREAKPOINTS.xl}px;
  margin: 0 auto;
  width: 100%;

  @media (min-width: ${BREAKPOINTS.sm}px) {
    padding: ${SPACING.unit * 2}px ${SPACING.unit * 3}px;
  }

  @media (min-width: ${BREAKPOINTS.md}px) {
    padding: ${SPACING.unit * 2}px ${SPACING.unit * 4}px;
  }
`;

// Styled logo container with responsive sizing
export const HeaderLogo = styled.div`
  width: ${LOGO_SIZE.width};
  height: ${LOGO_SIZE.height};
  flex-shrink: 0;
  display: flex;
  align-items: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  @media (min-width: ${BREAKPOINTS.md}px) {
    margin-right: ${SPACING.unit * 4}px;
  }
`;

// Styled navigation with accessibility support and responsive layout
export const HeaderNav = styled.nav`
  display: none;
  align-items: center;
  gap: ${SPACING.unit * 3}px;
  flex: 1;
  height: 100%;

  @media (min-width: ${BREAKPOINTS.md}px) {
    display: flex;
  }

  /* Ensure proper spacing for RTL languages */
  [dir="rtl"] & {
    margin-left: 0;
    margin-right: ${SPACING.unit * 4}px;
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    * {
      transition: none !important;
    }
  }
`;

// Styled controls container for theme toggle and user menu
export const HeaderControls = styled.div`
  display: flex;
  align-items: center;
  gap: ${SPACING.unit * 2}px;
  margin-left: auto;
  height: 100%;

  @media (min-width: ${BREAKPOINTS.sm}px) {
    gap: ${SPACING.unit * 3}px;
  }

  /* Ensure proper spacing for RTL languages */
  [dir="rtl"] & {
    margin-left: 0;
    margin-right: auto;
  }
`;

// Styled mobile menu button container
export const HeaderMobileMenu = styled.div`
  display: flex;
  align-items: center;
  margin-left: ${SPACING.unit}px;

  @media (min-width: ${BREAKPOINTS.md}px) {
    display: none;
  }

  /* Ensure proper spacing for RTL languages */
  [dir="rtl"] & {
    margin-left: 0;
    margin-right: ${SPACING.unit}px;
  }
`;

// Styled divider for visual separation
export const HeaderDivider = styled.div`
  width: 1px;
  height: 24px;
  background-color: ${({ theme }) => theme.colors.text.disabled};
  opacity: 0.2;
  margin: 0 ${SPACING.unit}px;

  @media (min-width: ${BREAKPOINTS.sm}px) {
    margin: 0 ${SPACING.unit * 2}px;
  }
`;