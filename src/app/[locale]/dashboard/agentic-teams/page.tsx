'use client';

import { useState, Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { PlusIcon } from '@heroicons/react/24/outline';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { useAgenticTeamsQuery, useAgenticTeamCacheActions } from '@/queries/agentic-teams';
import AgenticTeamsList from '@/components/agentic-teams/AgenticTeamsList';
import CreateTeamModal from '@/components/agentic-teams/CreateTeamModal';

function TeamsGrid() {
  const { data: teams } = useAgenticTeamsQuery();
  return <AgenticTeamsList teams={teams} />;
}

export default function AgenticTeamsPage() {
  const t = useTranslations('AgenticTeams');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { invalidateAll } = useAgenticTeamCacheActions();

  const handleCreated = () => {
    invalidateAll();
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
      <ErrorBoundary>
        <Suspense fallback={<div className="text-muted">{t('loading')}</div>}>
          <TeamsGrid />
        </Suspense>
      </ErrorBoundary>

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
