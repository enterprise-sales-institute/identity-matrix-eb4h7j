import React from 'react'; // v18.2+
import { CircularProgress } from '@mui/material'; // v5.0+
import { StyledButton, ButtonContent } from './Button.styles';

// Button component props interface with comprehensive accessibility support
interface ButtonProps {
  variant?: 'contained' | 'outlined' | 'text';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  children: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
  ariaLabel?: string;
  ariaExpanded?: boolean;
  ariaControls?: string;
  ariaDescribedby?: string;
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  tabIndex?: number;
  onKeyDown?: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
  className?: string;
  id?: string;
  form?: string;
}

// Enhanced button component with Material Design and accessibility features
export const Button: React.FC<ButtonProps> = React.memo(({
  variant = 'contained',
  size = 'medium',
  fullWidth = false,
  disabled = false,
  loading = false,
  startIcon,
  endIcon,
  children,
  onClick,
  type = 'button',
  ariaLabel,
  ariaExpanded,
  ariaControls,
  ariaDescribedby,
  color = 'primary',
  tabIndex,
  onKeyDown,
  className,
  id,
  form
}) => {
  // Handle keyboard interactions for accessibility
  const handleKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled || loading) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick?.(event as unknown as React.MouseEvent<HTMLButtonElement>);
    }

    onKeyDown?.(event);
  }, [disabled, loading, onClick, onKeyDown]);

  // Handle click events with loading state check
  const handleClick = React.useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return;
    onClick?.(event);
  }, [disabled, loading, onClick]);

  // Determine if the button has any icons
  const hasIcon = Boolean(startIcon || endIcon);

  // Get RTL direction from document
  const isRTL = document.dir === 'rtl';

  // Loading spinner component
  const loadingSpinner = loading && (
    <CircularProgress
      size={size === 'small' ? 16 : size === 'large' ? 24 : 20}
      color="inherit"
      thickness={4}
      sx={{ position: 'absolute', top: '50%', left: '50%', marginTop: '-12px', marginLeft: '-12px' }}
    />
  );

  return (
    <StyledButton
      variant={variant}
      size={size}
      fullWidth={fullWidth}
      disabled={disabled || loading}
      color={color}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      type={type}
      className={className}
      id={id}
      form={form}
      tabIndex={tabIndex}
      aria-label={ariaLabel}
      aria-expanded={ariaExpanded}
      aria-controls={ariaControls}
      aria-describedby={ariaDescribedby}
      aria-busy={loading}
      aria-disabled={disabled || loading}
      disableElevation={variant !== 'contained'}
      disableRipple={disabled || loading}
    >
      <ButtonContent
        hasIcon={hasIcon}
        iconPosition={startIcon ? 'start' : 'end'}
        loading={loading}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {startIcon}
        {children}
        {endIcon}
      </ButtonContent>
      {loadingSpinner}
    </StyledButton>
  );
});

// Display name for debugging
Button.displayName = 'Button';

export default Button;