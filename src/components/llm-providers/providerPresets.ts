import { LlmProviderType } from '@/types';

// Presets shown in the "Provider Type" dropdown of the Add modal. A preset is a
// selectable entry, not necessarily a distinct backend type — OpenRouter and the
// generic "OpenAI-compatible" entry both resolve to the OPENAI_COMPATIBLE type but
// differ by their default base URL.
export interface LlmProviderPreset {
  // Dropdown value (stable, not sent to the backend).
  key: string;
  // i18n key under the `LlmProviders` namespace.
  labelKey: string;
  // Backend provider type this preset resolves to.
  providerType: LlmProviderType;
  // Pre-filled into the Base URL field on selection. Empty string means "no default"
  // (let the user enter one / fall back to the backend default for native types).
  defaultBaseUrl: string;
}

export const LLM_PROVIDER_PRESETS: LlmProviderPreset[] = [
  {
    key: 'OPENAI',
    labelKey: 'providerTypeOpenAI',
    providerType: 'OPENAI',
    defaultBaseUrl: 'https://api.openai.com/v1',
  },
  {
    key: 'ANTHROPIC',
    labelKey: 'providerTypeAnthropic',
    providerType: 'ANTHROPIC',
    defaultBaseUrl: 'https://api.anthropic.com',
  },
  {
    key: 'GEMINI',
    labelKey: 'providerTypeGemini',
    providerType: 'GEMINI',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com',
  },
  {
    key: 'OPENROUTER',
    labelKey: 'providerTypeOpenRouter',
    providerType: 'OPENAI_COMPATIBLE',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
  },
  {
    key: 'OPENAI_COMPATIBLE',
    labelKey: 'providerTypeOpenAICompatible',
    providerType: 'OPENAI_COMPATIBLE',
    defaultBaseUrl: '',
  },
];

export const DEFAULT_PROVIDER_PRESET = LLM_PROVIDER_PRESETS[0];

// Label i18n key per backend provider type, derived from the canonical preset whose
// `key` equals the type (the generic entry, not an alias like OpenRouter which shares
// the OPENAI_COMPATIBLE type). Single source of truth for the type label shown in the
// providers list.
export const PROVIDER_TYPE_LABEL_KEY: Partial<Record<LlmProviderType, string>> =
  LLM_PROVIDER_PRESETS.reduce<Partial<Record<LlmProviderType, string>>>((acc, preset) => {
    if (preset.key === preset.providerType) acc[preset.providerType] = preset.labelKey;
    return acc;
  }, {});

// Derive a provider name from a base URL's domain, e.g.
// "https://openrouter.ai/api/v1" -> "openrouter.ai", "https://api.openai.com/v1" -> "openai.com".
// Strips leading "www." / "api." for a cleaner name. Returns "" when the URL is empty/invalid.
export function deriveProviderNameFromUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim();
  if (!trimmed) return '';
  try {
    const url = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
    return url.hostname.replace(/^(www|api)\./, '');
  } catch {
    return '';
  }
}
