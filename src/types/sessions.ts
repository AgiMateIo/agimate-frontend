// Active sign-ins on the account: one row per device that can still refresh its
// tokens, plus what that device is subscribed to for push notifications.
//
// "Active" is the only state here — revoked and expired sign-ins are dropped
// from the list rather than listed with a status, so there is no status column
// to render.
//
// Timestamps come as ISO-8601 with microseconds (`2026-08-15T21:05:21.903002`),
// not in the `yyyy-MM-dd HH:mm:ss` shape the control API uses; `parseBackendDate`
// handles both (its space→T replacement is a no-op here).

export type SessionClient = 'NATIVE' | 'WEB';

export type PushProvider = 'RUSTORE' | 'FIREBASE' | 'HMS';

export interface SessionPushSubscription {
  provider: PushProvider;
  // First 8 characters of the token and an ellipsis. This is *not* a token: the
  // real one is the right to notify the device and is handed to nobody,
  // including its owner. There is nowhere to send it back to, so it stays a
  // technical detail inside an expanded row.
  maskedToken: string;
  // When the device last confirmed this token.
  lastSeenAt: string;
}

export interface UserSessionResponse {
  // What DELETE /user/sessions/{id} takes.
  id: string;
  client: SessionClient;
  // Whatever the device called itself when signing in: a model for the app, the
  // raw User-Agent for a browser. Legitimately null — always keep a fallback
  // caption.
  deviceLabel: string | null;
  createdAt: string;
  // Last token refresh. The list is sorted by it server-side, freshest first —
  // do not re-sort.
  lastSeenAt: string;
  // Push subscriptions of this device. Empty is normal, not a fault: WEB rows
  // are always empty (web push does not exist in the product yet), so the
  // notification state is only worth showing for NATIVE.
  //
  // A list rather than one value because a device legitimately holds two
  // records for a while — when the transport rotates a token, the previous one
  // keeps receiving until it ages out. That resolves itself.
  push: SessionPushSubscription[];
}
