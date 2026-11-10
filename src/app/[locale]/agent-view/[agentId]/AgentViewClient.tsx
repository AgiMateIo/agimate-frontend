'use client';

import { useEffect, type ReactNode } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { WindowIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useUser } from '@/contexts/UserContext';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useSessionToolCallQuery } from '@/queries/chat-sessions';
import { useAgentViewContentQuery } from '@/queries/agents';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import AgentViewFrame from '@/components/agents/AgentViewFrame';
import { getErrorMessage } from '@/utils/error';

// A full-window host for one view. The raw page can't live in a tab (it has a
// `ui://` identity, not an address, and needs a host for `ui/initialize`), so
// the tab opens this route, which fetches the page and the call behind it.
export default function AgentViewClient() {
  const t = useTranslations('AgentViews');
  const { user, loading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const agentId = useParams().agentId as string;

  const connectionId = searchParams.get('connectionId') ?? '';
  const uri = searchParams.get('uri') ?? '';
  const name = searchParams.get('name') ?? '';
  const sessionId = searchParams.get('sessionId');
  const toolCallId = searchParams.get('toolCallId');
  const hasCall = !!sessionId && !!toolCallId;
  const search = searchParams.toString();
  const ready = !loading && !!user;

  useEffect(() => {
    if (loading || user) return;
    const next = `${pathname}${search ? `?${search}` : ''}`;
    router.replace(`/login?next=${encodeURIComponent(next)}`);
  }, [loading, user, router, pathname, search]);

  // Nothing is fetched before the sign-in is known; the tab may have no access
  // token of its own until the shared refresh cookie has been exchanged.
  const callQuery = useSessionToolCallQuery(
    ready ? sessionId : null,
    ready ? toolCallId : null,
  );
  const call = callQuery.data;
  const paramView = connectionId && uri ? { connectionId, uri } : null;
  const view = call
    ? call.viewUri
      ? { connectionId: call.connectionId, uri: call.viewUri }
      : null
    : paramView;
  const contentQuery = useAgentViewContentQuery(ready ? view : null, agentId);

  const title = call?.name || name || uri || t('open');
  useEffect(() => {
    if (title) document.title = title;
  }, [title]);

  if (loading || !user) return <FullScreenLoader />;

  if (!agentId || !connectionId || !uri) {
    return (
      <ViewShell title={t('open')}>
        <ErrorAlert>{t('invalidLink')}</ErrorAlert>
      </ViewShell>
    );
  }

  if (hasCall && callQuery.isLoading) {
    return (
      <ViewShell title={title}>
        <Loader />
      </ViewShell>
    );
  }

  if (hasCall && callQuery.error) {
    return (
      <ViewShell title={title}>
        <ErrorAlert>{getErrorMessage(callQuery.error, t('loadError'))}</ErrorAlert>
      </ViewShell>
    );
  }

  if (hasCall && call && !call.viewUri) {
    return (
      <ViewShell title={title}>
        <ErrorAlert>{t('viewUnavailable')}</ErrorAlert>
      </ViewShell>
    );
  }

  if (hasCall && call && !call.result) {
    // The call is still running; its query polls until the result lands.
    return (
      <ViewShell title={title}>
        <Loader />
      </ViewShell>
    );
  }

  if (contentQuery.isLoading) {
    return (
      <ViewShell title={title}>
        <Loader />
      </ViewShell>
    );
  }

  if (contentQuery.error) {
    return (
      <ViewShell title={title}>
        <ErrorAlert>{getErrorMessage(contentQuery.error, t('loadError'))}</ErrorAlert>
      </ViewShell>
    );
  }

  if (!view || !contentQuery.data) {
    return (
      <ViewShell title={title}>
        <ErrorAlert>{t('viewUnavailable')}</ErrorAlert>
      </ViewShell>
    );
  }

  return (
    <ViewShell title={title}>
      <AgentViewFrame
        agentId={agentId}
        view={{ connectionId: view.connectionId }}
        title={title}
        content={contentQuery.data}
        toolCall={
          hasCall && call?.result ? { input: call.input ?? {}, result: call.result } : undefined
        }
      />
    </ViewShell>
  );
}

function FullScreenLoader() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <span
        className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-accent"
        aria-hidden="true"
      />
    </div>
  );
}

function Loader() {
  const t = useTranslations('AgentViews');
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2">
      <span
        className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-accent"
        aria-hidden="true"
      />
      <span className="text-sm text-muted">{t('loading')}</span>
    </div>
  );
}

function ViewShell({ title, children }: { title: string; children: ReactNode }) {
  const t = useTranslations('Common');
  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3 sm:px-4">
        <WindowIcon className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
        <div className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{title}</div>
        <button
          type="button"
          onClick={() => window.close()}
          title={t('close')}
          aria-label={t('close')}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-surface-secondary hover:text-foreground"
        >
          <XMarkIcon className="h-4 w-4" aria-hidden="true" />
        </button>
      </header>
      <main className="min-h-0 flex-1 overflow-auto p-3 sm:p-4">
        <div className="mx-auto w-full max-w-[1600px]">{children}</div>
      </main>
    </div>
  );
}
