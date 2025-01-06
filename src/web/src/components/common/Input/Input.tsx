import React from 'react';
import { useTheme } from '@emotion/react';
import { useFocusVisible } from 'react-focus-visible';
import {
  InputContainer,
  StyledInput,
  InputLabel,
  ErrorText
} from './Input.styles';

export interface InputProps {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  disabled?: boolean;
  type?: string;
  placeholder?: string;
  dir?: 'ltr' | 'rtl';
}

const Input = React.forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  const {
    id,
    label,
    value,
    onChange,
    error,
    disabled = false,
    type = 'text',
    placeholder,
    dir = 'ltr',
    ...restProps
  } = props;

  const theme = useTheme();
  const { isFocusVisible } = useFocusVisible();

  // Generate unique IDs for accessibility
  const inputId = `input-${id}`;
  const errorId = `error-${id}`;
  const labelId = `label-${id}`;

  return (
    <InputContainer dir={dir}>
      {label && (
        <InputLabel
          htmlFor={inputId}
          id={labelId}
          error={!!error}
          disabled={disabled}
        >
          {label}
        </InputLabel>
      )}
      <StyledInput
        ref={ref}
        id={inputId}
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        error={!!error}
        placeholder={placeholder}
        hasLabel={!!label}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        aria-labelledby={labelId}
        aria-disabled={disabled}
        data-focus-visible={isFocusVisible}
        dir={dir}
        {...restProps}
      />
      {error && (
        <ErrorText
          id={errorId}
          role="alert"
          aria-live="polite"
        >
          {error}
        </ErrorText>
      )}
    </InputContainer>
  );
});

// Display name for debugging
Input.displayName = 'Input';

// Memoize the component for performance
export default React.memo(Input);