'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { LlmProviderResponse, LlmQuota } from '@/types';
import { localeMap } from '@/i18n/routing';
import { Button } from '@/components/ui/Button';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { useDeleteLlmQuotaMutation, useLlmProviderQuotasQuery } from '@/queries/llm-providers';
import AddQuotaModal from './AddQuotaModal';

interface ProviderQuotasSectionProps {
  provider: LlmProviderResponse;
}

export default function ProviderQuotasSection({ provider }: ProviderQuotasSectionProps) {
  const t = useTranslations('LlmUsage');
  const locale = useLocale();
  const bcp47 = localeMap[locale];
  const fmt = (n: number) => n.toLocaleString(bcp47);

  const { data: quotas, isPending, error } = useLlmProviderQuotasQuery(provider.id);
  const deleteMutation = useDeleteLlmQuotaMutation(provider.id);

  const [showAdd, setShowAdd] = useState(false);
  const [deleting, setDeleting] = useState<LlmQuota | null>(null);

  const taken = new Set((quotas ?? []).map((q) => `${q.subjectKind}:${q.window}`));

  return (
    <section className="bg-surface rounded-xl border border-border p-5 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t('quotasTitle')}</h2>
          <p className="text-sm text-muted mt-0.5">{t('quotasSubtitle')}</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="flex items-center gap-2 shrink-0">
          <PlusIcon className="h-4 w-4" />
          {t('addQuota')}
        </Button>
      </div>

      {isPending ? (
        <div className="text-sm text-muted py-4">{t('loadingQuotas')}</div>
      ) : error ? (
        <div className="text-sm text-error py-4">{t('quotasLoadFailed')}</div>
      ) : quotas.length === 0 ? (
        <div className="text-sm text-muted py-4">{t('noQuotas')}</div>
      ) : (
        <div className="divide-y divide-border">
          {quotas.map((q) => (
            <div key={q.id} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <div className="text-sm text-foreground">
                  <span className="font-medium">{t(`subject_${q.subjectKind}`)}</span>
                  <span className="text-muted"> · {t(q.window === 'DAY' ? 'windowDay' : 'windowMonth')}</span>
                </div>
                <div className="text-xs text-muted font-mono mt-0.5">
                  {t('limitValue', { limit: fmt(q.limitTokens) })}
                </div>
              </div>
              <button
                onClick={() => setDeleting(q)}
                className="p-1.5 rounded-lg text-muted hover:text-error hover:bg-error/10 transition-colors shrink-0"
                title={t('deleteQuota')}
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* To change a limit, delete and re-add — the backend has no PATCH for quotas. */}
      <p className="text-xs text-muted">{t('quotaEditHint')}</p>

      {showAdd && (
        <AddQuotaModal
          providerId={provider.id}
          isPlatform={provider.platform}
          taken={taken}
          onClose={() => setShowAdd(false)}
          onSuccess={() => setShowAdd(false)}
        />
      )}

      {deleting && (
        <ConfirmDeleteModal
          title={t('deleteQuota')}
          confirmLabel={t('deleteQuota')}
          cancelLabel={t('cancel')}
          defaultError={t('quotaDeleteFailed')}
          fullWidthButtons
          onConfirm={() => deleteMutation.mutateAsync(deleting.id)}
          onClose={() => setDeleting(null)}
          onSuccess={() => setDeleting(null)}
        >
          <p className="text-foreground">{t('deleteQuotaConfirm')}</p>
        </ConfirmDeleteModal>
      )}
    </section>
  );
}
