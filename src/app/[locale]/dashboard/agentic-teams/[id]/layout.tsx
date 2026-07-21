'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { usePathname } from '@/i18n/navigation';
import { UserGroupIcon } from '@heroicons/react/24/outline';
import { useAgenticTeamQuery, agenticTeamOptions } from '@/queries/agentic-teams';
import { useSetBreadcrumb } from '@/contexts/BreadcrumbContext';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

// Shell shared by every team section (general/agents/board/…). It owns the team
// header, breadcrumb override and the ErrorBoundary + Suspense boundary the section
// pages render inside. The team's contextual sidebar lives in SidebarNav, which
// detects the same route from the pathname.
function TeamShellHeader({ teamId }: { teamId: string }) {
  const { data: team } = useAgenticTeamQuery(teamId);
  useSetBreadcrumb(teamId, team.name);

  return (
    <div className="flex items-center gap-3">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
        <UserGroupIcon className="h-7 w-7" />
      </span>
      <div>
        <h1 className="text-2xl font-bold text-foreground">{team.name}</h1>
        {team.description && <p className="text-sm text-muted">{team.description}</p>}
      </div>
    </div>
  );
}

// The board owns the full canvas (its own header and kanban layout) — no team header
// on top of it, but still resolve the team name for the breadcrumb.
function TeamBreadcrumb({ teamId }: { teamId: string }) {
  const { data: team } = useQuery(agenticTeamOptions(teamId));
  useSetBreadcrumb(teamId, team?.name);
  return null;
}

export default function AgenticTeamDetailLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('AgenticTeams');
  const teamId = useParams().id as string;
  const pathname = usePathname();

  if (pathname.endsWith('/board')) {
    return (
      <>
        <TeamBreadcrumb teamId={teamId} />
        {children}
      </>
    );
  }

  return (
    <div className="space-y-6">
      <ErrorBoundary resetKeys={[teamId]}>
        <Suspense fallback={<div className="text-center py-12 text-muted">{t('loading')}</div>}>
          <TeamShellHeader teamId={teamId} />
          {children}
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
