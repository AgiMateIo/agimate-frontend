'use client';

import { Suspense, createContext, useContext, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { usePathname } from '@/i18n/navigation';
import { UserGroupIcon } from '@heroicons/react/24/outline';
import { useAgenticTeamQuery, agenticTeamOptions } from '@/queries/agentic-teams';
import { useSetBreadcrumb } from '@/contexts/BreadcrumbContext';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { Placeholder } from '@/components/ui/Placeholder';

// The header row exposes an actions slot (right-aligned next to the team name).
// Section pages fill it by wrapping their buttons in <TeamHeaderActions> — the
// content is portalled into the slot, so it sits on the header line instead of
// opening a gap below it (see the board page).
const HeaderActionsTargetContext = createContext<HTMLElement | null>(null);

export function TeamHeaderActions({ children }: { children: React.ReactNode }) {
  const target = useContext(HeaderActionsTargetContext);
  return target ? createPortal(children, target) : null;
}

// Shell shared by every team section (general/agents/board/…). It owns the team
// header (name only — the description lives on the General page), breadcrumb
// override and the ErrorBoundary + Suspense boundary the section pages render
// inside. The team's contextual sidebar lives in SidebarNav, which detects the
// same route from the pathname.
function TeamShellHeader({
  teamId,
  onActionsRef,
}: {
  teamId: string;
  onActionsRef: (el: HTMLElement | null) => void;
}) {
  const { data: team } = useAgenticTeamQuery(teamId);
  useSetBreadcrumb(teamId, team.name);

  return (
    // Wraps on a phone: the team name and the section's action buttons don't
    // share one row there, and `ml-auto` keeps the actions right-aligned in
    // whichever row they end up in.
    <div className="flex flex-wrap items-center gap-3">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
        <UserGroupIcon className="h-7 w-7" />
      </span>
      <h1 className="min-w-0 truncate text-2xl font-bold text-foreground">{team.name}</h1>
      <div ref={onActionsRef} className="ml-auto flex items-center gap-2" />
    </div>
  );
}

// The agent-creation wizard owns the whole canvas (its own stepper and headers) —
// no team header on top of it, but still resolve the team name for the breadcrumb.
function TeamBreadcrumb({ teamId }: { teamId: string }) {
  const { data: team } = useQuery(agenticTeamOptions(teamId));
  useSetBreadcrumb(teamId, team?.name);
  return null;
}

export default function AgenticTeamDetailLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('AgenticTeams');
  const teamId = useParams().id as string;
  const pathname = usePathname();
  const [actionsTarget, setActionsTarget] = useState<HTMLElement | null>(null);

  if (pathname.endsWith('/agents/create')) {
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
        <Suspense fallback={<Placeholder>{t('loading')}</Placeholder>}>
          <HeaderActionsTargetContext.Provider value={actionsTarget}>
            <TeamShellHeader teamId={teamId} onActionsRef={setActionsTarget} />
            {children}
          </HeaderActionsTargetContext.Provider>
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
