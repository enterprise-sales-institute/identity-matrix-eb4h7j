import { createGlobalStyle, css } from 'styled-components'; // v5.3+
import { TYPOGRAPHY, SPACING, BREAKPOINTS } from './variables.styles';

// Enhanced CSS reset with modern browser optimizations
const resetStyles = css`
  *, *::before, *::after {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    border: 0;
    vertical-align: baseline;
    -webkit-tap-highlight-color: transparent;
  }

  html {
    text-size-adjust: 100%;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    -webkit-text-size-adjust: 100%;
    content-visibility: auto;
    scroll-behavior: smooth;
    @media (prefers-reduced-motion: reduce) {
      scroll-behavior: auto;
    }
  }

  body {
    line-height: 1.5;
    min-height: 100vh;
    font-family: ${TYPOGRAPHY.fontFamily};
    font-size: ${TYPOGRAPHY.body1.fontSize}px;
    font-weight: ${TYPOGRAPHY.body1.fontWeight};
    overscroll-behavior: none;
    font-display: swap;
  }

  img, picture, video, canvas, svg {
    display: block;
    max-width: 100%;
  }

  input, button, textarea, select {
    font: inherit;
    appearance: none;
  }

  ul, ol {
    list-style: none;
  }

  a {
    text-decoration: none;
    color: inherit;
  }
`;

// Enhanced accessibility styles for WCAG 2.1 Level AA compliance
const accessibilityStyles = css`
  :focus {
    outline: none;
  }

  :focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    * {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .skip-link {
    position: fixed;
    top: -100%;
    left: 0;
    padding: ${SPACING.multiplier(2)}px;
    background: var(--color-background);
    z-index: 9999;

    &:focus {
      top: 0;
    }
  }
`;

// Typography styles based on Material Design type scale
const typographyStyles = css`
  h1 {
    font-size: ${TYPOGRAPHY.h1.fontSize}px;
    font-weight: ${TYPOGRAPHY.h1.fontWeight};
    line-height: ${TYPOGRAPHY.h1.lineHeight};
    letter-spacing: ${TYPOGRAPHY.h1.letterSpacing};
  }

  h2 {
    font-size: ${TYPOGRAPHY.h2.fontSize}px;
    font-weight: ${TYPOGRAPHY.h2.fontWeight};
    line-height: ${TYPOGRAPHY.h2.lineHeight};
    letter-spacing: ${TYPOGRAPHY.h2.letterSpacing};
  }

  h3 {
    font-size: ${TYPOGRAPHY.h3.fontSize}px;
    font-weight: ${TYPOGRAPHY.h3.fontWeight};
    line-height: ${TYPOGRAPHY.h3.lineHeight};
    letter-spacing: ${TYPOGRAPHY.h3.letterSpacing};
  }

  h4 {
    font-size: ${TYPOGRAPHY.h4.fontSize}px;
    font-weight: ${TYPOGRAPHY.h4.fontWeight};
    line-height: ${TYPOGRAPHY.h4.lineHeight};
    letter-spacing: ${TYPOGRAPHY.h4.letterSpacing};
  }

  p {
    font-size: ${TYPOGRAPHY.body1.fontSize}px;
    font-weight: ${TYPOGRAPHY.body1.fontWeight};
    line-height: ${TYPOGRAPHY.body1.lineHeight};
    letter-spacing: ${TYPOGRAPHY.body1.letterSpacing};
  }
`;

// Responsive design styles with mobile-first approach
const responsiveStyles = css`
  @media print {
    body {
      background: white;
    }
    
    @page {
      margin: 2cm;
    }
  }

  @media (min-width: ${BREAKPOINTS.xs}px) {
    html {
      font-size: 14px;
    }
  }

  @media (min-width: ${BREAKPOINTS.sm}px) {
    html {
      font-size: 15px;
    }
  }

  @media (min-width: ${BREAKPOINTS.md}px) {
    html {
      font-size: 16px;
    }
  }

  @media (min-width: ${BREAKPOINTS.lg}px) {
    html {
      font-size: 16px;
    }
  }

  @container (min-width: ${BREAKPOINTS.sm}px) {
    :root {
      --content-padding: ${SPACING.multiplier(3)}px;
    }
  }
`;

// Global styles component with all enhancements
export const GlobalStyles = createGlobalStyle`
  ${resetStyles}
  ${accessibilityStyles}
  ${typographyStyles}
  ${responsiveStyles}

  :root {
    --spacing-unit: ${SPACING.unit}px;
    --content-padding: ${SPACING.multiplier(2)}px;
    
    @supports (height: 100dvh) {
      --vh: 1dvh;
    }
    
    @supports not (height: 100dvh) {
      --vh: 1vh;
    }
  }
`;

export default GlobalStyles;