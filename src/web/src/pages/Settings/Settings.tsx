import React, { useState, useCallback, useEffect } from 'react'; // v18.2+
import { Button, CircularProgress, Dialog } from '@mui/material'; // v5.0+
import { useMediaQuery } from '@mui/material'; // v5.0+
import { useFormik } from 'formik'; // v2.0+

import {
  SettingsContainer,
  SettingsSection,
  SettingsHeader,
  SettingsForm,
  SettingsRow,
  SettingsLabel,
  SettingsActions
} from './Settings.styles';
import { useTheme } from '../../hooks/useTheme';
import { ThemeMode } from '../../types/theme.types';

// Form data interface with validation rules
interface SettingsFormData {
  themeMode: ThemeMode;
  defaultAttributionModel: string;
  notificationDuration: number;
  emailNotifications: boolean;
}

// Form validation constants
const FORM_VALIDATION_RULES = {
  defaultAttributionModel: {
    required: true,
    message: 'Please select an attribution model'
  },
  notificationDuration: {
    required: true,
    min: 3000,
    max: 10000,
    message: 'Duration must be between 3 and 10 seconds'
  }
};

// Keyboard shortcuts for accessibility
const KEYBOARD_SHORTCUTS = {
  SAVE_SETTINGS: 'mod+s',
  CANCEL_CHANGES: 'escape',
  TOGGLE_THEME: 'mod+shift+t'
};

const Settings: React.FC = React.memo(() => {
  const { theme, themeMode, setMode, toggleTheme } = useTheme();
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Initialize form with current settings
  const formik = useFormik<SettingsFormData>({
    initialValues: {
      themeMode,
      defaultAttributionModel: 'multiTouch',
      notificationDuration: 5000,
      emailNotifications: true
    },
    validate: (values) => {
      const errors: Partial<Record<keyof SettingsFormData, string>> = {};

      if (!values.defaultAttributionModel) {
        errors.defaultAttributionModel = FORM_VALIDATION_RULES.defaultAttributionModel.message;
      }

      if (values.notificationDuration < FORM_VALIDATION_RULES.notificationDuration.min || 
          values.notificationDuration > FORM_VALIDATION_RULES.notificationDuration.max) {
        errors.notificationDuration = FORM_VALIDATION_RULES.notificationDuration.message;
      }

      return errors;
    },
    onSubmit: async (values) => {
      try {
        setIsSaving(true);
        // Update theme mode if changed
        if (values.themeMode !== themeMode) {
          setMode(values.themeMode);
        }
        // Simulate API call for saving other settings
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsSaving(false);
      } catch (error) {
        console.error('Failed to save settings:', error);
        setIsSaving(false);
      }
    }
  });

  // Handle system theme preference changes
  useEffect(() => {
    if (!formik.values.themeMode) {
      setMode(prefersDarkMode ? ThemeMode.DARK : ThemeMode.LIGHT);
    }
  }, [prefersDarkMode, setMode]);

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyboard = (event: KeyboardEvent) => {
      // Save shortcut
      if ((event.metaKey || event.ctrlKey) && event.key === 's') {
        event.preventDefault();
        if (formik.isValid && formik.dirty) {
          formik.submitForm();
        }
      }
      // Cancel shortcut
      if (event.key === 'Escape' && formik.dirty) {
        event.preventDefault();
        setShowConfirmDialog(true);
      }
      // Theme toggle shortcut
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key === 't') {
        event.preventDefault();
        toggleTheme();
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [formik, toggleTheme]);

  // Handle form cancellation
  const handleCancel = useCallback(() => {
    if (formik.dirty) {
      setShowConfirmDialog(true);
    } else {
      formik.resetForm();
    }
  }, [formik]);

  return (
    <SettingsContainer role="main" aria-label="Settings Page">
      <SettingsSection>
        <SettingsHeader>
          <h2>Settings</h2>
          <p>Configure your preferences and application settings</p>
        </SettingsHeader>

        <SettingsForm
          onSubmit={formik.handleSubmit}
          aria-label="Settings Form"
          noValidate
        >
          {/* Theme Settings */}
          <SettingsRow>
            <SettingsLabel>
              <span>Theme Mode</span>
              <div className="description">Choose your preferred color scheme</div>
            </SettingsLabel>
            <div role="radiogroup" aria-label="Theme Mode Selection">
              <Button
                variant={formik.values.themeMode === ThemeMode.LIGHT ? 'contained' : 'outlined'}
                onClick={() => formik.setFieldValue('themeMode', ThemeMode.LIGHT)}
                aria-pressed={formik.values.themeMode === ThemeMode.LIGHT}
              >
                Light Mode
              </Button>
              <Button
                variant={formik.values.themeMode === ThemeMode.DARK ? 'contained' : 'outlined'}
                onClick={() => formik.setFieldValue('themeMode', ThemeMode.DARK)}
                aria-pressed={formik.values.themeMode === ThemeMode.DARK}
              >
                Dark Mode
              </Button>
            </div>
          </SettingsRow>

          {/* Attribution Model Settings */}
          <SettingsRow>
            <SettingsLabel>
              <span>Default Attribution Model</span>
              <div className="description">Select the default model for attribution analysis</div>
            </SettingsLabel>
            <select
              name="defaultAttributionModel"
              value={formik.values.defaultAttributionModel}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              aria-invalid={Boolean(formik.errors.defaultAttributionModel)}
              aria-describedby={formik.errors.defaultAttributionModel ? "attribution-error" : undefined}
            >
              <option value="firstTouch">First Touch</option>
              <option value="lastTouch">Last Touch</option>
              <option value="multiTouch">Multi-Touch</option>
              <option value="timeDecay">Time Decay</option>
            </select>
            {formik.errors.defaultAttributionModel && (
              <div id="attribution-error" role="alert" className="error">
                {formik.errors.defaultAttributionModel}
              </div>
            )}
          </SettingsRow>

          {/* Notification Settings */}
          <SettingsRow>
            <SettingsLabel>
              <span>Notification Duration (ms)</span>
              <div className="description">Set how long notifications remain visible</div>
            </SettingsLabel>
            <input
              type="number"
              name="notificationDuration"
              value={formik.values.notificationDuration}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              min={FORM_VALIDATION_RULES.notificationDuration.min}
              max={FORM_VALIDATION_RULES.notificationDuration.max}
              aria-invalid={Boolean(formik.errors.notificationDuration)}
              aria-describedby={formik.errors.notificationDuration ? "duration-error" : undefined}
            />
            {formik.errors.notificationDuration && (
              <div id="duration-error" role="alert" className="error">
                {formik.errors.notificationDuration}
              </div>
            )}
          </SettingsRow>

          <SettingsActions>
            <Button
              variant="outlined"
              onClick={handleCancel}
              disabled={isSaving}
              aria-label="Cancel changes"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={!formik.dirty || !formik.isValid || isSaving}
              aria-label="Save settings"
              endIcon={isSaving ? <CircularProgress size={20} /> : null}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </SettingsActions>
        </SettingsForm>
      </SettingsSection>

      {/* Confirmation Dialog */}
      <Dialog
        open={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
      >
        <div id="confirm-dialog-title">Discard Changes?</div>
        <div id="confirm-dialog-description">
          Are you sure you want to discard your unsaved changes?
        </div>
        <div>
          <Button
            onClick={() => setShowConfirmDialog(false)}
            aria-label="Keep editing"
          >
            No, Keep Editing
          </Button>
          <Button
            onClick={() => {
              formik.resetForm();
              setShowConfirmDialog(false);
            }}
            color="error"
            aria-label="Discard changes"
          >
            Yes, Discard Changes
          </Button>
        </div>
      </Dialog>
    </SettingsContainer>
  );
});

Settings.displayName = 'Settings';

export default Settings;