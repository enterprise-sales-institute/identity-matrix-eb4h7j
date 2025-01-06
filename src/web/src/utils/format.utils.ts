/**
 * @fileoverview Utility functions for formatting data values with internationalization support
 * @version 1.0.0
 */

// External imports
import { format as dateFnsFormat } from 'date-fns'; // v2.30.0

// Internal imports
import { AnalyticsMetric } from '../types/analytics.types';

// Cache for number formatters to improve performance
const numberFormatters: Map<string, Intl.NumberFormat> = new Map();

/**
 * Gets or creates a cached NumberFormat instance
 * @param locale - Locale string
 * @param options - Intl.NumberFormatOptions
 * @returns Intl.NumberFormat instance
 */
const getNumberFormatter = (locale: string, options: Intl.NumberFormatOptions): Intl.NumberFormat => {
  const key = `${locale}-${JSON.stringify(options)}`;
  if (!numberFormatters.has(key)) {
    numberFormatters.set(key, new Intl.NumberFormat(locale, options));
  }
  return numberFormatters.get(key)!;
};

/**
 * Formats numeric values with proper decimal places and locale support
 * @param value - Number to format
 * @param options - Formatting options
 * @returns Formatted number string
 */
export const formatNumber = (
  value: number,
  options: { decimals?: number; locale?: string; grouping?: boolean } = {}
): string => {
  if (value == null || isNaN(value)) {
    return '';
  }

  const {
    decimals = 2,
    locale = 'en-US',
    grouping = true
  } = options;

  try {
    const formatter = getNumberFormatter(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      useGrouping: grouping
    });
    return formatter.format(value);
  } catch (error) {
    console.error('Error formatting number:', error);
    return value.toString();
  }
};

/**
 * Formats monetary values with currency symbol and locale support
 * @param value - Monetary value to format
 * @param currencyCode - ISO 4217 currency code
 * @param options - Formatting options
 * @returns Formatted currency string
 */
export const formatCurrency = (
  value: number,
  currencyCode: string,
  options: { locale?: string; decimals?: number } = {}
): string => {
  if (value == null || isNaN(value)) {
    return '';
  }

  const {
    locale = 'en-US',
    decimals = 2
  } = options;

  try {
    const formatter = getNumberFormatter(locale, {
      style: 'currency',
      currency: currencyCode.toUpperCase(),
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
    return formatter.format(value);
  } catch (error) {
    console.error('Error formatting currency:', error);
    return `${currencyCode} ${value}`;
  }
};

/**
 * Formats decimal values as percentages with locale support
 * @param value - Decimal value between 0 and 1
 * @param options - Formatting options
 * @returns Formatted percentage string
 */
export const formatPercentage = (
  value: number,
  options: { decimals?: number; locale?: string } = {}
): string => {
  if (value == null || isNaN(value)) {
    return '';
  }

  const {
    decimals = 1,
    locale = 'en-US'
  } = options;

  try {
    const formatter = getNumberFormatter(locale, {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
    return formatter.format(value);
  } catch (error) {
    console.error('Error formatting percentage:', error);
    return `${(value * 100).toFixed(decimals)}%`;
  }
};

/**
 * Formats date objects into localized strings
 * @param date - Date object to format
 * @param formatString - Date format string
 * @param options - Formatting options
 * @returns Formatted date string
 */
export const formatDate = (
  date: Date,
  formatString: string,
  options: { locale?: string } = {}
): string => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return '';
  }

  try {
    return dateFnsFormat(date, formatString, {
      locale: options.locale
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return date.toISOString();
  }
};

/**
 * Formats analytics metric values based on metric type
 * @param value - Metric value to format
 * @param metricType - Type of analytics metric
 * @param options - Formatting options
 * @returns Formatted metric string
 */
export const formatMetricValue = (
  value: number,
  metricType: AnalyticsMetric,
  options: { locale?: string; currency?: string } = {}
): string => {
  if (value == null || isNaN(value)) {
    return '';
  }

  const { locale = 'en-US', currency = 'USD' } = options;

  try {
    switch (metricType) {
      case AnalyticsMetric.CONVERSION_RATE:
        return formatPercentage(value, { locale, decimals: 2 });
      
      case AnalyticsMetric.REVENUE:
      case AnalyticsMetric.AVERAGE_ORDER_VALUE:
      case AnalyticsMetric.CUSTOMER_LIFETIME_VALUE:
        return formatCurrency(value, currency, { locale, decimals: 2 });
      
      case AnalyticsMetric.RETURN_ON_INVESTMENT:
        return formatPercentage(value, { locale, decimals: 1 });
      
      case AnalyticsMetric.ATTRIBUTION_WEIGHT:
        return formatPercentage(value, { locale, decimals: 1 });
      
      case AnalyticsMetric.TOUCHPOINTS:
      case AnalyticsMetric.COST_PER_ACQUISITION:
        return formatNumber(value, { locale, decimals: 0 });
      
      default:
        return formatNumber(value, { locale, decimals: 2 });
    }
  } catch (error) {
    console.error('Error formatting metric value:', error);
    return value.toString();
  }
};