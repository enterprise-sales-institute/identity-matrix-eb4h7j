import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import Select from './Select';
import { renderWithProviders } from '../../../tests/utils/test-utils';

// Default test props
const defaultProps = {
  options: [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' }
  ],
  value: '',
  onChange: jest.fn(),
  placeholder: 'Select an option',
  label: 'Test Select',
  id: 'test-select'
};

// Test IDs for querying elements
const testIds = {
  select: 'select-component',
  dropdown: 'select-listbox',
  option: 'select-option',
  error: 'select-error'
};

// Helper function to render Select component
const renderSelect = (props = {}) => {
  const allProps = { ...defaultProps, ...props };
  return renderWithProviders(<Select {...allProps} />);
};

// Helper function for keyboard navigation tests
const setupKeyboardTest = async (props = {}) => {
  const user = userEvent.setup();
  const rendered = renderSelect(props);
  const select = screen.getByRole('combobox');
  await user.click(select);
  return { user, ...rendered };
};

describe('Select Component', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders with default props', () => {
      renderSelect();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
      expect(screen.getByText(defaultProps.placeholder)).toBeInTheDocument();
    });

    it('displays placeholder when no value selected', () => {
      renderSelect();
      expect(screen.getByText(defaultProps.placeholder)).toBeInTheDocument();
    });

    it('renders label correctly', () => {
      renderSelect();
      expect(screen.getByLabelText(defaultProps.label)).toBeInTheDocument();
    });

    it('applies disabled styling when disabled', () => {
      renderSelect({ disabled: true });
      const select = screen.getByRole('combobox');
      expect(select).toHaveAttribute('aria-disabled', 'true');
      expect(select).toHaveStyle({ cursor: 'not-allowed' });
    });

    it('handles empty options array', () => {
      renderSelect({ options: [] });
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  describe('Interaction Behavior', () => {
    it('opens dropdown on click', async () => {
      const { user } = await setupKeyboardTest();
      const listbox = screen.getByRole('listbox');
      expect(listbox).toBeVisible();
    });

    it('closes dropdown on outside click', async () => {
      const { user } = await setupKeyboardTest();
      await user.click(document.body);
      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeVisible();
      });
    });

    it('selects option on click', async () => {
      const onChange = jest.fn();
      const { user } = await setupKeyboardTest({ onChange });
      await user.click(screen.getByText('Option 1'));
      expect(onChange).toHaveBeenCalledWith('option1');
    });

    it('handles blur events correctly', async () => {
      const onBlur = jest.fn();
      const { user } = await setupKeyboardTest({ onBlur });
      await user.tab();
      expect(onBlur).toHaveBeenCalled();
    });

    it('maintains focus after selection', async () => {
      const { user } = await setupKeyboardTest();
      await user.click(screen.getByText('Option 1'));
      expect(screen.getByRole('combobox')).toHaveFocus();
    });
  });

  describe('Keyboard Navigation', () => {
    it('supports arrow key navigation', async () => {
      const { user } = await setupKeyboardTest();
      await user.keyboard('[ArrowDown]');
      expect(screen.getByText('Option 1')).toHaveAttribute('aria-selected', 'true');
    });

    it('selects option with Enter key', async () => {
      const onChange = jest.fn();
      const { user } = await setupKeyboardTest({ onChange });
      await user.keyboard('[ArrowDown][Enter]');
      expect(onChange).toHaveBeenCalledWith('option1');
    });

    it('closes dropdown with Escape key', async () => {
      const { user } = await setupKeyboardTest();
      await user.keyboard('[Escape]');
      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeVisible();
      });
    });

    it('supports type-ahead selection', async () => {
      const { user } = await setupKeyboardTest();
      await user.keyboard('opt');
      expect(screen.getByText('Option 1')).toHaveAttribute('aria-selected', 'true');
    });

    it('supports Home/End keys', async () => {
      const { user } = await setupKeyboardTest();
      await user.keyboard('[End]');
      expect(screen.getByText('Option 3')).toHaveAttribute('aria-selected', 'true');
      await user.keyboard('[Home]');
      expect(screen.getByText('Option 1')).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA attributes', () => {
      renderSelect();
      const select = screen.getByRole('combobox');
      expect(select).toHaveAttribute('aria-expanded', 'false');
      expect(select).toHaveAttribute('aria-haspopup', 'listbox');
      expect(select).toHaveAttribute('aria-label', defaultProps.label);
    });

    it('announces selected options', async () => {
      const { user } = await setupKeyboardTest();
      await user.click(screen.getByText('Option 1'));
      const select = screen.getByRole('combobox');
      expect(select).toHaveTextContent('Option 1');
    });

    it('provides keyboard focus indicators', async () => {
      const { user } = await setupKeyboardTest();
      const select = screen.getByRole('combobox');
      expect(select).toHaveAttribute('tabIndex', '0');
    });

    it('maintains focus order', async () => {
      const { user } = await setupKeyboardTest();
      await user.tab();
      expect(document.activeElement).not.toBe(screen.getByRole('combobox'));
    });
  });

  describe('Theming', () => {
    it('applies theme colors correctly', () => {
      renderSelect();
      const select = screen.getByRole('combobox');
      expect(select).toHaveStyle({
        backgroundColor: expect.any(String),
        color: expect.any(String)
      });
    });

    it('supports RTL layout', () => {
      renderSelect({ dir: 'rtl' });
      const select = screen.getByRole('combobox');
      expect(select).toHaveStyle({ direction: 'rtl' });
    });

    it('shows correct error styling', () => {
      renderSelect({ error: true, errorMessage: 'Error message' });
      expect(screen.getByText('Error message')).toHaveStyle({
        color: expect.any(String)
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error message', () => {
      const errorMessage = 'Required field';
      renderSelect({ error: true, errorMessage });
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('applies error state styling', () => {
      renderSelect({ error: true });
      const select = screen.getByRole('combobox').parentElement;
      expect(select).toHaveStyle({
        borderColor: expect.any(String)
      });
    });

    it('maintains accessibility in error state', () => {
      renderSelect({ error: true, errorMessage: 'Error message' });
      const select = screen.getByRole('combobox');
      expect(select).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByText('Error message')).toHaveAttribute('role', 'alert');
    });

    it('shows required field indicator', () => {
      renderSelect({ required: true });
      const select = screen.getByRole('combobox');
      expect(select).toHaveAttribute('aria-required', 'true');
    });
  });
});