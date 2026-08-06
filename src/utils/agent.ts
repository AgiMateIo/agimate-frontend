import type { AgentType } from '@/types';
import { getApiBaseUrl } from './api-url';

// The three types whose loop runs outside the platform. They share everything
// but the door for incoming events, and none of them uses a platform model —
// the brain (and its keys) belong to the user.
export const EXTERNAL_AGENT_TYPES: AgentType[] = ['MCP', 'CENTRIFUGO', 'WEBHOOK'];

export function isExternalAgentType(type: AgentType): boolean {
  return EXTERNAL_AGENT_TYPES.includes(type);
}

// An MCP agent has no server → client channel at all, so anything the platform
// would have to *deliver* (webchat, channels, triggers) has nothing to travel
// on. Everything the agent pulls itself (connections, skills, files) is fine.
export function isMcpAgent(type: AgentType): boolean {
  return type === 'MCP';
}

// The MCP endpoint the external client points at. Same host as the API gateway;
// never assembled from the dashboard's own origin.
export function getMcpEndpointUrl(): string {
  return `${getApiBaseUrl()}mcp`;
}

// What a bound connection's tools are called on the wire: the connection code,
// two underscores, the tool name. Characters outside [a-zA-Z0-9_-] are replaced,
// so `mcp_context7` + `resolve-library-id` → `mcp_context7__resolve-library-id`.
export function mcpToolPrefix(connectionCode: string): string {
  return `${connectionCode.replace(/[^a-zA-Z0-9_-]/g, '_')}__`;
}

// The config block an MCP client (Claude Code, Cursor, …) expects. `key` is the
// agent key, shown once at creation — with none at hand we render a placeholder
// so the shape is still copyable.
export function buildMcpClientConfig(key: string): string {
  return JSON.stringify(
    {
      mcpServers: {
        agimate: {
          url: getMcpEndpointUrl(),
          headers: { Authorization: `Bearer ${key}` },
        },
      },
    },
    null,
    2,
  );
}

// Per-agent limits the platform enforces on MCP calls. Shown next to the
// snippet: the client's own retry behaviour depends on them.
export const MCP_LIMITS = { callsPerMinute: 120, callTimeoutSeconds: 60 };
