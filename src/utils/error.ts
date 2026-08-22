// Straight from the transport rather than the api facade: this util is imported
// by nearly every component, and the facade would pull every domain module in
// behind it.
import { ApiError } from '@/services/httpClient';

/**
 * Extracts a human-readable message from an unknown thrown value.
 * Returns `error.message` for Error instances, otherwise the fallback.
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

/**
 * Same, but prefers the per-field sentences a validation error carries: a 400
 * that rejects one field says "Bad request" at the top level and puts the part
 * worth reading in `details`. For screens with no field-level slot to show them
 * in — an inline editor, a one-line form.
 */
export function getDetailedErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.details) {
    const parts = Object.values(error.details).filter(Boolean);
    if (parts.length > 0) return parts.join('; ');
  }
  return getErrorMessage(error, fallback);
}
