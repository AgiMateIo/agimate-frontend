'use client';

import { usePathname } from '@/i18n/navigation';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useUser } from '@/contexts/UserContext';
import { useBreadcrumbOverrides } from '@/contexts/BreadcrumbContext';
import LocaleSwitcher from '@/components/ui/LocaleSwitcher';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

export default function TopBar() {
  const pathname = usePathname();
  const { user, logout } = useUser();
  const t = useTranslations('TopBar');

  const [showUserMenu, setShowUserMenu] = useState(false);
  const breadcrumbOverrides = useBreadcrumbOverrides();

  // Build breadcrumbs from pathname
  const segments = pathname.split('/').filter(Boolean);
  // segments: e.g. ["dashboard", "connectors", "ozon"]

  const breadcrumbSegmentNames: Record<string, string> = {
    dashboard: t('breadcrumbs.dashboard'),
    connectors: t('breadcrumbs.connectors'),
    apps: t('breadcrumbs.apps'),
    agents: t('breadcrumbs.agents'),
    'agentic-teams': t('breadcrumbs.agenticTeams'),
    'api-keys': t('breadcrumbs.apiKeys'),
    'trigger-logs': t('breadcrumbs.triggerLogs'),
    'tool-use-logs': t('breadcrumbs.toolUseLogs'),
    integrations: t('breadcrumbs.integrations'),
    settings: t('breadcrumbs.settings'),
    board: t('breadcrumbs.board'),
  };

  const breadcrumbs = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/');
    const label = breadcrumbOverrides[segment] || breadcrumbSegmentNames[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
    const isLast = index === segments.length - 1;
    return { href, label, isLast };
  });

  return (
    <header className="h-16 border-b border-border bg-surface flex items-center justify-between px-6 shrink-0">
      {/* Left: Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm">
        {breadcrumbs.map((crumb, index) => (
          <span key={crumb.href} className="flex items-center gap-2">
            {index > 0 && <ChevronRightIcon className="h-4 w-4 text-muted" />}
            {crumb.isLast ? (
              <span className="text-foreground font-medium">{crumb.label}</span>
            ) : (
              <Link href={crumb.href} className="text-muted hover:text-foreground transition-colors">
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </nav>

      {/* Right: Language + User Avatar */}
      <div className="flex items-center gap-3">
        <LocaleSwitcher />
      <div className="relative">
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex items-center gap-3 hover:bg-surface-secondary rounded-lg px-3 py-2 transition-colors"
        >
          <span className="text-sm text-muted hidden sm:block">
            {user?.displayName || user?.email || 'User'}
          </span>
          <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-accent-foreground font-medium text-sm">
            {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
          </div>
        </button>

        {showUserMenu && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-surface border border-border rounded-lg shadow-lg py-1 z-50">
            <div className="px-4 py-2 border-b border-border">
              <div className="font-medium text-sm text-foreground truncate">
                {user?.displayName || 'User'}
              </div>
              <div className="text-xs text-muted truncate">
                {user?.email}
              </div>
            </div>
            <button
              onClick={() => {
                setShowUserMenu(false);
                logout();
              }}
              className="w-full text-left px-4 py-2 text-sm text-error hover:bg-surface-secondary transition-colors"
            >
              {t('logOut')}
            </button>
          </div>
        )}
      </div>
      </div>
    </header>
  );
}
