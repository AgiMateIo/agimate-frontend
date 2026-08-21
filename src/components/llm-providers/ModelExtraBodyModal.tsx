'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { LlmProviderModelResponse } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField, TextArea } from '@/components/ui/FormField';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import { formatExtraBody, parseExtraBodyInput } from './extraBody';

// Typical use case: pin the vision provider on an OpenRouter-style aggregator.
const PLACEHOLDER = `{
  "provider": { "only": ["moonshotai"], "require_parameters": true }
}`;

interface ModelExtraBodyModalProps {
  providerId: string;
  model: LlmProviderModelResponse;
  onClose: () => void;
  onSuccess: (updated: LlmProviderModelResponse) => void;
}

// Per-model extra_body override — deep-merged over the provider's extraBody
// by the backend (model wins, arrays replaced whole). Refresh never touches it.
export default function ModelExtraBodyModal({ providerId, model, onClose, onSuccess }: ModelExtraBodyModalProps) {
  const t = useTranslations('LlmProviders');
  const tCommon = useTranslations('Common');
  const [text, setText] = useState(formatExtraBody(model.extraBody));

  const { loading, error, handleSubmit, setError } = useAsyncForm<LlmProviderModelResponse>({
    onSuccess: (updated) => onSuccess(updated),
    defaultError: t('extraBodySaveFailed'),
  });

  const onSubmit = (e: React.FormEvent) => {
    const parsed = parseExtraBodyInput(text);
    if (!parsed.ok) {
      e.preventDefault();
      setError(t(parsed.errorKey));
      return;
    }
    handleSubmit(e, () =>
      apiService.updateLlmProviderModelExtraBody(providerId, {
        model: model.model,
        extraBody: parsed.value,
      })
    );
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={t('modelExtraBodyTitle')}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="text-sm text-foreground font-mono break-all">{model.model}</div>

        <FormField
          label={t('extraBodyLabel')}
          hint={`${t('modelExtraBodyHint')} ${t('extraBodySecretsWarning')}`}
        >
          <TextArea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={PLACEHOLDER}
            rows={8}
            disabled={loading}
            spellCheck={false}
            className="font-mono text-xs"
          />
        </FormField>

        {error && <ErrorAlert>{error}</ErrorAlert>}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            {tCommon('cancel')}
          </Button>
          <Button type="submit" loading={loading} disabled={loading}>
            {tCommon('save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
