// Ready-made agent templates offered on the first wizard step. Selecting one
// pre-fills name / description / instructions so the user can start from a
// persona and tweak it instead of facing an empty form. All presets are plain
// GENERIC chat agents; the difference is purely the system prompt + copy.
//
// `i18nKey` resolves under the `AgentWizard.presets.<i18nKey>` namespace
// (`name`, `desc`, `instructions`). `gradient` / `emoji` are the lively accents
// on the card header; the avatar is derived from the (localized) name so it
// matches the avatar shown elsewhere for the created agent.
export interface AgentPreset {
  id: string;
  i18nKey: string;
  emoji: string;
  // Tailwind gradient classes for the card header band.
  gradient: string;
}

export const AGENT_PRESETS = [
  {
    id: 'general-assistant',
    i18nKey: 'generalAssistant',
    emoji: '🤖',
    gradient: 'from-sky-500 to-indigo-500',
  },
  {
    id: 'founder-copilot',
    i18nKey: 'founderCopilot',
    emoji: '🚀',
    gradient: 'from-violet-500 to-fuchsia-500',
  },
  {
    id: 'biz-mind',
    i18nKey: 'bizMind',
    emoji: '📊',
    gradient: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'personal-chef',
    i18nKey: 'personalChef',
    emoji: '🍳',
    gradient: 'from-amber-500 to-orange-500',
  },
  {
    id: 'fitness-coach',
    i18nKey: 'fitnessCoach',
    emoji: '💪',
    gradient: 'from-rose-500 to-red-500',
  },
] as const satisfies readonly AgentPreset[];
