// Copyable snippets for the extra_body editors. Text lives in the LlmProviders
// namespace; provider names are brands and stay untranslated.

export type ExtraBodyExampleGroupId = 'reasoning' | 'caching' | 'format' | 'routing' | 'more';
export type ExtraBodyHintsScope = 'provider' | 'model';

// Literal union so next-intl's typed t() accepts the keys collected here.
export type ExtraBodyMessageKey =
  | 'extraBodyGroupReasoning'
  | 'extraBodyGroupCaching'
  | 'extraBodyGroupFormat'
  | 'extraBodyGroupRouting'
  | 'extraBodyGroupMore'
  | 'extraBodyProviderScopeHint'
  | 'extraBodyCachingHint'
  | 'extraBodyExampleReasoningEffort'
  | 'extraBodyExampleThinkingOff'
  | 'extraBodyExampleOpenRouterReasoning'
  | 'extraBodyExampleQwenThinking'
  | 'extraBodyExampleOpenAICacheKey'
  | 'extraBodyExampleOpenRouterCache'
  | 'extraBodyExampleSessionId'
  | 'extraBodyExampleResponseFormat'
  | 'extraBodyExampleMaxCompletionTokens'
  | 'extraBodyExampleMaxTokens'
  | 'extraBodyExampleParallelTools'
  | 'extraBodyExampleProviderOnly'
  | 'extraBodyExampleProviderSort'
  | 'extraBodyExampleProviderPrivacy'
  | 'extraBodyExampleContextCompression'
  | 'extraBodyExampleServiceTier'
  | 'extraBodyExampleVerbosity'
  | 'extraBodyExampleSampling';

export interface ExtraBodyExample {
  id: string;
  labelKey: ExtraBodyMessageKey;
  providers: string[];
  code: string;
  // A provider-wide JSON mode would break ordinary chat, so this one stays per model.
  modelOnly?: boolean;
}

export interface ExtraBodyExampleGroup {
  id: ExtraBodyExampleGroupId;
  labelKey: ExtraBodyMessageKey;
  hintKey?: ExtraBodyMessageKey;
  examples: ExtraBodyExample[];
  openRouterOnly?: boolean;
}

export const EXTRA_BODY_EXAMPLE_GROUPS: readonly ExtraBodyExampleGroup[] = [
  {
    id: 'reasoning',
    labelKey: 'extraBodyGroupReasoning',
    examples: [
      {
        id: 'reasoning-effort',
        labelKey: 'extraBodyExampleReasoningEffort',
        providers: ['OpenAI', 'DeepSeek', 'Groq', 'Kimi K3'],
        code: `{
  "reasoning_effort": "low"
}`,
      },
      {
        id: 'thinking-off',
        labelKey: 'extraBodyExampleThinkingOff',
        providers: ['DeepSeek', 'Kimi K2.6'],
        code: `{
  "thinking": { "type": "disabled" }
}`,
      },
      {
        id: 'openrouter-reasoning',
        labelKey: 'extraBodyExampleOpenRouterReasoning',
        providers: ['OpenRouter'],
        code: `{
  "reasoning": { "effort": "high", "exclude": true }
}`,
      },
      {
        id: 'qwen-thinking',
        labelKey: 'extraBodyExampleQwenThinking',
        providers: ['Qwen'],
        code: `{
  "enable_thinking": false
}`,
      },
    ],
  },
  {
    id: 'caching',
    labelKey: 'extraBodyGroupCaching',
    hintKey: 'extraBodyCachingHint',
    examples: [
      {
        id: 'openai-cache-key',
        labelKey: 'extraBodyExampleOpenAICacheKey',
        providers: ['OpenAI', 'OpenRouter'],
        code: `{
  "prompt_cache_key": "agimate-agent"
}`,
      },
      {
        id: 'openrouter-cache',
        labelKey: 'extraBodyExampleOpenRouterCache',
        providers: ['OpenRouter'],
        code: `{
  "cache_control": { "type": "ephemeral" }
}`,
      },
      {
        id: 'session-id',
        labelKey: 'extraBodyExampleSessionId',
        providers: ['OpenRouter'],
        code: `{
  "session_id": "agimate-agent"
}`,
      },
    ],
  },
  {
    id: 'format',
    labelKey: 'extraBodyGroupFormat',
    examples: [
      {
        id: 'response-format',
        labelKey: 'extraBodyExampleResponseFormat',
        providers: ['OpenAI', 'DeepSeek', 'OpenRouter'],
        modelOnly: true,
        code: `{
  "response_format": { "type": "json_object" }
}`,
      },
      {
        id: 'max-completion-tokens',
        labelKey: 'extraBodyExampleMaxCompletionTokens',
        providers: ['OpenAI'],
        code: `{
  "max_completion_tokens": 32768
}`,
      },
      {
        id: 'max-tokens',
        labelKey: 'extraBodyExampleMaxTokens',
        providers: ['DeepSeek', 'OpenRouter'],
        code: `{
  "max_tokens": 32768
}`,
      },
      {
        id: 'parallel-tool-calls',
        labelKey: 'extraBodyExampleParallelTools',
        providers: ['OpenAI', 'OpenRouter'],
        code: `{
  "parallel_tool_calls": false
}`,
      },
    ],
  },
  {
    id: 'routing',
    labelKey: 'extraBodyGroupRouting',
    openRouterOnly: true,
    examples: [
      {
        id: 'provider-only',
        labelKey: 'extraBodyExampleProviderOnly',
        providers: ['OpenRouter'],
        code: `{
  "provider": {
    "only": ["moonshotai"],
    "require_parameters": true
  }
}`,
      },
      {
        id: 'provider-sort',
        labelKey: 'extraBodyExampleProviderSort',
        providers: ['OpenRouter'],
        code: `{
  "provider": { "sort": "price" }
}`,
      },
      {
        id: 'provider-privacy',
        labelKey: 'extraBodyExampleProviderPrivacy',
        providers: ['OpenRouter'],
        code: `{
  "provider": { "data_collection": "deny", "zdr": true }
}`,
      },
      {
        id: 'context-compression',
        labelKey: 'extraBodyExampleContextCompression',
        providers: ['OpenRouter'],
        code: `{
  "plugins": [
    { "id": "context-compression" }
  ]
}`,
      },
    ],
  },
  {
    id: 'more',
    labelKey: 'extraBodyGroupMore',
    examples: [
      {
        id: 'service-tier',
        labelKey: 'extraBodyExampleServiceTier',
        providers: ['OpenAI'],
        code: `{
  "service_tier": "flex"
}`,
      },
      {
        id: 'verbosity',
        labelKey: 'extraBodyExampleVerbosity',
        providers: ['OpenAI'],
        code: `{
  "verbosity": "low"
}`,
      },
      {
        id: 'sampling',
        labelKey: 'extraBodyExampleSampling',
        providers: ['OpenAI', 'OpenRouter'],
        code: `{
  "temperature": 0.2,
  "top_p": 0.9,
  "seed": 42
}`,
      },
    ],
  },
];

function isOpenRouterUrl(baseUrl?: string | null): boolean {
  if (!baseUrl?.trim()) return false;
  try {
    const host = new URL(baseUrl.includes('://') ? baseUrl.trim() : `https://${baseUrl.trim()}`).hostname;
    return host === 'openrouter.ai' || host.endsWith('.openrouter.ai');
  } catch {
    return false;
  }
}

// Routing is a gateway feature; showing it next to a direct OpenAI key would only
// invite a 400. Everything else is labelled by provider instead of hidden.
export function exampleGroupsFor(
  baseUrl: string | null | undefined,
  scope: ExtraBodyHintsScope
): readonly ExtraBodyExampleGroup[] {
  const showRouting = isOpenRouterUrl(baseUrl);
  return EXTRA_BODY_EXAMPLE_GROUPS.filter(
    (group) => showRouting || !group.openRouterOnly
  )
    .map((group) => ({
      ...group,
      examples: group.examples.filter((example) => scope === 'model' || !example.modelOnly),
    }))
    .filter((group) => group.examples.length > 0);
}
