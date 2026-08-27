'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { ChatSessionResponse } from '@/types';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useChannelCacheActions, useChannelSessionsQuery } from '@/queries/channels';
import { formatDate, parseBackendDate } from '@/utils/date';
import { getErrorMessage } from '@/utils/error';
import ChannelChatView from './ChannelChatView';
import { Placeholder } from '@/components/ui/Placeholder';

interface ChannelSessionsListProps {
  channelId: string;
}

const SESSION_ACTIVE_WINDOW_MS = 12 * 60 * 60 * 1000;

function isSessionActive(s: ChatSessionResponse): boolean {
  if (s.closedAt) return false;
  const last = parseBackendDate(s.lastActivityAt).getTime();
  return Date.now() - last < SESSION_ACTIVE_WINDOW_MS;
}

export default function ChannelSessionsList({ channelId }: ChannelSessionsListProps) {
  const t = useTranslations('Channels');
  const tCommon = useTranslations('Common');
  const locale = useLocale();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { sessions, isPending, error, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useChannelSessionsQuery(channelId);
  const { patchSession } = useChannelCacheActions();

  if (error) return <ErrorAlert>{getErrorMessage(error, 'Failed to load sessions')}</ErrorAlert>;

  // Derived rather than an effect: switching channels lands on the freshest
  // session of the new list on its own, and so does a selection that paged away.
  const selected = sessions.find((s) => s.id === selectedId) ?? sessions[0] ?? null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4 min-h-0 h-[600px]">
      <div className="border border-border rounded-lg overflow-y-auto p-2">
        {isPending ? (
          <Placeholder size="sm">{t('loadingSessions')}</Placeholder>
        ) : sessions.length === 0 ? (
          <Placeholder size="sm">{t('noSessions')}</Placeholder>
        ) : (
          <div className="space-y-1">
            {sessions.map((s) => {
              const active = s.id === selected?.id;
              const live = isSessionActive(s);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedId(s.id)}
                  className={`w-full text-left p-2 rounded-md transition-colors ${
                    active
                      ? 'bg-accent/10 border border-accent'
                      : 'border border-transparent hover:bg-surface-secondary'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        live ? 'bg-success' : 'bg-muted'
                      }`}
                    />
                    <span className="text-xs font-medium text-foreground truncate flex-1">
                      {s.title || t('sessionUntitled')}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[10px] text-muted truncate">
                    {formatDate(s.lastActivityAt, locale)}
                  </div>
                </button>
              );
            })}
            {hasNextPage && (
              <button
                type="button"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="w-full p-2 text-xs text-accent transition-colors hover:text-accent/80 disabled:opacity-50"
              >
                {isFetchingNextPage ? t('loadingSessions') : tCommon('loadMore')}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="border border-border rounded-lg p-4 overflow-hidden">
        {selected ? (
          <ChannelChatView
            key={selected.id}
            session={selected}
            onUpdated={(updated) => patchSession(channelId, updated)}
          />
        ) : (
          <Placeholder size="sm">{t('selectSessionHint')}</Placeholder>
        )}
      </div>
    </div>
  );
}
