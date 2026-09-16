// Views — HTML pages an MCP server hands out alongside its tools (MCP Apps,
// `ui://…` resources). The page runs in a sandboxed iframe of ours and calls
// the server's tools back through us; the tools execute *as the agent*, under
// its bindings and access rules, which is why every endpoint here is addressed
// by agent id.
//
// Endpoints: /manage/agents/{agentId}/views/ (list),
// …/views/content (one page), …/views/tools/call (a call from inside a page).

export interface AgentViewResponse {
  // The connection that serves the view — carried back into the content and
  // tool-call requests, since a view only means anything next to its instance.
  connectionId: string;
  // `mcp` for a page an MCP server hands out, or an internal connector's own
  // code (`persist-memory`, later `sheets`) — the backend owns the list.
  connectorCode: string;
  // The connection's own name, null for a row that never had one. Worth showing
  // for `mcp`, where the user named the instance themselves; an internal
  // connector's is a technical English label, so the launcher titles those from
  // the connector catalogue instead.
  connectionName: string | null;
  // The view's identity, `ui://…` — `ui://<connectorCode>/<name>` for our own
  // panels. NOT a network address: never a link target, never an iframe `src`.
  uri: string;
  // Which of the connection's tools draw into this view.
  tools: string[];
}

// Which origins the page may reach, as the server declares them. Absent or null
// means "nothing of the sort" — the strictest policy, not a free pass.
export interface AgentViewCsp {
  connectDomains?: string[] | null;
  resourceDomains?: string[] | null;
  frameDomains?: string[] | null;
  baseUriDomains?: string[] | null;
}

export interface AgentViewContentResponse {
  uri: string;
  // `text/html;profile=mcp-app`.
  mimeType: string;
  // The whole page. Rendered through `withCsp` — never handed to an iframe raw.
  html: string;
  csp?: AgentViewCsp | null;
  // What the page asks for (camera, microphone…). Nothing is granted in this
  // pass, so it is read for nothing yet.
  permissions?: Record<string, unknown> | null;
  prefersBorder?: boolean | null;
}

// A tool call a page asked for, forwarded under the agent's name. `name` goes
// as the page sent it — the view speaks the server's own tool names.
export interface CallViewToolRequest {
  connectionId: string;
  name: string;
  arguments?: Record<string, unknown>;
}

// MCP's own result shape, passed back into the page verbatim. A failed tool is
// a 200 with `isError: true` — the page shows it, we do not.
export interface CallToolResult {
  content: unknown[];
  structuredContent?: unknown;
  isError?: boolean;
}
