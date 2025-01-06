import React, { memo, useEffect, useCallback, useState } from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Tooltip,
  Fade,
  CircularProgress
} from '@mui/material';
import {
  Brightness4,
  Brightness7,
  AccountCircle,
  ExitToApp
} from '@mui/icons-material';

import {
  HeaderContainer,
  HeaderContent,
  HeaderLogo,
  HeaderNav,
  HeaderControls
} from './Header.styles';
import { useTheme } from '../../../hooks/useTheme';
import { useAuth } from '../../../hooks/useAuth';

// Constants for menu items and timings
const MENU_ITEMS = [
  {
    label: 'Profile',
    icon: AccountCircle,
    action: 'profile',
    ariaLabel: 'View profile'
  },
  {
    label: 'Logout',
    icon: ExitToApp,
    action: 'logout',
    ariaLabel: 'Logout from application'
  }
] as const;

const SESSION_VALIDATION_INTERVAL = 60000; // 1 minute
const THEME_TRANSITION_DURATION = 200;

// Interface for component props
interface HeaderProps {
  elevated?: boolean;
}

/**
 * Enhanced header component with accessibility, theme switching, and session management
 */
const Header = memo<HeaderProps>(({ elevated = false }) => {
  // Hooks
  const { theme, toggleTheme } = useTheme();
  const { user, logout, validateSession } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Session validation effect
  useEffect(() => {
    const validateUserSession = async () => {
      try {
        await validateSession();
      } catch (error) {
        console.error('Session validation failed:', error);
      }
    };

    const interval = setInterval(validateUserSession, SESSION_VALIDATION_INTERVAL);
    return () => clearInterval(interval);
  }, [validateSession]);

  // Menu handlers
  const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  // Theme toggle handler with animation
  const handleThemeToggle = useCallback(() => {
    requestAnimationFrame(() => {
      document.documentElement.style.transition = `background-color ${THEME_TRANSITION_DURATION}ms ease-in-out`;
      toggleTheme();
      setTimeout(() => {
        document.documentElement.style.transition = '';
      }, THEME_TRANSITION_DURATION);
    });
  }, [toggleTheme]);

  // Logout handler with loading state
  const handleLogout = useCallback(async () => {
    try {
      setIsLoading(true);
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoading(false);
      handleMenuClose();
    }
  }, [logout, handleMenuClose]);

  // Menu action handler
  const handleMenuAction = useCallback((action: string) => {
    switch (action) {
      case 'logout':
        handleLogout();
        break;
      case 'profile':
        // Handle profile action
        handleMenuClose();
        break;
      default:
        handleMenuClose();
    }
  }, [handleLogout, handleMenuClose]);

  return (
    <HeaderContainer 
      position="fixed"
      elevation={elevated ? 4 : 0}
      role="banner"
      aria-label="Main header"
    >
      <HeaderContent>
        <HeaderLogo>
          <img 
            src="/logo.svg" 
            alt="Attribution Analytics Logo"
            width={120}
            height={32}
          />
        </HeaderLogo>

        <HeaderNav role="navigation" aria-label="Main navigation">
          {/* Navigation items can be added here */}
        </HeaderNav>

        <HeaderControls>
          <Tooltip 
            title={`Switch to ${theme.palette.mode === 'dark' ? 'light' : 'dark'} theme`}
            arrow
          >
            <IconButton
              onClick={handleThemeToggle}
              color="inherit"
              aria-label="Toggle theme"
              edge="end"
            >
              <Fade in timeout={THEME_TRANSITION_DURATION}>
                {theme.palette.mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
              </Fade>
            </IconButton>
          </Tooltip>

          {user && (
            <>
              <Tooltip title="Account settings" arrow>
                <IconButton
                  onClick={handleMenuOpen}
                  color="inherit"
                  aria-label="Open user menu"
                  aria-controls="user-menu"
                  aria-haspopup="true"
                  aria-expanded={Boolean(anchorEl)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    <Avatar
                      alt={user.email}
                      src={user.avatar}
                      sx={{ width: 32, height: 32 }}
                    />
                  )}
                </IconButton>
              </Tooltip>

              <Menu
                id="user-menu"
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                TransitionComponent={Fade}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                PaperProps={{
                  elevation: 3,
                  sx: { minWidth: 200 }
                }}
              >
                {MENU_ITEMS.map(({ label, icon: Icon, action, ariaLabel }) => (
                  <MenuItem
                    key={action}
                    onClick={() => handleMenuAction(action)}
                    disabled={isLoading && action === 'logout'}
                    aria-label={ariaLabel}
                  >
                    <Icon sx={{ mr: 2 }} />
                    {label}
                    {isLoading && action === 'logout' && (
                      <CircularProgress size={16} sx={{ ml: 1 }} />
                    )}
                  </MenuItem>
                ))}
              </Menu>
            </>
          )}
        </HeaderControls>
      </HeaderContent>
    </HeaderContainer>
  );
});

Header.displayName = 'Header';

export default Header;