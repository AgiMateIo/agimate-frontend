'use client';

import { Link } from '@/i18n/navigation';
import { usePathname } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import {
  HomeIcon,
  PuzzlePieceIcon,
  KeyIcon,
  BellAlertIcon,
  DevicePhoneMobileIcon,
  BoltIcon,
  PlayIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

const getNavItems = (t: ReturnType<typeof useTranslations>) => [
  { label: t('dashboard'), icon: HomeIcon, href: '/dashboard' },
  { label: t('connectors'), icon: PuzzlePieceIcon, href: '/dashboard/connectors' },
  { label: t('devices'), icon: DevicePhoneMobileIcon, href: '/dashboard/devices' },
  { label: t('triggers'), icon: BoltIcon, href: '/dashboard/triggers' },
  { label: t('actions'), icon: PlayIcon, href: '/dashboard/actions' },
  { label: t('webhooks'), icon: BellAlertIcon, href: '/dashboard/webhooks' },
  { label: t('apiKeys'), icon: KeyIcon, href: '/dashboard/api-keys' },
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
          const isActive = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));

          return (
            <Link
              key={item.href}
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
