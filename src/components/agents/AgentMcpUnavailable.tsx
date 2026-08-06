'use client';

import { useTranslations } from 'next-intl';
import { ArrowRightIcon, SignalSlashIcon } from '@heroicons/react/24/outline';
import { Link } from '@/i18n/navigation';

// Sections an MCP agent cannot have. Three of them need a server → client
// channel it does not have; the fourth (models) is simply not ours — the client
// runs on its own model and never comes for our keys.
export type UndeliverableSection = 'chat' | 'channels' | 'triggers' | 'models';

const HINT_KEY = {
  chat: 'mcpUnavailableHint',
  channels: 'mcpUnavailableHint',
  triggers: 'mcpUnavailableHint',
  models: 'mcpUnavailableHintModels',
} as const satisfies Record<UndeliverableSection, string>;

export default function AgentMcpUnavailable({
  agentId,
  section,
}: {
  agentId: string;
  section: UndeliverableSection;
}) {
  const t = useTranslations('Agents');

  return (
    <div className="bg-surface rounded-xl border border-border p-8">
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-secondary">
          <SignalSlashIcon className="h-6 w-6 text-muted" />
        </span>
        <h2 className="text-base font-semibold text-foreground">
          {t(`mcpUnavailable_${section}`)}
        </h2>
        <p className="text-sm text-muted">{t(HINT_KEY[section])}</p>
        <Link
          href={`/dashboard/agents/${agentId}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent/80 transition-colors"
        >
          {t('mcpUnavailableAction')}
          <ArrowRightIcon className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
