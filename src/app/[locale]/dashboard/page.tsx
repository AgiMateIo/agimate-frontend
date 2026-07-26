'use client';

import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import DashboardViewSwitch from '@/components/dashboard/DashboardViewSwitch';
import OverviewGreeting from '@/components/dashboard/OverviewGreeting';
import OverviewMode from '@/components/dashboard/OverviewMode';
import WorkMode from '@/components/dashboard/WorkMode';
import { useDashboardViewMode } from '@/components/dashboard/viewMode';
import { useDashboardResources } from '@/queries/dashboard';

function DashboardHome() {
  const t = useTranslations('DashboardHome');
  const { mode, setMode } = useDashboardViewMode();
  const resources = useDashboardResources();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        {mode === 'overview' ? (
          <OverviewGreeting />
        ) : (
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
            <p className="mt-1 text-muted">{t('subtitle')}</p>
          </div>
        )}
        <DashboardViewSwitch mode={mode} onChange={setMode} />
      </div>

      {mode === 'overview' ? (
        <OverviewMode resources={resources} />
      ) : (
        <WorkMode resources={resources} />
      )}
    </div>
  );
}

export default function DashboardPage() {
  // useDashboardViewMode reads the `view` search param, which needs a Suspense
  // boundary above it.
  return (
    <Suspense fallback={null}>
      <DashboardHome />
    </Suspense>
  );
}
