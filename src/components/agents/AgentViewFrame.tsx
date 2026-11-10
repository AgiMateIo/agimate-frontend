'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { useTheme } from '@/hooks/useTheme';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { getErrorMessage } from '@/utils/error';
import { theme as tokens, scale } from '@/generated/tokens';
import {
  decodeViewMessage,
  errorReply,
  resultReply,
  toolInputNotification,
  toolResultNotification,
  withCsp,
  JSONRPC_INTERNAL_ERROR,
  type JsonRpcNotification,
  type JsonRpcReply,
  type ViewHostContext,
} from '@/utils/mcp-view';
import type { AgentViewContentResponse, AgentViewResponse, CallToolResult } from '@/types';

// The frame starts at a workable size and grows to what the page asks for. The
// ceiling is not a layout preference: `ui/notifications/size-changed` is a
// number from the page, and an unbounded one would hand a view the whole
// scrollbar.
export const AGENT_VIEW_MIN_HEIGHT = 320;
const MIN_HEIGHT = AGENT_VIEW_MIN_HEIGHT;
const MAX_HEIGHT = 1200;

// A view's SDK registers `ontoolinput`/`ontoolresult` in an effect that runs
// *after* `initialized` (Excalidraw does exactly this). Sending in the same
// task loses the data before any handler exists; a short defer lets the page's
// React tree mount first.
const INLINE_DATA_DELAY_MS = 100;

// The call an inline view renders. The launcher passes nothing: its page opens
// cold and asks for its own data.
interface InlineToolCallData {
  input: Record<string, unknown>;
  result?: CallToolResult;
}

// The spec's CSS custom properties, filled from our own tokens so a view that
// honours them looks like it belongs here rather than like a white rectangle in
// a dark dashboard. A view is free to ignore every one of them. Only the names
// the spec declares: `hostContext.styles.variables` is validated strictly, and
// one extra key fails the whole handshake.
const styleVariables = (scheme: 'light' | 'dark'): Record<string, string> => {
  const t = tokens[scheme];
  return {
    '--color-background-primary': t.background,
    '--color-background-secondary': t['surface-secondary'],
    '--color-text-primary': t.foreground,
    '--color-text-secondary': t.muted,
    '--color-border-primary': t.border,
    // What a panel paints its buttons and its errors with. We have no "info"
    // colour of our own — the accent is the one thing here that reads as
    // "act on this", so it plays both parts.
    '--color-text-info': t.accent,
    '--color-text-danger': t.error,
    '--font-sans': 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
    '--border-radius-md': scale['radius-control'],
  };
};

export default function AgentViewFrame({
  agentId,
  view,
  title,
  content,
  toolCall,
  embedded = false,
}: {
  agentId: string;
  // Only the connection is needed to run the view's tools; the launcher has the
  // whole catalogue row, an inline view only the call it came from.
  view: Pick<AgentViewResponse, 'connectionId'>;
  // The name the launcher settled on — the connector's catalogue name for our
  // own panels, the connection's for an MCP server. Worked out once there so
  // the frame and the heading above it cannot disagree.
  title: string;
  content: AgentViewContentResponse;
  // Present only for an inline view: after `ui/notifications/initialized` the
  // host hands the page the arguments and the result of the call it renders.
  toolCall?: InlineToolCallData;
  // The caller draws the card around the page (the inline entry does); the
  // frame's own border would double it.
  embedded?: boolean;
}) {
  const t = useTranslations('AgentViews');
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(MIN_HEIGHT);

  const { theme } = useTheme();
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const scheme: 'light' | 'dark' = theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme;
  const locale = useLocale();

  // What the listener reads instead of closing over props: it is registered
  // once, at mount, and rebuilding it under a running page would mean tearing
  // the handshake down with it.
  //
  // The host context is settled at `ui/initialize` and this dialect has no
  // notification to revise it, so a theme switch while a view is open reaches
  // the next opening. Re-keying the iframe on it would reload the page and
  // throw away whatever the user had done inside — the wrong trade for a colour.
  const hostRef = useRef<ViewHostContext>({
    theme: scheme,
    locale,
    styles: { variables: styleVariables(scheme) },
  });
  const targetRef = useRef({ agentId, connectionId: view.connectionId });

  // The inline data is a prop but the listener reads it from a ref: it is
  // registered once, at mount, and the page may answer `ui/initialize` before
  // the next render has updated anything.
  const toolCallRef = useRef(toolCall);
  const bridgeRef = useRef({
    initialized: false,
    initialSendDone: false,
    inputSent: false,
    sentResult: null as CallToolResult | null,
    timer: null as ReturnType<typeof setTimeout> | null,
  });

  // Refs are written after the render that changed them, never during one.
  // Declared above the listener effect so that at mount they are current before
  // the first message can arrive.
  useEffect(() => {
    hostRef.current = { theme: scheme, locale, styles: { variables: styleVariables(scheme) } };
    targetRef.current = { agentId, connectionId: view.connectionId };
  });

  // The page as it will be handed to the element — the server's markup with our
  // policy on top of it, never the markup raw.
  const doc = useMemo(() => withCsp(content.html, content.csp), [content]);

  const post = useCallback((message: JsonRpcReply | JsonRpcNotification) => {
    // The window is gone once the view is closed; a tool call that resolves
    // after that has nowhere to land, and `contentWindow` is null there.
    frameRef.current?.contentWindow?.postMessage(message, '*');
  }, []);

  // Input goes first and exactly once; a result that changes afterwards is
  // sent alone, without reopening the page.
  const sendInlineData = useCallback(() => {
    const bridge = bridgeRef.current;
    const call = toolCallRef.current;
    if (!bridge.initialized || !call) return;
    if (!bridge.inputSent) {
      post(toolInputNotification(call.input));
      bridge.inputSent = true;
    }
    if (call.result != null && bridge.sentResult !== call.result) {
      post(toolResultNotification(call.result));
      bridge.sentResult = call.result;
    }
    bridge.initialSendDone = true;
  }, [post]);

  const scheduleInitialSend = useCallback(() => {
    const bridge = bridgeRef.current;
    if (bridge.timer !== null) clearTimeout(bridge.timer);
    bridge.timer = setTimeout(() => {
      bridge.timer = null;
      sendInlineData();
    }, INLINE_DATA_DELAY_MS);
  }, [sendInlineData]);

  useEffect(() => {
    toolCallRef.current = toolCall;
    // Before the first send, the scheduled one picks up the latest data; a
    // later result update is delivered directly.
    if (bridgeRef.current.initialSendDone) sendInlineData();
  }, [toolCall, sendInlineData]);

  useEffect(
    () => () => {
      if (bridgeRef.current.timer !== null) clearTimeout(bridgeRef.current.timer);
    },
    [],
  );

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
        case 'ready': {
          const bridge = bridgeRef.current;
          // A second `initialized` means the iframe loaded a new document (its
          // `srcDoc` changed); the call data has to be handed to it again.
          if (bridge.initialized) {
            bridge.inputSent = false;
            bridge.sentResult = null;
          }
          bridge.initialized = true;
          bridge.initialSendDone = false;
          if (toolCallRef.current) scheduleInitialSend();
          break;
        }
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

  // A border is drawn inside the declared height (`box-sizing: border-box`,
  // Tailwind's preflight, iframes included), so the page would get 2px less
  // room than the number it asked for — enough for a permanent scrollbar with a
  // full-length thumb. The border is added to the height rather than the box
  // switched to `content-box`, which would make `w-full` mean `100% + 2px` and
  // trade the inner scrollbar for a horizontal one on the page. An embedded
  // frame has no border of its own: the caller's card is the frame.
  const bordered = !embedded && content.prefersBorder !== false;

  return (
    <iframe
      ref={frameRef}
      title={title}
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
      style={{ height: bordered ? height + 2 : height }}
      // `block` and not the default `inline`: an inline frame sits on a text
      // baseline, and the descender space left under it reads as a stray gap at
      // the bottom of the card.
      className={`block w-full bg-surface transition-[height] ${bordered ? 'rounded-lg border border-border' : ''}`}
    />
  );
}
