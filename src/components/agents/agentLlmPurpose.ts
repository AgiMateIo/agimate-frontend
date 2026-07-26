import { AgentLlmPurpose } from '@/types';
import type { CapabilityFilter } from '@/components/llm-providers/modelRegistry';

// Row order of the purposes in the agent's models table — CHAT first, being the
// one purpose that is not a media tool.
export const AGENT_LLM_PURPOSES: readonly AgentLlmPurpose[] = ['CHAT', 'IMAGE', 'VISION', 'AUDIO_IN', 'AUDIO_OUT'];

export const purposeLabelKey = {
  CHAT: 'purposeChat',
  IMAGE: 'purposeImage',
  VISION: 'purposeVision',
  AUDIO_IN: 'purposeAudioIn',
  AUDIO_OUT: 'purposeAudioOut',
} as const satisfies Record<AgentLlmPurpose, string>;

// What each purpose needs of its model — the same modality match the backend's
// auto-pick uses. Media purposes are `hard`: a model whose metadata says it cannot
// do the job is folded away in the picker (still reachable, since provider
// listings are often incomplete). CHAT is soft: tool support is desirable, and
// a text model without it still holds a conversation.
export const purposeRequirement: Record<AgentLlmPurpose, { filter: CapabilityFilter; hard: boolean }> = {
  CHAT: { filter: { input: [], output: [], params: ['tools'] }, hard: false },
  IMAGE: { filter: { input: [], output: ['image'], params: [] }, hard: true },
  VISION: { filter: { input: ['image'], output: [], params: [] }, hard: true },
  AUDIO_IN: { filter: { input: ['audio'], output: [], params: [] }, hard: true },
  AUDIO_OUT: { filter: { input: [], output: ['audio'], params: [] }, hard: true },
};

// Sentence stating the requirement — the picker's mismatch warning and the
// model field's hint (free text has no metadata to check against).
export const purposeRequirementLabelKey = {
  CHAT: 'requirementChat',
  IMAGE: 'requirementImage',
  VISION: 'requirementVision',
  AUDIO_IN: 'requirementAudioIn',
  AUDIO_OUT: 'requirementAudioOut',
} as const satisfies Record<AgentLlmPurpose, string>;
