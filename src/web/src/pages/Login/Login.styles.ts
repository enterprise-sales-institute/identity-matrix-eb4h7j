import styled, { css } from 'styled-components'; // v5.3+
import { SPACING, BREAKPOINTS, TYPOGRAPHY } from '../../styles/variables.styles';
import { Theme } from '../../styles/theme.styles';

// Constants for component styling
const FORM_WIDTH = {
  SM: '320px',
  MD: '400px',
  LG: '480px'
} as const;

const ANIMATION_DURATION = '0.2s';
const CARD_SHADOW = '0 4px 8px rgba(0,0,0,0.15)';
const FOCUS_RING = '0 0 0 2px ${({ theme }) => theme.colors.primary.focus}';
const TRANSITION_PROPS = `all ${ANIMATION_DURATION} ease-in-out`;

// Helper function to generate responsive styles
const generateResponsiveStyles = (styles: Record<string, string>) => css`
  @media (min-width: ${BREAKPOINTS.xs}px) {
    width: ${FORM_WIDTH.SM};
    ${styles.xs || ''}
  }
  
  @media (min-width: ${BREAKPOINTS.sm}px) {
    width: ${FORM_WIDTH.MD};
    ${styles.sm || ''}
  }
  
  @media (min-width: ${BREAKPOINTS.md}px) {
    width: ${FORM_WIDTH.LG};
    ${styles.md || ''}
  }
`;

// Main container for the login page
export const LoginContainer = styled.div<{ theme: Theme }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: ${SPACING.multiplier(2)}px;
  background-color: ${({ theme }) => theme.colors.background.default};
  transition: ${TRANSITION_PROPS};

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

// Styled form component with Material Design principles
export const LoginForm = styled.form<{ theme: Theme }>`
  display: flex;
  flex-direction: column;
  gap: ${SPACING.multiplier(3)}px;
  padding: ${SPACING.multiplier(4)}px;
  background-color: ${({ theme }) => theme.colors.background.paper};
  border-radius: ${SPACING.unit}px;
  box-shadow: ${CARD_SHADOW};
  transition: ${TRANSITION_PROPS};

  ${generateResponsiveStyles({
    xs: `
      padding: ${SPACING.multiplier(2)}px;
    `,
    sm: `
      padding: ${SPACING.multiplier(3)}px;
    `,
    md: `
      padding: ${SPACING.multiplier(4)}px;
    `
  })}

  &:focus-within {
    box-shadow: ${CARD_SHADOW}, ${FOCUS_RING};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

// Header section of the login form
export const LoginHeader = styled.div<{ theme: Theme }>`
  text-align: center;
  margin-bottom: ${SPACING.multiplier(3)}px;

  h1 {
    font-family: ${TYPOGRAPHY.fontFamily};
    font-size: ${TYPOGRAPHY.h1.fontSize}px;
    font-weight: ${TYPOGRAPHY.h1.fontWeight};
    line-height: ${TYPOGRAPHY.h1.lineHeight};
    letter-spacing: ${TYPOGRAPHY.h1.letterSpacing};
    color: ${({ theme }) => theme.colors.text.primary};
    margin: 0 0 ${SPACING.unit}px;
  }

  p {
    font-family: ${TYPOGRAPHY.fontFamily};
    font-size: ${TYPOGRAPHY.body2.fontSize}px;
    font-weight: ${TYPOGRAPHY.body2.fontWeight};
    line-height: ${TYPOGRAPHY.body2.lineHeight};
    letter-spacing: ${TYPOGRAPHY.body2.letterSpacing};
    color: ${({ theme }) => theme.colors.text.secondary};
    margin: 0;
  }
`;

// Styled input fields with accessibility features
export const LoginInput = styled.input<{ theme: Theme }>`
  width: 100%;
  padding: ${SPACING.multiplier(1.5)}px;
  font-family: ${TYPOGRAPHY.fontFamily};
  font-size: ${TYPOGRAPHY.body1.fontSize}px;
  line-height: ${TYPOGRAPHY.body1.lineHeight};
  color: ${({ theme }) => theme.colors.text.primary};
  background-color: ${({ theme }) => theme.colors.background.default};
  border: 1px solid ${({ theme }) => theme.colors.text.disabled};
  border-radius: ${SPACING.unit / 2}px;
  transition: ${TRANSITION_PROPS};

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.hint};
  }

  &:hover {
    border-color: ${({ theme }) => theme.colors.text.secondary};
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary.main};
    box-shadow: ${FOCUS_RING};
  }

  &:disabled {
    background-color: ${({ theme }) => theme.colors.background.paper};
    color: ${({ theme }) => theme.colors.text.disabled};
    cursor: not-allowed;
  }

  /* High contrast mode support */
  @media screen and (-ms-high-contrast: active) {
    border: 2px solid currentColor;
  }

  /* Remove autofill background */
  &:-webkit-autofill,
  &:-webkit-autofill:hover,
  &:-webkit-autofill:focus {
    -webkit-box-shadow: 0 0 0 30px ${({ theme }) => theme.colors.background.default} inset;
    -webkit-text-fill-color: ${({ theme }) => theme.colors.text.primary};
    transition: background-color 5000s ease-in-out 0s;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;