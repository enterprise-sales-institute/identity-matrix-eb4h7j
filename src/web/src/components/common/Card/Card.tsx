import React, { useState, useCallback } from 'react';
import { useTheme } from 'styled-components';
import { CardContainer, CardHeader, CardContent, CardFooter } from './Card.styles';

// React v18.2.0
// styled-components v5.3.0

interface CardProps {
  children: React.ReactNode;
  elevation?: number;
  hoverElevation?: number;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  ariaLabel?: string;
  role?: string;
  loading?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  elevation = 1,
  hoverElevation,
  header,
  footer,
  className,
  ariaLabel,
  role = 'article',
  loading = false,
}) => {
  const theme = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const [isTouched, setIsTouched] = useState(false);

  // Handle hover state with GPU acceleration
  const handleMouseEnter = useCallback(() => {
    if (!isTouched) {
      setIsHovered(true);
    }
  }, [isTouched]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  // Handle touch interactions for mobile devices
  const handleTouchStart = useCallback(() => {
    setIsTouched(true);
    setIsHovered(true);
  }, []);

  const handleTouchEnd = useCallback(() => {
    setIsTouched(false);
    setIsHovered(false);
  }, []);

  // Loading skeleton state
  if (loading) {
    return (
      <CardContainer
        className={`${className} card-loading`}
        elevation={elevation}
        aria-busy="true"
        role="alert"
        aria-label="Loading content"
      >
        <div className="loading-animation" />
      </CardContainer>
    );
  }

  return (
    <CardContainer
      className={className}
      elevation={elevation}
      hoverElevation={isHovered ? hoverElevation : undefined}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      role={role}
      aria-label={ariaLabel}
      style={{
        willChange: 'transform, box-shadow',
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
      }}
    >
      {header && (
        <CardHeader
          responsive
          role="heading"
          aria-level={2}
        >
          {header}
        </CardHeader>
      )}

      <CardContent
        responsive
        role="region"
        aria-label={ariaLabel ? `${ariaLabel} content` : 'Card content'}
      >
        {children}
      </CardContent>

      {footer && (
        <CardFooter
          responsive
          role="contentinfo"
          aria-label={ariaLabel ? `${ariaLabel} footer` : 'Card footer'}
        >
          {footer}
        </CardFooter>
      )}
    </CardContainer>
  );
};

// Error boundary decorator
const withErrorBoundary = (WrappedComponent: React.FC<CardProps>) => {
  return class ErrorBoundary extends React.Component<CardProps, { hasError: boolean }> {
    constructor(props: CardProps) {
      super(props);
      this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
      return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
      console.error('Card Error:', error, errorInfo);
    }

    render() {
      if (this.state.hasError) {
        return (
          <CardContainer elevation={1} role="alert" aria-label="Error state">
            <CardContent responsive>
              An error occurred while rendering this card.
            </CardContent>
          </CardContainer>
        );
      }

      return <WrappedComponent {...this.props} />;
    }
  };
};

export default withErrorBoundary(Card);