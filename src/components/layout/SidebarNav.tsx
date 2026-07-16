'use client';

import { useState, useEffect } from 'react';
import { Link } from '@/i18n/navigation';
import { usePathname } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import {
  HomeIcon,
  DevicePhoneMobileIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  BoltIcon,
  WrenchScrewdriverIcon,
  LinkIcon,
  CpuChipIcon,
  AcademicCapIcon,
  ChartBarIcon,
  SparklesIcon,
  ChatBubbleLeftRightIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  ClockIcon,
  RocketLaunchIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import apiService from '@/services/api';
import { AgenticTeam } from '@/types';

type NavItem = {
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  href: string;
  children?: NavItem[];
};

// Length of the longest prefix of `pathname` that `href` matches (exact match or
// a nested route under it), or -1 when it doesn't match at all. Dashboard only
// matches exactly so it isn't lit up by every nested route. Used to pick the one
// most-specific nav entry when hrefs overlap (e.g. the agent wizard `/agents/create`
// sits under the agents list `/agents`).
const matchedLength = (pathname: string, href: string): number => {
  if (pathname === href) return href.length;
  if (href !== '/dashboard' && pathname.startsWith(href + '/')) return href.length;
  return -1;
};

const getNavItems = (t: ReturnType<typeof useTranslations>, teams: AgenticTeam[]): NavItem[] => [
  { label: t('dashboard'), icon: HomeIcon, href: '/dashboard' },
  {
    label: t('agentWizard'), icon: RocketLaunchIcon, href: '/dashboard/agents/create',
    children: [
      { label: t('agents'), icon: UserCircleIcon, href: '/dashboard/agents' },
    ],
  },
  { label: t('chat'), icon: ChatBubbleOvalLeftEllipsisIcon, href: '/dashboard/chat' },
  { label: t('llmProviders'), icon: SparklesIcon, href: '/dashboard/llm-providers' },
  {
    label: t('connectors'), icon: CpuChipIcon, href: '/dashboard/connectors',
    children: [
      { label: t('apps'), icon: DevicePhoneMobileIcon, href: '/dashboard/apps' },
      { label: t('connections'), icon: LinkIcon, href: '/dashboard/connections' },
      { label: t('channels'), icon: ChatBubbleLeftRightIcon, href: '/dashboard/channels' },
      { label: t('connectorJobs'), icon: ClockIcon, href: '/dashboard/connector-jobs' },
    ],
  },
  { label: t('skills'), icon: AcademicCapIcon, href: '/dashboard/skills' },
  {
    label: t('agenticTeams'), icon: UserGroupIcon, href: '/dashboard/agentic-teams',
    children: teams.map((team) => ({
      label: team.name,
      icon: UserGroupIcon,
      href: `/dashboard/agentic-teams/${team.id}`,
    })),
  },
  {
    label: t('monitoring'), icon: ChartBarIcon, href: '/dashboard/trigger-logs',
    children: [
      { label: t('triggerLogs'), icon: BoltIcon, href: '/dashboard/trigger-logs' },
      { label: t('toolUseLogs'), icon: WrenchScrewdriverIcon, href: '/dashboard/tool-use-logs' },
    ],
  },
  { label: t('settings'), icon: Cog6ToothIcon, href: '/dashboard/settings' },
];

export default function SidebarNav() {
  const pathname = usePathname();
  const t = useTranslations('Sidebar');
  const [teams, setTeams] = useState<AgenticTeam[]>([]);

  useEffect(() => {
    apiService.getAgenticTeams().then(setTeams).catch(() => {});
  }, []);

  const navItems = getNavItems(t, teams);

  return (
    <aside className="w-64 border-r border-border bg-surface flex flex-col shrink-0">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-border">
        <Link href="/dashboard" className="text-xl font-bold text-foreground">
          AgiMate
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const parentMatch = matchedLength(pathname, item.href);
          let activeChildIndex = -1;
          let activeChildMatch = -1;
          item.children?.forEach((child, index) => {
            const length = matchedLength(pathname, child.href);
            if (length > activeChildMatch) {
              activeChildMatch = length;
              activeChildIndex = index;
            }
          });
          // A child wins ties so shared-href sub-items (Monitoring → Trigger Logs)
          // stay lit instead of highlighting the parent.
          const childActive = activeChildMatch >= 0 && activeChildMatch >= parentMatch;
          const isActive = parentMatch >= 0 && !childActive;

          return (
            <div key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium
                  ${isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted hover:bg-surface-secondary hover:text-foreground'
                  }`}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
              {item.children && (
                <div className="mt-1 space-y-1">
                  {item.children.map((child, index) => {
                    const isChildActive = childActive && index === activeChildIndex;

                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`flex items-center gap-3 pl-8 pr-3 py-2 rounded-lg transition-colors text-sm
                          ${isChildActive
                            ? 'bg-accent text-accent-foreground font-medium'
                            : 'text-muted hover:bg-surface-secondary hover:text-foreground'
                          }`}
                      >
                        <child.icon className="h-4 w-4" />
                        <span>{child.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="text-xs text-muted">
          AgiMate v1.0.0
        </div>
      </div>
    </aside>
  );
}
