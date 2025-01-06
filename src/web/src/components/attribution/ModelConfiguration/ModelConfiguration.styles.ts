import styled from '@emotion/styled';
import { Box, Card } from '@mui/material';
import type { Theme } from '@mui/material';
import { SPACING, BREAKPOINTS, SHADOWS } from '../../../styles/variables.styles';

// Constants for styling
const CARD_SHADOW = SHADOWS.medium;
const BORDER_RADIUS = '8px';
const SECTION_SPACING = SPACING.unit * 3;
const FIELD_SPACING = SPACING.unit * 2;
const TRANSITION_DURATION = '0.2s';

// Helper function for responsive padding
const getResponsivePadding = (theme: Theme) => ({
  padding: `${SPACING.unit * 2}px`,
  [theme.breakpoints.up('sm')]: {
    padding: `${SPACING.unit * 3}px`,
  },
  [theme.breakpoints.up('md')]: {
    padding: `${SPACING.unit * 4}px`,
  },
});

// Main container with responsive layout
export const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  ${({ theme }) => getResponsivePadding(theme)};

  @media (max-width: ${BREAKPOINTS.sm}px) {
    padding: ${SPACING.unit}px;
  }
`;

// Form section wrapper with Material Design elevation
export const FormSection = styled.section`
  margin-bottom: ${SECTION_SPACING}px;
  border-radius: ${BORDER_RADIUS};
  background-color: ${({ theme }) => theme.palette.background.paper};
  transition: all ${TRANSITION_DURATION} ease-in-out;
  box-shadow: ${SHADOWS.low};

  &:hover {
    box-shadow: ${SHADOWS.medium};
  }
`;

// Model configuration card with elevation and hover effects
export const ModelCard = styled(Card)`
  box-shadow: ${CARD_SHADOW};
  border-radius: ${BORDER_RADIUS};
  padding: ${SPACING.unit * 3}px;
  transition: all ${TRANSITION_DURATION} ease-in-out;
  background-color: ${({ theme }) => theme.palette.background.paper};

  &:hover {
    box-shadow: ${SHADOWS.high};
    transform: translateY(-2px);
  }

  @media (max-width: ${BREAKPOINTS.sm}px) {
    padding: ${SPACING.unit * 2}px;
  }
`;

// Form field group with responsive layout
export const FieldGroup = styled.div`
  margin-bottom: ${FIELD_SPACING}px;
  display: flex;
  flex-direction: column;
  gap: ${SPACING.unit * 2}px;

  @media (min-width: ${BREAKPOINTS.md}px) {
    flex-direction: row;
    align-items: center;
  }
`;

// Input wrapper with consistent spacing
export const InputWrapper = styled(Box)`
  width: 100%;
  margin-bottom: ${SPACING.unit * 2}px;

  &:last-child {
    margin-bottom: 0;
  }

  @media (min-width: ${BREAKPOINTS.md}px) {
    margin-bottom: 0;
    margin-right: ${SPACING.unit * 2}px;

    &:last-child {
      margin-right: 0;
    }
  }
`;

// Label wrapper with proper alignment
export const LabelWrapper = styled.div`
  margin-bottom: ${SPACING.unit}px;
  color: ${({ theme }) => theme.palette.text.secondary};
  font-size: ${({ theme }) => theme.typography.body2.fontSize}px;
  font-weight: ${({ theme }) => theme.typography.body2.fontWeight};
`;

// Helper text with proper styling
export const HelperText = styled.div`
  color: ${({ theme }) => theme.palette.text.secondary};
  font-size: ${({ theme }) => theme.typography.caption.fontSize}px;
  margin-top: ${SPACING.unit / 2}px;
`;

// Error message styling
export const ErrorText = styled.div`
  color: ${({ theme }) => theme.palette.error.main};
  font-size: ${({ theme }) => theme.typography.caption.fontSize}px;
  margin-top: ${SPACING.unit / 2}px;
`;

// Action buttons container
export const ButtonContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${SPACING.unit * 2}px;
  margin-top: ${SPACING.unit * 3}px;

  @media (max-width: ${BREAKPOINTS.sm}px) {
    flex-direction: column;
    
    button {
      width: 100%;
    }
  }
`;

// Divider with proper spacing
export const Divider = styled.hr`
  border: none;
  border-top: 1px solid ${({ theme }) => theme.palette.divider};
  margin: ${SPACING.unit * 3}px 0;
`;