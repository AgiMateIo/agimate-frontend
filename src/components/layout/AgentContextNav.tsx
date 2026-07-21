'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import {
  AdjustmentsHorizontalIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  SparklesIcon,
  ChatBubbleLeftRightIcon,
  AcademicCapIcon,
  LinkIcon,
  CommandLineIcon,
  BoltIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import { useAgentDetailQuery, allAgentsOptions } from '@/queries/agents';
import { getAgentAvatarUrl } from '@/utils/avatar';
import ContextNav from './ContextNav';

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

  // Preserve the open section when switching agents; edit/unknown fall back to general.
  const keepSeg = SECTIONS.find((s) => s.key === currentSection)?.seg ?? '';

  return (
    <ContextNav
      collapsed={collapsed}
      backHref="/dashboard/agents"
      backLabel={tSidebar('agents')}
      createHref="/dashboard/agents/create"
      createLabel={tSidebar('createAgent')}
      name={agent?.name}
      avatarUrl={agent ? getAgentAvatarUrl(agent.name) : undefined}
      fallbackIcon={UserCircleIcon}
      status={agent ? { on: agent.enabled, label: agent.enabled ? t('enabled') : t('disabled') } : undefined}
      sections={SECTIONS.map(({ key, seg, labelKey, icon }) => ({
        key,
        href: hrefFor(agentId, seg),
        label: t(labelKey),
        icon,
      }))}
      currentSection={currentSection}
      switcher={{
        label: t('switchAgent'),
        open: switcherOpen,
        onOpenChange: setSwitcherOpen,
        items: (agentsPage?.content ?? []).map((a) => ({
          id: a.id,
          name: a.name,
          avatarUrl: getAgentAvatarUrl(a.name),
        })),
        currentId: agentId,
        onSelect: (id) => {
          setSwitcherOpen(false);
          router.push(hrefFor(id, keepSeg));
        },
      }}
    />
  );
}
