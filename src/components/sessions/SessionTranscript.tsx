'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Placeholder } from '@/components/ui/Placeholder';
import { useSessionMessagesQuery } from '@/queries/chat-sessions';
import { formatDate } from '@/utils/date';
import { getErrorMessage } from '@/utils/error';
import { parseErrandRequest } from '@/utils/errand';
import { ErrandRequestCard } from './ErrandRequestCard';

// The read-only history of one conversation, whatever carries it: a messenger
// thread on a channel's page, an errand a subagent was sent on. Webchat has its
// own view (`WebchatConversation`) because it also writes — this one only reads,
// so it works for every connector, including the ones with no transport behind
// them at all.
//
// Strings come from `Channels`, where this list started life; they say nothing
// about channels and there is no reason to duplicate them per caller.
export default function SessionTranscript({ sessionId }: { sessionId: string }) {
  const t = useTranslations('Channels');
  const tCommon = useTranslations('Common');
  const locale = useLocale();

  const { messages, isPending, error, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useSessionMessagesQuery(sessionId);

  const listRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<number | null>(null);
  const landedRef = useRef(false);

  // The newest messages are the point of opening a session, and they sit at the
  // bottom — so the first page lands scrolled down rather than on the oldest
  // message it happens to contain.
  useEffect(() => {
    const el = listRef.current;
    if (!el || landedRef.current || messages.length === 0) return;
    el.scrollTop = el.scrollHeight;
    landedRef.current = true;
  }, [messages]);

  // Older messages are prepended, which pushes the read position down by exactly
  // the height they added — put it back before the browser paints.
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el || anchorRef.current === null) return;
    el.scrollTop += el.scrollHeight - anchorRef.current;
    anchorRef.current = null;
  }, [messages]);

  // A fetch that fails never changes `messages`, so the layout effect above
  // never runs to clear the anchor — without this the guard below would block
  // every retry.
  useEffect(() => {
    if (!isFetchingNextPage) anchorRef.current = null;
  }, [isFetchingNextPage]);

  const handleLoadOlder = () => {
    const el = listRef.current;
    // A live `anchorRef` is a fetch already on its way: two scroll events fire
    // before `isFetchingNextPage` has re-rendered, and the second one would
    // overwrite the anchor the first is waiting on.
    if (!el || !hasNextPage || isFetchingNextPage || anchorRef.current !== null) return;
    anchorRef.current = el.scrollHeight;
    fetchNextPage();
  };

  // Scrolling to the top is the request for older messages; the button below is
  // the fallback for a thread too short to scroll at all.
  const handleScroll = () => {
    const el = listRef.current;
    if (el && el.scrollTop < 80 && !error) handleLoadOlder();
  };

  const loadError = error ? getErrorMessage(error, 'Failed to load messages') : '';

  return (
    <>
      {loadError && <ErrorAlert>{loadError}</ErrorAlert>}
      <div
        ref={listRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto py-4 space-y-3 min-h-0"
      >
        {isPending ? (
          <Placeholder size="sm">{t('loadingMessages')}</Placeholder>
        ) : messages.length === 0 ? (
          <Placeholder size="sm">{t('noMessages')}</Placeholder>
        ) : (
          <>
            {hasNextPage && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleLoadOlder}
                  disabled={isFetchingNextPage}
                  className="cursor-pointer text-xs text-accent underline underline-offset-2 transition-colors hover:text-accent/80 disabled:cursor-default disabled:no-underline disabled:opacity-50"
                >
                  {isFetchingNextPage ? t('loadingMessages') : tCommon('loadOlder')}
                </button>
              </div>
            )}
            {messages.map((m) => {
              // An errand — handed to a subagent or to another agent of the
              // team — arrives as the USER side of its session, but it is a
              // block one agent wrote for another's model: it gets a card of
              // its own, and falls back to the bubble below when it doesn't
              // parse.
              const request = m.direction === 'USER' ? parseErrandRequest(m.text) : null;
              if (request) {
                return (
                  <div key={m.id}>
                    <ErrandRequestCard request={request} />
                    <div className="mt-1 text-[10px] text-muted">
                      {formatDate(m.createdAt, locale)}
                    </div>
                  </div>
                );
              }

              // The agent's side of an external conversation is the outgoing one
              // — it keeps the right-hand accent bubble the old IN/OUT rendering
              // gave it. `text` is null on a message that was only attachments,
              // which this view has no way to show yet.
              const outgoing = m.direction === 'AGENT';
              return (
                <div key={m.id} className={`flex ${outgoing ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 ${
                      outgoing
                        ? 'bg-accent text-accent-foreground'
                        : 'bg-surface-secondary text-foreground'
                    }`}
                  >
                    <div className="text-sm whitespace-pre-wrap break-words">
                      {m.text ?? t('messageAttachmentOnly')}
                    </div>
                    <div
                      className={`mt-1 text-[10px] ${
                        outgoing ? 'text-accent-foreground/70' : 'text-muted'
                      }`}
                    >
                      {formatDate(m.createdAt, locale)}
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </>
  );
}
