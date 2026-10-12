// External MCP clients signing in to an agent by link (OAuth on the platform's
// own MCP server). The consent page forwards the client's query verbatim; the
// backend validates it and builds every return address.

import type { AgentType } from './agents';

// The OAuth query of /mcp/authorize, snake_case as the client sent it. Sent back
// unchanged with check, approve and deny.
export interface McpAuthorizationParams {
  response_type?: string;
  client_id?: string;
  redirect_uri?: string;
  code_challenge?: string;
  code_challenge_method?: string;
  state?: string;
  resource?: string;
  scope?: string;
}

export interface McpConsentAgent {
  id: string;
  name: string;
  description: string | null;
  type: AgentType;
  enabled: boolean;
  // false for GENERIC: its loop runs on the platform, nothing to hand a client.
  available: boolean;
}

export interface McpConsent {
  clientId: string;
  // Self-declared by the client; `clientHost` is what tells a real one from a fake.
  clientName: string;
  clientHost: string;
  // CIMD today; a string so a kind the backend adds later doesn't break anything.
  clientKind: string;
  redirectHost: string;
  localApplication: boolean;
  agents: McpConsentAgent[];
}

// Exactly one is set: a consent to show, or an error to hand back to the client.
export interface McpAuthorizeCheckResponse {
  consent?: McpConsent | null;
  redirectUrl?: string | null;
}

export interface McpAuthorizeRedirect {
  redirectUrl: string;
}

export interface McpClientResponse {
  id: string;
  clientId: string;
  clientName: string;
  clientKind: string;
  createdAt: string;
  // Updated at most once a minute; null = never used yet.
  lastUsedAt: string | null;
}
