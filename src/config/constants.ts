/**
 * Application-wide constants
 *
 * Centralized configuration for magic numbers, validation rules,
 * and other constants used throughout the application.
 */

export const VALIDATION = {
  // Form field length limits
  NAME_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 500,

  // UI interaction timeouts
  COPIED_TIMEOUT_MS: 2000,
} as const;

export const UI = {
  // Modal size classes
  MODAL_SIZES: {
    SM: 'max-w-md',
    MD: 'max-w-lg',
    LG: 'max-w-2xl',
  },

  // Date format options for Intl.DateTimeFormat
  DATE_FORMAT_OPTIONS: {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  } as Intl.DateTimeFormatOptions,

  // Default locale for formatting
  DEFAULT_LOCALE: 'ru-RU',
} as const;

export const API = {
  // API endpoint prefixes
  ENDPOINTS: {
    USER_API: 'user',
    CONNECTORS_API: 'connectors',
    DEVICE_API: 'device',
  },

  // Request timeouts (if needed in future)
  DEFAULT_TIMEOUT_MS: 30000,
} as const;
