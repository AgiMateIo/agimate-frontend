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

import { createPersistentValue } from '@/utils/persistentValue';

// External store shape, so a component can read it without a setState-in-effect
// and without a hydration mismatch (the server knows no session).
export const currentSessionIdStore = createPersistentValue<string | null>({
  key: 'session_id',
  event: 'auth:session-id-change',
  fallback: null,
  // Whatever the backend sent is the id; there is no shape to validate against.
  parse: (raw) => raw,
  // `null` clears it — the sign-in ended.
  serialize: (id) => id,
});

// Absent until this browser has refreshed its tokens at least once since the
// backend started sending the field — a session signed in before that goes
// unmarked in the list rather than marking the wrong row.
export const setCurrentSessionId = (sessionId: string | null | undefined) => {
  currentSessionIdStore.set(sessionId ?? null);
};

export const clearCurrentSessionId = () => setCurrentSessionId(null);
