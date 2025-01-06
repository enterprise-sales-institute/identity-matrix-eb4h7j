import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ThemeMode } from '../../../types/theme.types';
import { Card } from './Card';
import { renderWithProviders } from '../../../tests/utils/test-utils';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

describe('Card Component', () => {
  // Test cleanup
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders with required props', async () => {
      const { container } = renderWithProviders(
        <Card>
          <div>Card Content</div>
        </Card>
      );

      // Verify basic structure
      const cardElement = container.firstChild;
      expect(cardElement).toHaveClass('sc-Card');
      expect(cardElement).toHaveAttribute('role', 'article');
      expect(screen.getByText('Card Content')).toBeInTheDocument();

      // Verify default elevation
      expect(cardElement).toHaveStyle({
        boxShadow: expect.stringContaining('0px 1px')
      });
    });

    it('renders with all props', () => {
      const header = <div>Header Content</div>;
      const footer = <div>Footer Content</div>;
      const customClass = 'custom-card';

      const { container } = renderWithProviders(
        <Card
          elevation={3}
          header={header}
          footer={footer}
          className={customClass}
          ariaLabel="Test Card"
        >
          <div>Main Content</div>
        </Card>
      );

      // Verify all sections are rendered
      expect(screen.getByRole('heading')).toBeInTheDocument();
      expect(screen.getByText('Header Content')).toBeInTheDocument();
      expect(screen.getByText('Main Content')).toBeInTheDocument();
      expect(screen.getByText('Footer Content')).toBeInTheDocument();

      // Verify custom props are applied
      const cardElement = container.firstChild;
      expect(cardElement).toHaveClass(customClass);
      expect(cardElement).toHaveAttribute('aria-label', 'Test Card');
      expect(cardElement).toHaveStyle({
        boxShadow: expect.stringContaining('0px 3px')
      });
    });

    it('renders loading state correctly', () => {
      renderWithProviders(
        <Card loading>
          <div>Content</div>
        </Card>
      );

      const loadingCard = screen.getByRole('alert');
      expect(loadingCard).toHaveAttribute('aria-busy', 'true');
      expect(loadingCard).toHaveClass('card-loading');
      expect(loadingCard.querySelector('.loading-animation')).toBeInTheDocument();
    });
  });

  describe('Theming', () => {
    it('applies light theme styles correctly', () => {
      const { container } = renderWithProviders(
        <Card>
          <div>Content</div>
        </Card>,
        { theme: ThemeMode.LIGHT }
      );

      const cardElement = container.firstChild;
      expect(cardElement).toHaveStyle({
        backgroundColor: '#F5F5F5',
        color: '#333333'
      });
    });

    it('applies dark theme styles correctly', () => {
      const { container } = renderWithProviders(
        <Card>
          <div>Content</div>
        </Card>,
        { theme: ThemeMode.DARK }
      );

      const cardElement = container.firstChild;
      expect(cardElement).toHaveStyle({
        backgroundColor: '#2D2D2D',
        color: '#FFFFFF'
      });
    });

    it('handles theme transitions smoothly', async () => {
      const { container, rerender } = renderWithProviders(
        <Card>
          <div>Content</div>
        </Card>,
        { theme: ThemeMode.LIGHT }
      );

      const cardElement = container.firstChild;
      expect(cardElement).toHaveStyle({
        transition: expect.stringContaining('box-shadow')
      });

      // Rerender with dark theme
      rerender(
        <Card>
          <div>Content</div>
        </Card>
      );

      await waitFor(() => {
        expect(cardElement).toHaveStyle({
          backgroundColor: '#2D2D2D'
        });
      });
    });
  });

  describe('Accessibility', () => {
    it('meets WCAG requirements', async () => {
      const { container } = renderWithProviders(
        <Card
          header={<h2>Accessible Header</h2>}
          footer={<div>Footer Content</div>}
          ariaLabel="Test Card"
        >
          <div>Main Content</div>
        </Card>
      );

      // Run axe accessibility tests
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('implements proper ARIA attributes', () => {
      renderWithProviders(
        <Card
          header={<div>Header</div>}
          footer={<div>Footer</div>}
          ariaLabel="Test Card"
        >
          <div>Content</div>
        </Card>
      );

      // Verify ARIA roles and labels
      expect(screen.getByRole('article')).toBeInTheDocument();
      expect(screen.getByRole('heading')).toHaveAttribute('aria-level', '2');
      expect(screen.getByRole('region')).toHaveAttribute(
        'aria-label',
        'Test Card content'
      );
      expect(screen.getByRole('contentinfo')).toHaveAttribute(
        'aria-label',
        'Test Card footer'
      );
    });

    it('supports keyboard navigation', () => {
      renderWithProviders(
        <Card>
          <button>Interactive Element</button>
        </Card>
      );

      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();
    });
  });

  describe('Interactions', () => {
    it('handles hover state correctly', async () => {
      const { container } = renderWithProviders(
        <Card elevation={1} hoverElevation={3}>
          <div>Content</div>
        </Card>
      );

      const cardElement = container.firstChild;
      
      // Trigger hover
      fireEvent.mouseEnter(cardElement);
      await waitFor(() => {
        expect(cardElement).toHaveStyle({
          transform: 'translateY(-2px)',
          boxShadow: expect.stringContaining('0px 3px')
        });
      });

      // Remove hover
      fireEvent.mouseLeave(cardElement);
      await waitFor(() => {
        expect(cardElement).toHaveStyle({
          transform: 'translateY(0)',
          boxShadow: expect.stringContaining('0px 1px')
        });
      });
    });

    it('handles touch interactions correctly', async () => {
      const { container } = renderWithProviders(
        <Card elevation={1} hoverElevation={3}>
          <div>Content</div>
        </Card>
      );

      const cardElement = container.firstChild;

      // Trigger touch
      fireEvent.touchStart(cardElement);
      await waitFor(() => {
        expect(cardElement).toHaveStyle({
          transform: 'translateY(-2px)'
        });
      });

      // End touch
      fireEvent.touchEnd(cardElement);
      await waitFor(() => {
        expect(cardElement).toHaveStyle({
          transform: 'translateY(0)'
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('renders error boundary fallback on error', () => {
      const ErrorComponent = () => {
        throw new Error('Test Error');
      };

      const { container } = renderWithProviders(
        <Card>
          <ErrorComponent />
        </Card>
      );

      expect(screen.getByRole('alert')).toHaveTextContent(
        'An error occurred while rendering this card.'
      );
    });
  });
});