'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import {
  ArrowLeftIcon,
  ChevronUpDownIcon,
  AdjustmentsHorizontalIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  SparklesIcon,
  ChatBubbleLeftRightIcon,
  AcademicCapIcon,
  LinkIcon,
  CommandLineIcon,
  BoltIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { useAgentDetailQuery, allAgentsOptions } from '@/queries/agents';
import { getAgentAvatarUrl } from '@/utils/avatar';

type SectionLabelKey =
  | 'tabGeneral'
  | 'tabChat'
  | 'tabModels'
  | 'tabChannels'
  | 'tabSkills'
  | 'tabConnections'
  | 'tabToolCalls'
  | 'tabTriggers';

type Section = {
  key: string;
  seg: string; // path segment appended after the agent id; '' is the base (general) route
  labelKey: SectionLabelKey;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

const SECTIONS: Section[] = [
  { key: 'general', seg: '', labelKey: 'tabGeneral', icon: AdjustmentsHorizontalIcon },
  { key: 'chat', seg: 'chat', labelKey: 'tabChat', icon: ChatBubbleOvalLeftEllipsisIcon },
  { key: 'models', seg: 'models', labelKey: 'tabModels', icon: SparklesIcon },
  { key: 'channels', seg: 'channels', labelKey: 'tabChannels', icon: ChatBubbleLeftRightIcon },
  { key: 'skills', seg: 'skills', labelKey: 'tabSkills', icon: AcademicCapIcon },
  { key: 'connections', seg: 'connections', labelKey: 'tabConnections', icon: LinkIcon },
  { key: 'tool-calls', seg: 'tool-calls', labelKey: 'tabToolCalls', icon: CommandLineIcon },
  { key: 'triggers', seg: 'triggers', labelKey: 'tabTriggers', icon: BoltIcon },
];

const hrefFor = (agentId: string, seg: string) =>
  seg ? `/dashboard/agents/${agentId}/${seg}` : `/dashboard/agents/${agentId}`;

export default function AgentContextNav({
  agentId,
  currentSection,
  collapsed,
}: {
  agentId: string;
  currentSection: string; // 'general' | section key | 'edit'
  collapsed: boolean;
}) {
  const t = useTranslations('Agents');
  const tSidebar = useTranslations('Sidebar');
  const router = useRouter();
  const [switcherOpen, setSwitcherOpen] = useState(false);

  // Non-suspense: the sidebar must never blank out or throw while the agent loads.
  const { data: agent } = useAgentDetailQuery(agentId);
  const { data: agentsPage } = useQuery({ ...allAgentsOptions(), enabled: switcherOpen });
  const agents = agentsPage?.content ?? [];

  // Preserve the open section when switching agents; edit/unknown fall back to general.
  const keepSeg = SECTIONS.find((s) => s.key === currentSection)?.seg ?? '';
  const switchTo = (id: string) => {
    setSwitcherOpen(false);
    router.push(hrefFor(id, keepSeg));
  };

  const backLink = (
    <Link
      href="/dashboard/agents"
      title={collapsed ? tSidebar('agents') : undefined}
      className={`group/item relative flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-secondary hover:text-foreground ${
        collapsed ? 'justify-center' : ''
      }`}
    >
      <ArrowLeftIcon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate">{tSidebar('agents')}</span>}
      {collapsed && (
        <span className="pointer-events-none absolute left-full z-20 ml-2 hidden whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background shadow-lg group-hover/item:block">
          {tSidebar('agents')}
        </span>
      )}
    </Link>
  );

  const sectionLinks = (
    <div className="space-y-0.5">
      {SECTIONS.map(({ key, seg, labelKey, icon: Icon }) => {
        const isActive = currentSection === key;
        return (
          <Link
            key={key}
            href={hrefFor(agentId, seg)}
            title={collapsed ? t(labelKey) : undefined}
            className={`group/item relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors
              ${collapsed ? 'justify-center' : ''}
              ${isActive ? 'bg-accent text-accent-foreground' : 'text-muted hover:bg-surface-secondary hover:text-foreground'}`}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="truncate">{t(labelKey)}</span>}
            {collapsed && (
              <span className="pointer-events-none absolute left-full z-20 ml-2 hidden whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background shadow-lg group-hover/item:block">
                {t(labelKey)}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );

  if (collapsed) {
    return (
      <div key={agentId} className="animate-sidebar-in space-y-2">
        {backLink}
        {agent && (
          <div className="group/item relative flex justify-center py-1">
            <img src={getAgentAvatarUrl(agent.name)} alt={agent.name} className="h-8 w-8 rounded-lg" />
            <span className="pointer-events-none absolute left-full top-1/2 z-20 ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background shadow-lg group-hover/item:block">
              {agent.name}
            </span>
          </div>
        )}
        <div className="mx-2 h-px bg-border" />
        {sectionLinks}
      </div>
    );
  }

  return (
    <div key={agentId} className="animate-sidebar-in">
      {backLink}

      {/* Agent switcher */}
      <div className="relative mt-2 mb-3">
        <button
          type="button"
          onClick={() => setSwitcherOpen((v) => !v)}
          aria-label={t('switchAgent')}
          aria-expanded={switcherOpen}
          className="flex w-full items-center gap-2.5 rounded-lg border border-border bg-surface-secondary px-2.5 py-2 text-left transition-colors hover:border-accent"
        >
          {agent ? (
            <img src={getAgentAvatarUrl(agent.name)} alt="" className="h-7 w-7 shrink-0 rounded-md" />
          ) : (
            <span className="h-7 w-7 shrink-0 animate-pulse rounded-md bg-border" />
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13.5px] font-semibold text-foreground">
              {agent?.name ?? '…'}
            </span>
            {agent && (
              <span className="flex items-center gap-1 text-[11px] text-muted">
                <span className={`h-1.5 w-1.5 rounded-full ${agent.enabled ? 'bg-success' : 'bg-muted'}`} />
                {agent.enabled ? t('enabled') : t('disabled')}
              </span>
            )}
          </span>
          <ChevronUpDownIcon className="h-4 w-4 shrink-0 text-muted" />
        </button>

        {switcherOpen && (
          <>
            <button
              type="button"
              aria-hidden
              tabIndex={-1}
              onClick={() => setSwitcherOpen(false)}
              className="fixed inset-0 z-20 cursor-default"
            />
            <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 max-h-72 overflow-y-auto rounded-lg border border-border bg-surface p-1 shadow-lg">
              {agents.map((a) => {
                const isCurrent = a.id === agentId;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => switchTo(a.id)}
                    className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-surface-secondary ${
                      isCurrent ? 'text-muted' : 'text-foreground'
                    }`}
                  >
                    <img src={getAgentAvatarUrl(a.name)} alt="" className="h-6 w-6 shrink-0 rounded" />
                    <span className="min-w-0 flex-1 truncate">{a.name}</span>
                    {isCurrent && <CheckIcon className="h-4 w-4 shrink-0 text-accent" />}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {sectionLinks}
    </div>
  );
}
