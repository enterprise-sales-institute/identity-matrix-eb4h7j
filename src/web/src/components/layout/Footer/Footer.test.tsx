import React from 'react';
import { screen, within, fireEvent } from '@testing-library/react'; // v14.0.0
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'; // v29.0.0
import { Theme, useTheme } from '@mui/material'; // v5.0.0
import { axe } from '@axe-core/react'; // v4.7.3
import { renderWithProviders } from '../../../tests/utils/test-utils';
import Footer from './Footer';

// Test IDs for component elements
const TEST_IDS = {
  FOOTER_CONTAINER: 'footer-container',
  FOOTER_CONTENT: 'footer-content',
  FOOTER_LINKS: 'footer-links',
  FOOTER_COPYRIGHT: 'footer-copyright'
} as const;

// Viewport sizes based on design specifications
const VIEWPORT_SIZES = {
  MOBILE: 320,
  TABLET: 768,
  DESKTOP: 1024,
  LARGE_DESKTOP: 1440
} as const;

// Mock window resize helper
const resizeWindow = (width: number) => {
  global.innerWidth = width;
  global.dispatchEvent(new Event('resize'));
};

describe('Footer Component', () => {
  // Reset window size after each test
  afterEach(() => {
    resizeWindow(VIEWPORT_SIZES.DESKTOP);
  });

  describe('Rendering and Content', () => {
    beforeEach(() => {
      renderWithProviders(<Footer />);
    });

    it('renders with all required elements', () => {
      // Verify footer container
      const footer = screen.getByRole('contentinfo');
      expect(footer).toBeInTheDocument();

      // Verify navigation links
      const navigation = screen.getByRole('navigation');
      expect(navigation).toBeInTheDocument();

      // Verify all footer links are present
      const links = screen.getAllByRole('link');
      expect(links).toHaveLength(3); // Privacy, Terms, Contact

      // Verify copyright text
      const copyright = screen.getByText(/Multi-Touch Attribution Analytics/i);
      expect(copyright).toBeInTheDocument();
      expect(copyright).toHaveTextContent(new Date().getFullYear().toString());
    });

    it('renders links with correct attributes', () => {
      const links = screen.getAllByRole('link');
      
      links.forEach(link => {
        expect(link).toHaveAttribute('href');
        expect(link).toHaveAttribute('aria-label');
        expect(link).toHaveAttribute('tabIndex', '0');
      });
    });
  });

  describe('Theme Integration', () => {
    it('applies correct theme styles in light mode', () => {
      const { container } = renderWithProviders(<Footer />);
      const footer = container.firstChild as HTMLElement;

      expect(footer).toHaveStyle({
        backgroundColor: expect.stringMatching(/rgb\(245,\s*245,\s*245\)/), // paper background
        color: expect.stringMatching(/rgb\(51,\s*51,\s*51\)/), // text.primary
      });
    });

    it('applies correct theme styles in dark mode', () => {
      const { container } = renderWithProviders(<Footer />, {
        theme: { mode: 'dark' }
      });
      const footer = container.firstChild as HTMLElement;

      expect(footer).toHaveStyle({
        backgroundColor: expect.stringMatching(/rgb\(45,\s*45,\s*45\)/), // dark mode paper
        color: expect.stringMatching(/rgb\(255,\s*255,\s*255\)/), // dark mode text
      });
    });

    it('updates styles when theme changes', () => {
      const { container, rerender } = renderWithProviders(<Footer />);
      const footer = container.firstChild as HTMLElement;

      // Initial light mode styles
      expect(footer).toHaveStyle({
        backgroundColor: expect.stringMatching(/rgb\(245,\s*245,\s*245\)/)
      });

      // Rerender with dark theme
      rerender(<Footer />, { theme: { mode: 'dark' } });

      expect(footer).toHaveStyle({
        backgroundColor: expect.stringMatching(/rgb\(45,\s*45,\s*45\)/)
      });
    });
  });

  describe('Responsive Design', () => {
    it('adapts layout for mobile viewport', () => {
      resizeWindow(VIEWPORT_SIZES.MOBILE);
      const { container } = renderWithProviders(<Footer />);
      
      const content = container.querySelector('[role="contentinfo"] > div');
      expect(content).toHaveStyle({
        flexDirection: 'column',
        padding: expect.stringMatching(/16px/)
      });
    });

    it('adapts layout for tablet viewport', () => {
      resizeWindow(VIEWPORT_SIZES.TABLET);
      const { container } = renderWithProviders(<Footer />);
      
      const content = container.querySelector('[role="contentinfo"] > div');
      expect(content).toHaveStyle({
        flexDirection: 'row',
        padding: expect.stringMatching(/20px/)
      });
    });

    it('maintains proper spacing at desktop viewport', () => {
      resizeWindow(VIEWPORT_SIZES.DESKTOP);
      const { container } = renderWithProviders(<Footer />);
      
      const content = container.querySelector('[role="contentinfo"] > div');
      expect(content).toHaveStyle({
        padding: expect.stringMatching(/24px/),
        maxWidth: '1200px'
      });
    });
  });

  describe('Accessibility', () => {
    it('meets WCAG 2.1 accessibility guidelines', async () => {
      const { container } = renderWithProviders(<Footer />);
      const results = await axe(container);
      
      expect(results).toHaveNoViolations();
    });

    it('supports keyboard navigation', () => {
      renderWithProviders(<Footer />);
      const links = screen.getAllByRole('link');
      
      // Test keyboard focus order
      links.forEach(link => {
        link.focus();
        expect(document.activeElement).toBe(link);
      });
    });

    it('has proper ARIA labels', () => {
      renderWithProviders(<Footer />);
      
      expect(screen.getByRole('contentinfo')).toHaveAttribute('aria-label', 'Site footer');
      expect(screen.getByRole('navigation')).toHaveAttribute('aria-label', 'Footer navigation');
      
      const links = screen.getAllByRole('link');
      links.forEach(link => {
        expect(link).toHaveAttribute('aria-label');
      });
    });

    it('maintains sufficient color contrast', () => {
      const { container } = renderWithProviders(<Footer />);
      const links = screen.getAllByRole('link');
      
      links.forEach(link => {
        const styles = window.getComputedStyle(link);
        expect(styles.color).toHaveContrastRatio(styles.backgroundColor, 4.5);
      });
    });
  });

  describe('Interactive Behavior', () => {
    it('handles link clicks correctly', () => {
      renderWithProviders(<Footer />);
      const links = screen.getAllByRole('link');
      
      links.forEach(link => {
        fireEvent.click(link);
        // Verify click behavior - add specific assertions based on requirements
      });
    });

    it('shows focus indicators on keyboard navigation', () => {
      renderWithProviders(<Footer />);
      const links = screen.getAllByRole('link');
      
      links.forEach(link => {
        link.focus();
        expect(link).toHaveStyle({
          outline: expect.stringMatching(/none/),
          boxShadow: expect.stringMatching(/0 0 0 2px rgba\(0,102,204,0.4\)/)
        });
      });
    });
  });
});