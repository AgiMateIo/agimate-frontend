'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import apiService from '@/services/api';
import { ChannelSessionMessageResponse, ChannelSessionResponse } from '@/types';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/utils/date';

interface ChannelChatViewProps {
  session: ChannelSessionResponse;
  onClosed: (updated: ChannelSessionResponse) => void;
}

export default function ChannelChatView({ session, onClosed }: ChannelChatViewProps) {
  const t = useTranslations('Channels');
  const locale = useLocale();
  const [messages, setMessages] = useState<ChannelSessionMessageResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    apiService
      .getChannelSessionMessages(session.pubId)
      .then((data) => { if (!cancelled) setMessages(data); })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load messages'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [session.pubId]);

  const handleClose = async () => {
    setClosing(true);
    try {
      const updated = await apiService.closeChannelSession(session.pubId);
      onClosed(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to close session');
    } finally {
      setClosing(false);
    }
  };

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

      {error && <ErrorAlert>{error}</ErrorAlert>}

      <div className="flex-1 overflow-y-auto py-4 space-y-3 min-h-0">
        {loading ? (
          <div className="text-center py-8 text-muted text-sm">{t('loadingMessages')}</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-muted text-sm">{t('noMessages')}</div>
        ) : (
          messages.map((m) => (
            <div
              key={m.pubId}
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
          ))
        )}
      </div>
    </div>
  );
}
