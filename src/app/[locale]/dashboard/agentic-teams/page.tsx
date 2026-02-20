'use client';

import { useState, Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { PlusIcon } from '@heroicons/react/24/outline';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { usePromiseCache } from '@/hooks/usePromiseCache';
import apiService from '@/services/api';
import AgenticTeamsList from '@/components/agentic-teams/AgenticTeamsList';
import CreateTeamModal from '@/components/agentic-teams/CreateTeamModal';

export default function AgenticTeamsPage() {
  const t = useTranslations('AgenticTeams');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { promise, invalidate } = usePromiseCache(
    () => apiService.getAgenticTeams(),
    []
  );

  const handleCreated = () => {
    invalidate();
    setShowCreateModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
          <p className="text-muted mt-1">{t('subtitle')}</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="inline-flex items-center whitespace-nowrap">
          <PlusIcon className="h-4 w-4 mr-1.5 shrink-0" />
          {t('createTeam')}
        </Button>
      </div>

      {/* Info banner */}
      <Alert variant="info">{t('description')}</Alert>

      {/* Teams grid */}
      <Suspense fallback={<div className="text-muted">{t('loading')}</div>}>
        <AgenticTeamsList teamsPromise={promise} />
      </Suspense>

      {/* Modals */}
      {showCreateModal && (
        <CreateTeamModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreated}
        />
      )}
    </div>
  );
}
