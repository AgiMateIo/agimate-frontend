/**
 * Extracts a human-readable message from an unknown thrown value.
 * Returns `error.message` for Error instances, otherwise the fallback.
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
