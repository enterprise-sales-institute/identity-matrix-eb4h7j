import { styled } from '@mui/material/styles'; // v5.0+
import { Box, Paper } from '@mui/material'; // v5.0+
import { SPACING } from '../../styles/variables.styles';

// Main container for the settings page with responsive padding
export const SettingsContainer = styled(Box)(({ theme }) => ({
  padding: SPACING.multiplier(2),
  maxWidth: '1200px',
  margin: '0 auto',
  width: '100%',

  [theme.breakpoints.up('sm')]: {
    padding: SPACING.multiplier(3),
  },

  [theme.breakpoints.up('md')]: {
    padding: SPACING.multiplier(4),
  },
}));

// Section container with Material Design elevation and spacing
export const SettingsSection = styled(Paper)(({ theme }) => ({
  padding: SPACING.multiplier(3),
  marginBottom: SPACING.multiplier(3),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[1],
  transition: theme.transitions.create(['box-shadow']),

  '&:hover': {
    boxShadow: theme.shadows[2],
  },

  [theme.breakpoints.down('sm')]: {
    padding: SPACING.multiplier(2),
  },
}));

// Header component for settings sections
export const SettingsHeader = styled(Box)(({ theme }) => ({
  marginBottom: SPACING.multiplier(3),
  borderBottom: `1px solid ${theme.palette.divider}`,
  paddingBottom: SPACING.multiplier(2),

  '& h2': {
    ...theme.typography.h2,
    color: theme.palette.text.primary,
    margin: 0,
  },

  '& p': {
    ...theme.typography.body2,
    color: theme.palette.text.secondary,
    marginTop: SPACING.multiplier(1),
    marginBottom: 0,
  },
}));

// Form container with consistent spacing
export const SettingsForm = styled('form')({
  display: 'flex',
  flexDirection: 'column',
  gap: SPACING.multiplier(3),
});

// Row component for individual settings with responsive layout
export const SettingsRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'flex-start',
  gap: SPACING.multiplier(2),

  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
    gap: SPACING.multiplier(1),
  },

  '& > *:first-of-type': {
    flex: '0 0 200px',
  },

  '& > *:last-child': {
    flex: 1,
  },
}));

// Label component for settings fields
export const SettingsLabel = styled(Box)(({ theme }) => ({
  ...theme.typography.body1,
  color: theme.palette.text.primary,
  fontWeight: 500,

  '& .description': {
    ...theme.typography.body2,
    color: theme.palette.text.secondary,
    marginTop: SPACING.multiplier(0.5),
  },
}));

// Container for settings action buttons
export const SettingsActions = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: SPACING.multiplier(2),
  marginTop: SPACING.multiplier(4),
  paddingTop: SPACING.multiplier(3),
  borderTop: `1px solid ${theme.palette.divider}`,

  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
    gap: SPACING.multiplier(1),

    '& > button': {
      width: '100%',
    },
  },
}));