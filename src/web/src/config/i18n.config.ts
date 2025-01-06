import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import relativeTime from 'dayjs/plugin/relativeTime';

// Import translation namespaces
import * as common from '../locales/en/common.json';
import * as analytics from '../locales/en/analytics.json';
import * as attribution from '../locales/en/attribution.json';
import * as validation from '../locales/en/validation.json';

// Configure dayjs plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(localizedFormat);
dayjs.extend(relativeTime);

// Constants
const DEFAULT_LANGUAGE = 'en';
const FALLBACK_LANGUAGE = 'en';
const SUPPORTED_LANGUAGES = ['en']; // Add more languages as they become available
const RTL_LANGUAGES: string[] = []; // Add RTL language codes as needed

// Type definitions for strict type checking
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof common;
      analytics: typeof analytics;
      attribution: typeof attribution;
      validation: typeof validation;
    };
  }
}

// Language detector options
const detectionOptions = {
  order: ['localStorage', 'navigator', 'htmlTag'],
  lookupLocalStorage: 'i18nextLng',
  caches: ['localStorage'],
  cookieMinutes: 60 * 24 * 30, // 30 days
  checkWhitelist: true
};

// Number formatting options
const numberFormats = {
  number: {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  },
  percent: {
    style: 'percent',
    maximumFractionDigits: 1
  },
  currency: {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }
};

// Date formatting options
const dateFormats = {
  short: 'MM/DD/YYYY',
  long: 'MMMM D, YYYY',
  time: 'HH:mm',
  datetime: 'MMMM D, YYYY HH:mm',
  relative: 'relative'
};

// Initialize i18next configuration
const initI18n = async (): Promise<typeof i18next> => {
  await i18next
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      // Core configuration
      debug: process.env.NODE_ENV === 'development',
      fallbackLng: FALLBACK_LANGUAGE,
      supportedLngs: SUPPORTED_LANGUAGES,
      defaultNS: 'common',
      ns: ['common', 'analytics', 'attribution', 'validation'],
      
      // Resource configuration
      resources: {
        en: {
          common,
          analytics,
          attribution,
          validation
        }
      },

      // Detection configuration
      detection: detectionOptions,

      // Interpolation configuration
      interpolation: {
        escapeValue: false,
        format: (value, format, lng) => {
          if (!value) return '';

          // Handle date formatting
          if (format && dateFormats[format as keyof typeof dateFormats]) {
            return dayjs(value)
              .locale(lng || DEFAULT_LANGUAGE)
              .format(dateFormats[format as keyof typeof dateFormats]);
          }

          // Handle number formatting
          if (format && numberFormats[format as keyof typeof numberFormats]) {
            return new Intl.NumberFormat(
              lng || DEFAULT_LANGUAGE,
              numberFormats[format as keyof typeof numberFormats]
            ).format(value);
          }

          return value;
        }
      },

      // React configuration
      react: {
        useSuspense: true,
        transSupportBasicHtmlNodes: true,
        transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'p', 'span'],
      },

      // Performance configuration
      load: 'languageOnly',
      preload: [DEFAULT_LANGUAGE],
      keySeparator: '.',
      nsSeparator: ':',

      // Missing key handling
      saveMissing: process.env.NODE_ENV === 'development',
      missingKeyHandler: (lng, ns, key) => {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`Missing translation key: ${key} in namespace: ${ns} for language: ${lng}`);
        }
      },

      // Accessibility configuration
      appendNamespaceToCIMode: false,
      returnEmptyString: false,
      returnNull: false,
      returnObjects: true,
      joinArrays: '\n',
      
      // RTL support
      returnedObjectHandler: (key, value, options) => {
        if (RTL_LANGUAGES.includes(options.lng || DEFAULT_LANGUAGE)) {
          return { ...value, dir: 'rtl' };
        }
        return { ...value, dir: 'ltr' };
      }
    });

  // Initialize dayjs locale
  await import(`dayjs/locale/${DEFAULT_LANGUAGE}`);
  dayjs.locale(DEFAULT_LANGUAGE);

  return i18next;
};

// Export configured i18next instance
export default initI18n();

// Export helper functions for type-safe translations
export const getLanguageDirection = (language: string): 'rtl' | 'ltr' => {
  return RTL_LANGUAGES.includes(language) ? 'rtl' : 'ltr';
};

export const formatDate = (
  date: Date | string | number,
  format: keyof typeof dateFormats = 'short',
  language: string = DEFAULT_LANGUAGE
): string => {
  return dayjs(date)
    .locale(language)
    .format(dateFormats[format]);
};

export const formatNumber = (
  value: number,
  format: keyof typeof numberFormats = 'number',
  language: string = DEFAULT_LANGUAGE
): string => {
  return new Intl.NumberFormat(
    language,
    numberFormats[format]
  ).format(value);
};