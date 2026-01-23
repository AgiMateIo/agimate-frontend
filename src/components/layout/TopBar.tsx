'use client';

import { usePathname } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { ChevronDownIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/analytics': 'Analytics',
  '/dashboard/smart-actions': 'Smart Actions',
  '/dashboard/chat': 'AI Chat',
  '/dashboard/integrations': 'Integrations',
  '/dashboard/competitive': 'Competitive Intelligence',
  '/dashboard/settings': 'Settings',
};

const marketplaces = [
  { id: 'all', name: 'All Marketplaces' },
  { id: 'ozon', name: 'Ozon' },
  { id: 'wb', name: 'Wildberries' },
];

const dateRanges = [
  { id: 'today', name: 'Today' },
  { id: '7d', name: 'Last 7 days' },
  { id: '30d', name: 'Last 30 days' },
  { id: '90d', name: 'Last 90 days' },
];

export default function TopBar() {
  const pathname = usePathname();
  const { user, logout } = useUser();
  const pageTitle = pageTitles[pathname] || 'Dashboard';

  const [selectedMarketplace, setSelectedMarketplace] = useState('all');
  const [selectedDateRange, setSelectedDateRange] = useState('7d');
  const [showUserMenu, setShowUserMenu] = useState(false);

  const currentMarketplace = marketplaces.find(m => m.id === selectedMarketplace);
  const currentDateRange = dateRanges.find(d => d.id === selectedDateRange);

  return (
    <header className="h-16 border-b border-border bg-surface flex items-center justify-between px-6 shrink-0">
      {/* Left: Page Title */}
      <h1 className="text-lg font-semibold text-foreground">{pageTitle}</h1>

      {/* Center: Filters */}
      <div className="flex items-center gap-3">
        {/* Marketplace Selector */}
        <div className="relative">
          <select
            value={selectedMarketplace}
            onChange={(e) => setSelectedMarketplace(e.target.value)}
            className="appearance-none bg-surface-secondary border border-border rounded-lg px-4 py-2 pr-10 text-sm font-medium text-foreground cursor-pointer hover:bg-surface focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1"
          >
            {marketplaces.map((mp) => (
              <option key={mp.id} value={mp.id}>
                {mp.name}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
        </div>

        {/* Date Range Selector */}
        <div className="relative">
          <select
            value={selectedDateRange}
            onChange={(e) => setSelectedDateRange(e.target.value)}
            className="appearance-none bg-surface-secondary border border-border rounded-lg px-4 py-2 pr-10 text-sm font-medium text-foreground cursor-pointer hover:bg-surface focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1"
          >
            {dateRanges.map((dr) => (
              <option key={dr.id} value={dr.id}>
                {dr.name}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
        </div>
      </div>

      {/* Right: User Avatar */}
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
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
