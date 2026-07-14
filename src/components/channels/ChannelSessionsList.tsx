'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import apiService from '@/services/api';
import { ChannelSessionResponse } from '@/types';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { formatDate, parseBackendDate } from '@/utils/date';
import { getErrorMessage } from '@/utils/error';
import ChannelChatView from './ChannelChatView';

interface ChannelSessionsListProps {
  channelId: string;
}

const SESSION_ACTIVE_WINDOW_MS = 12 * 60 * 60 * 1000;

function isSessionActive(s: ChannelSessionResponse): boolean {
  if (s.closedAt) return false;
  const last = parseBackendDate(s.lastMessageAt).getTime();
  return Date.now() - last < SESSION_ACTIVE_WINDOW_MS;
}

export default function ChannelSessionsList({ channelId }: ChannelSessionsListProps) {
  const t = useTranslations('Channels');
  const locale = useLocale();
  const [sessions, setSessions] = useState<ChannelSessionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiService.getChannelSessions(channelId);
      setSessions(data);
      if (data.length > 0 && !selectedId) {
        setSelectedId(data[0].id);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load sessions'));
    } finally {
      setLoading(false);
    }
  }, [channelId, selectedId]);

  useEffect(() => {
    setSelectedId(null);
    fetchSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId]);

  const handleSessionClosed = (updated: ChannelSessionResponse) => {
    setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  if (error) return <ErrorAlert>{error}</ErrorAlert>;

  const selected = sessions.find((s) => s.id === selectedId) || null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4 min-h-0 h-[600px]">
      <div className="border border-border rounded-lg overflow-y-auto p-2">
        {loading ? (
          <div className="text-center py-8 text-muted text-sm">{t('loadingSessions')}</div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 text-muted text-sm">{t('noSessions')}</div>
        ) : (
          <div className="space-y-1">
            {sessions.map((s) => {
              const active = s.id === selectedId;
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
                    {formatDate(s.lastMessageAt, locale)}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="border border-border rounded-lg p-4 overflow-hidden">
        {selected ? (
          <ChannelChatView session={selected} onClosed={handleSessionClosed} />
        ) : (
          <div className="text-center py-12 text-muted text-sm">{t('selectSessionHint')}</div>
        )}
      </div>
    </div>
  );
}
