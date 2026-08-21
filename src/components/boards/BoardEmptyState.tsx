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
      {/* Warm rather than muted grey: an empty screen is the one moment the product
          has nothing to show and every reason to look welcoming, and `warm` is the
          only ink in the palette that answers the cool accent. */}
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-warm/10">
        <ClipboardDocumentListIcon className="h-10 w-10 text-warm" />
      </div>
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
