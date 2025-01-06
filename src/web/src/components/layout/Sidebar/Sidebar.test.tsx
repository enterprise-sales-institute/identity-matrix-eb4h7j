import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'; // v14.0.0
import userEvent from '@testing-library/user-event'; // v14.0.0
import { vi } from 'vitest'; // v0.34.0
import { MemoryRouter } from 'react-router-dom'; // v6.0+
import { axe, toHaveNoViolations } from 'jest-axe'; // v4.7.0
import { useMediaQuery, useTheme } from '@mui/material'; // v5.0+

import Sidebar from './Sidebar';
import { ROUTES } from '../../../constants/routes.constants';
import { ThemeMode } from '../../../types/theme.types';

// Mock Material-UI hooks
vi.mock('@mui/material', () => ({
  ...vi.importActual('@mui/material'),
  useMediaQuery: vi.fn(),
  useTheme: vi.fn()
}));

// Mock react-router-dom hooks
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: ROUTES.ANALYTICS })
  };
});

// Mock theme hook
vi.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({
    theme: {
      palette: { mode: 'light' },
      breakpoints: { down: () => {} }
    },
    toggleTheme: vi.fn()
  })
}));

// Extend expect matchers
expect.extend(toHaveNoViolations);

// Helper function to render Sidebar with required providers
const renderSidebar = (props = {}) => {
  const user = userEvent.setup();
  
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    disableTransitions: true
  };

  const utils = render(
    <MemoryRouter>
      <Sidebar {...defaultProps} {...props} />
    </MemoryRouter>
  );

  return {
    ...utils,
    user
  };
};

describe('Sidebar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Material Design Implementation', () => {
    test('applies correct spacing based on 8px grid system', () => {
      const { container } = renderSidebar();
      const sidebar = container.firstChild as HTMLElement;
      
      const computedStyle = window.getComputedStyle(sidebar);
      const padding = parseInt(computedStyle.padding);
      
      expect(padding % 8).toBe(0);
    });

    test('uses correct typography scale for navigation items', () => {
      renderSidebar();
      const navItems = screen.getAllByRole('listitem');
      
      navItems.forEach(item => {
        const text = within(item).getByText(/.+/);
        const computedStyle = window.getComputedStyle(text);
        
        expect(computedStyle.fontSize).toBe('16px');
        expect(computedStyle.lineHeight).toBe('1.5');
      });
    });

    test('implements elevation and z-index correctly', () => {
      const { container } = renderSidebar();
      const sidebar = container.firstChild as HTMLElement;
      
      const computedStyle = window.getComputedStyle(sidebar);
      expect(computedStyle.boxShadow).toBeTruthy();
      expect(parseInt(computedStyle.zIndex)).toBe(1200);
    });
  });

  describe('Responsive Behavior', () => {
    test('renders as drawer on mobile', () => {
      vi.mocked(useMediaQuery).mockReturnValue(true); // Mobile viewport
      renderSidebar();
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByLabelText('Close sidebar')).toBeInTheDocument();
    });

    test('renders as persistent sidebar on desktop', () => {
      vi.mocked(useMediaQuery).mockReturnValue(false); // Desktop viewport
      renderSidebar();
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Close sidebar')).not.toBeInTheDocument();
    });

    test('handles drawer close on mobile navigation', async () => {
      vi.mocked(useMediaQuery).mockReturnValue(true);
      const onClose = vi.fn();
      const { user } = renderSidebar({ onClose });
      
      await user.click(screen.getByText('Analytics'));
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Navigation Functionality', () => {
    test('renders all navigation items with correct attributes', () => {
      renderSidebar();
      
      const navItems = [
        { text: 'Analytics', route: ROUTES.ANALYTICS },
        { text: 'Attribution', route: ROUTES.ATTRIBUTION },
        { text: 'Settings', route: ROUTES.SETTINGS }
      ];

      navItems.forEach(({ text, route }) => {
        const item = screen.getByText(text);
        expect(item).toBeInTheDocument();
        expect(item.closest('a')).toHaveAttribute('href', route);
      });
    });

    test('handles keyboard shortcuts correctly', async () => {
      const { user } = renderSidebar();
      const navigate = vi.fn();
      vi.mocked(useNavigate).mockReturnValue(navigate);

      await user.keyboard('{Alt>}1{/Alt}');
      expect(navigate).toHaveBeenCalledWith(ROUTES.ANALYTICS);

      await user.keyboard('{Alt>}2{/Alt}');
      expect(navigate).toHaveBeenCalledWith(ROUTES.ATTRIBUTION);
    });

    test('maintains active state for current route', () => {
      renderSidebar();
      const activeItem = screen.getByText('Analytics').closest('li');
      
      expect(activeItem).toHaveClass('active');
      expect(activeItem).toHaveAttribute('aria-current', 'page');
    });
  });

  describe('Theme Switching', () => {
    test('toggles theme correctly', async () => {
      const toggleTheme = vi.fn();
      vi.mocked(useTheme).mockReturnValue({
        theme: { palette: { mode: ThemeMode.LIGHT } },
        toggleTheme
      });

      const { user } = renderSidebar();
      await user.click(screen.getByLabelText('Toggle theme'));
      
      expect(toggleTheme).toHaveBeenCalled();
    });

    test('displays correct theme icon', () => {
      vi.mocked(useTheme).mockReturnValue({
        theme: { palette: { mode: ThemeMode.DARK } },
        toggleTheme: vi.fn()
      });

      renderSidebar();
      expect(screen.getByTestId('LightModeOutlinedIcon')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('meets WCAG 2.1 Level AA requirements', async () => {
      const { container } = renderSidebar();
      const results = await axe(container);
      
      expect(results).toHaveNoViolations();
    });

    test('supports keyboard navigation', async () => {
      const { user } = renderSidebar();
      
      await user.tab();
      expect(screen.getByText('Analytics')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByText('Attribution')).toHaveFocus();
    });

    test('provides proper ARIA labels', () => {
      renderSidebar();
      
      expect(screen.getByRole('navigation')).toHaveAttribute('aria-label', 'Main Navigation');
      expect(screen.getByLabelText('Toggle theme')).toBeInTheDocument();
    });

    test('maintains focus after theme toggle', async () => {
      const { user } = renderSidebar();
      const themeButton = screen.getByLabelText('Toggle theme');
      
      await user.click(themeButton);
      expect(themeButton).toHaveFocus();
    });
  });
});