'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { useTheme } from '@/hooks/useTheme';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { getErrorMessage } from '@/utils/error';
import { theme as tokens } from '@/generated/tokens';
import {
  decodeViewMessage,
  errorReply,
  resultReply,
  withCsp,
  JSONRPC_INTERNAL_ERROR,
  type JsonRpcReply,
  type ViewHostContext,
} from '@/utils/mcp-view';
import type { AgentViewContentResponse, AgentViewResponse } from '@/types';

// The frame starts at a workable size and grows to what the page asks for. The
// ceiling is not a layout preference: `ui/notifications/size-changed` is a
// number from the page, and an unbounded one would hand a view the whole
// scrollbar.
const MIN_HEIGHT = 320;
const MAX_HEIGHT = 1200;

// The spec's CSS custom properties, filled from our own tokens so a view that
// honours them looks like it belongs here rather than like a white rectangle in
// a dark dashboard. A view is free to ignore every one of them.
const styleVariables = (scheme: 'light' | 'dark'): Record<string, string> => {
  const t = tokens[scheme];
  return {
    '--color-background-primary': t.background,
    '--color-background-secondary': t['surface-secondary'],
    '--color-surface-primary': t.surface,
    '--color-text-primary': t.foreground,
    '--color-text-secondary': t.muted,
    '--color-border-primary': t.border,
    '--color-accent-primary': t.accent,
    '--font-sans': 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
  };
};

export default function AgentViewFrame({
  agentId,
  view,
  content,
}: {
  agentId: string;
  view: AgentViewResponse;
  content: AgentViewContentResponse;
}) {
  const t = useTranslations('AgentViews');
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(MIN_HEIGHT);

  const { theme } = useTheme();
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const scheme: 'light' | 'dark' = theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme;

  // What the listener reads instead of closing over props: it is registered
  // once, at mount, and rebuilding it under a running page would mean tearing
  // the handshake down with it.
  //
  // The host context is settled at `ui/initialize` and this dialect has no
  // notification to revise it, so a theme switch while a view is open reaches
  // the next opening. Re-keying the iframe on it would reload the page and
  // throw away whatever the user had done inside — the wrong trade for a colour.
  const hostRef = useRef<ViewHostContext>({ theme: scheme, styles: { variables: styleVariables(scheme) } });
  const targetRef = useRef({ agentId, connectionId: view.connectionId });

  // Refs are written after the render that changed them, never during one.
  // Declared above the listener effect so that at mount they are current before
  // the first message can arrive.
  useEffect(() => {
    hostRef.current = { theme: scheme, styles: { variables: styleVariables(scheme) } };
    targetRef.current = { agentId, connectionId: view.connectionId };
  });

  // The page as it will be handed to the element — the server's markup with our
  // policy on top of it, never the markup raw.
  const doc = useMemo(() => withCsp(content.html, content.csp), [content]);

  const post = useCallback((reply: JsonRpcReply) => {
    // The window is gone once the view is closed; a tool call that resolves
    // after that has nowhere to land, and `contentWindow` is null there.
    frameRef.current?.contentWindow?.postMessage(reply, '*');
  }, []);

  // A layout effect, and the reason is the handshake. The listener has to exist
  // before the page can speak, and the phases are what guarantee it: React
  // inserts the iframe and runs layout effects synchronously in one commit,
  // while the document inside it is parsed and its scripts run in a later task.
  // A plain `useEffect` is late by a paint, and writing `srcdoc` from an effect
  // was worse than late — it raced the iframe's own initial `about:blank`
  // navigation and, run twice by StrictMode, left the frame blank at random.
  useLayoutEffect(() => {
    const onMessage = (event: MessageEvent) => {
      // The only identification available. `event.origin` is the string "null"
      // for every sandboxed document, ours and anyone else's alike, so the
      // window reference is what says this came from the view we opened.
      if (!frameRef.current || event.source !== frameRef.current.contentWindow) return;

      let action;
      try {
        action = decodeViewMessage(event.data, hostRef.current);
      } catch {
        // A malformed message is the page's problem; killing the listener over
        // it would freeze every later call.
        return;
      }

      switch (action.kind) {
        case 'reply':
          post(action.reply);
          break;
        case 'resize':
          setHeight(Math.min(Math.max(action.height, MIN_HEIGHT), MAX_HEIGHT));
          break;
        case 'open-link':
          window.open(action.url, '_blank', 'noopener,noreferrer');
          post(resultReply(action.id, {}));
          break;
        case 'call': {
          const { agentId: forAgent, connectionId } = targetRef.current;
          apiService
            .callAgentViewTool(forAgent, {
              connectionId,
              name: action.name,
              arguments: action.arguments,
            })
            // The MCP result goes back untouched — a tool that failed says so
            // with `isError` inside its own result, and turning that into a
            // JSON-RPC error would hide from the view what it asked for.
            .then((result) => post(resultReply(action.id, result)))
            .catch((error) =>
              post(errorReply(action.id, JSONRPC_INTERNAL_ERROR, getErrorMessage(error, t('toolCallFailed')))),
            );
          break;
        }
        case 'ready':
        case 'ignore':
          break;
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
    // One listener per opened view: the frame is keyed per opening, so there is
    // nothing here that can change without a remount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <iframe
      ref={frameRef}
      title={view.connectionName ?? view.uri}
      // `srcDoc` and not `src`: the page came to us as markup, and the `ui://`
      // uri is an identifier, not an address anything can be pointed at. It is
      // a prop rather than a later assignment so that the attribute is on the
      // element before it is inserted — there is then no navigation to race.
      srcDoc={doc}
      // The whole security model in one attribute. Without `allow-same-origin`
      // the document's origin is opaque: no cookies, no localStorage, no reach
      // into the dashboard's DOM or its access token — which matters because
      // this markup comes from a third-party MCP server. Deliberately absent as
      // well: `allow-top-navigation` (walks the tab off to another site),
      // `allow-popups`, `allow-forms`, `allow-modals` — each of them a way to
      // talk to the user around the page they think they are on.
      sandbox="allow-scripts"
      referrerPolicy="no-referrer"
      style={{ height }}
      className={`w-full rounded-lg bg-surface transition-[height] ${
        content.prefersBorder === false ? '' : 'border border-border'
      }`}
    />
  );
}
