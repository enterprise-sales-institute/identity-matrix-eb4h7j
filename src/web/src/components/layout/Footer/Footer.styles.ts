import styled from 'styled-components'; // v5.3+
import { SPACING, BREAKPOINTS, TYPOGRAPHY } from '../../../styles/variables.styles';

// Constants for footer configuration
const FOOTER_HEIGHT = {
  mobile: '80px',
  tablet: '72px',
  desktop: '64px'
};

const FOOTER_PADDING = {
  mobile: `${SPACING.unit * 2}px`,
  tablet: `${SPACING.unit * 2.5}px`,
  desktop: `${SPACING.unit * 3}px`
};

const FOOTER_Z_INDEX = 100;

// Helper function for generating responsive styles
const getResponsiveStyles = (breakpoint: number, styles: string) => `
  @media (min-width: ${breakpoint}px) {
    ${styles}
  }
`;

// Main footer container with responsive height and theme support
export const FooterContainer = styled.footer`
  position: relative;
  width: 100%;
  height: ${FOOTER_HEIGHT.mobile};
  background-color: ${({ theme }) => theme.colors.background.paper};
  color: ${({ theme }) => theme.colors.text.primary};
  z-index: ${FOOTER_Z_INDEX};
  box-shadow: ${({ theme }) => theme.elevation.low};
  transition: background-color 0.3s ease;

  ${getResponsiveStyles(
    BREAKPOINTS.sm,
    `height: ${FOOTER_HEIGHT.tablet};`
  )}

  ${getResponsiveStyles(
    BREAKPOINTS.md,
    `height: ${FOOTER_HEIGHT.desktop};`
  )}
`;

// Content wrapper with responsive padding and max-width
export const FooterContent = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
  padding: ${FOOTER_PADDING.mobile};
  height: 100%;

  ${getResponsiveStyles(
    BREAKPOINTS.sm,
    `
      flex-direction: row;
      padding: ${FOOTER_PADDING.tablet};
    `
  )}

  ${getResponsiveStyles(
    BREAKPOINTS.md,
    `padding: ${FOOTER_PADDING.desktop};`
  )}
`;

// Navigation links container with responsive grid
export const FooterLinks = styled.nav`
  display: grid;
  grid-template-columns: repeat(2, auto);
  gap: ${SPACING.unit * 2}px;
  text-align: center;

  ${getResponsiveStyles(
    BREAKPOINTS.sm,
    `
      grid-template-columns: repeat(4, auto);
      gap: ${SPACING.unit * 3}px;
      text-align: left;
    `
  )}

  a {
    font-family: ${TYPOGRAPHY.fontFamily};
    font-size: ${TYPOGRAPHY.body2.fontSize}px;
    font-weight: ${TYPOGRAPHY.body2.fontWeight};
    color: ${({ theme }) => theme.colors.text.secondary};
    text-decoration: none;
    transition: color 0.2s ease;

    &:hover, &:focus {
      color: ${({ theme }) => theme.colors.primary.main};
      outline: none;
    }

    &:focus-visible {
      box-shadow: ${({ theme }) => theme.elevation.focusRing};
      border-radius: 4px;
    }
  }
`;

// Copyright text with responsive typography
export const FooterCopyright = styled.p`
  font-family: ${TYPOGRAPHY.fontFamily};
  font-size: ${TYPOGRAPHY.caption.fontSize}px;
  font-weight: ${TYPOGRAPHY.caption.fontWeight};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: ${SPACING.unit}px 0 0;
  text-align: center;

  ${getResponsiveStyles(
    BREAKPOINTS.sm,
    `
      margin: 0;
      text-align: right;
    `
  )}
`;