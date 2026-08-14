/**
 * The referral code a visitor arrived with.
 *
 * Between the click on someone's invite link and the click on "sign in" there
 * can be days, and the backend does not see the code at all in that gap — it
 * only learns it as a `ref` parameter on the OAuth authorization URL. So the
 * landing keeps the value locally until sign-in starts, and drops it after.
 *
 * Attribution is best-effort by design: the backend silently ignores a value it
 * cannot use, and there is no endpoint to check a code beforehand. Nothing here
 * may ever get in the way of signing in.
 */

const STORAGE_KEY = 'referral:code';

// The backend accepts latin letters and digits, up to 16 characters, and drops
// anything else without failing the login. Applying the same rule here keeps
// junk out of storage and out of the authorization URL.
const CODE_PATTERN = /^[A-Za-z0-9]{1,16}$/;

/** Reads localStorage; storage can be unavailable (private mode, blocked cookies). */
function safeRead(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Remembers a `?ref=` code from the current URL, if there is a usable one.
 * Called with `window.location.search`.
 */
export function captureReferralCode(search: string): void {
  if (typeof window === 'undefined') return;
  const code = new URLSearchParams(search).get('ref');
  if (!code || !CODE_PATTERN.test(code)) return;
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // A visitor who blocks storage simply signs up without attribution.
  }
}

/** The remembered code, or null when there is none (or it is unusable). */
export function readReferralCode(): string | null {
  const code = safeRead();
  return code && CODE_PATTERN.test(code) ? code : null;
}

/** Called once sign-in succeeded: the code has done its only job. */
export function clearReferralCode(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do — a stale code is harmless, it only ever applies to a
    // brand-new account.
  }
}

/**
 * The link a user hands out. It points at the site root rather than a locale
 * path: the middleware sends `/` to the visitor's locale and keeps the query.
 */
export function buildReferralLink(origin: string, code: string): string {
  return `${origin}/?ref=${code}`;
}
