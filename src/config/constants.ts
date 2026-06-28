/**
 * Application-wide constants
 *
 * Centralized configuration for magic numbers, validation rules,
 * and other constants used throughout the application.
 */

export const UI = {
  // Date format options for Intl.DateTimeFormat
  DATE_FORMAT_OPTIONS: {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  } as Intl.DateTimeFormatOptions,

} as const;

export const API = {
  // API endpoint prefixes
  ENDPOINTS: {
    USER_API: 'user',
    CONTROL_API: 'control',
  },
} as const;
