'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { RefreshControls } from '@/components/ui/RefreshControls';
import { Link } from '@/i18n/navigation';
import {
  dashboardKeys,
  type DashboardResources,
  type useAttentionSignals,
} from '@/queries/dashboard';
import { llmProviderKeys } from '@/queries/llm-providers';
import { webchatKeys } from '@/queries/webchat';
import ActivityFeed from './ActivityFeed';
import AttentionPanel from './AttentionPanel';
import LlmSpend from './LlmSpend';
import RecentChats from './RecentChats';
import UpcomingJobs from './UpcomingJobs';
import { RESOURCE_CARDS } from './resources';

/**
 * Dense working home: what is broken, what just ran, what runs next, what it
 * costs. The counters shrink to a single line so the space goes to the blocks
 * that answer those questions.
 */
export default function WorkMode({
  resources,
  attention,
  refreshSeconds,
  onRefreshSecondsChange,
}: {
  resources: DashboardResources;
  attention: ReturnType<typeof useAttentionSignals>;
  refreshSeconds: number | null;
  onRefreshSecondsChange: (seconds: number | null) => void;
}) {
  const t = useTranslations('DashboardHome');
  const queryClient = useQueryClient();

  // One control refreshes every block, including the ones fed by shared keys.
  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    queryClient.invalidateQueries({ queryKey: llmProviderKeys.usage() });
    queryClient.invalidateQueries({ queryKey: webchatKeys.sessions() });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-border bg-surface px-5 py-3">
        {RESOURCE_CARDS.map((spec) => {
          const { count, loading, error } = resources[spec.key];

          return (
            <Link
              key={spec.key}
              href={spec.href}
              className="group flex items-baseline gap-2 text-sm"
            >
              <span className="text-muted transition-colors group-hover:text-foreground">
                {t(spec.labelKey)}
              </span>
              {loading ? (
                <span className="inline-block h-4 w-6 animate-pulse rounded bg-surface-secondary" />
              ) : error !== null ? (
                <span className="text-error">—</span>
              ) : (
                <span className="font-semibold tabular-nums text-foreground">
                  {count}
                </span>
              )}
            </Link>
          );
        })}
        <div className="ml-auto">
          <RefreshControls
            value={refreshSeconds}
            onChange={onRefreshSecondsChange}
            onRefresh={refreshAll}
          />
        </div>
      </div>

      <AttentionPanel
        signals={attention.signals}
        loading={attention.loading}
        error={attention.error}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ActivityFeed refreshSeconds={refreshSeconds} />
        </div>
        <div className="space-y-4">
          <UpcomingJobs refreshSeconds={refreshSeconds} />
          <RecentChats />
        </div>
      </div>

      <LlmSpend />
    </div>
  );
}
