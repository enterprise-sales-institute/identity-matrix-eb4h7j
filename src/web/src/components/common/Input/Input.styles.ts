import styled from '@emotion/styled';
import { css } from '@emotion/react';
import { SPACING, TYPOGRAPHY, COLORS } from '../../../styles/variables.styles';

// Constants for input styling
const INPUT_HEIGHT = '40px';
const BORDER_RADIUS = '4px';
const TRANSITION_DURATION = '0.2s';
const FOCUS_RING_WIDTH = '2px';
const ERROR_MESSAGE_HEIGHT = '20px';

// Helper function to get theme-aware colors
const getInputColors = (theme: any) => ({
  border: {
    default: theme.colors.text.secondary,
    hover: theme.colors.primary.hover,
    focus: theme.colors.primary.main,
    error: theme.colors.error.main,
    disabled: theme.colors.text.disabled
  },
  background: {
    default: theme.colors.background.default,
    hover: theme.colors.background.paper,
    disabled: theme.colors.background.paper
  },
  text: {
    default: theme.colors.text.primary,
    placeholder: theme.colors.text.hint,
    disabled: theme.colors.text.disabled,
    error: theme.colors.error.main
  }
});

// Container component for input field and error message
export const InputContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: ${SPACING.unit * 2}px;
  min-height: calc(${INPUT_HEIGHT} + ${ERROR_MESSAGE_HEIGHT});
  position: relative;
  width: 100%;
`;

// Styled input field with accessibility and theming support
export const StyledInput = styled.input<{ error?: boolean; hasLabel?: boolean }>`
  height: ${INPUT_HEIGHT};
  width: 100%;
  padding: ${SPACING.unit}px ${SPACING.unit * 1.5}px;
  border-radius: ${BORDER_RADIUS};
  border: 1px solid;
  font-family: ${TYPOGRAPHY.fontFamily};
  font-size: ${TYPOGRAPHY.body1.fontSize}px;
  line-height: ${TYPOGRAPHY.body1.lineHeight};
  letter-spacing: ${TYPOGRAPHY.body1.letterSpacing};
  transition: all ${TRANSITION_DURATION} ease-in-out;
  direction: inherit;
  background-color: ${({ theme }) => getInputColors(theme).background.default};
  border-color: ${({ theme, error }) =>
    error ? getInputColors(theme).border.error : getInputColors(theme).border.default};
  color: ${({ theme }) => getInputColors(theme).text.default};

  &::placeholder {
    color: ${({ theme }) => getInputColors(theme).text.placeholder};
    opacity: 1;
  }

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => getInputColors(theme).border.hover};
    background-color: ${({ theme }) => getInputColors(theme).background.hover};
  }

  &:focus-visible {
    outline: none;
    border-color: ${({ theme }) => getInputColors(theme).border.focus};
    box-shadow: 0 0 0 ${FOCUS_RING_WIDTH} ${({ theme }) => `${theme.colors.primary.main}40`};
  }

  &:disabled {
    background-color: ${({ theme }) => getInputColors(theme).background.disabled};
    border-color: ${({ theme }) => getInputColors(theme).border.disabled};
    color: ${({ theme }) => getInputColors(theme).text.disabled};
    cursor: not-allowed;
  }

  ${({ hasLabel }) =>
    hasLabel &&
    css`
      margin-top: ${SPACING.unit / 2}px;
    `}

  /* High contrast mode support */
  @media (forced-colors: active) {
    border-color: ButtonText;
    &:focus-visible {
      outline: 2px solid ButtonText;
    }
  }
`;

// Label component with semantic styling
export const InputLabel = styled.label<{ error?: boolean; disabled?: boolean }>`
  display: block;
  margin-bottom: ${SPACING.unit / 2}px;
  font-family: ${TYPOGRAPHY.fontFamily};
  font-size: ${TYPOGRAPHY.body2.fontSize}px;
  font-weight: ${TYPOGRAPHY.body2.fontWeight};
  line-height: ${TYPOGRAPHY.body2.lineHeight};
  color: ${({ theme, error, disabled }) =>
    disabled
      ? getInputColors(theme).text.disabled
      : error
      ? getInputColors(theme).text.error
      : getInputColors(theme).text.default};
  transition: color ${TRANSITION_DURATION} ease-in-out;
  cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'default')};
`;

// Error message component with screen reader support
export const ErrorText = styled.span`
  display: block;
  margin-top: ${SPACING.unit / 2}px;
  font-family: ${TYPOGRAPHY.fontFamily};
  font-size: ${TYPOGRAPHY.caption.fontSize}px;
  line-height: ${TYPOGRAPHY.caption.lineHeight};
  color: ${({ theme }) => theme.colors.error.main};
  min-height: ${ERROR_MESSAGE_HEIGHT};
  transition: opacity ${TRANSITION_DURATION} ease-in-out;
  
  /* Accessibility attributes */
  role: alert;
  aria-live: polite;
`;