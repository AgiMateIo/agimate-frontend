'use client';

import { useTranslations } from 'next-intl';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { Link } from '@/i18n/navigation';
import { useLlmUsageQuery } from '@/queries/llm-providers';
import type { DashboardResources } from '@/queries/dashboard';

type StepKey = 'setupLlm' | 'setupAgent' | 'setupConnection' | 'setupChat';

interface Step {
  key: StepKey;
  hintKey: 'setupLlmHint' | 'setupAgentHint' | 'setupConnectionHint' | 'setupChatHint';
  done: boolean;
  href: string;
}

/**
 * First-run checklist. Every step is derived from a count the dashboard already
 * fetches — no extra requests, and no state the backend doesn't actually track.
 * Disappears for good once all four are done.
 */
export default function SetupProgress({
  resources,
}: {
  resources: DashboardResources;
}) {
  const t = useTranslations('DashboardHome');
  const { data: usage, isPending: usagePending } = useLlmUsageQuery();

  const { agents, connections, chatSessions, llmProviders, firstAgentId } = resources;

  // A model is available either through the user's own provider or through the
  // platform free tier, which only appears in usage when it is enabled for them.
  const hasPlatformTier = usage?.some((u) => u.source === 'PLATFORM') ?? false;
  const hasModel = (llmProviders.count ?? 0) > 0 || hasPlatformTier;

  const stillLoading =
    usagePending ||
    llmProviders.loading ||
    agents.loading ||
    connections.loading ||
    chatSessions.loading;

  const steps: Step[] = [
    {
      key: 'setupLlm',
      hintKey: 'setupLlmHint',
      done: hasModel,
      href: '/dashboard/llm-providers',
    },
    {
      key: 'setupAgent',
      hintKey: 'setupAgentHint',
      done: (agents.count ?? 0) > 0,
      href: '/dashboard/agents/create',
    },
    {
      key: 'setupConnection',
      hintKey: 'setupConnectionHint',
      done: (connections.count ?? 0) > 0,
      href: '/dashboard/connectors',
    },
    {
      key: 'setupChat',
      hintKey: 'setupChatHint',
      done: (chatSessions.count ?? 0) > 0,
      href: firstAgentId ? `/dashboard/agents/${firstAgentId}/chat` : '/dashboard/agents',
    },
  ];

  const done = steps.filter((s) => s.done).length;

  // Wait for the counts rather than flashing an all-unchecked list, and step
  // aside entirely once the workspace is set up.
  if (stillLoading || done === steps.length) return null;

  return (
    <section className="space-y-4 rounded-xl border border-border bg-surface p-5">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-semibold text-foreground">{t('setupTitle')}</h2>
        <span className="text-sm tabular-nums text-muted">
          {t('setupProgress', { done, total: steps.length })}
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-surface-secondary">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${(done / steps.length) * 100}%` }}
        />
      </div>

      <ol className="space-y-1">
        {steps.map((step) => (
          <li key={step.key}>
            {step.done ? (
              <div className="flex items-center gap-3 rounded-lg px-2 py-2">
                <CheckCircleIcon className="h-5 w-5 shrink-0 text-success" />
                <span className="text-sm text-muted line-through">{t(step.key)}</span>
              </div>
            ) : (
              <Link
                href={step.href}
                className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-surface-secondary"
              >
                <span className="h-5 w-5 shrink-0 rounded-full border-2 border-border transition-colors group-hover:border-accent" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">
                    {t(step.key)}
                  </span>
                  <span className="block text-xs text-muted">{t(step.hintKey)}</span>
                </span>
                <span className="ml-auto text-sm font-medium text-accent opacity-0 transition-opacity group-hover:opacity-100">
                  →
                </span>
              </Link>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
