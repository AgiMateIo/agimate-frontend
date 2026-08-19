// currentSession.ts
// The id of the sign-in this browser is using.
//
// The sessions list carries no "this is you" flag — the current row is found by
// comparing ids, and the only place the frontend learns its own is the
// /oauth2/refresh response, which returns `sessionId` on every refresh and keeps
// it stable until the sign-in ends.
//
// It is an identifier, not a credential — same class as the refresh token id it
// sits next to in localStorage, and stored there for the same reason: it belongs
// to the sign-in, which outlives the tab that sessionStorage is scoped to.

const STORAGE_KEY = 'session_id';
const CHANGE_EVENT = 'auth:session-id-change';

// Absent until this browser has refreshed its tokens at least once since the
// backend started sending the field — a session signed in before that goes
// unmarked in the list rather than marking the wrong row.
export const setCurrentSessionId = (sessionId: string | null | undefined) => {
  if (typeof window === 'undefined') return;
  if (sessionId) {
    localStorage.setItem(STORAGE_KEY, sessionId);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
};

export const clearCurrentSessionId = () => setCurrentSessionId(null);

// External store shape, so a component can read it without a setState-in-effect
// and without a hydration mismatch (the server knows no session).
export const currentSessionIdStore = {
  subscribe(callback: () => void) {
    window.addEventListener(CHANGE_EVENT, callback);
    window.addEventListener('storage', callback);
    return () => {
      window.removeEventListener(CHANGE_EVENT, callback);
      window.removeEventListener('storage', callback);
    };
  },
  getSnapshot: (): string | null => localStorage.getItem(STORAGE_KEY),
  getServerSnapshot: (): string | null => null,
};
