import { LlmMediaTransport, LlmProviderType } from '@/types';

// Provider types the backend actually serves today. ANTHROPIC and GEMINI exist in
// the enum but have no implementation behind them yet, so offering them in a form
// would only produce a provider that cannot answer — they come back to the
// dropdown when the backend gains them, not before.
export const SELECTABLE_PROVIDER_TYPES: readonly LlmProviderType[] = ['OPENAI', 'OPENAI_COMPATIBLE'];

export const DEFAULT_PROVIDER_TYPE: LlmProviderType = 'OPENAI';

// Well-known base URL per type, seeded into the field when the type is picked.
// '' = no default: OPENAI_COMPATIBLE has no canonical address, and the value has
// to come from the user or from the provider catalog.
export const DEFAULT_BASE_URL: Record<LlmProviderType, string> = {
  OPENAI: 'https://api.openai.com/v1',
  ANTHROPIC: 'https://api.anthropic.com',
  GEMINI: 'https://generativelanguage.googleapis.com',
  OPENAI_COMPATIBLE: '',
};

// Label per backend type, for every type — including the ones no form offers, so
// a row created earlier (or a catalog entry) still names itself correctly instead
// of falling back to "OpenAI-compatible".
// `as const` keeps the values literal so `t()` still type-checks them as message keys.
export const PROVIDER_TYPE_LABEL_KEY = {
  OPENAI: 'providerTypeOpenAI',
  ANTHROPIC: 'providerTypeAnthropic',
  GEMINI: 'providerTypeGemini',
  OPENAI_COMPATIBLE: 'providerTypeOpenAICompatible',
} as const satisfies Record<LlmProviderType, string>;

// A provider type as it arrives from outside — the `create_llm_provider` deep
// link. Anything unknown is dropped rather than guessed: a type this build never
// heard of would create a provider that cannot answer.
export function parseProviderType(value: string | null | undefined): LlmProviderType | null {
  return value && value in PROVIDER_TYPE_LABEL_KEY ? (value as LlmProviderType) : null;
}

// Types the dropdown must show: the supported ones, plus whatever the form is
// already carrying (a catalog entry may name a type this build does not offer —
// hiding it would silently create the provider under a different type).
export function providerTypeOptions(current: LlmProviderType): readonly LlmProviderType[] {
  return SELECTABLE_PROVIDER_TYPES.includes(current)
    ? SELECTABLE_PROVIDER_TYPES
    : [...SELECTABLE_PROVIDER_TYPES, current];
}

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
