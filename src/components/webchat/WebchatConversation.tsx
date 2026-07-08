'use client';

import { useEffect, useRef, useState, KeyboardEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Cog6ToothIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import apiService from '@/services/api';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { formatDateTimeShort } from '@/utils/date';
import { getErrorMessage } from '@/utils/error';
import { useWebchatSubscription } from '@/realtime/useWebchatSubscription';
import { useWebchatThread, ThreadMessage } from './useWebchatThread';
import { ChatMessageText } from './ChatMessageText';
import type { WebchatMessagePayload, WebchatSessionResponse } from '@/types';

interface WebchatConversationProps {
  session: WebchatSessionResponse;
  agentName: string;
  onSessionClosed: (updated: WebchatSessionResponse) => void;
  // Title/lastMessageAt change server-side as messages flow — the parent
  // refreshes the sessions list on non-progress events.
  onActivity: () => void;
}

function MessageRow({ message }: { message: ThreadMessage }) {
  if (message.direction === 'AGENT' && message.stream === 'progress') {
    return (
      <div className="flex justify-start">
        <div className="flex items-center gap-1.5 px-3 py-1 text-xs text-muted italic">
          <Cog6ToothIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="whitespace-pre-wrap break-words">{message.text}</span>
        </div>
      </div>
    );
  }

  const isUser = message.direction === 'USER';
  const isError = message.stream === 'error';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-lg px-3 py-2 ${
          isUser
            ? `bg-accent text-accent-foreground ${message.pending ? 'opacity-60' : ''}`
            : isError
              ? 'bg-error/10 text-error border border-error/30'
              : 'bg-surface-secondary text-foreground'
        }`}
      >
        <div className="text-sm">
          <ChatMessageText text={message.text} />
        </div>
        <div
          className={`mt-1 text-[10px] ${
            isUser ? 'text-accent-foreground/70' : isError ? 'text-error/70' : 'text-muted'
          }`}
        >
          {formatDateTimeShort(message.createdAt)}
        </div>
      </div>
    </div>
  );
}

export default function WebchatConversation({
  session,
  agentName,
  onSessionClosed,
  onActivity,
}: WebchatConversationProps) {
  const t = useTranslations('Chat');
  const thread = useWebchatThread(session.sessionId);
  const [draft, setDraft] = useState('');
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState('');

  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  const { handleEvent } = thread;
  const onActivityRef = useRef(onActivity);
  useEffect(() => {
    onActivityRef.current = onActivity;
  }, [onActivity]);

  useWebchatSubscription(session.sessionId, {
    onMessage: (p: WebchatMessagePayload) => {
      handleEvent(p);
      if (p.stream !== 'progress') onActivityRef.current();
    },
  });

  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  // Follow the tail unless the user scrolled up to read history.
  useEffect(() => {
    const el = listRef.current;
    if (el && stickToBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [thread.messages, thread.awaitingReply, thread.loading]);

  const handleLoadOlder = async () => {
    const el = listRef.current;
    const prevHeight = el?.scrollHeight ?? 0;
    await thread.loadOlder();
    // Keep the viewport anchored after older messages are prepended.
    requestAnimationFrame(() => {
      const el2 = listRef.current;
      if (el2) el2.scrollTop += el2.scrollHeight - prevHeight;
    });
  };

  const handleSend = async () => {
    const text = draft;
    if (!text.trim() || session.closedAt) return;
    setDraft('');
    const ok = await thread.send(text);
    if (!ok) setDraft(text);
  };

  const handleComposerKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClose = async () => {
    setClosing(true);
    setCloseError('');
    try {
      const updated = await apiService.closeWebchatSession(session.sessionId);
      onSessionClosed(updated);
    } catch (err) {
      setCloseError(getErrorMessage(err, 'Failed to close session'));
    } finally {
      setClosing(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border shrink-0">
        <div className="min-w-0">
          <div className="text-sm font-medium text-foreground truncate">
            {session.title || t('untitledSession')}
          </div>
          <div className="text-xs text-muted truncate">
            {agentName}
            {session.closedAt
              ? ` · ${t('closedAt', { date: formatDateTimeShort(session.closedAt) })}`
              : ''}
          </div>
        </div>
        {!session.closedAt && (
          <Button variant="secondary" onClick={handleClose} loading={closing}>
            {t('closeSession')}
          </Button>
        )}
      </div>

      {/* Messages */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto min-h-0 p-4 space-y-3"
      >
        {(thread.error || closeError) && <ErrorAlert>{thread.error || closeError}</ErrorAlert>}

        {thread.hasOlder && (
          <div className="text-center">
            <button
              onClick={handleLoadOlder}
              disabled={thread.loadingOlder}
              className="text-xs text-accent hover:text-accent/80 disabled:opacity-50 transition-colors"
            >
              {thread.loadingOlder ? t('loadingMessages') : t('loadOlder')}
            </button>
          </div>
        )}

        {thread.loading ? (
          <div className="text-center py-8 text-muted text-sm">{t('loadingMessages')}</div>
        ) : thread.messages.length === 0 && !thread.awaitingReply ? (
          <div className="text-center py-8 text-muted text-sm">{t('noMessages')}</div>
        ) : (
          thread.messages.map((m) => <MessageRow key={m.key} message={m} />)
        )}

        {thread.awaitingReply && !thread.loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 bg-surface-secondary rounded-lg px-3 py-2">
              <span className="flex gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-muted animate-bounce [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-muted animate-bounce [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-muted animate-bounce" />
              </span>
              <span className="text-xs text-muted">{t('agentThinking')}</span>
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-border p-4 shrink-0">
        {thread.sendError && (
          <div className="mb-2">
            <ErrorAlert>{thread.sendError}</ErrorAlert>
          </div>
        )}
        {session.closedAt ? (
          <div className="text-center text-sm text-muted py-2">{t('sessionClosedNotice')}</div>
        ) : (
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleComposerKeyDown}
              placeholder={t('composerPlaceholder')}
              rows={2}
              className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-accent placeholder:text-muted"
            />
            <Button onClick={handleSend} disabled={!draft.trim()} title={t('send')}>
              <PaperAirplaneIcon className="h-4 w-4" />
              {t('send')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
