import { LlmMediaTransport, LlmProviderType } from '@/types';

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

export const LLM_PROVIDER_PRESETS = [
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
] as const satisfies readonly LlmProviderPreset[];

type ProviderLabelKey = (typeof LLM_PROVIDER_PRESETS)[number]['labelKey'];

export const DEFAULT_PROVIDER_PRESET: LlmProviderPreset = LLM_PROVIDER_PRESETS[0];

// Label i18n key per backend provider type, derived from the canonical preset whose
// `key` equals the type (the generic entry, not an alias like OpenRouter which shares
// the OPENAI_COMPATIBLE type). Single source of truth for the type label shown in the
// providers list.
export const PROVIDER_TYPE_LABEL_KEY: Partial<Record<LlmProviderType, ProviderLabelKey>> =
  LLM_PROVIDER_PRESETS.reduce<Partial<Record<LlmProviderType, ProviderLabelKey>>>((acc, preset) => {
    if (preset.key === preset.providerType) acc[preset.providerType] = preset.labelKey;
    return acc;
  }, {});

// Hosts known to want a dedicated media endpoint for image generation. Everything
// else — OpenRouter included, and any address we have not seen — is served by
// chat/completions with modalities.
const MEDIA_ENDPOINT_HOSTS = ['polza.ai'];

// A *suggestion* for the media-transport field, derived from the base URL. It only
// seeds the control: the value cannot be inferred reliably (two providers of the
// same `providerType` differ), so the user always keeps the final say.
export function suggestMediaTransport(baseUrl: string): LlmMediaTransport {
  const host = deriveProviderNameFromUrl(baseUrl).toLowerCase();
  const wantsMediaEndpoint = MEDIA_ENDPOINT_HOSTS.some(
    (known) => host === known || host.endsWith(`.${known}`)
  );
  return wantsMediaEndpoint ? 'MEDIA_ENDPOINT' : 'CHAT_MODALITIES';
}

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
