'use client';

import { useTranslations } from 'next-intl';
import { AgentType } from '@/types';
import { FormField, TextArea, Input } from '@/components/ui/FormField';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { getAgentAvatarUrl } from '@/utils/avatar';
import AgentTypePicker from '@/components/agents/AgentTypePicker';

interface AgentFormProps {
  name: string;
  onNameChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  prompt: string;
  onPromptChange: (value: string) => void;
  agentType: AgentType;
  onAgentTypeChange: (value: AgentType) => void;
  webhookUrl: string;
  onWebhookUrlChange: (value: string) => void;
  webhookAuthHeader: string;
  onWebhookAuthHeaderChange: (value: string) => void;
  fieldErrors: Record<string, string>;
  error?: string | null;
  /** Edit flow only: shows the "auth header already configured" hint. */
  webhookAuthConfigured?: boolean;
}

export default function AgentForm({
  name,
  onNameChange,
  description,
  onDescriptionChange,
  prompt,
  onPromptChange,
  agentType,
  onAgentTypeChange,
  webhookUrl,
  onWebhookUrlChange,
  webhookAuthHeader,
  onWebhookAuthHeaderChange,
  fieldErrors,
  error,
  webhookAuthConfigured = false,
}: AgentFormProps) {
  const t = useTranslations('Agents');

  const getFieldError = (prefix: string) =>
    Object.entries(fieldErrors)
      .filter(([key]) => key.startsWith(prefix))
      .map(([, value]) => value)
      .join('; ')
    || '';

  return (
    <>
      <FormField label={t('nameLabel')} required error={getFieldError('name')}>
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
            onChange={(e) => onNameChange(e.target.value)}
            placeholder={t('namePlaceholder')}
            required
            maxLength={100}
          />
        </div>
      </FormField>

      <FormField label={t('description')} error={getFieldError('description')}>
        <TextArea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder={t('descriptionPlaceholder')}
          rows={2}
          maxLength={500}
        />
      </FormField>

      <FormField label="Prompt" error={getFieldError('instructions')}>
        <TextArea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder={t('promptPlaceholder')}
          rows={6}
        />
      </FormField>

      <AgentTypePicker
        value={agentType}
        onChange={(next) => {
          onAgentTypeChange(next);
          if (next !== 'WEBHOOK') {
            onWebhookUrlChange('');
            onWebhookAuthHeaderChange('');
          }
        }}
        error={getFieldError('type')}
      />

      {agentType === 'WEBHOOK' && (
        <>
          <FormField label={t('webhookUrl')} required error={getFieldError('webhookUrl')} hint={t('webhookUrlHint')}>
            <Input
              value={webhookUrl}
              onChange={(e) => onWebhookUrlChange(e.target.value)}
              placeholder={t('webhookUrlPlaceholder')}
              pattern="^https?://.+"
              required
            />
          </FormField>

          <FormField label={t('webhookAuthHeader')} error={getFieldError('webhookAuthHeader')}>
            <Input
              value={webhookAuthHeader}
              onChange={(e) => onWebhookAuthHeaderChange(e.target.value)}
              placeholder={t('webhookAuthHeaderPlaceholder')}
            />
            {webhookAuthConfigured && (
              <p className="text-xs text-muted mt-1">{t('webhookAuthConfigured')}</p>
            )}
          </FormField>
        </>
      )}

      {error && <ErrorAlert>{error}</ErrorAlert>}
    </>
  );
}
