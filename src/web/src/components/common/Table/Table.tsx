import React, { useCallback, useMemo, CSSProperties } from 'react';
import { ArrowUpward, ArrowDownward } from '@mui/icons-material';
import {
  TableContainer,
  TableHeader,
  TableBody,
  TableRow,
  TableCell
} from './Table.styles';
import { PaginationParams, SortOrder } from '../../../types/common.types';

// Interface for table column configuration
interface TableColumn<T = any> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
  hidden?: boolean;
  minWidth?: string;
  maxWidth?: string;
  resizable?: boolean;
  headerClassName?: string;
  cellClassName?: string;
}

// Props interface for the Table component
interface TableProps<T = any> {
  data: T[];
  columns: TableColumn<T>[];
  pagination: PaginationParams;
  onSort: (columnKey: string, sortOrder: SortOrder) => void;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
  emptyStateMessage?: string;
  ariaLabel?: string;
  testId?: string;
  style?: CSSProperties;
  className?: string;
}

const Table = <T extends Record<string, any>>({
  data,
  columns,
  pagination,
  onSort,
  onPageChange,
  isLoading = false,
  emptyStateMessage = 'No data available',
  ariaLabel = 'Data table',
  testId = 'data-table',
  style,
  className
}: TableProps<T>): JSX.Element => {
  // Memoized sort handler for performance optimization
  const handleSort = useCallback((columnKey: string) => {
    const column = columns.find(col => col.key === columnKey);
    if (!column?.sortable) return;

    const newOrder = columnKey === pagination.sortBy
      ? pagination.sortOrder === SortOrder.ASC ? SortOrder.DESC : SortOrder.ASC
      : SortOrder.ASC;

    onSort(columnKey, newOrder);
  }, [columns, pagination.sortBy, pagination.sortOrder, onSort]);

  // Memoized sort icon renderer
  const renderSortIcon = useMemo(() => (columnKey: string) => {
    if (columnKey !== pagination.sortBy) return null;

    const IconComponent = pagination.sortOrder === SortOrder.ASC
      ? ArrowUpward
      : ArrowDownward;

    return (
      <IconComponent
        fontSize="small"
        aria-hidden="true"
        sx={{
          marginLeft: 1,
          fontSize: '1rem',
          transition: 'transform 0.2s ease-in-out'
        }}
      />
    );
  }, [pagination.sortBy, pagination.sortOrder]);

  // Empty state handler
  const renderEmptyState = () => (
    <TableRow>
      <TableCell
        colSpan={columns.length}
        align="center"
        role="cell"
        aria-label={emptyStateMessage}
      >
        {emptyStateMessage}
      </TableCell>
    </TableRow>
  );

  return (
    <TableContainer
      role="table"
      aria-label={ariaLabel}
      data-testid={testId}
      style={style}
      className={className}
    >
      <TableHeader role="rowgroup">
        <TableRow role="row">
          {columns
            .filter(column => !column.hidden)
            .map(column => (
              <TableCell
                key={column.key}
                role="columnheader"
                align={column.align || 'left'}
                style={{
                  width: column.width,
                  minWidth: column.minWidth,
                  maxWidth: column.maxWidth,
                  cursor: column.sortable ? 'pointer' : 'default'
                }}
                className={column.headerClassName}
                onClick={() => column.sortable && handleSort(column.key)}
                aria-sort={
                  column.key === pagination.sortBy
                    ? pagination.sortOrder.toLowerCase()
                    : 'none'
                }
                tabIndex={column.sortable ? 0 : -1}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && column.sortable) {
                    handleSort(column.key);
                  }
                }}
              >
                <span>
                  {column.label}
                  {column.sortable && renderSortIcon(column.key)}
                </span>
              </TableCell>
            ))}
        </TableRow>
      </TableHeader>
      <TableBody role="rowgroup">
        {isLoading ? (
          <TableRow role="row">
            <TableCell
              colSpan={columns.length}
              align="center"
              role="cell"
              aria-busy="true"
            >
              Loading...
            </TableCell>
          </TableRow>
        ) : data.length === 0 ? (
          renderEmptyState()
        ) : (
          data.map((row, rowIndex) => (
            <TableRow
              key={rowIndex}
              role="row"
              tabIndex={0}
              aria-rowindex={rowIndex + 1}
            >
              {columns
                .filter(column => !column.hidden)
                .map(column => (
                  <TableCell
                    key={`${rowIndex}-${column.key}`}
                    role="cell"
                    align={column.align || 'left'}
                    className={column.cellClassName}
                    style={{
                      width: column.width,
                      minWidth: column.minWidth,
                      maxWidth: column.maxWidth
                    }}
                  >
                    {column.render
                      ? column.render(row[column.key], row)
                      : row[column.key]}
                  </TableCell>
                ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </TableContainer>
  );
};

export default Table;