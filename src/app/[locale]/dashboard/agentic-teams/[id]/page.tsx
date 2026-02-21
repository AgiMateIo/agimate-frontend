'use client';

import { use, useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  PencilIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  ChatBubbleLeftRightIcon,
  BookOpenIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { usePromiseCache } from '@/hooks/usePromiseCache';
import { useSetBreadcrumb } from '@/contexts/BreadcrumbContext';
import apiService from '@/services/api';
import { AgenticTeam } from '@/types/agentic-teams';
import EditTeamModal from '@/components/agentic-teams/EditTeamModal';

function TeamDetail({
  teamsPromise,
  teamId,
  onEdit,
}: {
  teamsPromise: Promise<AgenticTeam[]>;
  teamId: string;
  onEdit: (team: AgenticTeam) => void;
}) {
  const t = useTranslations('AgenticTeams');
  const teams = use(teamsPromise);
  const team = teams.find((t) => t.id === teamId);
  useSetBreadcrumb(teamId, team?.name);

  if (!team) {
    return (
      <div className="text-center py-12 text-muted">
        {t('teamNotFound')}
      </div>
    );
  }

  const tiles = [
    {
      key: 'agents',
      icon: UserGroupIcon,
      title: t('agents'),
      description: t('agentsDescription'),
    },
    {
      key: 'knowledgeBase',
      icon: BookOpenIcon,
      title: t('knowledgeBase'),
      description: t('knowledgeBaseDescription'),
    },
    {
      key: 'taskBoard',
      icon: ClipboardDocumentListIcon,
      title: t('taskBoard'),
      description: t('taskBoardDescription'),
    },
    {
      key: 'agentChat',
      icon: ChatBubbleLeftRightIcon,
      title: t('agentChat'),
      description: t('agentChatDescription'),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{team.name}</h1>
          {team.description && (
            <p className="text-muted mt-1">{team.description}</p>
          )}
        </div>
        <Button
          variant="secondary"
          onClick={() => onEdit(team)}
          className="inline-flex items-center whitespace-nowrap"
        >
          <PencilIcon className="h-4 w-4 mr-1.5 shrink-0" />
          {t('editTeam')}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tiles.map((tile) => (
          <Link
            key={tile.key}
            href={tile.key === 'agents' ? `/dashboard/agentic-teams/${teamId}/agents` : '#'}
            className="bg-surface rounded-xl border border-border p-6 hover:border-accent/30 transition-colors block"
          >
            <tile.icon className="h-8 w-8 text-accent mb-3" />
            <h3 className="text-base font-semibold text-foreground">{tile.title}</h3>
            <p className="text-sm text-muted mt-1">{tile.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function AgenticTeamDetailPage() {
  const t = useTranslations('AgenticTeams');
  const router = useRouter();
  const params = useParams();
  const teamId = params.id as string;
  const [teamToEdit, setTeamToEdit] = useState<AgenticTeam | null>(null);

  const { promise, invalidate } = usePromiseCache(
    () => apiService.getAgenticTeams(),
    []
  );

  const handleUpdated = () => {
    invalidate();
    setTeamToEdit(null);
  };

  const handleDeleted = () => {
    setTeamToEdit(null);
    router.push('/dashboard/agentic-teams');
  };

  return (
    <div className="space-y-6">
      <Suspense fallback={<div className="text-muted">{t('loading')}</div>}>
        <TeamDetail teamsPromise={promise} teamId={teamId} onEdit={setTeamToEdit} />
      </Suspense>

      {teamToEdit && (
        <EditTeamModal
          team={teamToEdit}
          onClose={() => setTeamToEdit(null)}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
