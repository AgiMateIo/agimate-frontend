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
 * @param locale - BCP 47 locale string (e.g., 'ru-RU', 'en-US')
 * @param options - Intl.DateTimeFormatOptions (default: from constants)
 * @returns Formatted date string
 */
export function formatDate(
  dateString: string,
  locale: string,
  options: Intl.DateTimeFormatOptions = UI.DATE_FORMAT_OPTIONS
): string {
  const date = parseBackendDate(dateString);
  return new Intl.DateTimeFormat(locale, options).format(date);
}

/**
 * Format date as relative time
 *
 * @param dateString - Date string in backend format
 * @param locale - BCP 47 locale string
 * @param labels - Localized labels for relative time
 * @returns Relative time string
 */
export function formatRelativeTime(
  dateString: string,
  locale: string,
  labels: { today: string; yesterday: string; daysAgo: (count: number) => string }
): string {
  const date = parseBackendDate(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return labels.today;
  if (diffDays === 1) return labels.yesterday;
  if (diffDays < 7) return labels.daysAgo(diffDays);

  // For older dates, show formatted date
  return formatDate(dateString, locale);
}

/**
 * Format date in short format (without time)
 *
 * @param dateString - Date string in backend format
 * @param locale - BCP 47 locale string
 * @returns Short formatted date
 */
export function formatShortDate(
  dateString: string,
  locale: string
): string {
  const date = parseBackendDate(dateString);
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}
