/**
 * @fileoverview Comprehensive test suite for Login component covering authentication,
 * validation, accessibility and UI interactions
 * @version 1.0.0
 */

// External imports
import React from 'react';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from '@axe-core/react';

// Internal imports
import Login from './Login';
import { renderWithProviders } from '../../../tests/utils/test-utils';
import { useAuth } from '../../../hooks/useAuth';

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

// Mock auth hook
const mockLogin = jest.fn();
jest.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    login: mockLogin,
    isLoading: false,
    error: null,
    resetError: jest.fn()
  })
}));

describe('Login Component', () => {
  // Setup before each test
  beforeEach(() => {
    jest.clearAllMocks();
    mockLogin.mockReset();
  });

  describe('Rendering', () => {
    it('should render login form with all required elements', () => {
      renderWithProviders(<Login />);

      expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should apply Material Design styling', () => {
      renderWithProviders(<Login />);
      const form = screen.getByRole('form');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      expect(form).toHaveStyle({
        backgroundColor: expect.stringMatching(/^#/),
        borderRadius: '8px',
        padding: expect.stringMatching(/px$/)
      });

      expect(submitButton).toHaveStyle({
        backgroundColor: expect.stringMatching(/^#/),
        borderRadius: '4px'
      });
    });
  });

  describe('Form Validation', () => {
    it('should show validation errors for empty fields', async () => {
      renderWithProviders(<Login />);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });
    });

    it('should validate email format', async () => {
      renderWithProviders(<Login />);
      const emailInput = screen.getByLabelText(/email/i);

      await userEvent.type(emailInput, 'invalid-email');
      fireEvent.blur(emailInput);

      await waitFor(() => {
        expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
      });
    });

    it('should validate password length', async () => {
      renderWithProviders(<Login />);
      const passwordInput = screen.getByLabelText(/password/i);

      await userEvent.type(passwordInput, 'short');
      fireEvent.blur(passwordInput);

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
      });
    });
  });

  describe('Authentication Flow', () => {
    it('should handle successful login', async () => {
      mockLogin.mockResolvedValueOnce({ success: true });
      renderWithProviders(<Login />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'password123');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123'
        });
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should handle failed login', async () => {
      const errorMessage = 'Invalid credentials';
      mockLogin.mockRejectedValueOnce(new Error(errorMessage));
      renderWithProviders(<Login />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'wrongpassword');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(errorMessage);
      });
    });

    it('should disable form during submission', async () => {
      mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      renderWithProviders(<Login />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'password123');
      fireEvent.click(submitButton);

      expect(submitButton).toBeDisabled();
      expect(emailInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();
      expect(submitButton).toHaveTextContent(/signing in/i);
    });
  });

  describe('Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = renderWithProviders(<Login />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should support keyboard navigation', async () => {
      renderWithProviders(<Login />);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await userEvent.tab();
      expect(emailInput).toHaveFocus();

      await userEvent.tab();
      expect(passwordInput).toHaveFocus();

      await userEvent.tab();
      expect(submitButton).toHaveFocus();
    });

    it('should have proper ARIA attributes', () => {
      renderWithProviders(<Login />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      expect(emailInput).toHaveAttribute('aria-required', 'true');
      expect(passwordInput).toHaveAttribute('aria-required', 'true');

      // Verify error messages are properly associated
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      const emailError = screen.getByText(/email is required/i);
      const passwordError = screen.getByText(/password is required/i);

      expect(emailInput).toHaveAttribute('aria-invalid', 'true');
      expect(emailInput).toHaveAttribute('aria-describedby', emailError.id);
      expect(passwordInput).toHaveAttribute('aria-invalid', 'true');
      expect(passwordInput).toHaveAttribute('aria-describedby', passwordError.id);
    });
  });

  describe('Error Handling', () => {
    it('should clear error state on unmount', () => {
      const resetError = jest.fn();
      jest.spyOn(useAuth(), 'resetError').mockImplementation(resetError);

      const { unmount } = renderWithProviders(<Login />);
      unmount();

      expect(resetError).toHaveBeenCalled();
    });

    it('should display error messages with proper styling', async () => {
      mockLogin.mockRejectedValueOnce(new Error('Network error'));
      renderWithProviders(<Login />);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(submitButton);

      const errorMessage = await screen.findByRole('alert');
      expect(errorMessage).toHaveStyle({
        color: expect.stringMatching(/^#/),
        fontSize: expect.stringMatching(/px$/),
        marginTop: expect.stringMatching(/px$/)
      });
    });
  });
});