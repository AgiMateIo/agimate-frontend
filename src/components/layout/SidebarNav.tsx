'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  ChatBubbleLeftRightIcon,
  PuzzlePieceIcon,
  KeyIcon,
  BellAlertIcon,
  DevicePhoneMobileIcon,
  BoltIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

const navItems = [
  { label: 'Dashboard', icon: HomeIcon, href: '/dashboard' },
  { label: 'Analytics', icon: ChartBarIcon, href: '/dashboard/analytics' },
  { label: 'Smart Actions', icon: ExclamationTriangleIcon, href: '/dashboard/smart-actions' },
  { label: 'AI Chat', icon: ChatBubbleLeftRightIcon, href: '/dashboard/chat' },
  { label: 'Connectors', icon: PuzzlePieceIcon, href: '/dashboard/connectors' },
  { label: 'API Keys', icon: KeyIcon, href: '/dashboard/api-keys' },
  { label: 'Webhooks', icon: BellAlertIcon, href: '/dashboard/webhooks' },
  { label: 'Mobile Devices', icon: DevicePhoneMobileIcon, href: '/dashboard/mobile-devices' },
  { label: 'Competitive', icon: BoltIcon, href: '/dashboard/competitive' },
  { label: 'Settings', icon: Cog6ToothIcon, href: '/dashboard/settings' },
];

export default function SidebarNav() {
  const pathname = usePathname();

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
