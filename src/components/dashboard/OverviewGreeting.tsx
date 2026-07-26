'use client';

import { useTranslations } from 'next-intl';
import { useUser } from '@/contexts/UserContext';
import { useLlmUsageQuery } from '@/queries/llm-providers';

export default function OverviewGreeting() {
  const t = useTranslations('DashboardHome');
  const { user } = useUser();
  const { data: usage } = useLlmUsageQuery();

  const name =
    user?.firstName?.trim() ||
    user?.displayName?.trim() ||
    user?.email?.split('@')[0] ||
    '';

  // The only activity number the backend actually reports for the whole
  // workspace: LLM requests in today's window, summed over every provider the
  // user's agents run on.
  const requestsToday = usage
    ? usage.reduce(
        (sum, u) => sum + (u.windows.find((w) => w.window === 'DAY')?.requests ?? 0),
        0,
      )
    : null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">
        {name ? t('greeting', { name }) : t('greetingNoName')}
      </h1>
      <p className="mt-1 text-muted">
        {requestsToday === null
          ? t('subtitle')
          : requestsToday > 0
            ? t('requestsToday', { count: requestsToday })
            : t('quietToday')}
      </p>
    </div>
  );
}
