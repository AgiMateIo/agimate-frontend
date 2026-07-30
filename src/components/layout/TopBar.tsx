'use client';

import { usePathname } from '@/i18n/navigation';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useUser } from '@/contexts/UserContext';
import { useBreadcrumbOverrides } from '@/contexts/BreadcrumbContext';
import LocaleSwitcher from '@/components/ui/LocaleSwitcher';
import { Bars3Icon, ChevronRightIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

// `disabled` drops every in-app link (breadcrumbs, settings) and leaves only the
// locale switcher and sign-out — used while the account is awaiting activation.
// `onMenuClick` opens the mobile sidebar drawer (the burger is `lg:hidden`).
export default function TopBar({
  disabled = false,
  onMenuClick,
}: {
  disabled?: boolean;
  onMenuClick?: () => void;
}) {
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
    chat: t('breadcrumbs.chat'),
    connectors: t('breadcrumbs.connectors'),
    apps: t('breadcrumbs.apps'),
    agents: t('breadcrumbs.agents'),
    'agentic-teams': t('breadcrumbs.agenticTeams'),
    'trigger-logs': t('breadcrumbs.triggerLogs'),
    'tool-use-logs': t('breadcrumbs.toolUseLogs'),
    'connector-jobs': t('breadcrumbs.connectorJobs'),
    connections: t('breadcrumbs.connections'),
    skills: t('breadcrumbs.skills'),
    general: t('breadcrumbs.general'),
    models: t('breadcrumbs.models'),
    channels: t('breadcrumbs.channels'),
    'tool-calls': t('breadcrumbs.toolCalls'),
    settings: t('breadcrumbs.settings'),
    admin: t('breadcrumbs.admin'),
    users: t('breadcrumbs.users'),
    create: t('breadcrumbs.create'),
    edit: t('breadcrumbs.edit'),
    board: t('breadcrumbs.board'),
  };

  const breadcrumbs = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/');
    const label = breadcrumbOverrides[segment] || breadcrumbSegmentNames[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
    const isLast = index === segments.length - 1;
    return { href, label, isLast };
  });

  return (
    <header className="h-16 border-b border-border bg-surface flex items-center justify-between gap-2 px-4 shrink-0 sm:px-6">
      {/* Left: burger (mobile) + breadcrumbs */}
      <div className="flex min-w-0 items-center gap-2">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            aria-label={t('openMenu')}
            className="-ml-1.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-secondary hover:text-foreground lg:hidden"
          >
            <Bars3Icon className="h-5 w-5" />
          </button>
        )}

        {/* A deep path doesn't fit next to the avatar on a phone, and the drawer
            covers navigating up — so below `sm` only the current page shows. */}
        <nav className="flex min-w-0 items-center gap-2 text-sm">
          {breadcrumbs.map((crumb, index) => (
            <span
              key={crumb.href}
              className={`items-center gap-2 ${crumb.isLast ? 'flex min-w-0' : 'hidden sm:flex'}`}
            >
              {index > 0 && <ChevronRightIcon className="hidden h-4 w-4 shrink-0 text-muted sm:block" />}
              {crumb.isLast || disabled ? (
                <span className={`truncate ${crumb.isLast ? 'text-foreground font-medium' : 'text-muted'}`}>
                  {crumb.label}
                </span>
              ) : (
                <Link href={crumb.href} className="truncate text-muted hover:text-foreground transition-colors">
                  {crumb.label}
                </Link>
              )}
            </span>
          ))}
        </nav>
      </div>

      {/* Right: Language + User Avatar */}
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <LocaleSwitcher />
      <div className="relative">
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex items-center gap-3 hover:bg-surface-secondary rounded-lg px-1.5 py-2 transition-colors sm:px-3"
        >
          <span className="text-sm text-muted hidden sm:block truncate max-w-[180px]">
            {user?.displayName || user?.email || 'User'}
          </span>
          <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-accent-foreground font-medium text-sm">
            {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
          </div>
        </button>

        {showUserMenu && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-surface border border-border rounded-lg shadow-lg py-1 z-50">
            {disabled ? (
              <div className="block px-4 py-2 border-b border-border">
                <div className="font-medium text-sm text-foreground truncate">
                  {user?.displayName || 'User'}
                </div>
                <div className="text-xs text-muted truncate">{user?.email}</div>
              </div>
            ) : (
              <>
                <Link
                  href="/dashboard/settings"
                  onClick={() => setShowUserMenu(false)}
                  className="block px-4 py-2 border-b border-border hover:bg-surface-secondary transition-colors"
                >
                  <div className="font-medium text-sm text-foreground truncate">
                    {user?.displayName || 'User'}
                  </div>
                  <div className="text-xs text-muted truncate">
                    {user?.email}
                  </div>
                </Link>
                <Link
                  href="/dashboard/settings"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-foreground hover:bg-surface-secondary transition-colors"
                >
                  <Cog6ToothIcon className="h-4 w-4 text-muted" />
                  {t('settings')}
                </Link>
              </>
            )}
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
