'use client';

import { useId, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  ArrowTopRightOnSquareIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  WindowIcon,
} from '@heroicons/react/24/outline';
import { ApiError } from '@/services/api';
import { useAgentViewContentQuery } from '@/queries/agents';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import AgentViewFrame, { AGENT_VIEW_MIN_HEIGHT } from '@/components/agents/AgentViewFrame';
import { getErrorMessage } from '@/utils/error';
import type { InlineToolCall, InlineViewDescriptor } from './useInlineToolViews';

// A view under a TOOL_CALL line starts as a compact trigger: nothing is fetched
// until the reader opens it. `resolve` asks the hook for the call's data; the
// page itself is fetched here, in parallel.
export default function InlineToolCallView({
  agentId,
  sessionId,
  descriptor,
  call,
  onResolve,
}: {
  agentId: string;
  sessionId: string;
  descriptor: InlineViewDescriptor;
  // Absent until the call's data has been resolved.
  call?: InlineToolCall;
  onResolve: (toolCallId: string) => void;
}) {
  const t = useTranslations('AgentViews');
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const bodyId = useId();

  const toggle = () => {
    if (!open) onResolve(descriptor.toolCallId);
    setOpen((value) => !value);
  };

  // A full-screen host of our own: the raw view cannot live in a tab (no URL, no
  // host for `ui/initialize`). Open synchronously — a popup blocker sees the click.
  const openInNewTab = () => {
    const params = new URLSearchParams({
      connectionId: descriptor.connectionId,
      uri: descriptor.viewUri,
      name: descriptor.name,
      sessionId,
      toolCallId: descriptor.toolCallId,
    });
    window.open(
      `${window.location.origin}/${locale}/agent-view/${encodeURIComponent(agentId)}?${params.toString()}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex items-center bg-surface-secondary">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-controls={open ? bodyId : undefined}
          className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-surface-secondary/70"
        >
          <WindowIcon className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate font-medium text-foreground">
            {descriptor.name}
          </span>
          <span className="shrink-0 text-muted">{open ? t('hideView') : t('showView')}</span>
          {open ? (
            <ChevronUpIcon className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
          ) : (
            <ChevronDownIcon className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          onClick={openInNewTab}
          title={t('openInNewTab')}
          aria-label={t('openInNewTab')}
          className="mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-surface hover:text-accent"
        >
          <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      {open && (
        <div id={bodyId} className="border-t border-border">
          <InlineToolCallBody agentId={agentId} descriptor={descriptor} call={call} />
        </div>
      )}
    </div>
  );
}

function InlineToolCallBody({
  agentId,
  descriptor,
  call,
}: {
  agentId: string;
  descriptor: InlineViewDescriptor;
  call?: InlineToolCall;
}) {
  const t = useTranslations('AgentViews');
  const { data: content, error, isLoading } = useAgentViewContentQuery(
    { connectionId: descriptor.connectionId, uri: descriptor.viewUri },
    agentId,
  );

  if (error) {
    // The binding was revoked between the trigger and the opening: the line
    // stays, the page goes, and nothing is shown for it.
    if (error instanceof ApiError && error.status === 404) return null;
    return <ErrorAlert>{getErrorMessage(error, t('loadError'))}</ErrorAlert>;
  }

  if (!call || isLoading || !content) {
    // Reserve the frame's height: replacing the loader with the iframe must not
    // push the conversation's tail down.
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 bg-surface"
        style={{ minHeight: AGENT_VIEW_MIN_HEIGHT }}
      >
        <span
          className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-accent"
          aria-hidden="true"
        />
        <span className="text-sm text-muted">{t('loading')}</span>
      </div>
    );
  }

  return (
    <AgentViewFrame
      agentId={agentId}
      view={{ connectionId: descriptor.connectionId }}
      title={descriptor.name}
      content={content}
      toolCall={{ input: call.input ?? {}, result: call.result }}
      embedded
    />
  );
}
