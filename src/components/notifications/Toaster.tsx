'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Link } from '@/i18n/navigation';
import { getAgentAvatarUrl } from '@/utils/avatar';
import { dismissAgentReply, useAgentReplyToastList, type AgentReplyToast } from './toastStore';

const VISIBLE_MS = 6_000;

export default function Toaster() {
  const toasts = useAgentReplyToastList();
  // Always mounted: screen readers announce changes to an existing live region.
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)] z-50 flex flex-col items-stretch gap-2 sm:inset-x-auto sm:right-6 sm:w-80"
    >
      {toasts.map((toast) => (
        // Version in the key restarts the timer on update.
        <ToastCard key={`${toast.agentId}:${toast.version}`} toast={toast} />
      ))}
    </div>
  );
}

// Paused under the pointer and while the tab is hidden.
function useDismissTimer(onElapsed: () => void) {
  const [hovered, setHovered] = useState(false);
  const [hidden, setHidden] = useState(
    () => typeof document !== 'undefined' && document.visibilityState === 'hidden',
  );
  const remainingRef = useRef(VISIBLE_MS);
  const elapsedRef = useRef(onElapsed);
  useEffect(() => {
    elapsedRef.current = onElapsed;
  }, [onElapsed]);

  useEffect(() => {
    const onChange = () => setHidden(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);

  useEffect(() => {
    if (hovered || hidden) return;
    const startedAt = Date.now();
    const timer = setTimeout(() => elapsedRef.current(), remainingRef.current);
    return () => {
      clearTimeout(timer);
      remainingRef.current -= Date.now() - startedAt;
    };
  }, [hovered, hidden]);

  return { onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false) };
}

function ToastCard({ toast }: { toast: AgentReplyToast }) {
  const t = useTranslations('Notifications');
  const dismiss = () => dismissAgentReply(toast.agentId);
  const hoverHandlers = useDismissTimer(dismiss);

  const name = toast.agentName ?? t('agentFallback');
  const title = toast.isError ? t('failed', { agent: name }) : t('replied', { agent: name });
  const body = toast.text ?? t('attachment');

  return (
    <div
      {...hoverHandlers}
      className={`pointer-events-auto relative flex gap-3 rounded-xl border bg-surface p-3 pr-9 shadow-lg ${
        toast.isError ? 'border-error/50' : 'border-border'
      }`}
    >
      <Link
        href={`/dashboard/agents/${toast.agentId}/chat`}
        onClick={dismiss}
        className="flex min-w-0 flex-1 gap-3 after:absolute after:inset-0 after:content-['']"
      >
        {toast.agentName ? (
          <img src={getAgentAvatarUrl(toast.agentName)} alt="" className="h-9 w-9 shrink-0 rounded-md" />
        ) : (
          <span className="h-9 w-9 shrink-0 rounded-md bg-surface-secondary" />
        )}
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-sm font-semibold ${toast.isError ? 'text-error' : 'text-foreground'}`}>
            {title}
          </span>
          <span className="mt-0.5 line-clamp-2 text-xs text-muted">{body}</span>
          {toast.count > 1 && (
            <span className="mt-1 block text-[11px] text-accent">{t('moreReplies', { count: toast.count })}</span>
          )}
        </span>
      </Link>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t('dismiss')}
        className="absolute right-2 top-2 z-10 grid h-6 w-6 place-items-center rounded-md text-muted transition-colors hover:bg-surface-secondary hover:text-foreground"
      >
        <XMarkIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
