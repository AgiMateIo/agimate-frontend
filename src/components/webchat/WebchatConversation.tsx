'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  ClipboardEvent,
  DragEvent,
  KeyboardEvent,
} from 'react';
import { useTranslations } from 'next-intl';
import {
  ArrowLeftIcon,
  ArrowUpIcon,
  ArrowUpTrayIcon,
  Cog6ToothIcon,
  FolderOpenIcon,
  PencilSquareIcon,
  PlusIcon,
  QueueListIcon,
  StopIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import apiService from '@/services/api';
import { useRouter } from '@/i18n/navigation';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { getAgentAvatarUrl } from '@/utils/avatar';
import { formatDateTimeShort } from '@/utils/date';
import { getErrorMessage } from '@/utils/error';
import { useWebchatSubscription } from '@/realtime/useWebchatSubscription';
import { useMarkWebchatSessionRead } from '@/queries/webchat';
import { useWebchatThread, ThreadMessage } from './useWebchatThread';
import { ChatMessageText } from './ChatMessageText';
import { ChatMessageAttachments } from './ChatMessageAttachments';
import { ComposerAttachments } from './ComposerAttachments';
import FilePickerModal from '@/components/files/FilePickerModal';
import RenameSessionModal from '@/components/sessions/RenameSessionModal';
import { useComposerAttachments, MAX_ATTACHMENTS } from './useComposerAttachments';
import { useComposerSending, useComposerStore, useComposerText } from './composerStore';
import type { WebchatMessagePayload, ChatSessionResponse } from '@/types';
import { Placeholder } from '@/components/ui/Placeholder';

interface WebchatConversationProps {
  session: ChatSessionResponse;
  agentName: string;
  // Closing and renaming both answer the enriched row — one handler puts either
  // back into the sessions list.
  onSessionUpdated: (updated: ChatSessionResponse) => void;
  // Title/lastActivityAt change server-side as messages flow — the parent
  // refreshes the sessions list on non-progress events.
  onActivity: () => void;
  // Returns to the sessions list where the two panes can't share the screen
  // (below `md`); the button that calls it is hidden from `md` up.
  onBack?: () => void;
}

// Progress lines are a running commentary of one agent turn, not separate
// messages — they read as a block when packed tighter than real bubbles.
const isProgressRow = (m: ThreadMessage) => m.direction === 'AGENT' && m.stream === 'progress';

// How far the composer is allowed to grow before it starts scrolling. Past this
// the input is eating the conversation it belongs to.
const MAX_COMPOSER_ROWS = 5;

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
        className={`max-w-[85%] rounded-lg px-3 py-2 sm:max-w-[80%] ${
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
  onSessionUpdated,
  onActivity,
  onBack,
}: WebchatConversationProps) {
  const t = useTranslations('Chat');
  const tCommon = useTranslations('Common');
  const tRuns = useTranslations('Runs');
  const router = useRouter();
  const sessionId = session.id;
  const thread = useWebchatThread(sessionId, session.isRunning);
  const markRead = useMarkWebchatSessionRead();
  // Text, tray and the in-flight send live above this component: switching
  // sessions remounts it (`key={sessionId}` — the thread is built on that), and
  // a draft is not something to lose over a click on another conversation.
  const composerStore = useComposerStore();
  const draft = useComposerText(sessionId);
  const sending = useComposerSending(sessionId);
  const setDraft = useCallback(
    (text: string) => composerStore.setText(sessionId, text),
    [composerStore, sessionId]
  );
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState('');
  const [renaming, setRenaming] = useState(false);
  const composer = useComposerAttachments(sessionId);
  // Depth counter for dragenter/dragleave pairs while a file hovers the pane.
  const [dragDepth, setDragDepth] = useState(0);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  const { handleEvent } = thread;
  const onActivityRef = useRef(onActivity);
  useEffect(() => {
    onActivityRef.current = onActivity;
  }, [onActivity]);

  // Opening a conversation is reading it — the pointer goes to the end, with no
  // body, and the badge on the row behind it drops to zero. Sending a message
  // and closing the session clear it server-side, so neither needs a call.
  const hasMessages = session.lastMessage !== null;
  useEffect(() => {
    // A session that never had a message has nothing to mark — that is every
    // freshly created chat, and it opens straight into this component.
    if (hasMessages) markRead(sessionId);
  }, [markRead, sessionId, hasMessages]);

  useWebchatSubscription(sessionId, {
    onMessage: (p: WebchatMessagePayload) => {
      handleEvent(p);
      if (p.stream === 'progress') return;
      onActivityRef.current();
      // A reply that lands while the user is looking at it is read on arrival:
      // otherwise leaving the chat would leave a badge for a message they
      // watched being written.
      if (p.direction === 'AGENT') markRead(sessionId);
    },
  });

  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  // Follow the tail unless the user scrolled up to read history. `draft` belongs
  // in here: the composer is part of the scrolled content, so text that grew it
  // just pushed the last message up out of view.
  useEffect(() => {
    const el = listRef.current;
    if (el && stickToBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [thread.messages, thread.awaitingReply, thread.loading, draft, composer.attachments]);

  // The composer grows with the text rather than scrolling inside a fixed two
  // rows. The height has to be cleared before measuring: scrollHeight never
  // reports less than the height already set on the element.
  const resizeComposer = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    const styles = getComputedStyle(el);
    const lineHeight = parseFloat(styles.lineHeight) || 20;
    const padding = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
    const max = lineHeight * MAX_COMPOSER_ROWS + padding;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, max)}px`;
    el.style.overflowY = el.scrollHeight > max ? 'auto' : 'hidden';
  }, []);

  // Also on viewport changes: the same text wraps into a different number of
  // lines when the pane gets narrower (rotating a phone, opening the sidebar).
  useEffect(() => {
    resizeComposer();
    window.addEventListener('resize', resizeComposer);
    return () => window.removeEventListener('resize', resizeComposer);
  }, [draft, resizeComposer]);

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
    composerStore.setSending(sessionId, true);
    try {
      // Uploads start on file pick; here we only wait out the stragglers.
      const settled = await composer.waitForUploads();
      // Anything short of 'ready' holds the send back: a failed upload keeps its
      // error chip until it is fixed or removed, and a chip still uploading past
      // the barrier would be dropped by `toOptimisticParts` — the message would
      // go out without the file and say nothing about it.
      if (settled.some((a) => a.status !== 'ready')) return;
      setDraft('');
      const ok = await thread.send(text, composer.toOptimisticParts(settled));
      if (!ok) {
        setDraft(text);
        return; // keep the tray so the user can retry the send as-is
      }
      composer.clearAfterSend();
    } finally {
      composerStore.setSending(sessionId, false);
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
      const updated = await apiService.closeChatSession(sessionId);
      // Nothing left to send it from: the composer is replaced by the closed
      // notice, so the draft goes and its previews with it.
      composer.discard();
      onSessionUpdated(updated);
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
        <div className="pointer-events-none absolute inset-2 z-20 grid place-items-center rounded-xl border-2 border-dashed border-accent bg-accent/10">
          <div className="text-center">
            <ArrowUpTrayIcon className="mx-auto h-8 w-8 text-accent" />
            <div className="mt-1 text-sm font-medium text-foreground">{t('dropToAttach')}</div>
            <div className="text-xs text-muted">{t('dropHint', { max: MAX_ATTACHMENTS })}</div>
          </div>
        </div>
      )}
      {/* Header — carries the agent identity, since the chat section drops the
          page-level agent header to give the conversation the full canvas. */}
      <div className="flex h-16 items-center justify-between gap-2 px-3 border-b border-border shrink-0 sm:gap-3 sm:px-4">
        <div className="flex items-center gap-2.5 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label={tCommon('back')}
              className="-ml-1 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-secondary hover:text-foreground md:hidden"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
          )}
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
        {/* Both header actions live in the overflow menu: neither is part of
            writing a message, and a header that keeps them visible spends its
            width on things used once per conversation. Closing is destructive
            enough to sit apart, at the bottom and in the error colour. */}
        <DropdownMenu
          items={[
            {
              // The title is the only handle on a conversation in the list
              // beside it, and the one the backend wrote from the first message
              // rarely survives contact with a long chat.
              label: t('rename'),
              icon: PencilSquareIcon,
              onClick: () => setRenaming(true),
            },
            {
              // The chat shows what was said; the runs behind it show what was
              // done — the tool calls, the reasoning, and the runs that were
              // cancelled or that the agent has no memory of.
              label: tRuns('viewRuns'),
              icon: QueueListIcon,
              onClick: () =>
                router.push(
                  `/dashboard/agents/${session.agentId}/runs?sessionId=${sessionId}`,
                ),
            },
            ...(session.closedAt
              ? []
              : [
                  {
                    // The label doesn't change while the request is in flight —
                    // the item just stops responding; "Loading…" in place of the
                    // action reads as a different menu entry.
                    label: t('closeSession'),
                    icon: XCircleIcon,
                    onClick: handleClose,
                    disabled: closing,
                    danger: true,
                    separated: true,
                  },
                ]),
          ]}
        />
      </div>

      {/* Messages. `scrollbar-gutter: stable both-edges` keeps the reading
          column centred against the *pane*, not against the pane minus a
          scrollbar — otherwise the messages shift half a scrollbar left of the
          composer floating below them, which are supposed to share one column. */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        className="flex flex-1 flex-col overflow-y-auto min-h-0 [scrollbar-gutter:stable_both-edges]"
      >
        {/* Reading column: the pane is as wide as the window allows, but a chat
            line past ~75 characters stops scanning as a conversation.
            `shrink-0` because this is now a flex item: without it the column
            would be squeezed to fit instead of overflowing into a scroll. */}
        <div className="mx-auto w-full max-w-3xl shrink-0 p-3 space-y-3 sm:p-4">
          {(thread.error || closeError) && <ErrorAlert>{thread.error || closeError}</ErrorAlert>}

          {thread.hasOlder && (
            <div className="text-center">
              <button
                onClick={handleLoadOlder}
                disabled={thread.loadingOlder}
                className="text-xs text-accent hover:text-accent/80 disabled:opacity-50 transition-colors"
              >
                {thread.loadingOlder ? t('loadingMessages') : tCommon('loadOlder')}
              </button>
            </div>
          )}

          {thread.loading ? (
            <Placeholder size="sm">{t('loadingMessages')}</Placeholder>
          ) : thread.messages.length === 0 && !thread.awaitingReply ? (
            <Placeholder size="sm">{t('noMessages')}</Placeholder>
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
        {/* Composer — same reading column as the messages, so the input lines up
            with the conversation instead of spanning the whole pane.

            It lives *inside* the scrolling area as a sticky element rather than
            floating over it. That way its height is real content: the newest
            message can never come to rest underneath it, with no measuring of
            the composer and nothing to keep in sync. Older messages still pass
            behind it while scrolling, which is the whole point of the floating
            look. `mt-auto` covers the short-conversation case — a sticky element
            with nothing to scroll would otherwise sit wherever the content ends,
            halfway up the pane.

            A full-width strip of pane colour under the conversation reads as a
            slab painted over it, so only the input's own box is opaque —
            everything around it is transparent and `pointer-events-none`, and
            scrolling or clicking in that margin reaches the messages behind. */}
        <div className="pointer-events-none sticky bottom-0 z-10 mt-auto shrink-0">
          <div className="mx-auto w-full max-w-3xl p-3 sm:p-4">
            {(thread.sendError || thread.stopError) && (
              <div className="pointer-events-auto mb-2">
                <ErrorAlert>{thread.sendError || thread.stopError}</ErrorAlert>
              </div>
            )}
            {session.closedAt ? (
              <div className="pointer-events-auto rounded-2xl border border-border bg-background/80 py-2 text-center text-sm text-muted backdrop-blur-md">
                {t('sessionClosedNotice')}
              </div>
            ) : (
              <>
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
                {/* One field, not a row of controls: the text grows the box
                    upwards and everything else lines up along its bottom edge.
                    Translucent + blurred, so a message passing underneath stays
                    present without being readable through the input. */}
                <div className="pointer-events-auto rounded-2xl border border-border bg-background/80 backdrop-blur-md transition-colors focus-within:border-accent/60 focus-within:ring-1 focus-within:ring-accent/40">
                  {/* The field is inset from the corner instead of filling it: past
                      the row cap its scrollbar is drawn hard against the element's
                      own edge, and a square scrollbar track in a rounded corner
                      cuts a notch out of it. Insetting keeps the bar clear of the
                      curve — and unlike `overflow-hidden` on the box, it doesn't
                      clip the attach menu, which unfolds upwards out of it. */}
                  <div className="pl-3.5 pr-2 pt-3">
                    <textarea
                      ref={textareaRef}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={handleComposerKeyDown}
                      onPaste={handleComposerPaste}
                      placeholder={t('composerPlaceholder')}
                      rows={1}
                      // 16px below `sm`: iOS Safari zooms the page in on a focused
                      // input with a smaller font, and never zooms back out.
                      // `leading-6` is not decoration — the row cap is measured off it.
                      className="block w-full resize-none bg-transparent pb-1 pr-1 text-base leading-6 text-foreground placeholder:text-muted focus:outline-none sm:text-sm"
                    />
                  </div>
                  <div className="flex items-end gap-2 px-2 pb-2">
                    {/* Two ways to attach, one button: uploading from the device,
                        and referencing a file the user already has — which needs
                        no second upload and no second copy against the daily quota. */}
                    <DropdownMenu
                      icon={PlusIcon}
                      placement="top"
                      align="left"
                      disabled={!composer.canAddMore}
                      label={
                        composer.canAddMore
                          ? t('attachFiles')
                          : t('maxAttachments', { max: MAX_ATTACHMENTS })
                      }
                      triggerClassName="grid h-8 w-8 place-items-center rounded-full border border-border text-muted transition-colors hover:border-accent hover:text-accent"
                      items={[
                        {
                          label: t('uploadFromDevice'),
                          icon: ArrowUpTrayIcon,
                          onClick: () => fileInputRef.current?.click(),
                        },
                        {
                          label: t('pickFromFiles'),
                          icon: FolderOpenIcon,
                          onClick: () => setShowFilePicker(true),
                        },
                      ]}
                    />
                    <div className="min-w-0 flex-1">
                      <ComposerAttachments
                        attachments={composer.attachments}
                        onRemove={composer.remove}
                        onRetry={composer.retry}
                      />
                    </div>
                    {/* Stop appears next to send, never in place of it: a follow-up
                        message stays legal while the agent works, and a button that
                        changes meaning under the cursor turns a second send into a
                        stop. Send therefore keeps the same spot either way. */}
                    {thread.awaitingReply && (
                      <button
                        type="button"
                        onClick={thread.stop}
                        disabled={thread.stopping}
                        title={thread.stopping ? t('stopping') : t('stopRun')}
                        aria-label={thread.stopping ? t('stopping') : t('stopRun')}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border text-muted transition-colors hover:border-error/50 hover:text-error disabled:cursor-default disabled:opacity-50 disabled:hover:border-border disabled:hover:text-muted"
                      >
                        <StopIcon className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={sending || (!draft.trim() && composer.attachments.length === 0)}
                      title={t('send')}
                      aria-label={t('send')}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-40 disabled:hover:bg-accent"
                    >
                      {sending ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent-foreground/40 border-t-accent-foreground" />
                      ) : (
                        <ArrowUpIcon className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showFilePicker && (
        <FilePickerModal
          remainingSlots={composer.remainingSlots}
          onClose={() => setShowFilePicker(false)}
          onPick={(files) => {
            composer.addExisting(files);
            setShowFilePicker(false);
          }}
        />
      )}

      {renaming && (
        <RenameSessionModal
          session={session}
          onClose={() => setRenaming(false)}
          onRenamed={(updated) => {
            onSessionUpdated(updated);
            setRenaming(false);
          }}
        />
      )}
    </div>
  );
}
