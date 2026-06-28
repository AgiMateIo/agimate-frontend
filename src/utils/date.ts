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
 * Format a full absolute timestamp ("yyyy-MM-dd HH:mm:ss"), e.g. for tooltips.
 * Returns the input unchanged if it cannot be parsed.
 */
export function formatDateTimeFull(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  } catch {
    return dateStr;
  }
}

/**
 * Format a compact timestamp: "HH:mm" when the date is today, otherwise "dd.MM HH:mm".
 * Returns the input unchanged if it cannot be parsed.
 */
export function formatDateTimeShort(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()) {
      return time;
    }
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)} ${time}`;
  } catch {
    return dateStr;
  }
}
