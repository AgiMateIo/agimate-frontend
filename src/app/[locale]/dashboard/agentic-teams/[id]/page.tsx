'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useSuspenseQueries } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import {
  PencilIcon,
  UserCircleIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { Link, useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/Button';
import { agenticTeamOptions, useAgenticTeamCacheActions } from '@/queries/agentic-teams';
import { agentsListOptions } from '@/queries/agents';
import { boardsListOptions, boardTasksOptions } from '@/queries/boards';
import EditTeamModal from '@/components/agentic-teams/EditTeamModal';
import { formatDate } from '@/utils/date';

export default function AgenticTeamGeneralPage() {
  const t = useTranslations('AgenticTeams');
  const tBoard = useTranslations('Board');
  const locale = useLocale();
  const router = useRouter();
  const teamId = useParams().id as string;

  const [{ data: team }, { data: agentsPage }, { data: boards }] = useSuspenseQueries({
    queries: [agenticTeamOptions(teamId), agentsListOptions(teamId), boardsListOptions()],
  });
  const board = boards.find((b) => b.agenticTeamId === teamId) ?? null;
  // Depends on the resolved board id — non-suspense so the tiles render while it loads.
  const { data: columns } = useQuery({ ...boardTasksOptions(board?.id ?? ''), enabled: !!board });

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

  // No board yet → the team has 0 tasks; board present but tasks still loading → placeholder.
  const taskValue = (count: number | undefined) => (board ? (count ?? '—') : 0);
  const totalTasks = columns
    ? Object.values(columns).reduce((n, tasks) => n + tasks.length, 0)
    : undefined;

  const boardHref = `/dashboard/agentic-teams/${teamId}/board`;
  const tiles = [
    {
      key: 'agents',
      label: t('agents'),
      value: agentsPage.content.length,
      icon: UserCircleIcon,
      href: `/dashboard/agentic-teams/${teamId}/agents`,
    },
    {
      key: 'tasks',
      label: t('tasksTotal'),
      value: taskValue(totalTasks),
      icon: ClipboardDocumentListIcon,
      href: boardHref,
    },
    {
      key: 'inProgress',
      label: tBoard('status.IN_PROGRESS'),
      value: taskValue(columns?.IN_PROGRESS.length),
      icon: ClockIcon,
      href: boardHref,
    },
    {
      key: 'done',
      label: tBoard('status.DONE'),
      value: taskValue(columns?.DONE.length),
      icon: CheckCircleIcon,
      href: boardHref,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map(({ key, label, value, icon: Icon, href }) => (
          <Link
            key={key}
            href={href}
            className="bg-surface rounded-xl border border-border p-4 hover:border-accent/30 transition-colors block"
          >
            <div className="flex items-center gap-2 text-sm text-muted">
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{label}</span>
            </div>
            <div className="mt-1.5 text-2xl font-semibold text-foreground">{value}</div>
          </Link>
        ))}
      </div>

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
