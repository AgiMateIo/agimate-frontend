'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useSuspenseQueries } from '@tanstack/react-query';
import { Link } from '@/i18n/navigation';
import { Placeholder } from '@/components/ui/Placeholder';
import { PROVIDER_PURPOSES } from '@/components/llm-providers/llmPurpose';
import { llmProvidersListOptions, platformLlmsOptions } from '@/queries/llm-providers';
import type { AgentLlmPurpose, PlatformLlmEntryResponse } from '@/types';
import PlatformPurposeCard from './PlatformPurposeCard';

// The platform's own answer to "which model serves this purpose" — the same
// ordered chains an agent holds, but global. Platform providers themselves live
// in the sibling Platform providers section; this screen only wires providers
// and models into purposes.
export default function AdminPlatformLlms() {
  const t = useTranslations('LlmProviders');

  const [{ data: providers }, { data: entries }] = useSuspenseQueries({
    queries: [llmProvidersListOptions(), platformLlmsOptions()],
  });

  const platformProviders = useMemo(() => providers.filter((p) => p.platform), [providers]);

  // One flat list from the server: group it by purpose, keeping the served
  // priority order within each.
  const byPurpose = useMemo(() => {
    const map = new Map<AgentLlmPurpose, PlatformLlmEntryResponse[]>();
    for (const entry of entries) {
      const list = map.get(entry.purpose);
      if (list) list.push(entry);
      else map.set(entry.purpose, [entry]);
    }
    for (const list of map.values()) list.sort((a, b) => a.priority - b.priority);
    return map;
  }, [entries]);

  if (platformProviders.length === 0) {
    return (
      <Placeholder>
        <p>{t('platformPurposesNoProviders')}</p>
        <div className="mt-4">
          <Link href="/dashboard/admin/platform-providers" className="text-accent hover:text-accent/80 transition-colors">
            {t('platformPurposesCreateProvider')} →
          </Link>
        </div>
      </Placeholder>
    );
  }

  return (
    <div className="space-y-3">
      {PROVIDER_PURPOSES.map((purpose) => (
        <PlatformPurposeCard
          key={purpose}
          purpose={purpose}
          entries={byPurpose.get(purpose) ?? []}
          providers={platformProviders}
        />
      ))}
    </div>
  );
}
