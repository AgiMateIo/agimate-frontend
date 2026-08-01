// A connector *instance* (Connection on the backend) — e.g. a specific Telegram
// bot or MCP server. External connectors (telegram/mcp/app) have user-created
// instances; internal connectors have exactly one system row per user
// (subCode = null, fullCode = "<code>_<userId>") managed by the backend.
export interface ConnectionResponse {
  id: string;
  connectorCode: string;
  // canonical instance discriminator on the platform (telegram username, MCP URL).
  // Formerly `platformIdentifier`. null until the platform identity is known.
  subCode: string | null;
  // stable per-user instance handle, e.g. `mcp_context7` — used as the instance label in UI.
  fullCode: string;
  name: string;
  enabled: boolean;
  authStatus: ConnectionAuthStatus;
  lastUsedAt: string | null;
  createdAt: string;
}

// Orthogonal to `enabled`: `enabled` is what the user wants, `authStatus` is
// whether the connection can actually reach the platform. Anything other than
// AUTHORIZED means the connection has no working tools — the OAuth grant is
// either not obtained yet (PENDING_AUTH) or gone (AUTH_EXPIRED), and only the
// user walking through the provider's consent screen fixes it.
// Connections with a static secret are always AUTHORIZED.
export type ConnectionAuthStatus = 'AUTHORIZED' | 'PENDING_AUTH' | 'AUTH_EXPIRED';

export interface CreateConnectionRequest {
  connectorCode: string;
  credentials: Record<string, string>;
  name?: string;
}

// POST /manage/connections/ no longer answers with the row alone: an OAuth
// connector (Notion, Linear, …) is created in PENDING_AUTH and needs the user
// to pass the provider's consent screen before it works.
export interface CreateConnectionResult {
  connection: ConnectionResponse;
  status: 'ready' | 'authorization_required';
  // Present only for `authorization_required`; the authorize call below is
  // addressed by connection id, so this is informational.
  authorizeUrl?: string;
}

// POST /manage/connections/{id}/authorize — also used for re-connecting an
// AUTH_EXPIRED connection and for widening scopes; the backend remembers the
// state. The URL is a third-party consent screen and lives ~10 minutes, so it
// must be handed to a top-level navigation right away (never fetch/iframe).
export interface ConnectionAuthorizeResponse {
  authorizationUrl: string;
}

// POST /manage/connections/oauth/complete — everything the provider put in the
// callback query, forwarded verbatim. `code` and `error` are mutually
// exclusive; `iss` is only sent when the provider supplied it (the backend
// checks it against the issuer it recorded at start).
export interface CompleteConnectionOAuthRequest {
  state: string;
  code?: string;
  error?: string;
  iss?: string;
}

export interface UpdateConnectionRequest {
  enabled?: boolean;
  name?: string;
}

export interface UpdateConnectionSecretRequest {
  credentials: Record<string, string>;
}

// Result of POST /manage/connections/{id}/test
export interface ConnectionTestResponse {
  valid: boolean;
  // valid:true together with this means the server answered and the input is
  // fine, but the OAuth grant is missing/expired — offer re-connecting rather
  // than reporting a failed check.
  authorizationRequired?: boolean;
  identifier: string | null;
  displayName: string | null;
  // number of tools loaded into cache (MCP only; null for other connectors)
  toolsDiscovered: number | null;
  // valid:true but tools/list failed — error text; otherwise null
  toolsError: string | null;
  // populated when valid:false
  errorMessage?: string | null;
  errorField?: string | null;
}

// A trigger *spec* (declaration) for a connection instance, returned by
// GET /manage/connections/{id}/triggers/. The instance set is the union of the
// connector type's declared triggers and any per-connection dynamic ones.
export interface TriggerSpecificationResponse {
  name: string;
  description: string;
  // Parameter names carried in `trigger.data`; best-effort for dynamic
  // triggers, so it may be empty.
  params: string[];
}
