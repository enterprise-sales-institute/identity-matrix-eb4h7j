import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { axe, toHaveNoViolations } from 'jest-axe';

import Header from './Header';
import { renderWithProviders } from '../../../tests/utils/test-utils';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Test IDs for component elements
const TEST_IDS = {
  HEADER: 'header',
  THEME_TOGGLE: 'theme-toggle',
  USER_MENU: 'user-menu',
  MOBILE_MENU: 'mobile-menu',
  NAV_ITEMS: 'nav-items',
  LOADING: 'loading-indicator',
  ERROR: 'error-message'
} as const;

// Viewport sizes for responsive testing
const VIEWPORT_SIZES = {
  MOBILE: 320,
  TABLET: 768,
  DESKTOP: 1024,
  LARGE: 1440
} as const;

// Mock user data
const MOCK_USER = {
  id: 'test-user',
  name: 'Test User',
  email: 'test@example.com',
  roles: ['user']
};

describe('Header', () => {
  // Setup and cleanup
  beforeEach(() => {
    // Reset viewport size
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: VIEWPORT_SIZES.DESKTOP
    });

    // Clear local storage
    localStorage.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Visual Hierarchy', () => {
    it('implements Material Design 3.0 principles', () => {
      const { container } = renderWithProviders(<Header />);
      
      // Check z-axis layering
      const header = container.querySelector('header');
      expect(header).toHaveStyle({
        zIndex: '1100',
        boxShadow: expect.stringContaining('rgba(0, 0, 0,')
      });

      // Verify typography scale
      const logo = container.querySelector('.MuiTypography-root');
      expect(logo).toHaveStyle({
        fontSize: '1.25rem',
        fontWeight: '500'
      });

      // Validate spacing system (8px grid)
      const toolbar = container.querySelector('.MuiToolbar-root');
      expect(toolbar).toHaveStyle({
        padding: '0 24px'
      });
    });

    it('maintains proper elevation states', async () => {
      const { container } = renderWithProviders(<Header elevated={true} />);
      
      const header = container.querySelector('header');
      expect(header).toHaveStyle({
        boxShadow: expect.stringContaining('0px 4px')
      });

      // Test elevation on scroll
      fireEvent.scroll(window, { target: { pageYOffset: 100 } });
      await waitFor(() => {
        expect(header).toHaveStyle({
          boxShadow: expect.stringContaining('0px 4px')
        });
      });
    });
  });

  describe('Responsive Design', () => {
    it('adapts layout for mobile viewport', () => {
      // Set mobile viewport
      window.innerWidth = VIEWPORT_SIZES.MOBILE;
      const { container } = renderWithProviders(<Header />);

      // Check mobile-specific elements
      const mobileMenu = screen.queryByTestId(TEST_IDS.MOBILE_MENU);
      expect(mobileMenu).toBeInTheDocument();

      // Verify navigation is hidden
      const nav = screen.queryByTestId(TEST_IDS.NAV_ITEMS);
      expect(nav).not.toBeVisible();
    });

    it('adapts layout for tablet viewport', () => {
      window.innerWidth = VIEWPORT_SIZES.TABLET;
      const { container } = renderWithProviders(<Header />);

      // Verify tablet-specific layout
      const header = container.querySelector('header');
      expect(header).toHaveStyle({
        height: '64px'
      });
    });

    it('adapts layout for desktop viewport', () => {
      window.innerWidth = VIEWPORT_SIZES.DESKTOP;
      const { container } = renderWithProviders(<Header />);

      // Verify desktop navigation is visible
      const nav = screen.queryByTestId(TEST_IDS.NAV_ITEMS);
      expect(nav).toBeVisible();

      // Check desktop-specific spacing
      const toolbar = container.querySelector('.MuiToolbar-root');
      expect(toolbar).toHaveStyle({
        padding: '0 32px'
      });
    });
  });

  describe('Theme Management', () => {
    it('handles theme toggle correctly', async () => {
      const { container } = renderWithProviders(<Header />);
      
      // Find theme toggle button
      const themeToggle = screen.getByLabelText(/toggle theme/i);
      
      // Test light to dark transition
      await userEvent.click(themeToggle);
      await waitFor(() => {
        expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
      });

      // Test dark to light transition
      await userEvent.click(themeToggle);
      await waitFor(() => {
        expect(document.documentElement).toHaveAttribute('data-theme', 'light');
      });
    });

    it('applies correct theme-specific styles', async () => {
      const { container } = renderWithProviders(<Header />);
      
      // Check light theme styles
      const header = container.querySelector('header');
      expect(header).toHaveStyle({
        backgroundColor: expect.stringContaining('rgb')
      });

      // Toggle to dark theme
      const themeToggle = screen.getByLabelText(/toggle theme/i);
      await userEvent.click(themeToggle);

      // Verify dark theme styles
      await waitFor(() => {
        expect(header).toHaveStyle({
          backgroundColor: expect.stringContaining('rgb')
        });
      });
    });
  });

  describe('User Controls', () => {
    it('handles user menu interactions', async () => {
      const { container } = renderWithProviders(<Header />);
      
      // Open user menu
      const userMenuButton = screen.getByLabelText(/open user menu/i);
      await userEvent.click(userMenuButton);

      // Verify menu items
      const menu = screen.getByRole('menu');
      expect(menu).toBeInTheDocument();
      expect(within(menu).getByText(/profile/i)).toBeInTheDocument();
      expect(within(menu).getByText(/logout/i)).toBeInTheDocument();
    });

    it('displays loading state during actions', async () => {
      const { container } = renderWithProviders(<Header />);
      
      // Trigger loading state
      const logoutButton = screen.getByText(/logout/i);
      await userEvent.click(logoutButton);

      // Verify loading indicator
      const loading = screen.getByTestId(TEST_IDS.LOADING);
      expect(loading).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('meets WCAG 2.1 Level AA standards', async () => {
      const { container } = renderWithProviders(<Header />);
      
      // Run accessibility tests
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('supports keyboard navigation', async () => {
      const { container } = renderWithProviders(<Header />);
      
      // Test keyboard navigation
      const themeToggle = screen.getByLabelText(/toggle theme/i);
      themeToggle.focus();
      expect(document.activeElement).toBe(themeToggle);

      // Navigate to user menu
      fireEvent.keyDown(themeToggle, { key: 'Tab' });
      const userMenu = screen.getByLabelText(/open user menu/i);
      expect(document.activeElement).toBe(userMenu);
    });
  });

  describe('Error Handling', () => {
    it('displays error states appropriately', async () => {
      const { container } = renderWithProviders(<Header />);
      
      // Simulate error state
      const logoutButton = screen.getByText(/logout/i);
      await userEvent.click(logoutButton);

      // Verify error message
      const error = screen.queryByTestId(TEST_IDS.ERROR);
      expect(error).toBeInTheDocument();
    });

    it('recovers from error states', async () => {
      const { container } = renderWithProviders(<Header />);
      
      // Trigger and recover from error
      const logoutButton = screen.getByText(/logout/i);
      await userEvent.click(logoutButton);
      
      // Verify error cleared after retry
      await userEvent.click(logoutButton);
      const error = screen.queryByTestId(TEST_IDS.ERROR);
      expect(error).not.toBeInTheDocument();
    });
  });
});