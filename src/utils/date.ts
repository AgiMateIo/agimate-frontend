import { UI } from '@/config/constants';

/**
 * Parse date string from backend format
 *
 * Backend returns dates as "yyyy-MM-dd HH:mm:ss"
 * This function converts it to ISO format before parsing
 */
export function parseBackendDate(dateString: string): Date {
  return new Date(dateString.replace(' ', 'T'));
}

/**
 * Format date for display using specified locale
 *
 * @param dateString - Date string in backend format "yyyy-MM-dd HH:mm:ss"
 * @param locale - Locale string (default: ru-RU)
 * @param options - Intl.DateTimeFormatOptions (default: from constants)
 * @returns Formatted date string
 *
 * @example
 * ```ts
 * formatDate('2025-01-15 14:30:00') // "15 января 2025 г., 14:30"
 * ```
 */
export function formatDate(
  dateString: string,
  locale: string = UI.DEFAULT_LOCALE,
  options: Intl.DateTimeFormatOptions = UI.DATE_FORMAT_OPTIONS
): string {
  const date = parseBackendDate(dateString);
  return new Intl.DateTimeFormat(locale, options).format(date);
}

/**
 * Format date as relative time (e.g., "2 hours ago")
 *
 * @param dateString - Date string in backend format
 * @param locale - Locale string (default: ru-RU)
 * @returns Relative time string
 *
 * @example
 * ```ts
 * formatRelativeTime('2025-01-15 14:30:00') // "Today" or "2 days ago"
 * ```
 */
export function formatRelativeTime(
  dateString: string,
  locale: string = UI.DEFAULT_LOCALE
): string {
  const date = parseBackendDate(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  // For older dates, show formatted date
  return formatDate(dateString, locale);
}

/**
 * Format date in short format (without time)
 *
 * @param dateString - Date string in backend format
 * @param locale - Locale string (default: ru-RU)
 * @returns Short formatted date
 *
 * @example
 * ```ts
 * formatShortDate('2025-01-15 14:30:00') // "15 января 2025 г."
 * ```
 */
export function formatShortDate(
  dateString: string,
  locale: string = UI.DEFAULT_LOCALE
): string {
  const date = parseBackendDate(dateString);
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}
