'use client';

import { Link } from '@/i18n/navigation';
import { usePathname } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import {
  HomeIcon,
  DevicePhoneMobileIcon,
  SparklesIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  BoltIcon,
  WrenchScrewdriverIcon,
  LinkIcon,
  CpuChipIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline';

type NavItem = {
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  href: string;
  activePaths?: string[];
  children?: NavItem[];
};

const getNavItems = (t: ReturnType<typeof useTranslations>): NavItem[] => [
  { label: t('dashboard'), icon: HomeIcon, href: '/dashboard' },
  {
    label: t('connectors'), icon: CpuChipIcon, href: '/dashboard/connectors',
    activePaths: ['/dashboard/connectors', '/dashboard/apps', '/dashboard/trigger-logs', '/dashboard/tool-use-logs', '/dashboard/integrations'],
    children: [
      { label: t('apps'), icon: DevicePhoneMobileIcon, href: '/dashboard/apps' },
      { label: t('integrations'), icon: LinkIcon, href: '/dashboard/integrations' },
      { label: t('triggerLogs'), icon: BoltIcon, href: '/dashboard/trigger-logs' },
      { label: t('toolUseLogs'), icon: WrenchScrewdriverIcon, href: '/dashboard/tool-use-logs' },
    ],
  },
  {
    label: t('agenticTeams'), icon: UserGroupIcon, href: '/dashboard/agentic-teams',
    activePaths: ['/dashboard/agentic-teams', '/dashboard/agents'],
    children: [
      { label: t('agents'), icon: SparklesIcon, href: '/dashboard/agents' },
    ],
  },
  { label: t('skills'), icon: AcademicCapIcon, href: '/dashboard/skills' },
  { label: t('settings'), icon: Cog6ToothIcon, href: '/dashboard/settings' },
];

export default function SidebarNav() {
  const pathname = usePathname();
  const t = useTranslations('Sidebar');
  const navItems = getNavItems(t);

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
          const hasActiveChild = item.children?.some(child =>
            pathname === child.href || pathname.startsWith(child.href + '/'));
          const isActive = !hasActiveChild && (
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))
          );

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
                  {item.children.map((child) => {
                    const isChildActive = pathname === child.href ||
                      pathname.startsWith(child.href + '/');

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
