'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { LlmQuota } from '@/types';
import { getErrorMessage } from '@/utils/error';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField, Input } from '@/components/ui/FormField';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useUpdateLlmQuotaMutation } from '@/queries/llm-providers';

interface EditQuotaModalProps {
  providerId: string;
  quota: LlmQuota;
  onClose: () => void;
  onSuccess: () => void;
}

// Changes only the limit of an existing quota via PATCH — an atomic update with no
// "unlimited" gap. subjectKind/window are the quota's key and are shown read-only
// (to move a quota to another subject/window, delete it and add a new one).
export default function EditQuotaModal({ providerId, quota, onClose, onSuccess }: EditQuotaModalProps) {
  const t = useTranslations('LlmUsage');
  const tc = useTranslations('Common');

  const [limit, setLimit] = useState(String(quota.limitTokens));
  const [error, setError] = useState<string | null>(null);

  const mutation = useUpdateLlmQuotaMutation(providerId);

  const limitValue = Number(limit);
  const valid = Number.isInteger(limitValue) && limitValue >= 1;
  const unchanged = limitValue === quota.limitTokens;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || unchanged) return;
    setError(null);
    try {
      await mutation.mutateAsync({ quotaId: quota.id, data: { limitTokens: limitValue } });
      onSuccess();
    } catch (err) {
      setError(getErrorMessage(err, t('quotaUpdateFailed')));
    }
  };

  const busy = mutation.isPending;

  return (
    <Modal isOpen={true} onClose={busy ? () => {} : onClose} title={t('editQuota')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="text-sm text-foreground">
          <span className="font-medium">{t(`subject_${quota.subjectKind}`)}</span>
          <span className="text-muted"> · {t(quota.window === 'DAY' ? 'windowDay' : 'windowMonth')}</span>
        </div>

        <FormField label={t('limitTokens')} required hint={t('limitTokensHint')}>
          <Input
            type="number"
            min={1}
            step={1}
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            placeholder="1000"
            disabled={busy}
            required
            autoFocus
          />
        </FormField>

        {error && <ErrorAlert>{error}</ErrorAlert>}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            {tc('cancel')}
          </Button>
          <Button type="submit" loading={busy} disabled={busy || !valid || unchanged}>
            {tc('save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
