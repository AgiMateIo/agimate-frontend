'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useSuspenseQueries } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import {
  TrashIcon,
  UserCircleIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { Link, useRouter } from '@/i18n/navigation';
import apiService from '@/services/api';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { InlineEditField } from '@/components/ui/InlineEdit';
import { TextArea } from '@/components/ui/FormField';
import {
  agenticTeamOptions,
  useAgenticTeamCacheActions,
  useUpdateAgenticTeamMutation,
} from '@/queries/agentic-teams';
import { agentsListOptions } from '@/queries/agents';
import { boardsListOptions, boardTasksOptions } from '@/queries/boards';
import { TeamHeaderActions } from './layout';
import { formatDate } from '@/utils/date';

export default function AgenticTeamGeneralPage() {
  const t = useTranslations('AgenticTeams');
  const tBoard = useTranslations('Board');
  const tCommon = useTranslations('Common');
  const locale = useLocale();
  const router = useRouter();
  const teamId = useParams().id as string;

  const [{ data: team }, { data: agentsPage }, { data: boards }] = useSuspenseQueries({
    queries: [agenticTeamOptions(teamId), agentsListOptions(teamId), boardsListOptions()],
  });
  const board = boards.find((b) => b.agenticTeamId === teamId) ?? null;
  // Depends on the resolved board id — non-suspense so the tiles render while it loads.
  const { data: columns } = useQuery({ ...boardTasksOptions(board?.id ?? ''), enabled: !!board });

  const updateTeam = useUpdateAgenticTeamMutation(teamId);
  const { invalidateAll } = useAgenticTeamCacheActions();
  const [deleting, setDeleting] = useState(false);

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
      {/* The name is edited on the header line itself, so what is left for a
          menu is the one action that is not a field: deleting the team. */}
      <TeamHeaderActions>
        <DropdownMenu
          items={[
            {
              label: t('deleteTeam'),
              icon: TrashIcon,
              onClick: () => setDeleting(true),
              danger: true,
            },
          ]}
        />
      </TeamHeaderActions>

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
        <InlineEditField
          label={t('teamDescription')}
          value={team.description ?? ''}
          // An emptied field sends "" — that is what clears it; null would read
          // as "leave it alone".
          onSave={(next) => updateTeam.mutateAsync({ description: next.trim() })}
          defaultError={t('editError')}
          editor={({ draft, setDraft, disabled, onKeyDown }) => (
            <TextArea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={disabled}
              placeholder={t('teamDescriptionPlaceholder')}
              rows={3}
              maxLength={500}
            />
          )}
        >
          {team.description ? (
            <p className="text-sm text-foreground">{team.description}</p>
          ) : (
            <p className="text-sm text-muted">{t('noDescription')}</p>
          )}
        </InlineEditField>

        <div>
          <h3 className="text-sm font-medium text-muted mb-2">{t('created')}</h3>
          <p className="text-sm text-foreground">{formatDate(team.createdAt, locale)}</p>
        </div>

        <div>
          <h3 className="text-sm font-medium text-muted mb-2">{t('updated')}</h3>
          <p className="text-sm text-foreground">{formatDate(team.updatedAt, locale)}</p>
        </div>
      </div>

      {deleting && (
        <ConfirmDeleteModal
          title={t('deleteTeam')}
          confirmLabel={tCommon('delete')}
          cancelLabel={tCommon('cancel')}
          defaultError={t('deleteError')}
          onConfirm={() => apiService.deleteAgenticTeam(teamId)}
          onClose={() => setDeleting(false)}
          onSuccess={() => {
            invalidateAll();
            router.push('/dashboard/agentic-teams');
          }}
        >
          <p className="text-sm text-foreground">
            {t('deleteTeamConfirm', { name: team.name })}
          </p>
        </ConfirmDeleteModal>
      )}
    </div>
  );
}
