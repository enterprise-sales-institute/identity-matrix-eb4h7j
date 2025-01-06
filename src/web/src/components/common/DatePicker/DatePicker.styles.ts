import { styled } from '@mui/material/styles'; // v5.0+
import { Box, TextField, Paper } from '@mui/material'; // v5.0+
import { SPACING, TYPOGRAPHY, BREAKPOINTS } from '../../../styles/variables.styles';
import { CustomTheme } from '../../../types/theme.types';

// Constants for component dimensions and behavior
const CALENDAR_WIDTH = '280px';
const CALENDAR_WIDTH_MOBILE = '100%';
const INPUT_HEIGHT = '40px';
const POPUP_Z_INDEX = 1000;
const TRANSITION_DURATION = '0.2s';

// Container component with theme support and accessibility features
export const DatePickerContainer = styled(Box)<{ theme: CustomTheme }>(({ theme }) => ({
  position: 'relative',
  width: '100%',
  margin: `${SPACING.unit}px 0`,
  
  // Theme-based styling
  '&[data-theme="light"]': {
    backgroundColor: theme.colors.background.default,
    color: theme.colors.text.primary
  },
  
  '&[data-theme="dark"]': {
    backgroundColor: theme.colors.background.paper,
    color: theme.colors.text.primary
  },
  
  // Accessibility focus state
  '&:focus-within': {
    outline: `2px solid ${theme.colors.primary.main}`,
    outlineOffset: '2px'
  },
  
  // Screen reader only text
  '& .sr-only': {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: '0',
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    border: '0'
  }
}));

// Input component with theme integration and responsive behavior
export const DatePickerInput = styled(TextField)<{ theme: CustomTheme }>(({ theme }) => ({
  height: INPUT_HEIGHT,
  width: '100%',
  fontFamily: TYPOGRAPHY.fontFamily,
  
  // Base input styling
  '& .MuiInputBase-root': {
    height: '100%',
    fontFamily: 'inherit',
    transition: `all ${TRANSITION_DURATION}`
  },
  
  // Input field styling
  '& .MuiOutlinedInput-input': {
    padding: `${SPACING.unit}px ${SPACING.unit * 2}px`,
    fontSize: theme.typography.body1.fontSize,
    lineHeight: theme.typography.body1.lineHeight,
    
    '&::placeholder': {
      color: theme.colors.text.hint,
      opacity: 1
    }
  },
  
  // Border styling
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.colors.text.disabled,
    transition: `border-color ${TRANSITION_DURATION}`
  },
  
  // Hover state
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.colors.primary.main
  },
  
  // Focus state
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.colors.primary.main,
    borderWidth: '2px'
  },
  
  // Error state
  '&.Mui-error .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.colors.error.main
  },
  
  // Disabled state
  '&.Mui-disabled': {
    opacity: 0.7,
    cursor: 'not-allowed',
    
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: theme.colors.text.disabled
    }
  },
  
  // Responsive font size
  [`@media (max-width: ${BREAKPOINTS.xs}px)`]: {
    '& .MuiOutlinedInput-input': {
      fontSize: theme.typography.body2.fontSize
    }
  }
}));

// Calendar popup component with responsive design and animations
export const DatePickerCalendar = styled(Paper)<{ theme: CustomTheme }>(({ theme }) => ({
  position: 'absolute',
  zIndex: POPUP_Z_INDEX,
  width: CALENDAR_WIDTH,
  backgroundColor: theme.colors.background.paper,
  boxShadow: theme.shadows[8],
  borderRadius: `${SPACING.unit}px`,
  overflow: 'hidden',
  
  // Animation properties
  transition: `all ${TRANSITION_DURATION}`,
  transformOrigin: 'top left',
  willChange: 'transform, opacity',
  
  // Animation states
  '&[data-state="entering"], &[data-state="entered"]': {
    opacity: 1,
    transform: 'scale(1)'
  },
  
  '&[data-state="exiting"], &[data-state="exited"]': {
    opacity: 0,
    transform: 'scale(0.95)'
  },
  
  // Theme-based styling
  '&[data-theme="light"]': {
    border: `1px solid ${theme.colors.text.disabled}`
  },
  
  '&[data-theme="dark"]': {
    border: `1px solid ${theme.colors.background.elevated}`
  },
  
  // Mobile responsiveness
  [`@media (max-width: ${BREAKPOINTS.xs}px)`]: {
    width: CALENDAR_WIDTH_MOBILE,
    position: 'fixed',
    left: 0,
    bottom: 0,
    transformOrigin: 'bottom center',
    borderRadius: `${SPACING.unit}px ${SPACING.unit}px 0 0`,
    maxHeight: '80vh',
    overflowY: 'auto',
    
    // Mobile animation
    '&[data-state="entering"], &[data-state="entered"]': {
      transform: 'translateY(0)'
    },
    
    '&[data-state="exiting"], &[data-state="exited"]': {
      transform: 'translateY(100%)'
    }
  }
}));

// Helper function to calculate calendar position
export const getCalendarPosition = (
  inputRect: DOMRect,
  viewport: { width: number; height: number }
) => {
  const { top, left, height, width } = inputRect;
  const calendarWidth = viewport.width <= BREAKPOINTS.xs ? viewport.width : parseInt(CALENDAR_WIDTH);
  const spaceBelow = viewport.height - (top + height);
  const spaceAbove = top;
  
  // Calculate optimal position
  const position = {
    top: spaceBelow >= 320 ? top + height + SPACING.unit : undefined,
    bottom: spaceBelow < 320 ? SPACING.unit : undefined,
    left: Math.min(left, viewport.width - calendarWidth - SPACING.unit)
  };
  
  return position;
};