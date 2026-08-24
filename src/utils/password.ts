// password.ts
// The one rule the backend enforces on a password, checked before the request.

export const MIN_PASSWORD_LENGTH = 8;
// Not characters. The hash algorithm reads 72 bytes and says nothing about the
// rest, so the limit is in bytes: 40 Cyrillic letters are already over it while
// looking like a short password. A form counting characters would let through
// exactly what the server rejects.
export const MAX_PASSWORD_BYTES = 72;

export const passwordByteLength = (value: string): number =>
  new TextEncoder().encode(value).length;

export type PasswordProblem = 'tooShort' | 'tooLong';

// No composition rules (a digit, a capital, a symbol) — deliberately, on the
// backend's side as well.
export function checkPassword(value: string): PasswordProblem | null {
  if (value.length < MIN_PASSWORD_LENGTH) return 'tooShort';
  if (passwordByteLength(value) > MAX_PASSWORD_BYTES) return 'tooLong';
  return null;
}
