'use client';

import { use } from 'react';
import { useTranslations } from 'next-intl';
import { TrashIcon } from '@heroicons/react/24/outline';
import { AgenticTeam } from '@/types/agentic-teams';

interface AgenticTeamsListProps {
  teamsPromise: Promise<AgenticTeam[]>;
  onDelete: (team: AgenticTeam) => void;
}

export default function AgenticTeamsList({ teamsPromise, onDelete }: AgenticTeamsListProps) {
  const t = useTranslations('AgenticTeams');
  const teams = use(teamsPromise);

  if (teams.length === 0) {
    return (
      <div className="text-center py-12 text-muted">
        {t('noTeams')}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {teams.map((team) => (
        <div
          key={team.id}
          className="bg-surface rounded-xl border border-border p-5 space-y-3 hover:border-border-hover transition-colors"
        >
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-semibold text-foreground truncate">
              {team.name}
            </h3>
            <button
              onClick={() => onDelete(team)}
              className="shrink-0 p-1.5 rounded-lg text-muted hover:text-error hover:bg-error/10 transition-colors"
              title={t('deleteTeam')}
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
          {team.description && (
            <p className="text-sm text-muted line-clamp-2">
              {team.description}
            </p>
          )}
          <p className="text-xs text-muted">
            {t('created')}: {new Date(team.createdAt).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  );
}
