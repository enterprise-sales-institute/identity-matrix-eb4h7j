import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import Table from './Table';
import { renderWithProviders } from '../../../tests/utils/test-utils';
import { SortOrder } from '../../../types/common.types';

// Mock data and configurations
const TEST_DATA = [
  { id: '1', name: 'Channel A', revenue: 1000, conversions: 50 },
  { id: '2', name: 'Channel B', revenue: 2000, conversions: 75 },
  { id: '3', name: 'Channel C', revenue: 1500, conversions: 60 }
];

const COLUMN_CONFIG = [
  { 
    key: 'name', 
    label: 'Channel Name', 
    sortable: true,
    align: 'left' as const
  },
  { 
    key: 'revenue', 
    label: 'Revenue', 
    sortable: true,
    align: 'right' as const,
    render: (value: number) => `$${value.toLocaleString()}`
  },
  { 
    key: 'conversions', 
    label: 'Conversions', 
    sortable: true,
    align: 'right' as const
  }
];

const VIEWPORT_SIZES = {
  mobile: { width: 320, height: 568 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 }
};

// Test setup utilities
const setupTestData = (options = {}) => {
  const onSort = jest.fn();
  const onPageChange = jest.fn();
  const defaultProps = {
    data: TEST_DATA,
    columns: COLUMN_CONFIG,
    pagination: {
      page: 1,
      limit: 10,
      sortBy: '',
      sortOrder: SortOrder.ASC,
      filters: {}
    },
    onSort,
    onPageChange,
    ariaLabel: 'Test table',
    testId: 'test-table'
  };

  return {
    ...defaultProps,
    ...options
  };
};

const setupResponsiveTests = (viewportConfig: { width: number; height: number }) => {
  Object.defineProperty(window, 'innerWidth', { value: viewportConfig.width });
  Object.defineProperty(window, 'innerHeight', { value: viewportConfig.height });
  window.dispatchEvent(new Event('resize'));
};

describe('Table Component', () => {
  // Reset mocks and viewport between tests
  afterEach(() => {
    jest.clearAllMocks();
    setupResponsiveTests(VIEWPORT_SIZES.desktop);
  });

  describe('Rendering', () => {
    it('renders table with data correctly', () => {
      const props = setupTestData();
      renderWithProviders(<Table {...props} />);

      // Verify table headers
      COLUMN_CONFIG.forEach(column => {
        expect(screen.getByText(column.label)).toBeInTheDocument();
      });

      // Verify data rows
      TEST_DATA.forEach(row => {
        expect(screen.getByText(row.name)).toBeInTheDocument();
        expect(screen.getByText(`$${row.revenue.toLocaleString()}`)).toBeInTheDocument();
        expect(screen.getByText(row.conversions.toString())).toBeInTheDocument();
      });
    });

    it('renders empty state message when no data', () => {
      const props = setupTestData({ data: [] });
      renderWithProviders(<Table {...props} />);
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('renders loading state correctly', () => {
      const props = setupTestData({ isLoading: true });
      renderWithProviders(<Table {...props} />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Sorting Functionality', () => {
    it('handles column sorting on click', async () => {
      const props = setupTestData();
      renderWithProviders(<Table {...props} />);

      // Click sortable column header
      const nameHeader = screen.getByText('Channel Name');
      await userEvent.click(nameHeader);

      expect(props.onSort).toHaveBeenCalledWith('name', SortOrder.ASC);

      // Click again for descending order
      await userEvent.click(nameHeader);
      expect(props.onSort).toHaveBeenCalledWith('name', SortOrder.DESC);
    });

    it('shows sort direction indicator', () => {
      const props = setupTestData({
        pagination: {
          ...setupTestData().pagination,
          sortBy: 'name',
          sortOrder: SortOrder.ASC
        }
      });
      renderWithProviders(<Table {...props} />);

      const nameHeader = screen.getByText('Channel Name');
      expect(nameHeader.closest('[aria-sort]')).toHaveAttribute('aria-sort', 'ascending');
    });

    it('supports keyboard sort activation', async () => {
      const props = setupTestData();
      renderWithProviders(<Table {...props} />);

      const nameHeader = screen.getByText('Channel Name');
      nameHeader.focus();
      await userEvent.keyboard('{Enter}');

      expect(props.onSort).toHaveBeenCalledWith('name', SortOrder.ASC);
    });
  });

  describe('Accessibility', () => {
    it('implements correct ARIA attributes', () => {
      const props = setupTestData();
      renderWithProviders(<Table {...props} />);

      const table = screen.getByRole('table');
      expect(table).toHaveAttribute('aria-label', 'Test table');

      // Check row and column headers
      expect(screen.getAllByRole('columnheader')).toHaveLength(COLUMN_CONFIG.length);
      expect(screen.getAllByRole('row')).toHaveLength(TEST_DATA.length + 1); // +1 for header row
    });

    it('supports keyboard navigation', async () => {
      const props = setupTestData();
      renderWithProviders(<Table {...props} />);

      const firstRow = screen.getAllByRole('row')[1];
      firstRow.focus();
      expect(document.activeElement).toBe(firstRow);

      // Test keyboard navigation
      await userEvent.keyboard('{Tab}');
      const secondRow = screen.getAllByRole('row')[2];
      expect(document.activeElement).toBe(secondRow);
    });

    it('announces sort changes to screen readers', async () => {
      const props = setupTestData();
      renderWithProviders(<Table {...props} />);

      const nameHeader = screen.getByText('Channel Name');
      await userEvent.click(nameHeader);

      expect(nameHeader.closest('[aria-sort]')).toHaveAttribute('aria-sort', 'ascending');
    });
  });

  describe('Responsive Design', () => {
    it('adapts to mobile viewport', async () => {
      setupResponsiveTests(VIEWPORT_SIZES.mobile);
      const props = setupTestData();
      renderWithProviders(<Table {...props} />);

      // Verify mobile optimizations
      const table = screen.getByTestId('test-table');
      expect(table).toHaveStyle({ minWidth: '320px' });
    });

    it('handles touch interactions on mobile', async () => {
      setupResponsiveTests(VIEWPORT_SIZES.mobile);
      const props = setupTestData();
      renderWithProviders(<Table {...props} />);

      const firstRow = screen.getAllByRole('row')[1];
      await userEvent.click(firstRow);

      // Verify touch target sizes
      const cells = within(firstRow).getAllByRole('cell');
      cells.forEach(cell => {
        const styles = window.getComputedStyle(cell);
        expect(parseInt(styles.minHeight)).toBeGreaterThanOrEqual(48); // Minimum touch target size
      });
    });

    it('maintains column visibility based on breakpoints', () => {
      // Test different viewport sizes
      const viewportTests = [
        { size: VIEWPORT_SIZES.mobile, expectedColumns: 2 },
        { size: VIEWPORT_SIZES.tablet, expectedColumns: 3 },
        { size: VIEWPORT_SIZES.desktop, expectedColumns: 3 }
      ];

      viewportTests.forEach(({ size, expectedColumns }) => {
        setupResponsiveTests(size);
        const props = setupTestData();
        renderWithProviders(<Table {...props} />);

        const visibleHeaders = screen.getAllByRole('columnheader');
        expect(visibleHeaders).toHaveLength(expectedColumns);
      });
    });
  });
});