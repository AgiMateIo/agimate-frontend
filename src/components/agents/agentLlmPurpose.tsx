'use client';

import { useTranslations } from 'next-intl';
import { AgentLlmPurpose } from '@/types';
import { Select } from '@/components/ui/FormField';
import type { ModelQuickFilterKey } from '@/components/llm-providers/ModelPickerList';

export const AGENT_LLM_PURPOSES: readonly AgentLlmPurpose[] = ['CHAT', 'IMAGE', 'VISION', 'AUDIO_IN', 'AUDIO_OUT'];

export const purposeLabelKey = {
  CHAT: 'purposeChat',
  IMAGE: 'purposeImage',
  VISION: 'purposeVision',
  AUDIO_IN: 'purposeAudioIn',
  AUDIO_OUT: 'purposeAudioOut',
} as const satisfies Record<AgentLlmPurpose, string>;

// Capability filter to pre-toggle in the model picker as a candidate hint for
// the role (the backend's auto-pick uses the same modality match).
export const purposeQuickFilters: Record<AgentLlmPurpose, readonly ModelQuickFilterKey[]> = {
  CHAT: [],
  IMAGE: ['imageOut'],
  VISION: ['vision'],
  AUDIO_IN: ['audioIn'],
  AUDIO_OUT: ['audioOut'],
};

interface PurposeSelectProps {
  value: AgentLlmPurpose;
  onChange: (purpose: AgentLlmPurpose) => void;
  disabled?: boolean;
}

export function PurposeSelect({ value, onChange, disabled }: PurposeSelectProps) {
  const t = useTranslations('Agents');
  return (
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value as AgentLlmPurpose)}
      disabled={disabled}
    >
      {AGENT_LLM_PURPOSES.map((p) => (
        <option key={p} value={p}>
          {t(purposeLabelKey[p])}
        </option>
      ))}
    </Select>
  );
}
