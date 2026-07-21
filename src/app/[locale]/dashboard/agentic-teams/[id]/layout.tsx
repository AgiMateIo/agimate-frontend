'use client';

import { Suspense, createContext, useContext, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { UserGroupIcon } from '@heroicons/react/24/outline';
import { useAgenticTeamQuery } from '@/queries/agentic-teams';
import { useSetBreadcrumb } from '@/contexts/BreadcrumbContext';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

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
    <div className="flex items-center gap-3">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
        <UserGroupIcon className="h-7 w-7" />
      </span>
      <h1 className="text-2xl font-bold text-foreground">{team.name}</h1>
      <div ref={onActionsRef} className="ml-auto flex items-center gap-2" />
    </div>
  );
}

export default function AgenticTeamDetailLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('AgenticTeams');
  const teamId = useParams().id as string;
  const [actionsTarget, setActionsTarget] = useState<HTMLElement | null>(null);

  return (
    <div className="space-y-6">
      <ErrorBoundary resetKeys={[teamId]}>
        <Suspense fallback={<div className="text-center py-12 text-muted">{t('loading')}</div>}>
          <HeaderActionsTargetContext.Provider value={actionsTarget}>
            <TeamShellHeader teamId={teamId} onActionsRef={setActionsTarget} />
            {children}
          </HeaderActionsTargetContext.Provider>
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
