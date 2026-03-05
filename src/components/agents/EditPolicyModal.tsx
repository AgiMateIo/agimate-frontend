'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { AgentPolicyResponse, PolicyEffect, PolicyKind } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField, Input, TextArea } from '@/components/ui/FormField';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import { getPolicyLabels } from './policyLabels';

interface EditPolicyModalProps {
  kind: PolicyKind;
  policy: AgentPolicyResponse;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditPolicyModal({ kind, policy, onClose, onSuccess }: EditPolicyModalProps) {
  const t = useTranslations('Agents');
  const labels = getPolicyLabels(kind);
  const [connectorCode, setConnectorCode] = useState(policy.connectorCode || '');
  const [connectorIdentity, setConnectorIdentity] = useState(policy.connectorIdentity || '');
  const [resourceName, setResourceName] = useState(policy.resourceName || '');
  const [effect, setEffect] = useState<PolicyEffect>(policy.effect);
  const [description, setDescription] = useState(policy.description || '');

  const { loading, error, handleSubmit } = useAsyncForm<void>({
    onSuccess,
    defaultError: 'Failed to update policy',
  });

  const onSubmit = (e: React.FormEvent) =>
    handleSubmit(e, async () => {
      const data = {
        connectorCode: connectorCode.trim() || null,
        connectorIdentity: connectorIdentity.trim() || null,
        resourceName: resourceName.trim() || null,
        effect,
        description: description.trim() || undefined,
      };
      if (kind === 'tool') {
        await apiService.updateAgentToolPolicy(policy.id, data);
      } else {
        await apiService.updateAgentTriggerPolicy(policy.id, data);
      }
    });

  return (
    <Modal isOpen={true} onClose={onClose} title={t(labels.editPolicy)} size="lg">
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField label={t('connectorCode')}>
          <select
            value={connectorCode}
            onChange={(e) => setConnectorCode(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
          >
            <option value="">{t('anyWildcard')}</option>
            <option value="app">app</option>
          </select>
        </FormField>

        <FormField label={t('connectorIdentity')}>
          <Input
            type="text"
            value={connectorIdentity}
            onChange={(e) => setConnectorIdentity(e.target.value)}
            placeholder={t('anyWildcard')}
          />
        </FormField>

        <FormField label={t(labels.resourceColumn)}>
          <Input
            type="text"
            value={resourceName}
            onChange={(e) => setResourceName(e.target.value)}
            placeholder={t('anyWildcard')}
          />
        </FormField>

        <FormField label={t('effect')}>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="effect"
                value="ALLOW"
                checked={effect === 'ALLOW'}
                onChange={() => setEffect('ALLOW')}
                className="accent-success"
              />
              <span className="text-sm font-medium text-success">{t('effectAllow')}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="effect"
                value="DENY"
                checked={effect === 'DENY'}
                onChange={() => setEffect('DENY')}
                className="accent-error"
              />
              <span className="text-sm font-medium text-error">{t('effectDeny')}</span>
            </label>
          </div>
        </FormField>

        <details className="group">
          <summary className="text-sm font-medium text-muted cursor-pointer hover:text-foreground transition-colors">
            {t('description')}
          </summary>
          <div className="mt-2">
            <TextArea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('description')}
              rows={3}
              maxLength={500}
            />
          </div>
        </details>

        {error && <ErrorAlert>{error}</ErrorAlert>}

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
            className="flex-1"
          >
            {t('cancel')}
          </Button>
          <Button
            type="submit"
            loading={loading}
            className="flex-1"
          >
            {t('save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
