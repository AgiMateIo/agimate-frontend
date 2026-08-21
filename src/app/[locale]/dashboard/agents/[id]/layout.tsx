'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { usePathname } from '@/i18n/navigation';
import { useAgentDetailSuspenseQuery } from '@/queries/agents';
import { useSetBreadcrumb } from '@/contexts/BreadcrumbContext';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { getAgentAvatarUrl } from '@/utils/avatar';
import { Placeholder } from '@/components/ui/Placeholder';

// Shell shared by every agent section (general/models/channels/…). It owns the
// agent header, breadcrumb override and the ErrorBoundary + Suspense boundary the
// section pages render inside. The agent's contextual sidebar lives in SidebarNav,
// which detects the same route from the pathname.
function AgentShellHeader({
  agentId,
  // The chat section shows the agent in its own conversation header, so it takes
  // the shell for the breadcrumb override alone and keeps the height for messages.
  breadcrumbOnly = false,
}: {
  agentId: string;
  breadcrumbOnly?: boolean;
}) {
  const { data: agent } = useAgentDetailSuspenseQuery(agentId);
  useSetBreadcrumb(agentId, agent.name);

  if (breadcrumbOnly) return null;

  return (
    <div className="flex items-center gap-3">
      <img src={getAgentAvatarUrl(agent.name)} alt={agent.name} className="w-12 h-12 rounded-lg" />
      <div>
        <h1 className="text-2xl font-bold text-foreground">{agent.name}</h1>
        {agent.agenticTeamName && <p className="text-sm text-muted">{agent.agenticTeamName}</p>}
      </div>
    </div>
  );
}

export default function AgentDetailLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('Agents');
  const agentId = useParams().id as string;
  const pathname = usePathname();

  // The edit page renders its own back button, title, loading/error and breadcrumb —
  // let it own the whole canvas instead of stacking the section header on top of it.
  if (pathname.endsWith('/edit')) return <>{children}</>;

  // Chat stretches to the bottom of the viewport instead of sitting in the
  // section rhythm: `h-full` hands the page the canvas height so its composer
  // lands on the viewport floor, with no hardcoded chrome offset to keep in sync.
  const isChat = pathname.endsWith('/chat');

  return (
    <div className={isChat ? 'h-full' : 'space-y-6'}>
      <ErrorBoundary resetKeys={[agentId]}>
        <Suspense fallback={<Placeholder>{t('loadingAgents')}</Placeholder>}>
          <AgentShellHeader agentId={agentId} breadcrumbOnly={isChat} />
          {children}
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
