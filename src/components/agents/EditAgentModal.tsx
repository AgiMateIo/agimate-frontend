'use client';

import { useState } from 'react';
import apiService from '@/services/api';
import { AgentSettingsResponse, TriggerDestination } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField, TextArea } from '@/components/ui/FormField';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Toggle } from '@/components/ui/Toggle';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import TriggerPicker from './TriggerPicker';
import ToolPicker from './ToolPicker';

interface EditAgentModalProps {
  agent: AgentSettingsResponse;
  apiKeyName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditAgentModal({ agent, apiKeyName, onClose, onSuccess }: EditAgentModalProps) {
  const [prompt, setPrompt] = useState(agent.prompt);
  const [triggersTo, setTriggersTo] = useState<TriggerDestination>(agent.triggersTo);
  const [triggersAllowAll, setTriggersAllowAll] = useState(agent.triggersAllowAll);
  const [triggers, setTriggers] = useState<string[]>(agent.triggers);
  const [tools, setTools] = useState<string[]>(agent.tools);

  const { loading, error, fieldErrors, handleSubmit } = useAsyncForm<AgentSettingsResponse>({
    onSuccess: () => {
      onSuccess();
    },
    defaultError: 'Failed to update agent configuration',
  });

  const getFieldError = (prefix: string) =>
    Object.entries(fieldErrors)
      .filter(([key]) => key.startsWith(prefix))
      .map(([, value]) => value)
      .join('; ')
    || '';

  const onSubmit = (e: React.FormEvent) =>
    handleSubmit(e, () =>
      apiService.updateAgentSettings(agent.apiKeyPubId, {
        prompt,
        triggersAllowAll,
        triggersTo,
        tools,
        triggers: triggersAllowAll ? [] : triggers,
      })
    );

  const triggerDestinationOptions: { value: TriggerDestination; label: string; color: string }[] = [
    { value: 'centrifugo', label: 'Centrifugo (Real-time)', color: 'text-accent' },
    { value: 'webhook', label: 'Webhook', color: 'text-success' },
    { value: 'ignore', label: 'Ignore', color: 'text-muted' },
  ];

  return (
    <Modal isOpen={true} onClose={onClose} title="Edit Agent Configuration" size="lg">
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField label="API Key">
          <div className="px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-muted">
            {apiKeyName}
          </div>
        </FormField>

        <FormField label="Prompt" required error={getFieldError('prompt')}>
          <TextArea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter instructions for the agent..."
            rows={6}
            required
          />
        </FormField>

        <FormField label="Trigger Destination" required error={getFieldError('triggersTo')}>
          <div className="space-y-2">
            {triggerDestinationOptions.map((option) => (
              <label key={option.value} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="triggersTo"
                  value={option.value}
                  checked={triggersTo === option.value}
                  onChange={() => setTriggersTo(option.value)}
                  className="accent-accent"
                />
                <span className={`text-sm ${option.color}`}>{option.label}</span>
              </label>
            ))}
          </div>
        </FormField>

        <FormField label="Allow All Triggers" error={getFieldError('triggersAllowAll')}>
          <Toggle
            checked={triggersAllowAll}
            onChange={setTriggersAllowAll}
            label="Accept all triggers from connected devices"
          />
        </FormField>

        {!triggersAllowAll && (
          <FormField label="Triggers" error={getFieldError('triggers')}>
            <TriggerPicker
              selectedTriggers={triggers}
              onChange={setTriggers}
            />
          </FormField>
        )}

        <FormField label="Tools" error={getFieldError('tools')}>
          <ToolPicker
            selectedTools={tools}
            onChange={setTools}
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
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || !prompt.trim()}
            loading={loading}
            className="flex-1"
          >
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}
