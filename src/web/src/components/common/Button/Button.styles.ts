import styled from '@emotion/styled'; // v11.0+
import { css } from '@emotion/react'; // v11.0+
import { Button as MuiButton } from '@mui/material'; // v5.0+
import { CustomTheme } from '../../../types/theme.types';

// Interface for styled button props
export interface StyledButtonProps {
  variant?: 'contained' | 'outlined' | 'text';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  disabled?: boolean;
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  disableElevation?: boolean;
  disableRipple?: boolean;
  loading?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

// Interface for button content wrapper props
export interface ButtonContentProps {
  hasIcon: boolean;
  iconPosition?: 'start' | 'end';
  loading?: boolean;
  dir?: 'ltr' | 'rtl';
}

// Button size configurations following 8px grid system
const BUTTON_SIZES = {
  small: {
    padding: '8px 16px',
    fontSize: '14px',
    height: '32px',
    minWidth: '64px',
    iconSize: '16px',
    borderRadius: '4px'
  },
  medium: {
    padding: '12px 24px',
    fontSize: '16px',
    height: '40px',
    minWidth: '80px',
    iconSize: '20px',
    borderRadius: '4px'
  },
  large: {
    padding: '16px 32px',
    fontSize: '18px',
    height: '48px',
    minWidth: '96px',
    iconSize: '24px',
    borderRadius: '6px'
  }
};

// Button variant styles following Material Design principles
const BUTTON_VARIANTS = {
  contained: {
    shadow: '0 2px 4px rgba(0,0,0,0.1)',
    hoverShadow: '0 4px 8px rgba(0,0,0,0.15)',
    activeShadow: '0 1px 2px rgba(0,0,0,0.2)',
    transition: 'all 0.2s ease-in-out'
  },
  outlined: {
    borderWidth: '1px',
    borderStyle: 'solid',
    transition: 'all 0.2s ease-in-out',
    hoverScale: '1.02'
  },
  text: {
    padding: '8px 12px',
    background: 'transparent',
    hoverBackground: 'currentColor',
    hoverOpacity: '0.04'
  }
};

// Focus styles for accessibility
const FOCUS_STYLES = {
  outline: '2px solid currentColor',
  outlineOffset: '2px',
  transition: 'outline-offset 0.2s ease'
};

// Styled button component with comprehensive theming support
export const StyledButton = styled(MuiButton)<StyledButtonProps>`
  ${({ theme, variant = 'contained', size = 'medium', color = 'primary', fullWidth, disabled, loading }) => {
    const themeColors = (theme as CustomTheme).colors;
    const buttonSize = BUTTON_SIZES[size];
    const variantStyles = BUTTON_VARIANTS[variant];
    
    return css`
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: ${buttonSize.minWidth};
      height: ${buttonSize.height};
      padding: ${buttonSize.padding};
      font-size: ${buttonSize.fontSize};
      font-family: ${(theme as CustomTheme).typography.button.fontFamily};
      font-weight: ${(theme as CustomTheme).typography.button.fontWeight};
      letter-spacing: ${(theme as CustomTheme).typography.button.letterSpacing};
      border-radius: ${buttonSize.borderRadius};
      width: ${fullWidth ? '100%' : 'auto'};
      transition: ${variantStyles.transition};
      
      /* Color and variant specific styles */
      ${variant === 'contained' && css`
        background-color: ${themeColors[color].main};
        color: ${themeColors[color].contrastText};
        box-shadow: ${!disabled && variantStyles.shadow};
        
        &:hover {
          background-color: ${!disabled && themeColors[color].dark};
          box-shadow: ${!disabled && variantStyles.hoverShadow};
        }
        
        &:active {
          box-shadow: ${!disabled && variantStyles.activeShadow};
        }
      `}
      
      ${variant === 'outlined' && css`
        background-color: transparent;
        color: ${themeColors[color].main};
        border: ${variantStyles.borderWidth} ${variantStyles.borderStyle} ${themeColors[color].main};
        
        &:hover {
          background-color: ${!disabled && `${themeColors[color].main}${themeColors[color].alpha * 0.04}`};
          transform: ${!disabled && `scale(${variantStyles.hoverScale})`};
        }
      `}
      
      ${variant === 'text' && css`
        background-color: transparent;
        color: ${themeColors[color].main};
        padding: ${variantStyles.padding};
        
        &:hover {
          background-color: ${!disabled && `${themeColors[color].main}${themeColors[color].alpha * 0.04}`};
        }
      `}
      
      /* Disabled state */
      ${disabled && css`
        opacity: 0.6;
        cursor: not-allowed;
      `}
      
      /* Loading state */
      ${loading && css`
        pointer-events: none;
        opacity: 0.7;
      `}
      
      /* Focus styles for accessibility */
      &:focus-visible {
        outline: ${FOCUS_STYLES.outline};
        outline-offset: ${FOCUS_STYLES.outlineOffset};
        transition: ${FOCUS_STYLES.transition};
      }
      
      /* Touch target size for mobile accessibility */
      @media (pointer: coarse) {
        min-height: 48px;
        min-width: 48px;
      }
    `;
  }}
`;

// Button content wrapper with RTL support and loading states
export const ButtonContent = styled.span<ButtonContentProps>`
  ${({ hasIcon, iconPosition, loading, dir = 'ltr' }) => css`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: ${(props) => props.theme.spacing.unit}px;
    flex-direction: ${dir === 'rtl' ? 'row-reverse' : 'row'};
    opacity: ${loading ? 0 : 1};
    
    /* Icon spacing */
    ${hasIcon && css`
      & > *:first-of-type {
        margin-${iconPosition === 'start' ? 'right' : 'left'}: ${(props) => props.theme.spacing.unit}px;
      }
    `}
  `}
`;