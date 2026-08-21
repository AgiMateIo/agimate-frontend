'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import apiService from '@/services/api';
import { ChannelSessionResponse } from '@/types';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Button } from '@/components/ui/Button';
import { useChannelSessionMessagesQuery } from '@/queries/channels';
import { formatDate } from '@/utils/date';
import { getErrorMessage } from '@/utils/error';
import { Placeholder } from '@/components/ui/Placeholder';

interface ChannelChatViewProps {
  session: ChannelSessionResponse;
  onClosed: (updated: ChannelSessionResponse) => void;
}

export default function ChannelChatView({ session, onClosed }: ChannelChatViewProps) {
  const t = useTranslations('Channels');
  const tCommon = useTranslations('Common');
  const locale = useLocale();
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState('');

  const { messages, isPending, error, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useChannelSessionMessagesQuery(session.id);

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

  const handleLoadOlder = () => {
    anchorRef.current = listRef.current?.scrollHeight ?? null;
    fetchNextPage();
  };

  const handleClose = async () => {
    setClosing(true);
    try {
      const updated = await apiService.closeChannelSession(session.id);
      onClosed(updated);
    } catch (err) {
      setCloseError(getErrorMessage(err, 'Failed to close session'));
    } finally {
      setClosing(false);
    }
  };

  const loadError = error ? getErrorMessage(error, 'Failed to load messages') : '';

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-border">
        <div className="min-w-0">
          <div className="text-sm font-medium text-foreground truncate">
            {session.title || t('sessionUntitled')}
          </div>
          <div className="text-xs text-muted">
            {session.closedAt
              ? t('sessionClosedAt', { date: formatDate(session.closedAt, locale) })
              : t('sessionLastMessageAt', { date: formatDate(session.lastMessageAt, locale) })}
          </div>
        </div>
        {!session.closedAt && (
          <Button variant="secondary" onClick={handleClose} loading={closing}>
            {t('closeSession')}
          </Button>
        )}
      </div>

      {(loadError || closeError) && <ErrorAlert>{loadError || closeError}</ErrorAlert>}

      <div ref={listRef} className="flex-1 overflow-y-auto py-4 space-y-3 min-h-0">
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
                  className="text-xs text-accent transition-colors hover:text-accent/80 disabled:opacity-50"
                >
                  {isFetchingNextPage ? t('loadingMessages') : tCommon('loadOlder')}
                </button>
              </div>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.direction === 'OUT' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 ${
                    m.direction === 'OUT'
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-surface-secondary text-foreground'
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap break-words">{m.message}</div>
                  <div
                    className={`mt-1 text-[10px] ${
                      m.direction === 'OUT' ? 'text-accent-foreground/70' : 'text-muted'
                    }`}
                  >
                    {formatDate(m.createdAt, locale)}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
