import styled, { css } from 'styled-components';
import { SPACING, TYPOGRAPHY, COLORS, BREAKPOINTS, SHADOWS, TRANSITIONS } from '../../../styles/variables.styles';

// Constants for select component styling
const TRANSITION_DURATION = TRANSITIONS.duration.short;
const DROPDOWN_SHADOW = SHADOWS.medium;
const BORDER_RADIUS = SPACING.unit / 2; // 4px
const Z_INDEX_DROPDOWN = 1000;
const ANIMATION_CONFIG = TRANSITIONS.easing.standard;
const FOCUS_RING_COLOR = 'rgba(0, 0, 0, 0.12)';

// Props interfaces
interface SelectContainerProps {
  error?: boolean;
  disabled?: boolean;
  focused?: boolean;
  elevated?: boolean;
}

interface SelectOptionProps {
  selected?: boolean;
  disabled?: boolean;
  highlighted?: boolean;
  $isRtl?: boolean;
}

// Container component
export const SelectContainer = styled.div<SelectContainerProps>`
  position: relative;
  width: 100%;
  min-width: ${SPACING.unit * 20}px;
  font-family: ${TYPOGRAPHY.fontFamily};
  border-radius: ${BORDER_RADIUS}px;
  background-color: ${({ theme }) => theme.colors.background.paper};
  border: 1px solid ${({ theme, error }) => 
    error ? theme.colors.error.main : theme.colors.text.disabled};
  transition: all ${TRANSITION_DURATION} ${ANIMATION_CONFIG};

  ${({ disabled, theme }) => disabled && css`
    opacity: 0.6;
    cursor: not-allowed;
    background-color: ${theme.colors.background.default};
  `}

  ${({ focused, theme }) => focused && css`
    border-color: ${theme.colors.primary.main};
    box-shadow: ${SHADOWS.focusRing};
  `}

  ${({ elevated }) => elevated && css`
    box-shadow: ${SHADOWS.low};
  `}

  @media (max-width: ${BREAKPOINTS.sm}px) {
    min-width: ${SPACING.unit * 15}px;
  }
`;

// Input element
export const SelectInput = styled.div`
  display: flex;
  align-items: center;
  padding: ${SPACING.unit * 1.5}px ${SPACING.unit * 2}px;
  min-height: ${SPACING.unit * 6}px;
  cursor: pointer;
  user-select: none;
  font-size: ${TYPOGRAPHY.body1.fontSize}px;
  line-height: ${TYPOGRAPHY.body1.lineHeight};
  color: ${({ theme }) => theme.colors.text.primary};

  &[aria-disabled='true'] {
    cursor: not-allowed;
  }

  &:focus {
    outline: none;
  }
`;

// Dropdown menu container
export const SelectDropdown = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: ${Z_INDEX_DROPDOWN};
  margin-top: ${SPACING.unit}px;
  max-height: ${SPACING.unit * 30}px;
  overflow-y: auto;
  background-color: ${({ theme }) => theme.colors.background.paper};
  border-radius: ${BORDER_RADIUS}px;
  box-shadow: ${DROPDOWN_SHADOW};
  opacity: 0;
  transform: translateY(-${SPACING.unit}px);
  transition: opacity ${TRANSITION_DURATION} ${ANIMATION_CONFIG},
              transform ${TRANSITION_DURATION} ${ANIMATION_CONFIG};

  &[aria-expanded='true'] {
    opacity: 1;
    transform: translateY(0);
  }

  @media (max-width: ${BREAKPOINTS.sm}px) {
    position: fixed;
    top: auto;
    bottom: 0;
    left: 0;
    right: 0;
    margin: 0;
    border-radius: ${BORDER_RADIUS}px ${BORDER_RADIUS}px 0 0;
    max-height: 50vh;
  }
`;

// Option item
export const SelectOption = styled.div<SelectOptionProps>`
  padding: ${SPACING.unit * 1.5}px ${SPACING.unit * 2}px;
  font-size: ${TYPOGRAPHY.body1.fontSize}px;
  line-height: ${TYPOGRAPHY.body1.lineHeight};
  cursor: pointer;
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: ${({ $isRtl }) => $isRtl ? 'flex-end' : 'flex-start'};
  transition: background-color ${TRANSITION_DURATION} ${ANIMATION_CONFIG};
  color: ${({ theme }) => theme.colors.text.primary};

  ${({ selected, theme }) => selected && css`
    background-color: ${theme.colors.primary.main}15;
    color: ${theme.colors.primary.main};
    font-weight: ${TYPOGRAPHY.button.fontWeight};
  `}

  ${({ disabled, theme }) => disabled && css`
    opacity: 0.6;
    cursor: not-allowed;
    color: ${theme.colors.text.disabled};
  `}

  ${({ highlighted, theme }) => highlighted && css`
    background-color: ${theme.colors.primary.main}08;
  `}

  &:hover:not([aria-disabled='true']) {
    background-color: ${({ theme }) => theme.colors.primary.main}08;
  }

  &:focus {
    outline: none;
    background-color: ${({ theme }) => theme.colors.primary.main}12;
  }

  @media (max-width: ${BREAKPOINTS.sm}px) {
    padding: ${SPACING.unit * 2}px ${SPACING.unit * 2}px;
    min-height: ${SPACING.unit * 6}px;
  }
`;