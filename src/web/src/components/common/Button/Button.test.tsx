import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Button } from './Button';
import { renderWithProviders } from '../../../tests/utils/test-utils';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Test IDs for consistent querying
const TEST_IDS = {
  button: 'button-component',
  startIcon: 'button-start-icon',
  endIcon: 'button-end-icon',
  spinner: 'button-spinner'
};

describe('Button Component', () => {
  // Basic Rendering Tests
  describe('Rendering', () => {
    it('renders correctly with default props', () => {
      renderWithProviders(<Button>Click Me</Button>);
      const button = screen.getByRole('button', { name: /click me/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('type', 'button');
      expect(button).not.toBeDisabled();
    });

    it('renders with custom className', () => {
      renderWithProviders(<Button className="custom-class">Click Me</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });
  });

  // Variant Tests
  describe('Variants', () => {
    const variants = ['contained', 'outlined', 'text'] as const;

    test.each(variants)('renders %s variant correctly', (variant) => {
      renderWithProviders(<Button variant={variant}>Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-variant', variant);
    });

    it('applies correct styles for each variant', () => {
      const { rerender } = renderWithProviders(
        <Button variant="contained">Button</Button>
      );
      let button = screen.getByRole('button');
      expect(button).toHaveStyle({ backgroundColor: expect.any(String) });

      rerender(<Button variant="outlined">Button</Button>);
      button = screen.getByRole('button');
      expect(button).toHaveStyle({ borderStyle: 'solid' });

      rerender(<Button variant="text">Button</Button>);
      button = screen.getByRole('button');
      expect(button).toHaveStyle({ backgroundColor: 'transparent' });
    });
  });

  // Size Tests
  describe('Sizes', () => {
    const sizes = ['small', 'medium', 'large'] as const;

    test.each(sizes)('renders %s size correctly', (size) => {
      renderWithProviders(<Button size={size}>Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-size', size);
    });
  });

  // State Tests
  describe('States', () => {
    it('handles disabled state correctly', () => {
      renderWithProviders(<Button disabled>Disabled Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });

    it('handles loading state correctly', () => {
      renderWithProviders(<Button loading>Loading Button</Button>);
      const button = screen.getByRole('button');
      const spinner = screen.getByRole('progressbar');
      
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(button).toBeDisabled();
      expect(spinner).toBeInTheDocument();
    });

    it('prevents click events when loading', () => {
      const handleClick = jest.fn();
      renderWithProviders(
        <Button loading onClick={handleClick}>
          Loading Button
        </Button>
      );
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  // Icon Tests
  describe('Icons', () => {
    const TestIcon = () => <span data-testid="test-icon">icon</span>;

    it('renders start icon correctly', () => {
      renderWithProviders(
        <Button startIcon={<TestIcon />}>Button with Start Icon</Button>
      );
      expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    });

    it('renders end icon correctly', () => {
      renderWithProviders(
        <Button endIcon={<TestIcon />}>Button with End Icon</Button>
      );
      expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    });

    it('handles RTL layout with icons', () => {
      document.dir = 'rtl';
      renderWithProviders(
        <Button startIcon={<TestIcon />} endIcon={<TestIcon />}>
          RTL Button
        </Button>
      );
      const button = screen.getByRole('button');
      expect(button).toHaveStyle({ direction: 'rtl' });
      document.dir = 'ltr'; // Reset
    });
  });

  // Accessibility Tests
  describe('Accessibility', () => {
    it('meets WCAG 2.1 accessibility guidelines', async () => {
      const { container } = renderWithProviders(
        <Button aria-label="Accessible Button">Click Me</Button>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('supports keyboard navigation', () => {
      const handleClick = jest.fn();
      renderWithProviders(<Button onClick={handleClick}>Keyboard Button</Button>);
      
      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();
      
      fireEvent.keyDown(button, { key: 'Enter' });
      expect(handleClick).toHaveBeenCalledTimes(1);
      
      fireEvent.keyDown(button, { key: ' ' });
      expect(handleClick).toHaveBeenCalledTimes(2);
    });

    it('provides appropriate ARIA attributes', () => {
      renderWithProviders(
        <Button
          aria-label="Test Button"
          aria-expanded={true}
          aria-controls="test-panel"
          aria-describedby="test-description"
        >
          ARIA Button
        </Button>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Test Button');
      expect(button).toHaveAttribute('aria-expanded', 'true');
      expect(button).toHaveAttribute('aria-controls', 'test-panel');
      expect(button).toHaveAttribute('aria-describedby', 'test-description');
    });
  });

  // Interaction Tests
  describe('Interactions', () => {
    it('handles click events correctly', async () => {
      const handleClick = jest.fn();
      renderWithProviders(<Button onClick={handleClick}>Click Me</Button>);
      
      const button = screen.getByRole('button');
      await userEvent.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('handles focus and blur events', () => {
      renderWithProviders(<Button>Focus Test</Button>);
      const button = screen.getByRole('button');
      
      button.focus();
      expect(button).toHaveFocus();
      
      button.blur();
      expect(button).not.toHaveFocus();
    });

    it('maintains focus visibility for keyboard navigation', () => {
      renderWithProviders(<Button>Focus Visible</Button>);
      const button = screen.getByRole('button');
      
      // Simulate keyboard focus
      button.focus();
      expect(button).toHaveAttribute('data-focus-visible', 'true');
      
      // Simulate mouse interaction
      fireEvent.mouseDown(button);
      expect(button).not.toHaveAttribute('data-focus-visible');
    });
  });
});