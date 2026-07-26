'use client';

import { useEffect, useRef, useState, ClipboardEvent, DragEvent, KeyboardEvent } from 'react';
import { useTranslations } from 'next-intl';
import {
  ArrowUpTrayIcon,
  Cog6ToothIcon,
  PaperAirplaneIcon,
  PaperClipIcon,
} from '@heroicons/react/24/outline';
import apiService from '@/services/api';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { getAgentAvatarUrl } from '@/utils/avatar';
import { formatDateTimeShort } from '@/utils/date';
import { getErrorMessage } from '@/utils/error';
import { useWebchatSubscription } from '@/realtime/useWebchatSubscription';
import { useWebchatThread, ThreadMessage } from './useWebchatThread';
import { ChatMessageText } from './ChatMessageText';
import { ChatMessageAttachments } from './ChatMessageAttachments';
import { ComposerAttachments } from './ComposerAttachments';
import { useComposerAttachments, MAX_ATTACHMENTS } from './useComposerAttachments';
import type { WebchatMessagePayload, WebchatSessionResponse } from '@/types';

interface WebchatConversationProps {
  session: WebchatSessionResponse;
  agentName: string;
  onSessionClosed: (updated: WebchatSessionResponse) => void;
  // Title/lastMessageAt change server-side as messages flow — the parent
  // refreshes the sessions list on non-progress events.
  onActivity: () => void;
}

// Progress lines are a running commentary of one agent turn, not separate
// messages — they read as a block when packed tighter than real bubbles.
const isProgressRow = (m: ThreadMessage) => m.direction === 'AGENT' && m.stream === 'progress';

function MessageRow({
  message,
  onExpired,
}: {
  message: ThreadMessage;
  onExpired: () => Promise<void>;
}) {
  if (isProgressRow(message)) {
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
        {message.text && (
          <div className="text-sm">
            <ChatMessageText text={message.text} />
          </div>
        )}
        {message.parts.length > 0 && (
          <div className={message.text ? 'mt-2' : ''}>
            <ChatMessageAttachments parts={message.parts} onExpired={onExpired} />
          </div>
        )}
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
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState('');
  const composer = useComposerAttachments();
  // Depth counter for dragenter/dragleave pairs while a file hovers the pane.
  const [dragDepth, setDragDepth] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    const hasAttachments = composer.attachments.length > 0;
    if ((!text.trim() && !hasAttachments) || session.closedAt || sending) return;
    setSending(true);
    try {
      // Uploads start on file pick; here we only wait out the stragglers.
      const settled = await composer.waitForUploads();
      // A failed upload keeps its error chip in the tray — fix or remove it first.
      if (settled.some((a) => a.status === 'error')) return;
      setDraft('');
      const ok = await thread.send(text, composer.toOptimisticParts(settled));
      if (!ok) {
        setDraft(text);
        return; // keep the tray so the user can retry the send as-is
      }
      composer.clearAfterSend();
    } finally {
      setSending(false);
    }
  };

  const handleComposerKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Ctrl/Cmd+V with a screenshot in the clipboard attaches it; text pastes normally.
  const handleComposerPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(e.clipboardData.files);
    if (files.length === 0 || session.closedAt) return;
    e.preventDefault();
    composer.addFiles(files);
  };

  const dragHasFiles = (e: DragEvent) => Array.from(e.dataTransfer.types).includes('Files');

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    if (!dragHasFiles(e) || session.closedAt) return;
    e.preventDefault();
    setDragDepth((d) => d + 1);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (!dragHasFiles(e) || session.closedAt) return;
    e.preventDefault();
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    if (!dragHasFiles(e) || session.closedAt) return;
    e.preventDefault();
    setDragDepth((d) => Math.max(0, d - 1));
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    if (!dragHasFiles(e) || session.closedAt) return;
    e.preventDefault();
    setDragDepth(0);
    composer.addFiles(Array.from(e.dataTransfer.files));
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
    <div
      className="relative flex flex-col h-full min-h-0"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drop-to-attach overlay */}
      {dragDepth > 0 && !session.closedAt && (
        <div className="pointer-events-none absolute inset-2 z-10 grid place-items-center rounded-xl border-2 border-dashed border-accent bg-accent/10">
          <div className="text-center">
            <ArrowUpTrayIcon className="mx-auto h-8 w-8 text-accent" />
            <div className="mt-1 text-sm font-medium text-foreground">{t('dropToAttach')}</div>
            <div className="text-xs text-muted">{t('dropHint', { max: MAX_ATTACHMENTS })}</div>
          </div>
        </div>
      )}
      {/* Header — carries the agent identity, since the chat section drops the
          page-level agent header to give the conversation the full canvas. */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <img src={getAgentAvatarUrl(agentName)} alt={agentName} className="h-8 w-8 rounded-lg shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground truncate">{agentName}</div>
            <div className="text-xs text-muted truncate">
              {session.title || t('untitledSession')}
              {session.closedAt
                ? ` · ${t('closedAt', { date: formatDateTimeShort(session.closedAt) })}`
                : ''}
            </div>
          </div>
        </div>
        {!session.closedAt && (
          <Button variant="secondary" onClick={handleClose} loading={closing}>
            {t('closeSession')}
          </Button>
        )}
      </div>

      {/* Messages */}
      <div ref={listRef} onScroll={handleScroll} className="flex-1 overflow-y-auto min-h-0">
        {/* Reading column: the pane is as wide as the window allows, but a chat
            line past ~75 characters stops scanning as a conversation. */}
        <div className="mx-auto w-full max-w-3xl p-4 space-y-3">
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
            // Own spacing instead of the container's space-y so consecutive
            // progress lines can sit closer together than message bubbles.
            <div>
              {thread.messages.map((m, i) => {
                const prev = thread.messages[i - 1];
                const tight = i > 0 && isProgressRow(m) && isProgressRow(prev);
                return (
                  <div key={m.key} className={i === 0 ? '' : tight ? 'mt-0.5' : 'mt-3'}>
                    <MessageRow message={m} onExpired={thread.refreshParts} />
                  </div>
                );
              })}
            </div>
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
      </div>

      {/* Composer — same reading column as the messages, so the input lines up
          with the conversation instead of spanning the whole pane. */}
      <div className="border-t border-border shrink-0">
        <div className="mx-auto w-full max-w-3xl p-4">
          {thread.sendError && (
            <div className="mb-2">
              <ErrorAlert>{thread.sendError}</ErrorAlert>
            </div>
          )}
          {session.closedAt ? (
            <div className="text-center text-sm text-muted py-2">{t('sessionClosedNotice')}</div>
          ) : (
            <>
              <ComposerAttachments
                attachments={composer.attachments}
                onRemove={composer.remove}
                onRetry={composer.retry}
              />
              <div className="flex items-end gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  hidden
                  onChange={(e) => {
                    composer.addFiles(Array.from(e.target.files ?? []));
                    e.target.value = ''; // allow re-picking the same file
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!composer.canAddMore}
                  title={composer.canAddMore ? t('attachFiles') : t('maxAttachments', { max: MAX_ATTACHMENTS })}
                  className="shrink-0 rounded-lg border border-border p-2.5 text-muted transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:text-muted"
                >
                  <PaperClipIcon className="h-4 w-4" />
                  <span className="sr-only">{t('attachFiles')}</span>
                </button>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={handleComposerKeyDown}
                  onPaste={handleComposerPaste}
                  placeholder={t('composerPlaceholder')}
                  rows={2}
                  className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-accent placeholder:text-muted"
                />
                <Button
                  onClick={handleSend}
                  loading={sending}
                  disabled={!draft.trim() && composer.attachments.length === 0}
                  title={t('send')}
                >
                  <PaperAirplaneIcon className="h-4 w-4" />
                  {t('send')}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
