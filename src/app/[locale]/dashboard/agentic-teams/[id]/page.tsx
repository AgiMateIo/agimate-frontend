'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { PencilIcon } from '@heroicons/react/24/outline';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/Button';
import { useAgenticTeamQuery, useAgenticTeamCacheActions } from '@/queries/agentic-teams';
import EditTeamModal from '@/components/agentic-teams/EditTeamModal';
import { formatDate } from '@/utils/date';

export default function AgenticTeamGeneralPage() {
  const t = useTranslations('AgenticTeams');
  const locale = useLocale();
  const router = useRouter();
  const teamId = useParams().id as string;
  const { data: team } = useAgenticTeamQuery(teamId);

  const [showEditModal, setShowEditModal] = useState(false);
  const { invalidateAll } = useAgenticTeamCacheActions();

  const handleUpdated = () => {
    invalidateAll();
    setShowEditModal(false);
  };

  const handleDeleted = () => {
    setShowEditModal(false);
    router.push('/dashboard/agentic-teams');
  };

  return (
    <div className="bg-surface rounded-xl border border-border p-6 space-y-6">
      <div className="flex items-start justify-between gap-3">
        {team.description ? (
          <div className="min-w-0">
            <h3 className="text-sm font-medium text-muted mb-2">{t('teamDescription')}</h3>
            <p className="text-sm text-foreground">{team.description}</p>
          </div>
        ) : (
          <div />
        )}
        <Button
          variant="secondary"
          onClick={() => setShowEditModal(true)}
          className="inline-flex items-center whitespace-nowrap shrink-0"
        >
          <PencilIcon className="h-4 w-4 mr-1.5 shrink-0" />
          {t('editTeam')}
        </Button>
      </div>

      <div>
        <h3 className="text-sm font-medium text-muted mb-2">{t('created')}</h3>
        <p className="text-sm text-foreground">{formatDate(team.createdAt, locale)}</p>
      </div>

      <div>
        <h3 className="text-sm font-medium text-muted mb-2">{t('updated')}</h3>
        <p className="text-sm text-foreground">{formatDate(team.updatedAt, locale)}</p>
      </div>

      {showEditModal && (
        <EditTeamModal
          team={team}
          onClose={() => setShowEditModal(false)}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
