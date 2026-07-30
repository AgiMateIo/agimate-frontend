import {
  AgentLlmPurpose,
  LlmProviderModelResponse,
  LlmProviderResponse,
  LlmPurposePriority,
} from '@/types';
import type { CapabilityFilter } from './modelRegistry';

// A purpose is both the identity of an agent's model binding and a key of a
// provider's `purposePriority` map, so the vocabulary lives here rather than
// under components/agents. All labels below are `LlmProviders` message keys.

// Row order in the agent's models table — CHAT first, being the one purpose
// that is not a media tool.
export const LLM_PURPOSES: readonly AgentLlmPurpose[] = ['CHAT', 'IMAGE', 'VISION', 'AUDIO_IN', 'AUDIO_OUT'];

// Purposes the provider-level priority editor exposes. The backend stores audio
// lists happily, but no speech-to-text/text-to-speech tool exists yet, so a list
// there would configure nothing — keep it out of the UI until one does.
export const PROVIDER_PURPOSES: readonly AgentLlmPurpose[] = ['CHAT', 'VISION', 'IMAGE'];

export const purposeLabelKey = {
  CHAT: 'purposeChat',
  IMAGE: 'purposeImage',
  VISION: 'purposeVision',
  AUDIO_IN: 'purposeAudioIn',
  AUDIO_OUT: 'purposeAudioOut',
} as const satisfies Record<AgentLlmPurpose, string>;

// What each purpose needs of its model. Media purposes are `hard`: a model whose
// metadata says it cannot do the job is folded away in the picker (still
// reachable, since provider listings are often incomplete). CHAT is soft: tool
// support is desirable, and a text model without it still holds a conversation.
// The backend never applies this filter itself — it is a drafting aid for a
// choice the human confirms.
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

// 'unset' — the key is absent: the purpose falls through to the platform provider.
// 'off'   — an empty list: deliberately switched off, the chain stops here.
// 'list'  — a priority order of models.
export type PurposeState = 'unset' | 'off' | 'list';

export function purposeState(priority: LlmPurposePriority | null | undefined, purpose: AgentLlmPurpose): PurposeState {
  const models = priority?.[purpose];
  if (!models) return 'unset';
  return models.length === 0 ? 'off' : 'list';
}

// Purpose lists seeded from the provider catalog are unverified: they ship with
// the installation and can lag behind what the gateway actually lists. Once the
// registry has been fetched, these are the entries the backend would skip — a
// model it never listed, or one it has dropped. Returns [] while the registry is
// empty, since then there is nothing to compare against yet.
export function unusableSeededModels(
  priority: LlmPurposePriority | null | undefined,
  models: LlmProviderModelResponse[]
): { purpose: AgentLlmPurpose; model: string }[] {
  if (models.length === 0) return [];
  const usable = new Set(models.filter((m) => m.status === 'AVAILABLE').map((m) => m.model));
  return Object.entries(priority ?? {}).flatMap(([purpose, list]) =>
    (list ?? [])
      .filter((model) => !usable.has(model))
      .map((model) => ({ purpose: purpose as AgentLlmPurpose, model }))
  );
}

// The model the provider would try first for a purpose — what the UI shows when
// there is room for one name only. null when the purpose is unset or switched off.
export function firstPurposeModel(provider: LlmProviderResponse, purpose: AgentLlmPurpose): string | null {
  return provider.purposePriority?.[purpose]?.[0] ?? null;
}
