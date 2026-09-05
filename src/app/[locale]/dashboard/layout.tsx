'use client';

import { useTranslations } from 'next-intl';
import { useUser } from '@/contexts/UserContext';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useEffect, useState } from 'react';
import SidebarNav from '@/components/layout/SidebarNav';
import TopBar from '@/components/layout/TopBar';
import PendingActivationNotice from '@/components/dashboard/PendingActivationNotice';
import { BreadcrumbProvider } from '@/contexts/BreadcrumbContext';
import { useIsGuest } from '@/hooks/useIsGuest';
// Side effect only: starts listening for the browser's install offer as soon as
// the dashboard loads. It fires once per page load, and the settings card that
// shows it may mount much later.
import '@/utils/installPrompt';

// The one dashboard route a guest account may open: it holds the device list,
// and someone who has just lost a phone must not wait for account approval to
// revoke a sign-in. Everything else is replaced by the pending notice.
// Matched exactly, not by prefix: an allow-list decides who gets in, so a route
// added under /dashboard/settings later has to be listed here on purpose rather
// than inherit access from its parent. The cost is remembering to add it — which
// is the direction to fail in.
const GUEST_ALLOWED_ROUTES = ['/dashboard/settings'];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations('Common');
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
  const guestBlocked = isGuest && !GUEST_ALLOWED_ROUTES.includes(pathname);
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
        <div className="text-muted">{t('loading')}</div>
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
          {/* A guest account has access to almost no dashboard route, so the
              notice replaces the page instead of rendering alongside it —
              except on the routes it is explicitly allowed to open. */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">
            {/* Capped and centred: on a 27" monitor a log table stretched past
                2000px, and a row that wide is no longer scannable. `h-full`
                keeps the percentage-height chain unbroken through this extra
                element — the agent chat measures its canvas through it to put
                the composer on the viewport floor. */}
            <div className="mx-auto h-full w-full max-w-[1600px]">
              {guestBlocked ? <PendingActivationNotice /> : children}
            </div>
          </main>
        </div>
      </div>
    </BreadcrumbProvider>
  );
}
