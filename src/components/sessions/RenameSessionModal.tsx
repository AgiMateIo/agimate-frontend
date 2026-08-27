'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import type { ChatSessionResponse } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField, Input } from '@/components/ui/FormField';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useAsyncForm } from '@/hooks/useAsyncForm';

// The backend's limit, and it answers 400 rather than trimming — so the field
// stops here instead of letting a long name fail on submit.
const TITLE_MAX = 80;

interface RenameSessionModalProps {
  session: ChatSessionResponse;
  onClose: () => void;
  // Handed the renamed row — the same shape the listing holds, so it can go
  // straight back into the cache.
  onRenamed: (session: ChatSessionResponse) => void;
}

// Renaming a conversation, wherever it is read from: the dashboard chat and a
// messenger session are one resource now, and both name themselves after their
// first message until somebody says otherwise.
export default function RenameSessionModal({
  session,
  onClose,
  onRenamed,
}: RenameSessionModalProps) {
  const t = useTranslations('Chat');
  const tCommon = useTranslations('Common');
  // Prefilled with what the row shows now, the automatic title included: a
  // rename replaces it for good, so the user should see what they are giving up.
  const [title, setTitle] = useState(session.title ?? '');

  const { loading, error, handleSubmit } = useAsyncForm<ChatSessionResponse>({
    onSuccess: onRenamed,
    defaultError: 'Failed to rename the conversation',
  });

  const trimmed = title.trim();
  const unchanged = trimmed === (session.title ?? '');

  const onSubmit = (e: React.FormEvent) =>
    handleSubmit(e, () => apiService.renameChatSession(session.id, trimmed));

  return (
    <Modal isOpen onClose={onClose} title={t('renameTitle')} size="sm">
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField label={t('renameLabel')} required hint={t('renameHint')}>
          <Input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('renamePlaceholder')}
            maxLength={TITLE_MAX}
            autoFocus
            required
          />
        </FormField>

        {error && <ErrorAlert>{error}</ErrorAlert>}

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
            className="flex-1"
          >
            {tCommon('cancel')}
          </Button>
          <Button
            type="submit"
            // An unchanged name is a request that would only cost a round trip.
            disabled={loading || !trimmed || unchanged}
            loading={loading}
            className="flex-1"
          >
            {tCommon('save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
