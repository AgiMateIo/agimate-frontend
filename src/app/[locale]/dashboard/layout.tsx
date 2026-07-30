'use client';

import { useUser } from '@/contexts/UserContext';
import { useRouter } from '@/i18n/navigation';
import { useEffect } from 'react';
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

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

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
        <SidebarNav disabled={isGuest} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar disabled={isGuest} />
          {/* A guest account has access to no dashboard route, so the notice
              replaces the page instead of rendering alongside it. */}
          <main className="flex-1 overflow-y-auto p-6">
            {isGuest ? <PendingActivationNotice /> : children}
          </main>
        </div>
      </div>
    </BreadcrumbProvider>
  );
}
