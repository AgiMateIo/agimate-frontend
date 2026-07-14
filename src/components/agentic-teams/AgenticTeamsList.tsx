'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { localeMap } from '@/i18n/routing';
import { AgenticTeam } from '@/types/agentic-teams';
import { formatDate } from '@/utils/date';

interface AgenticTeamsListProps {
  teams: AgenticTeam[];
}

export default function AgenticTeamsList({ teams }: AgenticTeamsListProps) {
  const t = useTranslations('AgenticTeams');
  const locale = useLocale();
  const bcp47 = localeMap[locale];

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
        <Link
          key={team.id}
          href={`/dashboard/agentic-teams/${team.id}`}
          className="bg-surface rounded-xl border border-border p-5 space-y-3 hover:border-accent/30 transition-colors block"
        >
          <h3 className="text-base font-semibold text-foreground truncate">
            {team.name}
          </h3>
          {team.description && (
            <p className="text-sm text-muted line-clamp-2">
              {team.description}
            </p>
          )}
          <p className="text-xs text-muted">
            {t('created')}: {formatDate(team.createdAt, bcp47)}
          </p>
        </Link>
      ))}
    </div>
  );
}
