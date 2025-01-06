import styled, { css } from 'styled-components';
import { SPACING } from '../../styles/variables.styles';

// Constants for elevation and transitions
const MIN_ELEVATION = 0;
const MAX_ELEVATION = 5;
const DEFAULT_ELEVATION = 1;
const HOVER_ELEVATION_INCREASE = 1;
const TRANSITION_DURATION = '0.2s';
const TRANSITION_TIMING = 'cubic-bezier(0.4, 0, 0.2, 1)';
const BASE_PADDING = SPACING.multiplier(2);
const MOBILE_PADDING_RATIO = 0.75;
const TABLET_PADDING_RATIO = 0.875;
const DESKTOP_PADDING_RATIO = 1;

// Helper function to generate elevation shadows
const getElevation = (elevation: number): string => {
  const validElevation = Math.max(MIN_ELEVATION, Math.min(elevation, MAX_ELEVATION));
  const ambientY = validElevation * 1;
  const ambientBlur = validElevation * 3;
  const directY = validElevation * 2;
  const directBlur = validElevation * 2;
  
  return `
    0px ${ambientY}px ${ambientBlur}px rgba(0, 0, 0, 0.1),
    0px ${directY}px ${directBlur}px rgba(0, 0, 0, 0.15)
  `;
};

// Helper function for responsive padding
const getResponsivePadding = (basePadding: number) => css`
  padding: ${basePadding * MOBILE_PADDING_RATIO}px;
  
  @media (min-width: ${({ theme }) => theme.breakpoints.sm}px) {
    padding: ${basePadding * TABLET_PADDING_RATIO}px;
  }
  
  @media (min-width: ${({ theme }) => theme.breakpoints.md}px) {
    padding: ${basePadding * DESKTOP_PADDING_RATIO}px;
  }
`;

interface CardContainerProps {
  elevation?: number;
  hoverElevation?: number;
}

export const CardContainer = styled.div<CardContainerProps>`
  background-color: ${({ theme }) => theme.colors.background.paper};
  border-radius: ${SPACING.unit}px;
  box-shadow: ${({ elevation = DEFAULT_ELEVATION }) => getElevation(elevation)};
  transition: box-shadow ${TRANSITION_DURATION} ${TRANSITION_TIMING},
              transform ${TRANSITION_DURATION} ${TRANSITION_TIMING};
  position: relative;
  overflow: hidden;
  
  &:hover {
    box-shadow: ${({ elevation = DEFAULT_ELEVATION, hoverElevation }) => 
      getElevation(hoverElevation || elevation + HOVER_ELEVATION_INCREASE)};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

interface SectionProps {
  responsive?: boolean;
}

export const CardHeader = styled.div<SectionProps>`
  ${({ responsive }) => responsive ? getResponsivePadding(BASE_PADDING) : css`
    padding: ${BASE_PADDING}px;
  `}
  border-bottom: 1px solid ${({ theme }) => theme.colors.background.default};
`;

export const CardContent = styled.div<SectionProps>`
  ${({ responsive }) => responsive ? getResponsivePadding(BASE_PADDING) : css`
    padding: ${BASE_PADDING}px;
  `}
`;

export const CardFooter = styled.div<SectionProps>`
  ${({ responsive }) => responsive ? getResponsivePadding(BASE_PADDING) : css`
    padding: ${BASE_PADDING}px;
  `}
  border-top: 1px solid ${({ theme }) => theme.colors.background.default};
`;