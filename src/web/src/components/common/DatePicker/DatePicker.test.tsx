import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ThemeProvider } from '@mui/material/styles';
import DatePicker from './DatePicker';
import { TimeRange } from '../../../types/common.types';
import { themeConfig } from '../../../config/theme.config';
import { ThemeMode } from '../../../types/theme.types';

// Mock ResizeObserver for responsive tests
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock theme hook
vi.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({
    theme: themeConfig.createCustomTheme(ThemeMode.LIGHT),
    themeMode: ThemeMode.LIGHT,
  }),
}));

describe('DatePicker Component', () => {
  // Test setup
  const mockOnChange = vi.fn();
  const defaultProps = {
    value: null,
    onChange: mockOnChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // Render Tests
  describe('Render Tests', () => {
    it('renders without crashing', () => {
      render(
        <ThemeProvider theme={themeConfig.defaultTheme}>
          <DatePicker {...defaultProps} />
        </ThemeProvider>
      );
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('renders with placeholder text', () => {
      const placeholder = 'Select date';
      render(
        <ThemeProvider theme={themeConfig.defaultTheme}>
          <DatePicker {...defaultProps} placeholder={placeholder} />
        </ThemeProvider>
      );
      expect(screen.getByPlaceholderText(placeholder)).toBeInTheDocument();
    });

    it('renders in disabled state', () => {
      render(
        <ThemeProvider theme={themeConfig.defaultTheme}>
          <DatePicker {...defaultProps} disabled />
        </ThemeProvider>
      );
      expect(screen.getByRole('textbox')).toBeDisabled();
    });

    it('renders with initial date value', () => {
      const initialDate = new Date('2023-01-01');
      render(
        <ThemeProvider theme={themeConfig.defaultTheme}>
          <DatePicker {...defaultProps} value={initialDate} />
        </ThemeProvider>
      );
      expect(screen.getByRole('textbox')).toHaveValue('01/01/2023');
    });
  });

  // Interaction Tests
  describe('Interaction Tests', () => {
    it('opens calendar on input click', async () => {
      render(
        <ThemeProvider theme={themeConfig.defaultTheme}>
          <DatePicker {...defaultProps} />
        </ThemeProvider>
      );
      
      const input = screen.getByRole('textbox');
      await userEvent.click(input);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('handles date selection', async () => {
      render(
        <ThemeProvider theme={themeConfig.defaultTheme}>
          <DatePicker {...defaultProps} />
        </ThemeProvider>
      );

      await userEvent.click(screen.getByRole('textbox'));
      const dayButton = screen.getByRole('button', { name: '15' });
      await userEvent.click(dayButton);

      expect(mockOnChange).toHaveBeenCalled();
    });

    it('handles date range selection', async () => {
      render(
        <ThemeProvider theme={themeConfig.defaultTheme}>
          <DatePicker {...defaultProps} mode="range" />
        </ThemeProvider>
      );

      await userEvent.click(screen.getByRole('textbox'));
      const startDay = screen.getByRole('button', { name: '15' });
      await userEvent.click(startDay);
      const endDay = screen.getByRole('button', { name: '20' });
      await userEvent.click(endDay);

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: expect.any(Date),
          endDate: expect.any(Date),
        })
      );
    });

    it('validates min date constraint', async () => {
      const minDate = new Date('2023-01-10');
      render(
        <ThemeProvider theme={themeConfig.defaultTheme}>
          <DatePicker {...defaultProps} minDate={minDate} />
        </ThemeProvider>
      );

      await userEvent.click(screen.getByRole('textbox'));
      const invalidDay = screen.getByRole('button', { name: '5' });
      expect(invalidDay).toBeDisabled();
    });
  });

  // Accessibility Tests
  describe('Accessibility Tests', () => {
    it('supports keyboard navigation', async () => {
      render(
        <ThemeProvider theme={themeConfig.defaultTheme}>
          <DatePicker {...defaultProps} />
        </ThemeProvider>
      );

      const input = screen.getByRole('textbox');
      await userEvent.tab();
      expect(input).toHaveFocus();

      fireEvent.keyDown(input, { key: 'Enter' });
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      fireEvent.keyDown(input, { key: 'Escape' });
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('provides appropriate ARIA labels', () => {
      render(
        <ThemeProvider theme={themeConfig.defaultTheme}>
          <DatePicker {...defaultProps} aria-label="Select date" />
        </ThemeProvider>
      );
      
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-label', 'Select date');
    });

    it('announces validation errors to screen readers', async () => {
      const minDate = new Date('2023-01-10');
      render(
        <ThemeProvider theme={themeConfig.defaultTheme}>
          <DatePicker {...defaultProps} minDate={minDate} />
        </ThemeProvider>
      );

      const input = screen.getByRole('textbox');
      await userEvent.type(input, '01/05/2023');
      
      const errorMessage = screen.getByRole('status');
      expect(errorMessage).toHaveTextContent('Date must not be before minimum date');
    });
  });

  // Theme Integration Tests
  describe('Theme Integration', () => {
    it('applies theme styles correctly', () => {
      render(
        <ThemeProvider theme={themeConfig.createCustomTheme(ThemeMode.LIGHT)}>
          <DatePicker {...defaultProps} />
        </ThemeProvider>
      );

      const container = screen.getByRole('textbox').closest('div');
      expect(container).toHaveAttribute('data-theme', 'light');
    });

    it('supports dark mode', () => {
      render(
        <ThemeProvider theme={themeConfig.createCustomTheme(ThemeMode.DARK)}>
          <DatePicker {...defaultProps} />
        </ThemeProvider>
      );

      const container = screen.getByRole('textbox').closest('div');
      expect(container).toHaveAttribute('data-theme', 'dark');
    });
  });

  // Error Handling Tests
  describe('Error Handling', () => {
    it('handles invalid date input', async () => {
      render(
        <ThemeProvider theme={themeConfig.defaultTheme}>
          <DatePicker {...defaultProps} />
        </ThemeProvider>
      );

      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'invalid date');
      
      expect(screen.getByRole('status')).toHaveTextContent('Invalid date format');
    });

    it('validates date range order', async () => {
      render(
        <ThemeProvider theme={themeConfig.defaultTheme}>
          <DatePicker {...defaultProps} mode="range" />
        </ThemeProvider>
      );

      const input = screen.getByRole('textbox');
      await userEvent.type(input, '12/31/2023 - 01/01/2023');
      
      expect(screen.getByRole('status')).toHaveTextContent(/invalid/i);
    });
  });
});