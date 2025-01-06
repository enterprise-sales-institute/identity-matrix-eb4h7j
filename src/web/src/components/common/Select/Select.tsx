import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTheme } from 'styled-components';
import {
  SelectContainer,
  SelectInput,
  SelectDropdown,
  SelectOption,
} from './Select.styles';

// Keyboard interaction constants
const KEYBOARD_KEYS = {
  UP: 'ArrowUp',
  DOWN: 'ArrowDown',
  ENTER: 'Enter',
  ESCAPE: 'Escape',
  SPACE: ' ',
  HOME: 'Home',
  END: 'End',
  TAB: 'Tab'
} as const;

// ARIA role constants
const ARIA_ROLES = {
  COMBOBOX: 'combobox',
  LISTBOX: 'listbox',
  OPTION: 'option'
} as const;

interface SelectProps {
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  errorMessage?: string;
  label?: string;
  required?: boolean;
  name?: string;
  id?: string;
  className?: string;
  testId?: string;
  dir?: 'ltr' | 'rtl';
  maxHeight?: number;
  virtualized?: boolean;
  onBlur?: () => void;
  onFocus?: () => void;
}

const Select = React.memo<SelectProps>(({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  disabled = false,
  error = false,
  errorMessage,
  label,
  required = false,
  name,
  id,
  className,
  testId = 'select',
  dir = 'ltr',
  maxHeight,
  virtualized = false,
  onBlur,
  onFocus
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [typeAheadQuery, setTypeAheadQuery] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const typeAheadTimeoutRef = useRef<NodeJS.Timeout>();

  const theme = useTheme();

  // Handle intersection observer for dropdown positioning
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const bounds = entry.boundingClientRect;
        const viewportHeight = window.innerHeight;
        setDropdownPosition(
          bounds.bottom + 320 > viewportHeight ? 'top' : 'bottom'
        );
      },
      { threshold: 1.0 }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        if (onBlur) onBlur();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [onBlur]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (disabled) return;

    switch (event.key) {
      case KEYBOARD_KEYS.UP:
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setFocusedIndex(prev => 
            prev <= 0 ? options.length - 1 : prev - 1
          );
        }
        break;

      case KEYBOARD_KEYS.DOWN:
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setFocusedIndex(prev => 
            prev === options.length - 1 ? 0 : prev + 1
          );
        }
        break;

      case KEYBOARD_KEYS.ENTER:
        event.preventDefault();
        if (isOpen && focusedIndex >= 0) {
          const option = options[focusedIndex];
          if (!option.disabled) {
            onChange(option.value);
            setIsOpen(false);
          }
        } else {
          setIsOpen(true);
        }
        break;

      case KEYBOARD_KEYS.ESCAPE:
        event.preventDefault();
        setIsOpen(false);
        inputRef.current?.focus();
        break;

      case KEYBOARD_KEYS.HOME:
        if (isOpen) {
          event.preventDefault();
          setFocusedIndex(0);
        }
        break;

      case KEYBOARD_KEYS.END:
        if (isOpen) {
          event.preventDefault();
          setFocusedIndex(options.length - 1);
        }
        break;

      default:
        // Type-ahead functionality
        if (event.key.length === 1) {
          const newQuery = typeAheadQuery + event.key;
          setTypeAheadQuery(newQuery);

          const matchingIndex = options.findIndex(option =>
            option.label.toLowerCase().startsWith(newQuery.toLowerCase())
          );

          if (matchingIndex >= 0) {
            setFocusedIndex(matchingIndex);
          }

          if (typeAheadTimeoutRef.current) {
            clearTimeout(typeAheadTimeoutRef.current);
          }

          typeAheadTimeoutRef.current = setTimeout(() => {
            setTypeAheadQuery('');
          }, 500);
        }
        break;
    }
  }, [disabled, isOpen, focusedIndex, options, onChange, typeAheadQuery]);

  const selectedOption = options.find(option => option.value === value);

  const handleOptionClick = useCallback((optionValue: string, disabled: boolean | undefined) => {
    if (!disabled) {
      onChange(optionValue);
      setIsOpen(false);
      inputRef.current?.focus();
    }
  }, [onChange]);

  return (
    <SelectContainer
      ref={containerRef}
      className={className}
      data-testid={testId}
      error={error}
      disabled={disabled}
      focused={isOpen}
      elevated={isOpen}
      onClick={() => !disabled && setIsOpen(prev => !prev)}
      onFocus={onFocus}
    >
      <SelectInput
        ref={inputRef}
        role={ARIA_ROLES.COMBOBOX}
        aria-expanded={isOpen}
        aria-haspopup={ARIA_ROLES.LISTBOX}
        aria-controls={`${id || name}-listbox`}
        aria-label={label}
        aria-required={required}
        aria-invalid={error}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
      >
        {selectedOption ? selectedOption.label : placeholder}
      </SelectInput>

      <SelectDropdown
        ref={dropdownRef}
        role={ARIA_ROLES.LISTBOX}
        id={`${id || name}-listbox`}
        aria-expanded={isOpen}
        style={{
          maxHeight: maxHeight || undefined,
          display: isOpen ? 'block' : 'none',
          top: dropdownPosition === 'top' ? 'auto' : '100%',
          bottom: dropdownPosition === 'top' ? '100%' : 'auto'
        }}
      >
        {options.map((option, index) => (
          <SelectOption
            key={option.value}
            role={ARIA_ROLES.OPTION}
            aria-selected={value === option.value}
            aria-disabled={option.disabled}
            selected={value === option.value}
            disabled={option.disabled}
            highlighted={focusedIndex === index}
            $isRtl={dir === 'rtl'}
            onClick={() => handleOptionClick(option.value, option.disabled)}
            tabIndex={-1}
          >
            {option.label}
          </SelectOption>
        ))}
      </SelectDropdown>

      {error && errorMessage && (
        <div
          role="alert"
          style={{
            color: theme.colors.error.main,
            fontSize: '0.75rem',
            marginTop: '0.25rem'
          }}
        >
          {errorMessage}
        </div>
      )}
    </SelectContainer>
  );
});

Select.displayName = 'Select';

export default Select;