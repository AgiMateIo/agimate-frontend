'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import CreateBoardModal from './CreateBoardModal';
import type { Board } from '@/types';

interface BoardEmptyStateProps {
  teamId: string;
  onCreated: (board: Board) => void;
}

export default function BoardEmptyState({ teamId, onCreated }: BoardEmptyStateProps) {
  const t = useTranslations('Board');
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <ClipboardDocumentListIcon className="h-16 w-16 text-muted mb-4" />
      <h2 className="text-xl font-semibold text-foreground mb-2">{t('noBoard')}</h2>
      <p className="text-muted text-sm mb-6 max-w-sm">{t('noBoardDescription')}</p>
      <Button onClick={() => setShowModal(true)}>
        {t('createBoard')}
      </Button>

      {showModal && (
        <CreateBoardModal
          teamId={teamId}
          onClose={() => setShowModal(false)}
          onSuccess={(board) => {
            setShowModal(false);
            onCreated(board);
          }}
        />
      )}
    </div>
  );
}
