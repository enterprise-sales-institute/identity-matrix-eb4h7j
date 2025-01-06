import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ThemeProvider } from '@emotion/react';
import Input from './Input';
import { COLORS, TYPOGRAPHY } from '../../../styles/variables.styles';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock theme for testing
const mockTheme = {
  colors: COLORS.light,
  typography: TYPOGRAPHY,
  mode: 'light'
};

// Test setup utilities
const renderWithTheme = (ui: React.ReactElement, theme = mockTheme) => {
  return render(
    <ThemeProvider theme={theme}>
      {ui}
    </ThemeProvider>
  );
};

describe('Input Component', () => {
  // Common props for testing
  const defaultProps = {
    id: 'test-input',
    label: 'Test Label',
    value: '',
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = renderWithTheme(<Input {...defaultProps} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper ARIA attributes', () => {
      renderWithTheme(<Input {...defaultProps} />);
      const input = screen.getByRole('textbox');
      
      expect(input).toHaveAttribute('aria-labelledby', `label-${defaultProps.id}`);
      expect(input).not.toHaveAttribute('aria-invalid');
      expect(input).not.toHaveAttribute('aria-describedby');
    });

    it('should handle error states with proper ARIA attributes', () => {
      const error = 'Error message';
      renderWithTheme(<Input {...defaultProps} error={error} />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAttribute('aria-describedby', `error-${defaultProps.id}`);
      
      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toHaveTextContent(error);
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      renderWithTheme(<Input {...defaultProps} />);
      
      const input = screen.getByRole('textbox');
      await user.tab();
      
      expect(input).toHaveFocus();
      expect(input).toHaveAttribute('data-focus-visible', 'true');
    });
  });

  describe('Theme Integration', () => {
    it('should render with light theme styles', () => {
      renderWithTheme(<Input {...defaultProps} />);
      const input = screen.getByRole('textbox');
      
      expect(input).toHaveStyle({
        backgroundColor: COLORS.light.background.default,
        color: COLORS.light.text.primary
      });
    });

    it('should render with dark theme styles', () => {
      const darkTheme = {
        ...mockTheme,
        colors: COLORS.dark,
        mode: 'dark'
      };
      
      renderWithTheme(<Input {...defaultProps} />, darkTheme);
      const input = screen.getByRole('textbox');
      
      expect(input).toHaveStyle({
        backgroundColor: COLORS.dark.background.default,
        color: COLORS.dark.text.primary
      });
    });

    it('should handle disabled state with proper styling', () => {
      renderWithTheme(<Input {...defaultProps} disabled />);
      const input = screen.getByRole('textbox');
      
      expect(input).toBeDisabled();
      expect(input).toHaveStyle({
        backgroundColor: COLORS.light.background.paper,
        color: COLORS.light.text.disabled
      });
    });
  });

  describe('RTL Support', () => {
    it('should render correctly in RTL mode', () => {
      renderWithTheme(<Input {...defaultProps} dir="rtl" />);
      const container = screen.getByRole('textbox').parentElement;
      
      expect(container).toHaveAttribute('dir', 'rtl');
      expect(screen.getByRole('textbox')).toHaveStyle({
        direction: 'rtl'
      });
    });

    it('should maintain proper layout in RTL mode', () => {
      renderWithTheme(<Input {...defaultProps} dir="rtl" error="Error message" />);
      const container = screen.getByRole('textbox').parentElement;
      const errorMessage = screen.getByRole('alert');
      
      const styles = window.getComputedStyle(container as Element);
      expect(styles.direction).toBe('rtl');
      expect(errorMessage).toBeVisible();
    });
  });

  describe('User Interactions', () => {
    it('should handle text input correctly', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      
      renderWithTheme(<Input {...defaultProps} onChange={onChange} />);
      const input = screen.getByRole('textbox');
      
      await user.type(input, 'test input');
      expect(onChange).toHaveBeenCalledTimes(10); // One call per character
      expect(input).toHaveValue('test input');
    });

    it('should handle focus and blur events', async () => {
      const user = userEvent.setup();
      const onFocus = jest.fn();
      const onBlur = jest.fn();
      
      renderWithTheme(
        <Input {...defaultProps} onFocus={onFocus} onBlur={onBlur} />
      );
      const input = screen.getByRole('textbox');
      
      await user.click(input);
      expect(onFocus).toHaveBeenCalledTimes(1);
      
      await user.tab();
      expect(onBlur).toHaveBeenCalledTimes(1);
    });

    it('should handle placeholder text', () => {
      const placeholder = 'Enter value';
      renderWithTheme(<Input {...defaultProps} placeholder={placeholder} />);
      
      expect(screen.getByPlaceholderText(placeholder)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message with proper styling', () => {
      const error = 'Required field';
      renderWithTheme(<Input {...defaultProps} error={error} />);
      
      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toHaveStyle({
        color: COLORS.light.error.main
      });
      expect(errorMessage).toHaveTextContent(error);
    });

    it('should update error message dynamically', () => {
      const { rerender } = renderWithTheme(
        <Input {...defaultProps} error="First error" />
      );
      
      expect(screen.getByRole('alert')).toHaveTextContent('First error');
      
      rerender(
        <ThemeProvider theme={mockTheme}>
          <Input {...defaultProps} error="Updated error" />
        </ThemeProvider>
      );
      
      expect(screen.getByRole('alert')).toHaveTextContent('Updated error');
    });
  });
});