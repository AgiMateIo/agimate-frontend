'use client';

import { Suspense, useState } from 'react';
import { useTranslations } from 'next-intl';
import DashboardViewSwitch from '@/components/dashboard/DashboardViewSwitch';
import OverviewGreeting from '@/components/dashboard/OverviewGreeting';
import OverviewMode from '@/components/dashboard/OverviewMode';
import WorkMode from '@/components/dashboard/WorkMode';
import { useDashboardViewMode } from '@/components/dashboard/viewMode';
import { useAttentionSignals, useDashboardResources } from '@/queries/dashboard';

function DashboardHome() {
  const t = useTranslations('DashboardHome');
  const { mode, setMode } = useDashboardViewMode();
  const resources = useDashboardResources();
  // Polling belongs to the work mode; the overview reads the same data once.
  const [refreshSeconds, setRefreshSeconds] = useState<number | null>(null);
  // Fetched in both modes: the overview needs it for the banner and the dot on
  // the switch, which is the whole point of surfacing it there.
  const attention = useAttentionSignals(mode === 'pro' ? refreshSeconds : null);

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
        <DashboardViewSwitch mode={mode} onChange={setMode} alert={attention.hasAlert} />
      </div>

      {mode === 'overview' ? (
        <OverviewMode resources={resources} attentionCount={attention.signals.length} />
      ) : (
        <WorkMode
          resources={resources}
          attention={attention}
          refreshSeconds={refreshSeconds}
          onRefreshSecondsChange={setRefreshSeconds}
        />
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
