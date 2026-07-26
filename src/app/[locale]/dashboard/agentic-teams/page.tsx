'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { PlusIcon } from '@heroicons/react/24/outline';
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const { invalidateAll } = useAgenticTeamCacheActions();

  // The sidebar's "+" links here with ?create=1 (team creation is a modal, not a
  // route). Open the modal on arrival with the param — via setState-during-render
  // (the effect only strips the param from the URL, so close + reopen works).
  const shouldCreate = searchParams.get('create') === '1';
  const [showCreateModal, setShowCreateModal] = useState(shouldCreate);
  const [seenCreateParam, setSeenCreateParam] = useState(shouldCreate);
  if (shouldCreate && !seenCreateParam) {
    setSeenCreateParam(true);
    setShowCreateModal(true);
  }
  if (!shouldCreate && seenCreateParam) setSeenCreateParam(false);
  useEffect(() => {
    if (shouldCreate) router.replace('/dashboard/agentic-teams');
  }, [shouldCreate, router]);

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
