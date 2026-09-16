// The two halves of running somebody else's page inside ours: the policy that
// caps what the page may do, and the protocol it talks to us over.
//
// Both are pure on purpose — the iframe component should read as wiring, and
// the rules a security decision rests on should be readable in one file.

import type { AgentViewCsp } from '@/types';

// What the page is allowed to reach, as a CSP the document carries itself.
//
// The starting point is `default-src 'none'`: a view gets nothing it was not
// granted by name. Scripts and styles are `'unsafe-inline'` because an MCP app
// *is* one inline document — no external script is fetched unless the server
// listed the host in `resourceDomains`. `connect-src`, `frame-src` and
// `base-uri` fall to `'none'` rather than to the page's own origin: its origin
// is opaque, so there is no "own" to fall back to.
export function buildCsp(csp?: AgentViewCsp | null): string {
  const list = (key: keyof AgentViewCsp, fallback = '') => (csp?.[key] ?? []).join(' ') || fallback;
  const resources = list('resourceDomains');
  return [
    "default-src 'none'",
    `script-src 'unsafe-inline' ${resources}`,
    `style-src 'unsafe-inline' ${resources}`,
    `img-src data: blob: ${resources}`,
    `font-src data: ${resources}`,
    `media-src data: blob: ${resources}`,
    `connect-src ${list('connectDomains', "'none'")}`,
    `frame-src ${list('frameDomains', "'none'")}`,
    `base-uri ${list('baseUriDomains', "'none'")}`,
    "object-src 'none'",
  ]
    .map((directive) => directive.trim())
    .join('; ');
}

// The policy goes in as the document's first meta, before anything the page
// itself declares. A second policy can only ever narrow the first, so a page
// cannot write its way out of this one — which is why it is inserted even when
// the server sent no `csp` at all, where it is at its strictest.
export function withCsp(html: string, csp?: AgentViewCsp | null): string {
  const meta = `<meta http-equiv="Content-Security-Policy" content="${buildCsp(csp).replace(/"/g, '&quot;')}">`;
  return /<head[^>]*>/i.test(html)
    ? html.replace(/<head[^>]*>/i, (head) => head + meta)
    : meta + html;
}

// ---------------------------------------------------------------------------
// The bridge: JSON-RPC 2.0 over postMessage, in the MCP Apps `ui/*` dialect.
// ---------------------------------------------------------------------------

// JSON-RPC ids are strings or numbers, and `0` is a perfectly good one — hence
// `'id' in message` everywhere below rather than a truthiness test.
export type JsonRpcId = string | number;

export interface JsonRpcReply {
  jsonrpc: '2.0';
  id: JsonRpcId;
  result?: unknown;
  error?: { code: number; message: string };
}

// Not in the spec's own words but in ours: what the host has to *do* about a
// message. Keeping the decision separate from the doing is what lets the whole
// protocol table be read — and tested — without a DOM.
export type ViewAction =
  | { kind: 'reply'; reply: JsonRpcReply }
  | { kind: 'ready' }
  | { kind: 'resize'; height: number }
  | { kind: 'call'; id: JsonRpcId; name: string; arguments: Record<string, unknown> }
  | { kind: 'open-link'; id: JsonRpcId; url: HttpsUrl }
  | { kind: 'ignore' };

// A link a view asked us to open, already proved to be `https:`. The brand is
// not decoration: the only way to obtain one is `parseHttpsUrl`, so the place
// that finally calls `window.open` cannot be handed a `javascript:` string —
// not by a view, and not by a later edit that moves the check somewhere else.
declare const httpsUrlBrand: unique symbol;
export type HttpsUrl = string & { readonly [httpsUrlBrand]: true };

// Parsed rather than pattern-matched: `new URL` is the same parser the browser
// will use at the sink, so there is no gap between what we approved and what
// gets opened, and the normalised form is what we hand on.
export function parseHttpsUrl(raw: unknown): HttpsUrl | null {
  if (typeof raw !== 'string') return null;
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  // `https:` alone. `http:` is not an oversight — a view is a page from a third
  // party, and a cleartext hop is not something to hand the user unasked.
  return parsed.protocol === 'https:' ? (parsed.toString() as HttpsUrl) : null;
}

export const JSONRPC_METHOD_NOT_FOUND = -32601;
export const JSONRPC_INTERNAL_ERROR = -32603;

export const errorReply = (id: JsonRpcId, code: number, message: string): JsonRpcReply => ({
  jsonrpc: '2.0',
  id,
  error: { code, message },
});

export const resultReply = (id: JsonRpcId, result: unknown): JsonRpcReply => ({
  jsonrpc: '2.0',
  id,
  result,
});

// What we tell a view about the host it opened in. `displayMode: 'inline'` and
// the single-entry `availableDisplayModes` are the honest answer for a launcher:
// there is no fullscreen or picture-in-picture to switch to.
export interface ViewHostContext {
  theme: 'light' | 'dark';
  // The language the dashboard itself is in, as a BCP 47 tag — our own `ru` /
  // `en`, no region invented to look like the spec's examples. A panel that
  // shows text to the user picks its language off this; without the field it
  // would fall back to the browser's, which is not the same question.
  locale: string;
  styles: { variables: Record<string, string> };
}

export function initializeResult(protocolVersion: unknown, host: ViewHostContext) {
  return {
    // Echoed back rather than asserted: the view picked the version, and a
    // number of our own would only disagree with it.
    protocolVersion,
    hostInfo: { name: 'agimate', version: '1' },
    // `serverTools` alone: the view may call the MCP server's own tools through
    // us, and nothing else. No sampling, no model context, no host messages.
    hostCapabilities: { serverTools: {} },
    hostContext: {
      theme: host.theme,
      locale: host.locale,
      displayMode: 'inline',
      availableDisplayModes: ['inline'],
      styles: host.styles,
    },
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

// The protocol table, whole. Everything unknown that carries an id is answered
// with "method not found" — a view left without an answer waits forever, so
// silence is never an option for a request; an unknown notification is dropped,
// which is what a notification is for.
export function decodeViewMessage(data: unknown, host: ViewHostContext): ViewAction {
  if (!isRecord(data) || data.jsonrpc !== '2.0' || typeof data.method !== 'string') {
    return { kind: 'ignore' };
  }

  const params = isRecord(data.params) ? data.params : {};
  const isRequest = 'id' in data && (typeof data.id === 'string' || typeof data.id === 'number');
  const id = data.id as JsonRpcId;

  // Notifications first — answering one is as wrong as ignoring a request.
  if (!isRequest) {
    switch (data.method) {
      case 'ui/notifications/initialized':
        return { kind: 'ready' };
      case 'ui/notifications/size-changed': {
        const height = Number(params.height);
        // A page that reports nothing usable keeps the height it has; growing
        // to NaN would collapse the frame.
        return Number.isFinite(height) && height > 0 ? { kind: 'resize', height } : { kind: 'ignore' };
      }
      default:
        return { kind: 'ignore' };
    }
  }

  switch (data.method) {
    case 'ui/initialize':
      return { kind: 'reply', reply: resultReply(id, initializeResult(params.protocolVersion, host)) };
    case 'ping':
      return { kind: 'reply', reply: resultReply(id, {}) };
    case 'tools/call': {
      // Only the tool name and its arguments are read out of the message. The
      // agent and the connection come from the page that opened the view — a
      // view naming its own connection would be choosing whose credentials to
      // spend.
      if (typeof params.name !== 'string' || !params.name) {
        return { kind: 'reply', reply: errorReply(id, JSONRPC_INTERNAL_ERROR, 'Missing tool name') };
      }
      return {
        kind: 'call',
        id,
        name: params.name,
        arguments: isRecord(params.arguments) ? params.arguments : {},
      };
    }
    case 'ui/open-link': {
      // https only, and opened by us rather than by the page: the sandbox has
      // no `allow-popups` precisely so that a link is a decision of the host.
      const url = parseHttpsUrl(params.url);
      if (!url) {
        return { kind: 'reply', reply: errorReply(id, JSONRPC_INTERNAL_ERROR, 'Only https links can be opened') };
      }
      return { kind: 'open-link', id, url };
    }
    default:
      // `ui/message`, `ui/update-model-context`, `resources/read`, … — the view
      // is told plainly that the host does not do that, and can fall back.
      return { kind: 'reply', reply: errorReply(id, JSONRPC_METHOD_NOT_FOUND, 'Method not found') };
  }
}
