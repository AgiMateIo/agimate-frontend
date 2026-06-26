'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  ChevronDownIcon,
  ClipboardDocumentIcon,
  ClipboardDocumentCheckIcon,
} from '@heroicons/react/24/outline';
import apiService from '@/services/api';
import { AgentType } from '@/types';
import { Button } from '@/components/ui/Button';
import { FormField, Input, TextArea } from '@/components/ui/FormField';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Alert } from '@/components/ui/Alert';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import { useClipboard } from '@/hooks/useClipboard';
import { getAgentAvatarUrl } from '@/utils/avatar';
import AgentTypePicker from '@/components/agents/AgentTypePicker';
import AgentPresetGallery, { PresetSelection } from './AgentPresetGallery';
import { WizardStepProps } from './AgentWizard';

export default function Step1Describe({ data, setData, goNext }: WizardStepProps) {
  const t = useTranslations('AgentWizard');
  const [name, setName] = useState(data.agent?.name ?? '');
  const [description, setDescription] = useState(data.agent?.description ?? '');
  const [instructions, setInstructions] = useState(data.agent?.instructions ?? '');
  const [agentType, setAgentType] = useState<AgentType>(data.agent?.type ?? 'GENERIC');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  // The manual form is collapsed by default behind the "or describe your own"
  // divider; picking a preset (or toggling the divider) reveals it.
  const [showForm, setShowForm] = useState(false);
  const { copied, copy } = useClipboard();

  const applyPreset = (preset: PresetSelection) => {
    setName(preset.name);
    setDescription(preset.description);
    setInstructions(preset.instructions);
    setAgentType('GENERIC');
    setSelectedPreset(preset.id);
  };

  const { loading, error, fieldErrors, handleSubmit } = useAsyncForm({
    defaultError: t('step1Error'),
  });

  const isCreated = !!data.agent;
  // Always show the form once the agent exists (editing); otherwise it's gated.
  const formVisible = isCreated || showForm;

  const onSubmit = (e: React.FormEvent) =>
    handleSubmit(e, async () => {
      if (data.agent) {
        const updated = await apiService.updateAgent(data.agent.id, {
          name: name.trim(),
          description: description.trim() || null,
          instructions: instructions,
          type: agentType,
        });
        setData({ agent: updated });
      } else {
        const res = await apiService.createAgent({
          name: name.trim(),
          description: description.trim() || undefined,
          instructions: instructions.trim() || undefined,
          type: agentType,
        });
        setData({ agent: res.agent, agentKey: res.fullKey });
      }
    });

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{t('step1Title')}</h2>
        <p className="text-sm text-muted mt-0.5">{t('step1Subtitle')}</p>
      </div>

      {!isCreated && (
        <>
          <AgentPresetGallery selectedId={selectedPreset} onSelect={applyPreset} />
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="relative block w-full"
            aria-expanded={formVisible}
          >
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="inline-flex items-center gap-1 bg-surface px-3 text-xs text-muted hover:text-foreground transition-colors">
                {t('presetsOr')}
                <ChevronDownIcon
                  className={`h-3.5 w-3.5 transition-transform ${formVisible ? 'rotate-180' : ''}`}
                />
              </span>
            </div>
          </button>
        </>
      )}

      {isCreated && data.agentKey && (
        <div className="space-y-2">
          <Alert variant="success">{t('agentCreated')}</Alert>
          <Alert variant="warning">{t('agentKeyWarning')}</Alert>
          <FormField label={t('agentKeyLabel')}>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-surface-secondary border border-border/50 rounded-lg px-4 py-2.5 text-sm font-mono text-foreground break-all">
                {data.agentKey}
              </code>
              <button
                type="button"
                onClick={() => copy(data.agentKey!)}
                className="shrink-0 p-2.5 rounded-lg border border-border/50 hover:bg-surface-secondary transition-colors text-muted hover:text-foreground"
                title={t('copy')}
              >
                {copied ? (
                  <ClipboardDocumentCheckIcon className="w-5 h-5 text-success" />
                ) : (
                  <ClipboardDocumentIcon className="w-5 h-5" />
                )}
              </button>
            </div>
          </FormField>
        </div>
      )}

      {formVisible && (
        <>
          <FormField label={t('nameLabel')} required error={fieldErrors['name']}>
            <div className="flex items-center gap-3">
              {name && (
                <img
                  src={getAgentAvatarUrl(name)}
                  alt={name}
                  className="w-10 h-10 rounded-lg flex-shrink-0"
                />
              )}
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setSelectedPreset(null);
                }}
                placeholder={t('namePlaceholder')}
                required
                maxLength={100}
              />
            </div>
          </FormField>

          <FormField label={t('descriptionLabel')} error={fieldErrors['description']}>
            <TextArea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('descriptionPlaceholder')}
              rows={2}
              maxLength={500}
            />
          </FormField>

          <FormField label={t('instructionsLabel')} error={fieldErrors['instructions']} hint={t('instructionsHint')}>
            <TextArea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder={t('instructionsPlaceholder')}
              rows={6}
            />
          </FormField>

          <div className="border border-border rounded-lg">
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-foreground"
            >
              <span>{t('advancedToggle')}</span>
              <ChevronDownIcon
                className={`h-4 w-4 text-muted transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
              />
            </button>
            {showAdvanced && (
              <div className="px-4 pb-4">
                <AgentTypePicker
                  value={agentType}
                  onChange={setAgentType}
                  error={fieldErrors['type']}
                />
              </div>
            )}
          </div>
        </>
      )}

      {error && <ErrorAlert>{error}</ErrorAlert>}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" variant={isCreated ? 'secondary' : 'primary'} loading={loading} disabled={loading || !name.trim()}>
          {isCreated ? t('saveChanges') : t('createAgent')}
        </Button>
        {isCreated && (
          <Button type="button" onClick={goNext}>
            {t('next')}
          </Button>
        )}
      </div>
    </form>
  );
}
