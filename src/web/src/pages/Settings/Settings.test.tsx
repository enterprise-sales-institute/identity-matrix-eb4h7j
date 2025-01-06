import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Internal imports
import { Settings } from './Settings';
import { renderWithProviders } from '../../tests/utils/test-utils';
import { useTheme } from '../../hooks/useTheme';
import { useToast } from '../../hooks/useToast';
import { ThemeMode } from '../../types/theme.types';

// Mock hooks
jest.mock('../../hooks/useTheme');
jest.mock('../../hooks/useToast');

// Test constants
const TEST_INITIAL_STATE = {
  theme: {
    mode: ThemeMode.LIGHT,
    colors: 'defaultPalette',
    systemPreference: ThemeMode.LIGHT
  },
  settings: {
    attributionModel: 'firstTouch',
    notificationDuration: 5000,
    emailNotifications: true,
    accessibilityMode: false
  }
};

const ACCESSIBILITY_SELECTORS = {
  themeToggle: 'theme-mode-toggle',
  attributionSelect: 'attribution-model-select',
  notificationToggle: 'notification-toggle',
  submitButton: 'settings-submit-button'
};

describe('Settings Page', () => {
  // Mock implementations
  const mockToggleTheme = jest.fn();
  const mockSetMode = jest.fn();
  const mockShowToast = jest.fn();

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock theme hook
    (useTheme as jest.Mock).mockReturnValue({
      theme: { palette: { mode: ThemeMode.LIGHT } },
      themeMode: ThemeMode.LIGHT,
      toggleTheme: mockToggleTheme,
      setMode: mockSetMode
    });

    // Mock toast hook
    (useToast as jest.Mock).mockReturnValue({
      showToast: mockShowToast
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders settings page with all required elements', async () => {
    renderWithProviders(<Settings />, {
      preloadedState: TEST_INITIAL_STATE
    });

    // Verify main container
    const mainContainer = screen.getByRole('main', { name: /settings page/i });
    expect(mainContainer).toBeInTheDocument();

    // Verify sections
    expect(screen.getByText(/theme mode/i)).toBeInTheDocument();
    expect(screen.getByText(/default attribution model/i)).toBeInTheDocument();
    expect(screen.getByText(/notification duration/i)).toBeInTheDocument();

    // Verify form controls
    expect(screen.getByRole('radiogroup', { name: /theme mode selection/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /attribution model/i })).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: /notification duration/i })).toBeInTheDocument();
  });

  it('handles theme mode changes correctly', async () => {
    renderWithProviders(<Settings />, {
      preloadedState: TEST_INITIAL_STATE
    });

    // Get theme toggle buttons
    const lightButton = screen.getByRole('button', { name: /light mode/i });
    const darkButton = screen.getByRole('button', { name: /dark mode/i });

    // Verify initial state
    expect(lightButton).toHaveAttribute('aria-pressed', 'true');
    expect(darkButton).toHaveAttribute('aria-pressed', 'false');

    // Toggle theme
    await userEvent.click(darkButton);
    expect(mockSetMode).toHaveBeenCalledWith(ThemeMode.DARK);

    // Verify keyboard shortcuts
    await userEvent.keyboard('{Meta>}Shift{/Meta}t');
    expect(mockToggleTheme).toHaveBeenCalled();
  });

  it('validates form inputs correctly', async () => {
    renderWithProviders(<Settings />, {
      preloadedState: TEST_INITIAL_STATE
    });

    // Get form inputs
    const durationInput = screen.getByRole('spinbutton', { name: /notification duration/i });

    // Test invalid duration
    await userEvent.clear(durationInput);
    await userEvent.type(durationInput, '2000');
    await userEvent.tab();

    // Verify error message
    expect(screen.getByText(/duration must be between 3 and 10 seconds/i)).toBeInTheDocument();

    // Test valid duration
    await userEvent.clear(durationInput);
    await userEvent.type(durationInput, '5000');
    await userEvent.tab();

    // Verify error message is removed
    expect(screen.queryByText(/duration must be between 3 and 10 seconds/i)).not.toBeInTheDocument();
  });

  it('validates accessibility requirements', async () => {
    renderWithProviders(<Settings />, {
      preloadedState: TEST_INITIAL_STATE
    });

    // Test ARIA labels
    expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'Settings Page');
    expect(screen.getByRole('form')).toHaveAttribute('aria-label', 'Settings Form');

    // Test keyboard navigation
    const form = screen.getByRole('form');
    const focusableElements = within(form).getAllByRole('button');
    
    await userEvent.tab();
    expect(focusableElements[0]).toHaveFocus();

    await userEvent.tab();
    expect(focusableElements[1]).toHaveFocus();

    // Test screen reader text
    const attributionSelect = screen.getByRole('combobox', { name: /attribution model/i });
    expect(attributionSelect).toHaveAttribute('aria-describedby');
  });

  it('handles form submission correctly', async () => {
    renderWithProviders(<Settings />, {
      preloadedState: TEST_INITIAL_STATE
    });

    // Get form elements
    const form = screen.getByRole('form');
    const submitButton = screen.getByRole('button', { name: /save settings/i });

    // Make form changes
    const attributionSelect = screen.getByRole('combobox');
    await userEvent.selectOptions(attributionSelect, 'multiTouch');

    // Submit form
    await userEvent.click(submitButton);

    // Verify loading state
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    // Wait for submission to complete
    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith({
        type: 'SUCCESS',
        message: 'Settings saved successfully'
      });
    });
  });

  it('handles unsaved changes warning', async () => {
    renderWithProviders(<Settings />, {
      preloadedState: TEST_INITIAL_STATE
    });

    // Make form changes
    const attributionSelect = screen.getByRole('combobox');
    await userEvent.selectOptions(attributionSelect, 'multiTouch');

    // Try to navigate away
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await userEvent.click(cancelButton);

    // Verify confirmation dialog
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/discard changes/i)).toBeInTheDocument();

    // Confirm discard
    const confirmButton = screen.getByRole('button', { name: /discard changes/i });
    await userEvent.click(confirmButton);

    // Verify form reset
    expect(attributionSelect).toHaveValue('multiTouch');
  });
});