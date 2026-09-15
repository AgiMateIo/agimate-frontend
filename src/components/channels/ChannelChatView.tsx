'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import apiService from '@/services/api';
import { ChatSessionResponse } from '@/types';
import { PencilSquareIcon } from '@heroicons/react/24/outline';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Button } from '@/components/ui/Button';
import { RowAction } from '@/components/ui/RowAction';
import RenameSessionModal from '@/components/sessions/RenameSessionModal';
import SessionTranscript from '@/components/sessions/SessionTranscript';
import { formatDate } from '@/utils/date';
import { getErrorMessage } from '@/utils/error';

interface ChannelChatViewProps {
  session: ChatSessionResponse;
  // Closing and renaming both answer the enriched row — one handler puts either
  // back into the sessions list.
  onUpdated: (updated: ChatSessionResponse) => void;
}

// The header of a channel conversation: what it is called, when it last moved,
// and the two things that can be done to it. The messages themselves are
// `SessionTranscript`, which every read-only conversation shares.
export default function ChannelChatView({ session, onUpdated }: ChannelChatViewProps) {
  const t = useTranslations('Channels');
  const tChat = useTranslations('Chat');
  const locale = useLocale();
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState('');
  const [renaming, setRenaming] = useState(false);

  const handleClose = async () => {
    setClosing(true);
    try {
      const updated = await apiService.closeChatSession(session.id);
      onUpdated(updated);
    } catch (err) {
      setCloseError(getErrorMessage(err, 'Failed to close session'));
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
              : t('sessionLastMessageAt', { date: formatDate(session.lastActivityAt, locale) })}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {/* A messenger conversation names itself after its first message just
              like a chat does — and the same endpoint renames both. Offered on a
              closed session too: an archive is exactly where a name earns its
              keep. */}
          <RowAction
            icon={PencilSquareIcon}
            label={tChat('rename')}
            onClick={() => setRenaming(true)}
          />
          {!session.closedAt && (
            <Button variant="secondary" onClick={handleClose} loading={closing}>
              {t('closeSession')}
            </Button>
          )}
        </div>
      </div>

      {closeError && <ErrorAlert>{closeError}</ErrorAlert>}

      <SessionTranscript sessionId={session.id} />

      {renaming && (
        <RenameSessionModal
          session={session}
          onClose={() => setRenaming(false)}
          onRenamed={(updated) => {
            onUpdated(updated);
            setRenaming(false);
          }}
        />
      )}
    </div>
  );
}
