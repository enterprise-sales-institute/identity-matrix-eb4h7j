/**
 * @fileoverview Secure login page component with Auth0 integration and comprehensive validation
 * @version 1.0.0
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material';
import styled from '@emotion/styled';

// Internal imports
import { useAuth } from '../../hooks/useAuth';
import { Input } from '../../components/common/Input/Input';
import type { LoginCredentials } from '../../types/auth.types';
import { SPACING, TYPOGRAPHY, SHADOWS, TRANSITIONS } from '../../styles/variables.styles';

// Styled components
const LoginContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: ${SPACING.unit * 2}px;
  background-color: ${({ theme }) => theme.colors.background.default};
`;

const LoginForm = styled.form`
  width: 100%;
  max-width: 400px;
  padding: ${SPACING.unit * 3}px;
  background-color: ${({ theme }) => theme.colors.background.paper};
  border-radius: 8px;
  box-shadow: ${SHADOWS.medium};
`;

const LoginHeader = styled.h1`
  font-family: ${TYPOGRAPHY.fontFamily};
  font-size: ${TYPOGRAPHY.h1.fontSize}px;
  font-weight: ${TYPOGRAPHY.h1.fontWeight};
  line-height: ${TYPOGRAPHY.h1.lineHeight};
  text-align: center;
  margin-bottom: ${SPACING.unit * 3}px;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const SubmitButton = styled.button`
  width: 100%;
  height: 48px;
  margin-top: ${SPACING.unit * 3}px;
  background-color: ${({ theme }) => theme.colors.primary.main};
  color: ${({ theme }) => theme.colors.primary.contrastText};
  border: none;
  border-radius: 4px;
  font-family: ${TYPOGRAPHY.button.fontFamily};
  font-size: ${TYPOGRAPHY.button.fontSize}px;
  font-weight: ${TYPOGRAPHY.button.fontWeight};
  cursor: pointer;
  transition: ${TRANSITIONS.create('background-color', TRANSITIONS.duration.short, TRANSITIONS.easing.standard)};

  &:hover:not(:disabled) {
    background-color: ${({ theme }) => theme.colors.primary.hover};
  }

  &:disabled {
    background-color: ${({ theme }) => theme.colors.text.disabled};
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  color: ${({ theme }) => theme.colors.error.main};
  font-size: ${TYPOGRAPHY.caption.fontSize}px;
  text-align: center;
  margin-top: ${SPACING.unit * 2}px;
  min-height: 20px;
`;

// Form validation interface
interface FormErrors {
  email: string | null;
  password: string | null;
}

/**
 * Login page component with secure authentication and validation
 */
const Login: React.FC = React.memo(() => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { login, isLoading, error, resetError } = useAuth();

  // Form state
  const [formData, setFormData] = useState<LoginCredentials>({
    email: '',
    password: ''
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({
    email: null,
    password: null
  });

  // Clear error on unmount
  useEffect(() => {
    return () => {
      resetError();
    };
  }, [resetError]);

  // Form validation rules
  const validateForm = useMemo(() => {
    return {
      email: (value: string) => {
        if (!value) return 'Email is required';
        if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value)) {
          return 'Invalid email address';
        }
        return null;
      },
      password: (value: string) => {
        if (!value) return 'Password is required';
        if (value.length < 8) return 'Password must be at least 8 characters';
        return null;
      }
    };
  }, []);

  // Handle input changes with validation
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setFormErrors(prev => ({
      ...prev,
      [name]: validateForm[name as keyof typeof validateForm](value)
    }));
  }, [validateForm]);

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const errors: FormErrors = {
      email: validateForm.email(formData.email),
      password: validateForm.password(formData.password)
    };

    setFormErrors(errors);

    // Check for validation errors
    if (Object.values(errors).some(error => error !== null)) {
      return;
    }

    try {
      const response = await login(formData);
      if (response.success) {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Login failed:', error);
    }
  }, [formData, validateForm, login, navigate]);

  return (
    <LoginContainer>
      <LoginForm onSubmit={handleSubmit} noValidate>
        <LoginHeader>Sign In</LoginHeader>
        
        <Input
          id="email"
          name="email"
          type="email"
          label="Email"
          value={formData.email}
          onChange={handleInputChange}
          error={formErrors.email}
          disabled={isLoading}
          aria-required="true"
          autoComplete="email"
          data-testid="email-input"
        />

        <Input
          id="password"
          name="password"
          type="password"
          label="Password"
          value={formData.password}
          onChange={handleInputChange}
          error={formErrors.password}
          disabled={isLoading}
          aria-required="true"
          autoComplete="current-password"
          data-testid="password-input"
        />

        <SubmitButton
          type="submit"
          disabled={isLoading || Object.values(formErrors).some(error => error !== null)}
          aria-busy={isLoading}
          data-testid="submit-button"
        >
          {isLoading ? 'Signing in...' : 'Sign In'}
        </SubmitButton>

        {error && (
          <ErrorMessage role="alert" aria-live="polite">
            {error}
          </ErrorMessage>
        )}
      </LoginForm>
    </LoginContainer>
  );
});

Login.displayName = 'Login';

export default Login;