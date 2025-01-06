import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'; // v18.2+
import { DatePicker as MuiDatePicker, LocalizationProvider } from '@mui/x-date-pickers'; // v6.0+
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'; // v6.0+
import { DatePickerContainer, DatePickerInput, DatePickerCalendar } from './DatePicker.styles';
import { TimeRange } from '../../../types/common.types';
import { useTheme } from '../../../hooks/useTheme';

// Error type for date validation
interface DatePickerError {
  type: 'min' | 'max' | 'invalid' | 'required';
  message: string;
}

// Props interface with strict type checking
interface DatePickerProps {
  value: Date | TimeRange | null;
  onChange: (date: Date | TimeRange | null, error?: DatePickerError) => void;
  mode?: 'single' | 'range';
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  mobileBreakpoint?: number;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

// Constants for accessibility and validation
const ARIA_MESSAGES = {
  calendar: 'Date picker calendar dialog',
  input: 'Date input field',
  selected: 'Selected date',
  range: 'Date range selection',
  invalid: 'Invalid date selection',
};

const DEFAULT_ERROR_MESSAGES = {
  min: 'Date must not be before minimum date',
  max: 'Date must not be after maximum date',
  invalid: 'Invalid date format',
  required: 'Date selection is required',
};

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  mode = 'single',
  minDate,
  maxDate,
  disabled = false,
  placeholder = 'Select date',
  className,
  mobileBreakpoint = 768,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
}) => {
  // Theme and system preferences
  const { theme, themeMode } = useTheme();

  // Refs for DOM elements
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // State management
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<DatePickerError | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Memoized date validation function
  const validateDate = useMemo(() => {
    return (date: Date | null): DatePickerError | null => {
      if (!date) return null;

      if (minDate && date < minDate) {
        return { type: 'min', message: DEFAULT_ERROR_MESSAGES.min };
      }

      if (maxDate && date > maxDate) {
        return { type: 'max', message: DEFAULT_ERROR_MESSAGES.max };
      }

      return null;
    };
  }, [minDate, maxDate]);

  // Handle window resize for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < mobileBreakpoint);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, [mobileBreakpoint]);

  // Handle date change with validation
  const handleDateChange = useCallback((newValue: Date | null) => {
    const validationError = validateDate(newValue);
    setError(validationError);

    if (mode === 'single') {
      onChange(newValue, validationError || undefined);
    } else if (newValue && value && value instanceof Object) {
      const range = value as TimeRange;
      const newRange = {
        startDate: range.startDate || newValue,
        endDate: newValue,
      };
      onChange(newRange, validationError || undefined);
    }
  }, [mode, onChange, validateDate, value]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'Escape':
        setIsOpen(false);
        break;
      case 'Enter':
        if (!isOpen) setIsOpen(true);
        break;
      case 'Tab':
        if (isOpen) event.preventDefault();
        break;
    }
  }, [isOpen]);

  // Render date picker component
  return (
    <DatePickerContainer
      ref={containerRef}
      className={className}
      data-theme={themeMode}
      aria-expanded={isOpen}
    >
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <MuiDatePicker
          value={mode === 'single' ? value as Date : (value as TimeRange)?.startDate}
          onChange={handleDateChange}
          disabled={disabled}
          minDate={minDate}
          maxDate={maxDate}
          open={isOpen}
          onOpen={() => setIsOpen(true)}
          onClose={() => setIsOpen(false)}
          renderInput={(params) => (
            <DatePickerInput
              {...params}
              inputRef={inputRef}
              placeholder={placeholder}
              error={!!error}
              helperText={error?.message}
              onKeyDown={handleKeyDown}
              aria-label={ariaLabel || ARIA_MESSAGES.input}
              aria-describedby={ariaDescribedBy}
              aria-invalid={!!error}
            />
          )}
          PopperProps={{
            placement: isMobile ? 'bottom' : 'bottom-start',
            modifiers: [{
              name: 'offset',
              options: {
                offset: [0, 8],
              },
            }],
          }}
          PaperProps={{
            component: DatePickerCalendar,
            elevation: 8,
            'data-theme': themeMode,
            'aria-label': ARIA_MESSAGES.calendar,
          }}
        />
      </LocalizationProvider>

      {/* Screen reader only text for accessibility */}
      <span className="sr-only" role="status" aria-live="polite">
        {error ? error.message : value ? ARIA_MESSAGES.selected : ''}
      </span>
    </DatePickerContainer>
  );
};

export type { DatePickerProps, DatePickerError };