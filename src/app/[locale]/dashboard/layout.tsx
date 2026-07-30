'use client';

import { useUser } from '@/contexts/UserContext';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useEffect, useState } from 'react';
import SidebarNav from '@/components/layout/SidebarNav';
import TopBar from '@/components/layout/TopBar';
import PendingActivationNotice from '@/components/dashboard/PendingActivationNotice';
import { BreadcrumbProvider } from '@/contexts/BreadcrumbContext';
import { useIsGuest } from '@/hooks/useIsGuest';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useUser();
  const isGuest = useIsGuest();
  const router = useRouter();
  const pathname = usePathname();

  // Below `lg` the sidebar is an overlay drawer, so its open state lives here —
  // TopBar (the burger) and SidebarNav are siblings. Desktop ignores it entirely.
  // Navigating is what the drawer is for, so a route change closes it: the
  // pathname is stored alongside the flag and compared during render (the
  // adjust-state-on-change pattern) rather than synced from an effect.
  const [nav, setNav] = useState({ open: false, pathname });
  if (nav.pathname !== pathname) {
    setNav({ open: false, pathname });
  }
  const navOpen = nav.open;
  const setNavOpen = (open: boolean) => setNav({ open, pathname });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!navOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNav((current) => ({ ...current, open: false }));
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navOpen]);

  // Only the initial load blanks the screen; a re-fetch (e.g. the guest polling
  // for activation) keeps the current UI and shows its own inline spinner.
  if (loading && !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-muted">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <BreadcrumbProvider>
      <div className="flex h-screen bg-background">
        {navOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setNavOpen(false)}
            aria-hidden="true"
          />
        )}
        <SidebarNav disabled={isGuest} open={navOpen} onClose={() => setNavOpen(false)} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar disabled={isGuest} onMenuClick={() => setNavOpen(true)} />
          {/* A guest account has access to no dashboard route, so the notice
              replaces the page instead of rendering alongside it. */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">
            {isGuest ? <PendingActivationNotice /> : children}
          </main>
        </div>
      </div>
    </BreadcrumbProvider>
  );
}
