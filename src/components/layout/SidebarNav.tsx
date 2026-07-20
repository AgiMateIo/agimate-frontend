'use client';

import { useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, usePathname } from '@/i18n/navigation';
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
  SparklesIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  UserCircleIcon,
  PlusIcon,
  ChevronDoubleLeftIcon,
} from '@heroicons/react/24/outline';
import { agenticTeamsListOptions } from '@/queries/agentic-teams';
import { AgenticTeam } from '@/types';
import AgentContextNav from './AgentContextNav';

// Route segments under /dashboard/agents that are not an agent instance.
const NON_AGENT_SEGMENTS = new Set(['create', 'deliveries']);

// When on an agent detail route the sidebar swaps its global nav for that agent's
// contextual nav. Returns { agentId, section } or null. section is 'general' for the
// base route, the sub-route name otherwise (e.g. 'models', 'edit').
const matchAgentRoute = (pathname: string): { agentId: string; section: string } | null => {
  const m = pathname.match(/^\/dashboard\/agents\/([^/]+)(?:\/([^/]+))?$/);
  if (!m || NON_AGENT_SEGMENTS.has(m[1])) return null;
  return { agentId: m[1], section: m[2] ?? 'general' };
};

type NavItem = {
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  href: string;
  createHref?: string; // renders an inline "+" action (e.g. Agents → wizard)
  createLabel?: string;
  children?: NavItem[];
};

type NavGroup = {
  label?: string;
  items: NavItem[];
};

const COLLAPSE_KEY = 'sidebar:collapsed';
const COLLAPSE_EVENT = 'sidebar:collapsed-change';

// Persisted collapse flag as an external store so we read localStorage without a
// setState-in-effect, stay SSR-safe (server renders expanded), and sync across tabs.
const collapseStore = {
  subscribe(callback: () => void) {
    window.addEventListener(COLLAPSE_EVENT, callback);
    window.addEventListener('storage', callback);
    return () => {
      window.removeEventListener(COLLAPSE_EVENT, callback);
      window.removeEventListener('storage', callback);
    };
  },
  getSnapshot: () => localStorage.getItem(COLLAPSE_KEY) === '1',
  getServerSnapshot: () => false,
  toggle(current: boolean) {
    localStorage.setItem(COLLAPSE_KEY, current ? '0' : '1');
    window.dispatchEvent(new Event(COLLAPSE_EVENT));
  },
};

// Length of the longest prefix of `pathname` that `href` matches (exact match or
// a nested route under it), or -1 when it doesn't match at all. Dashboard only
// matches exactly so it isn't lit up by every nested route. Used to pick the one
// most-specific nav entry when hrefs overlap (e.g. an agent detail `/agents/{id}`
// sits under the agents list `/agents`).
const matchedLength = (pathname: string, href: string): number => {
  if (pathname === href) return href.length;
  if (href !== '/dashboard' && pathname.startsWith(href + '/')) return href.length;
  return -1;
};

const getNavGroups = (
  t: ReturnType<typeof useTranslations>,
  teams: AgenticTeam[],
): NavGroup[] => [
  {
    label: t('workspace'),
    items: [
      { label: t('dashboard'), icon: HomeIcon, href: '/dashboard' },
      {
        label: t('agents'),
        icon: UserCircleIcon,
        href: '/dashboard/agents',
        createHref: '/dashboard/agents/create',
        createLabel: t('createAgent'),
      },
      { label: t('skills'), icon: AcademicCapIcon, href: '/dashboard/skills' },
      {
        label: t('agenticTeams'),
        icon: UserGroupIcon,
        href: '/dashboard/agentic-teams',
        children: teams.map((team) => ({
          label: team.name,
          icon: UserGroupIcon,
          href: `/dashboard/agentic-teams/${team.id}`,
        })),
      },
    ],
  },
  {
    label: t('infrastructure'),
    items: [
      { label: t('llmProviders'), icon: SparklesIcon, href: '/dashboard/llm-providers' },
      { label: t('connectors'), icon: CpuChipIcon, href: '/dashboard/connectors' },
      { label: t('apps'), icon: DevicePhoneMobileIcon, href: '/dashboard/apps' },
      { label: t('connections'), icon: LinkIcon, href: '/dashboard/connections' },
      { label: t('channels'), icon: ChatBubbleLeftRightIcon, href: '/dashboard/channels' },
      { label: t('connectorJobs'), icon: ClockIcon, href: '/dashboard/connector-jobs' },
    ],
  },
  {
    label: t('monitoring'),
    items: [
      { label: t('triggerLogs'), icon: BoltIcon, href: '/dashboard/trigger-logs' },
      { label: t('toolUseLogs'), icon: WrenchScrewdriverIcon, href: '/dashboard/tool-use-logs' },
    ],
  },
  {
    items: [{ label: t('settings'), icon: Cog6ToothIcon, href: '/dashboard/settings' }],
  },
];

export default function SidebarNav() {
  const pathname = usePathname();
  const t = useTranslations('Sidebar');
  // Non-suspense query: the sidebar must never blank out or throw to the layout
  // error boundary while teams load — an empty list is a fine intermediate state.
  const { data: teams = [] } = useQuery(agenticTeamsListOptions());

  const collapsed = useSyncExternalStore(
    collapseStore.subscribe,
    collapseStore.getSnapshot,
    collapseStore.getServerSnapshot,
  );
  const toggleCollapsed = () => collapseStore.toggle(collapsed);

  const agentRoute = matchAgentRoute(pathname);

  const groups = getNavGroups(t, teams);

  // Resolve the single most-specific active leaf across every group so shared-href
  // sub-items (a team detail under Teams) stay lit instead of highlighting a parent.
  let activeHref: string | null = null;
  let activeMatch = -1;
  for (const group of groups) {
    for (const item of group.items) {
      for (const href of [item.href, ...(item.children?.map((c) => c.href) ?? [])]) {
        const length = matchedLength(pathname, href);
        if (length > activeMatch) {
          activeMatch = length;
          activeHref = href;
        }
      }
    }
  }

  return (
    <aside
      className={`${collapsed ? 'w-[68px]' : 'w-64'} border-r border-border bg-surface flex flex-col shrink-0 transition-[width] duration-200`}
    >
      {/* Logo + collapse toggle */}
      <div className="h-16 flex items-center gap-2 px-4 border-b border-border">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-xl font-bold text-foreground min-w-0"
        >
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-accent text-sm font-extrabold text-accent-foreground">
            A
          </span>
          {!collapsed && <span className="truncate">AgiMate</span>}
        </Link>
        {!collapsed && (
          <button
            type="button"
            onClick={toggleCollapsed}
            title={t('collapse')}
            aria-label={t('collapse')}
            className="ml-auto grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted hover:bg-surface-secondary hover:text-foreground transition-colors"
          >
            <ChevronDoubleLeftIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3">
        {collapsed && (
          <button
            type="button"
            onClick={toggleCollapsed}
            title={t('expand')}
            aria-label={t('expand')}
            className="mb-2 grid h-9 w-full place-items-center rounded-lg text-muted hover:bg-surface-secondary hover:text-foreground transition-colors"
          >
            <ChevronDoubleLeftIcon className="h-4 w-4 rotate-180" />
          </button>
        )}

        {agentRoute ? (
          <AgentContextNav
            agentId={agentRoute.agentId}
            currentSection={agentRoute.section}
            collapsed={collapsed}
          />
        ) : (
          groups.map((group, groupIndex) => (
          <div key={group.label ?? `group-${groupIndex}`} className="mb-3.5 last:mb-0">
            {group.label &&
              (collapsed ? (
                <div className="mx-2 my-2 h-px bg-border" />
              ) : (
                <div className="px-2.5 pb-1 pt-1.5 text-[10.5px] font-bold uppercase tracking-wider text-muted/80">
                  {group.label}
                </div>
              ))}

            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = activeHref === item.href;
                const childActiveHref =
                  item.children?.find((c) => c.href === activeHref)?.href ?? null;

                return (
                  <div key={item.href}>
                    <div className="group/item relative flex items-center">
                      <Link
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        className={`flex flex-1 items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors
                          ${collapsed ? 'justify-center' : ''}
                          ${
                            isActive
                              ? 'bg-accent text-accent-foreground'
                              : 'text-muted hover:bg-surface-secondary hover:text-foreground'
                          }`}
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </Link>

                      {!collapsed && item.createHref && (
                        <Link
                          href={item.createHref}
                          title={item.createLabel}
                          aria-label={item.createLabel}
                          className={`absolute right-1.5 grid h-6 w-6 place-items-center rounded-md transition-colors
                            ${
                              isActive
                                ? 'text-accent-foreground/80 hover:bg-white/20 hover:text-accent-foreground'
                                : 'text-muted opacity-0 hover:bg-accent hover:text-accent-foreground group-hover/item:opacity-100'
                            }`}
                        >
                          <PlusIcon className="h-4 w-4" />
                        </Link>
                      )}

                      {/* Tooltip for collapsed mode */}
                      {collapsed && (
                        <span className="pointer-events-none absolute left-full z-20 ml-2 hidden whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background shadow-lg group-hover/item:block">
                          {item.label}
                        </span>
                      )}
                    </div>

                    {!collapsed && item.children && item.children.length > 0 && (
                      <div className="mt-0.5 space-y-0.5 pl-5">
                        {item.children.map((child) => {
                          const isChildActive = childActiveHref === child.href;
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[12.5px] transition-colors
                                ${
                                  isChildActive
                                    ? 'bg-accent font-medium text-accent-foreground'
                                    : 'text-muted hover:bg-surface-secondary hover:text-foreground'
                                }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 shrink-0 rounded-full ${isChildActive ? 'bg-accent-foreground' : 'bg-muted'}`}
                              />
                              <span className="truncate">{child.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          ))
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-4">
        <div className="text-xs text-muted">{collapsed ? 'v1' : 'AgiMate v1.0.0'}</div>
      </div>
    </aside>
  );
}
