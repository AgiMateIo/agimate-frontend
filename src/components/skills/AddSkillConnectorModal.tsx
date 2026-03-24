'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { SkillConnectorType, ConnectorCatalogEntry } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useAsyncForm } from '@/hooks/useAsyncForm';

interface AddSkillConnectorModalProps {
  skillId: string;
  connectors: ConnectorCatalogEntry[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddSkillConnectorModal({
  skillId,
  connectors,
  onClose,
  onSuccess,
}: AddSkillConnectorModalProps) {
  const t = useTranslations('SkillConnectors');
  const [connectorCode, setConnectorCode] = useState('');
  const [type, setType] = useState<SkillConnectorType | ''>('');
  const [name, setName] = useState('');

  const { loading, error, handleSubmit } = useAsyncForm<void>({
    onSuccess,
    defaultError: t('addError'),
  });

  const onSubmit = (e: React.FormEvent) =>
    handleSubmit(e, async () => {
      await apiService.addSkillConnector(skillId, {
        connectorCode,
        type: type || null,
        name: (type && name.trim()) ? name.trim() : null,
      });
    });

  return (
    <Modal isOpen={true} onClose={onClose} title={t('addBinding')} size="md">
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField label={t('connector')} required>
          <select
            value={connectorCode}
            onChange={(e) => setConnectorCode(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
            required
          >
            <option value="">{t('selectConnector')}</option>
            {connectors.map(c => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </FormField>

        <FormField label={t('type')} hint={t('typeHint')}>
          <select
            value={type}
            onChange={(e) => {
              const val = e.target.value as SkillConnectorType | '';
              setType(val);
              if (!val) setName('');
            }}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
          >
            <option value="">{t('typeNone')}</option>
            <option value="TOOL">{t('typeTool')}</option>
            <option value="TRIGGER">{t('typeTrigger')}</option>
          </select>
        </FormField>

        <FormField label={t('name')} hint={type ? t('nameHint') : t('nameDisabledHint')}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!type}
            placeholder={type ? t('namePlaceholder') : ''}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted disabled:opacity-50"
          />
        </FormField>

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
            disabled={!connectorCode}
            className="flex-1"
          >
            {t('add')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
