'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { usePathname } from '@/i18n/navigation';
import { useAgentDetailSuspenseQuery } from '@/queries/agents';
import { useSetBreadcrumb } from '@/contexts/BreadcrumbContext';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { getAgentAvatarUrl } from '@/utils/avatar';

// Shell shared by every agent section (general/models/channels/…). It owns the
// agent header, breadcrumb override and the ErrorBoundary + Suspense boundary the
// section pages render inside. The agent's contextual sidebar lives in SidebarNav,
// which detects the same route from the pathname.
function AgentShellHeader({ agentId }: { agentId: string }) {
  const { data: agent } = useAgentDetailSuspenseQuery(agentId);
  useSetBreadcrumb(agentId, agent.name);

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

  return (
    <div className="space-y-6">
      <ErrorBoundary resetKeys={[agentId]}>
        <Suspense fallback={<div className="text-center py-12 text-muted">{t('loadingAgents')}</div>}>
          <AgentShellHeader agentId={agentId} />
          {children}
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
