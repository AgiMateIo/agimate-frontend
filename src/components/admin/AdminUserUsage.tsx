'use client';

import { useTranslations } from 'next-intl';
import { Chip } from '@/components/ui/Chip';
import { UsageBars } from '@/components/llm-providers/UsageBars';
import { useAdminUserUsageQuery } from '@/queries/admin';

// Token spend of one user, one row per provider. Fetched only while the row is
// expanded — there is no batch endpoint, so this is a request per user.
export default function AdminUserUsage({ userId }: { userId: string }) {
  const t = useTranslations('Admin');
  const tu = useTranslations('LlmUsage');
  const { data, isPending, isError } = useAdminUserUsageQuery(userId);
  const rows = data ?? [];

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-foreground">{t('usageTitle')}</div>

      {isPending ? (
        <div className="text-sm text-muted">{tu('loadingUsage')}</div>
      ) : isError ? (
        <div className="text-sm text-error">{tu('usageLoadFailed')}</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-muted">{t('usageNoProviders')}</div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div
              key={row.llmProviderId ?? 'platform'}
              className="space-y-2 rounded-lg border border-border bg-surface p-3"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-foreground">
                  {/* The platform provider reports a technical name ("platform"). */}
                  {row.source === 'PLATFORM' ? tu('platformProviderName') : row.providerName}
                </span>
                <Chip tone={row.source === 'PLATFORM' ? 'accent' : 'default'}>
                  {row.source === 'PLATFORM' ? tu('platformBadge') : t('usageSourceOwnKey')}
                </Chip>
              </div>
              {/* Same numbers, different meaning: the platform row is this user's
                  own spend, an own-key row is the whole key across their agents. */}
              <p className="text-xs text-muted">
                {row.source === 'PLATFORM' ? t('usageScopePlatform') : t('usageScopeOwnKey')}
              </p>
              <UsageBars windows={row.windows} />
            </div>
          ))}
          <p className="text-xs text-muted">{t('usageUtcNote')}</p>
        </div>
      )}
    </div>
  );
}
