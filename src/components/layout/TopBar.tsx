'use client';

import { usePathname } from '@/i18n/navigation';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useUser } from '@/contexts/UserContext';
import { useBreadcrumbOverrides } from '@/contexts/BreadcrumbContext';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import LocaleSwitcher from '@/components/ui/LocaleSwitcher';
import ThemeSwitcher from '@/components/ui/ThemeSwitcher';
import {
  ArrowRightStartOnRectangleIcon,
  Bars3Icon,
  ChevronRightIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useRef, useState } from 'react';

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
  const isAdmin = useIsAdmin();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const breadcrumbOverrides = useBreadcrumbOverrides();

  // Same dismissal contract as `DropdownMenu`: outside pointerdown and Escape.
  // pointerdown rather than click, so the menu is gone before the control under
  // the pointer takes focus — a click elsewhere both closes this and lands.
  useEffect(() => {
    if (!showUserMenu) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (!userMenuRef.current?.contains(e.target as Node)) setShowUserMenu(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowUserMenu(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showUserMenu]);

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
    runs: t('breadcrumbs.runs'),
    'trigger-logs': t('breadcrumbs.triggerLogs'),
    'tool-use-logs': t('breadcrumbs.toolUseLogs'),
    'connector-jobs': t('breadcrumbs.connectorJobs'),
    connections: t('breadcrumbs.connections'),
    skills: t('breadcrumbs.skills'),
    files: t('breadcrumbs.files'),
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

      {/* Right: Theme + Language + User Avatar */}
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <ThemeSwitcher />
        <LocaleSwitcher />
      <div ref={userMenuRef} className="relative">
        <button
          type="button"
          onClick={() => setShowUserMenu(!showUserMenu)}
          aria-haspopup="menu"
          aria-expanded={showUserMenu}
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
          <div role="menu" className="absolute right-0 top-full mt-2 w-48 bg-surface border border-border rounded-lg shadow-lg py-1 z-50">
            {disabled ? (
              <div className="block px-4 py-2 border-b border-border">
                <div className="font-medium text-sm text-foreground truncate">
                  {user?.displayName || 'User'}
                </div>
                <div className="text-xs text-muted truncate">{user?.email}</div>
              </div>
            ) : (
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
            )}
            {/* Kept for a guest too, unlike every other in-app link: settings is
                the route a pending account may open, and the device list is on
                it — the way out of a lost phone must not need approval. */}
            <Link
              href="/dashboard/settings"
              onClick={() => setShowUserMenu(false)}
              className="flex items-center gap-3 w-full px-4 py-2 text-sm text-foreground hover:bg-surface-secondary transition-colors"
            >
              <Cog6ToothIcon className="h-5 w-5 text-muted" />
              {t('settings')}
            </Link>
            {/* The admin area lives here rather than in the sidebar: it is about
                the person signed in, not about the workspace being navigated. A
                pending account is never an admin, but `disabled` still gates it
                along with every other in-app link. */}
            {isAdmin && !disabled && (
              <Link
                href="/dashboard/admin/users"
                onClick={() => setShowUserMenu(false)}
                className="flex items-center gap-3 w-full px-4 py-2 text-sm text-foreground hover:bg-surface-secondary transition-colors"
              >
                <ShieldCheckIcon className="h-5 w-5 text-muted" />
                {t('administration')}
              </Link>
            )}
            <button
              onClick={() => {
                setShowUserMenu(false);
                logout();
              }}
              className="flex items-center gap-3 w-full text-left px-4 py-2 text-sm text-error hover:bg-surface-secondary transition-colors"
            >
              {/* The icon inherits the row's error colour instead of the muted
                  grey the links above use — signing out is the one item here
                  that is not navigation. */}
              <ArrowRightStartOnRectangleIcon className="h-5 w-5" />
              {t('logOut')}
            </button>
          </div>
        )}
      </div>
      </div>
    </header>
  );
}
