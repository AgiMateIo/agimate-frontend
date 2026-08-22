'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { usePathname } from '@/i18n/navigation';
import { useAgentDetailSuspenseQuery, useUpdateAgentMutation } from '@/queries/agents';
import { useSetBreadcrumb } from '@/contexts/BreadcrumbContext';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { getAgentAvatarUrl } from '@/utils/avatar';
import { InlineEditTitle } from '@/components/ui/InlineEdit';
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
  const t = useTranslations('Agents');
  const { data: agent } = useAgentDetailSuspenseQuery(agentId);
  const updateAgent = useUpdateAgentMutation(agentId);
  useSetBreadcrumb(agentId, agent.name);

  if (breadcrumbOnly) return null;

  return (
    <InlineEditTitle
      value={agent.name}
      onSave={(name) => updateAgent.mutateAsync({ name })}
      defaultError={t('updateError')}
      ariaLabel={t('nameLabel')}
      leading={
        // eslint-disable-next-line @next/next/no-img-element -- generated avatar, not an asset
        <img
          src={getAgentAvatarUrl(agent.name)}
          alt={agent.name}
          className="h-12 w-12 shrink-0 rounded-lg"
        />
      }
    >
      {agent.agenticTeamName && <p className="text-sm text-muted">{agent.agenticTeamName}</p>}
    </InlineEditTitle>
  );
}

export default function AgentDetailLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('Agents');
  const agentId = useParams().id as string;
  const pathname = usePathname();

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
