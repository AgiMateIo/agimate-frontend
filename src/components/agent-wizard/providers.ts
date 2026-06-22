import { LlmProviderType } from '@/types';

// Frontend-maintained catalogue of LLM providers offered by the wizard.
// Kept on the frontend on purpose (see wizard spec) — no backend list yet.
export interface WizardProvider {
  type: LlmProviderType;
  // Display name (not translated — these are brand names).
  name: string;
  // Two-letter badge for the card avatar.
  badge: string;
  // OPENAI_COMPATIBLE needs an explicit base URL.
  needsBaseUrl: boolean;
  apiKeyPlaceholder: string;
  // Where the user gets an API key (optional helper link).
  docsUrl?: string;
}

export const WIZARD_PROVIDERS: WizardProvider[] = [
  {
    type: 'OPENAI',
    name: 'OpenAI',
    badge: 'AI',
    needsBaseUrl: false,
    apiKeyPlaceholder: 'sk-...',
    docsUrl: 'https://platform.openai.com/api-keys',
  },
  {
    type: 'ANTHROPIC',
    name: 'Anthropic (Claude)',
    badge: 'An',
    needsBaseUrl: false,
    apiKeyPlaceholder: 'sk-ant-...',
    docsUrl: 'https://console.anthropic.com/settings/keys',
  },
  {
    type: 'GEMINI',
    name: 'Google Gemini',
    badge: 'Gm',
    needsBaseUrl: false,
    apiKeyPlaceholder: 'AIza...',
    docsUrl: 'https://aistudio.google.com/app/apikey',
  },
  {
    type: 'OPENAI_COMPATIBLE',
    name: 'OpenAI-compatible',
    badge: 'OS',
    needsBaseUrl: true,
    apiKeyPlaceholder: 'sk-...',
  },
];
