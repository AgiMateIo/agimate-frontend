'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { CreateLlmQuotaRequest, LlmQuotaSubjectKind, LlmUsageWindowKind } from '@/types';
import { getErrorMessage } from '@/utils/error';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField, Input, Select } from '@/components/ui/FormField';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useCreateLlmQuotaMutation } from '@/queries/llm-providers';

interface AddQuotaModalProps {
  providerId: string;
  // Platform provider → per-user free-tier caps; user provider → TOTAL / AGENT.
  isPlatform: boolean;
  // Subject×window pairs already configured — blocked to pre-empt the backend 409.
  taken: Set<string>;
  onClose: () => void;
  onSuccess: () => void;
}

const USER_SUBJECTS: LlmQuotaSubjectKind[] = ['TOTAL', 'AGENT'];
const PLATFORM_SUBJECTS: LlmQuotaSubjectKind[] = ['USER'];
const WINDOWS: LlmUsageWindowKind[] = ['DAY', 'MONTH'];

export default function AddQuotaModal({ providerId, isPlatform, taken, onClose, onSuccess }: AddQuotaModalProps) {
  const t = useTranslations('LlmUsage');
  const tc = useTranslations('Common');

  const subjects = isPlatform ? PLATFORM_SUBJECTS : USER_SUBJECTS;
  const [subjectKind, setSubjectKind] = useState<LlmQuotaSubjectKind>(subjects[0]);
  const [window, setWindow] = useState<LlmUsageWindowKind>('DAY');
  const [limit, setLimit] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useCreateLlmQuotaMutation(providerId);

  const limitValue = Number(limit);
  const duplicate = taken.has(`${subjectKind}:${window}`);
  const valid = Number.isInteger(limitValue) && limitValue >= 1 && !duplicate;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setError(null);
    const body: CreateLlmQuotaRequest = { subjectKind, window, limitTokens: limitValue };
    try {
      await mutation.mutateAsync(body);
      onSuccess();
    } catch (err) {
      setError(getErrorMessage(err, t('quotaCreateFailed')));
    }
  };

  const busy = mutation.isPending;

  return (
    <Modal isOpen={true} onClose={busy ? () => {} : onClose} title={t('addQuota')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label={t('subjectKind')} hint={t(`subject_${subjectKind}_hint`)}>
          <Select
            value={subjectKind}
            onChange={(e) => setSubjectKind(e.target.value as LlmQuotaSubjectKind)}
            disabled={busy}
          >
            {subjects.map((s) => (
              <option key={s} value={s}>{t(`subject_${s}`)}</option>
            ))}
          </Select>
        </FormField>

        <FormField label={t('window')}>
          <Select
            value={window}
            onChange={(e) => setWindow(e.target.value as LlmUsageWindowKind)}
            disabled={busy}
          >
            {WINDOWS.map((w) => (
              <option key={w} value={w}>{t(w === 'DAY' ? 'windowDay' : 'windowMonth')}</option>
            ))}
          </Select>
        </FormField>

        <FormField
          label={t('limitTokens')}
          required
          error={duplicate ? t('quotaExists') : undefined}
          hint={t('limitTokensHint')}
        >
          <Input
            type="number"
            min={1}
            step={1}
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            placeholder="1000"
            disabled={busy}
            required
          />
        </FormField>

        {error && <ErrorAlert>{error}</ErrorAlert>}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            {tc('cancel')}
          </Button>
          <Button type="submit" loading={busy} disabled={busy || !valid}>
            {t('addQuota')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
