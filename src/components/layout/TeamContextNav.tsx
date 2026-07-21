'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import {
  AdjustmentsHorizontalIcon,
  UserCircleIcon,
  ClipboardDocumentListIcon,
  BookOpenIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { agenticTeamOptions, agenticTeamsListOptions } from '@/queries/agentic-teams';
import ContextNav from './ContextNav';

type SectionLabelKey = 'tabGeneral' | 'agents' | 'taskBoard' | 'knowledgeBase' | 'agentChat';

type Section = {
  key: string;
  seg: string; // path segment appended after the team id; '' is the base (general) route
  labelKey: SectionLabelKey;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

const SECTIONS: Section[] = [
  { key: 'general', seg: '', labelKey: 'tabGeneral', icon: AdjustmentsHorizontalIcon },
  { key: 'agents', seg: 'agents', labelKey: 'agents', icon: UserCircleIcon },
  { key: 'board', seg: 'board', labelKey: 'taskBoard', icon: ClipboardDocumentListIcon },
  { key: 'knowledge-base', seg: 'knowledge-base', labelKey: 'knowledgeBase', icon: BookOpenIcon },
  { key: 'chat', seg: 'chat', labelKey: 'agentChat', icon: ChatBubbleLeftRightIcon },
];

const hrefFor = (teamId: string, seg: string) =>
  seg ? `/dashboard/agentic-teams/${teamId}/${seg}` : `/dashboard/agentic-teams/${teamId}`;

export default function TeamContextNav({
  teamId,
  currentSection,
  collapsed,
}: {
  teamId: string;
  currentSection: string; // 'general' | section key
  collapsed: boolean;
}) {
  const t = useTranslations('AgenticTeams');
  const tSidebar = useTranslations('Sidebar');
  const router = useRouter();
  const [switcherOpen, setSwitcherOpen] = useState(false);

  // Non-suspense: the sidebar must never blank out or throw while the team loads.
  const { data: team } = useQuery(agenticTeamOptions(teamId));
  const { data: teams } = useQuery({ ...agenticTeamsListOptions(), enabled: switcherOpen });

  // Preserve the open section when switching teams; unknown falls back to general.
  const keepSeg = SECTIONS.find((s) => s.key === currentSection)?.seg ?? '';

  return (
    <ContextNav
      collapsed={collapsed}
      backHref="/dashboard/agentic-teams"
      backLabel={tSidebar('agenticTeams')}
      createHref="/dashboard/agentic-teams?create=1"
      createLabel={tSidebar('createTeam')}
      name={team?.name}
      fallbackIcon={UserGroupIcon}
      sections={SECTIONS.map(({ key, seg, labelKey, icon }) => ({
        key,
        href: hrefFor(teamId, seg),
        label: t(labelKey),
        icon,
      }))}
      currentSection={currentSection}
      switcher={{
        label: t('switchTeam'),
        open: switcherOpen,
        onOpenChange: setSwitcherOpen,
        items: (teams ?? []).map((tm) => ({ id: tm.id, name: tm.name })),
        currentId: teamId,
        onSelect: (id) => {
          setSwitcherOpen(false);
          router.push(hrefFor(id, keepSeg));
        },
      }}
    />
  );
}
