import React, { useEffect, useState, useCallback, useMemo, useRef, memo } from 'react';
import { useMediaQuery, List, ListItem, ListItemIcon, ListItemText, IconButton, Typography, Divider, Fade, Grow } from '@mui/material'; // v5.0+
import { AnalyticsOutlined, AttributionOutlined, SettingsOutlined, DarkModeOutlined, LightModeOutlined, ChevronLeft } from '@mui/icons-material'; // v5.0+
import { useLocation, useNavigate } from 'react-router-dom'; // v6.0+
import { ErrorBoundary } from 'react-error-boundary'; // v4.0+

import {
  SidebarContainer,
  SidebarDrawer,
  SidebarContent,
  SidebarHeader,
  SidebarNavigation,
  SidebarFooter
} from './Sidebar.styles';
import { ROUTES } from '../../../constants/routes.constants';
import { useTheme } from '../../../hooks/useTheme';

// Interface for component props
interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  disableTransitions?: boolean;
  defaultActiveItem?: string;
}

// Navigation items with enhanced accessibility
const navigationItems = [
  {
    path: ROUTES.ANALYTICS,
    label: 'Analytics',
    icon: AnalyticsOutlined,
    ariaLabel: 'Navigate to Analytics Dashboard',
    shortcut: 'Alt+1'
  },
  {
    path: ROUTES.ATTRIBUTION,
    label: 'Attribution',
    icon: AttributionOutlined,
    ariaLabel: 'Navigate to Attribution Models',
    shortcut: 'Alt+2'
  },
  {
    path: ROUTES.SETTINGS,
    label: 'Settings',
    icon: SettingsOutlined,
    ariaLabel: 'Navigate to Settings',
    shortcut: 'Alt+3'
  }
] as const;

// Enhanced Sidebar component with accessibility and performance optimizations
const Sidebar: React.FC<SidebarProps> = memo(({
  isOpen,
  onClose,
  disableTransitions = false,
  defaultActiveItem
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  
  // Responsive behavior detection
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Refs for focus management
  const sidebarRef = useRef<HTMLDivElement>(null);
  const lastFocusedItem = useRef<string | null>(null);
  
  // Active item state management
  const [activeItem, setActiveItem] = useState<string>(
    defaultActiveItem || location.pathname
  );

  // Update active item when route changes
  useEffect(() => {
    setActiveItem(location.pathname);
  }, [location.pathname]);

  // Enhanced keyboard navigation handler
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    const { key, altKey } = event;
    
    if (altKey) {
      const itemIndex = parseInt(key) - 1;
      if (itemIndex >= 0 && itemIndex < navigationItems.length) {
        event.preventDefault();
        const item = navigationItems[itemIndex];
        handleNavigation(item.path);
      }
    }
  }, []);

  // Optimized navigation handler
  const handleNavigation = useCallback((path: string) => {
    lastFocusedItem.current = path;
    setActiveItem(path);
    navigate(path);
    
    if (isMobile) {
      onClose();
    }
  }, [navigate, isMobile, onClose]);

  // Memoized sidebar content
  const sidebarContent = useMemo(() => (
    <SidebarContent>
      <SidebarHeader>
        <Typography variant="h6" component="h1">
          Attribution Analytics
        </Typography>
        {isMobile && (
          <IconButton
            onClick={onClose}
            aria-label="Close sidebar"
            className="close-button"
            edge="end"
          >
            <ChevronLeft />
          </IconButton>
        )}
      </SidebarHeader>

      <Divider />

      <SidebarNavigation>
        <List component="nav" aria-label="Main Navigation">
          {navigationItems.map(({ path, label, icon: Icon, ariaLabel, shortcut }) => (
            <Grow
              key={path}
              in={!disableTransitions}
              timeout={300}
              style={{ transformOrigin: '0 0 0' }}
            >
              <ListItem
                button
                onClick={() => handleNavigation(path)}
                selected={activeItem === path}
                className={`nav-item ${activeItem === path ? 'active' : ''}`}
                aria-label={ariaLabel}
                aria-current={activeItem === path ? 'page' : undefined}
                title={`${label} (${shortcut})`}
              >
                <ListItemIcon>
                  <Icon />
                </ListItemIcon>
                <ListItemText primary={label} />
              </ListItem>
            </Grow>
          ))}
        </List>
      </SidebarNavigation>

      <Divider />

      <SidebarFooter>
        <IconButton
          onClick={toggleTheme}
          aria-label="Toggle theme"
          title="Toggle light/dark theme"
        >
          <Fade in timeout={200}>
            {theme.palette.mode === 'dark' ? <LightModeOutlined /> : <DarkModeOutlined />}
          </Fade>
        </IconButton>
      </SidebarFooter>
    </SidebarContent>
  ), [activeItem, disableTransitions, handleNavigation, isMobile, onClose, theme.palette.mode, toggleTheme]);

  // Focus management effect
  useEffect(() => {
    if (isOpen && lastFocusedItem.current && sidebarRef.current) {
      const element = sidebarRef.current.querySelector(
        `[aria-label*="${lastFocusedItem.current}"]`
      );
      if (element instanceof HTMLElement) {
        element.focus();
      }
    }
  }, [isOpen]);

  // Error boundary fallback
  const ErrorFallback = ({ error }: { error: Error }) => (
    <div role="alert">
      <Typography color="error">Error loading sidebar: {error.message}</Typography>
    </div>
  );

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      {isMobile ? (
        <SidebarDrawer
          open={isOpen}
          onClose={onClose}
          variant="temporary"
          anchor="left"
          ref={sidebarRef}
          onKeyDown={handleKeyDown}
          SlideProps={{ timeout: disableTransitions ? 0 : 300 }}
          ModalProps={{ keepMounted: true }}
        >
          {sidebarContent}
        </SidebarDrawer>
      ) : (
        <SidebarContainer
          ref={sidebarRef}
          isOpen={isOpen}
          onKeyDown={handleKeyDown}
          role="navigation"
          aria-label="Main Sidebar"
        >
          {sidebarContent}
        </SidebarContainer>
      )}
    </ErrorBoundary>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;