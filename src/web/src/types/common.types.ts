/**
 * @fileoverview Core TypeScript type definitions and interfaces used across the frontend application
 * @version 1.0.0
 */

// External imports
import { Record } from 'typescript'; // v4.9.0 - Utility type for type-safe key-value pairs

/**
 * Enum for sort order options in data queries
 */
export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC'
}

/**
 * Enum for common entity status values
 */
export enum Status {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING',
  ERROR = 'ERROR',
  ARCHIVED = 'ARCHIVED',
  DELETED = 'DELETED'
}

/**
 * Enum for detailed loading stages during async operations
 */
export enum LoadingStage {
  INITIAL = 'INITIAL',
  LOADING = 'LOADING',
  PROCESSING = 'PROCESSING',
  SAVING = 'SAVING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}

/**
 * Base interface providing common properties for all entity types
 */
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  status: Status;
}

/**
 * Interface for time range selections with timezone support
 */
export interface TimeRange {
  startDate: Date;
  endDate: Date;
  timeZone: string;
}

/**
 * Interface for pagination parameters with filtering support
 */
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: SortOrder;
  filters: Record<string, unknown>;
}

/**
 * Generic interface for standardized API responses with metadata support
 */
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message: string;
  errors: Record<string, string[]>;
  metadata: Record<string, unknown>;
}

/**
 * Interface for component loading states with error handling
 */
export interface LoadingState {
  isLoading: boolean;
  error: string;
  isSuccess: boolean;
  progress: number;
  stage: string;
}

/**
 * Interface for validation error objects
 */
export interface ValidationError {
  field: string;
  messages: string[];
  code: string;
}

/**
 * Utility type for nullable values with strict null checking
 */
export type Nullable<T> = T | null;

/**
 * Utility type for optional values with undefined checking
 */
export type Optional<T> = T | undefined;

/**
 * Type for validation error objects with multiple messages per field
 */
export type ErrorType = Record<string, string[]>;

/**
 * Utility type for deeply partial objects
 * Makes all properties optional recursively
 */
export type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};