// Greeting and conversation starters of an agent's empty chat
// (GET/PUT /control/manage/agents/{agentId}/starters/).

// One ready-made first message. Exactly one of `id` / `agentSkillId` is set:
// `id` = the agent's own starter (edited through PUT, removed by leaving it out),
// `agentSkillId` = it comes from a bound skill (hidden, never deleted from here).
export interface AgentStarter {
  id: string | null;
  agentSkillId: string | null;
  skillTitle: string | null;
  // One line, ≤150 characters, sent verbatim as the user's message.
  text: string;
}

export interface AgentStartersResponse {
  // Shown above the starters; not a message, never part of the history.
  greeting: string | null;
  // Already in display order: the agent's own first, then the skills'. Skills
  // that don't work right now (an integration not connected) are left out.
  starters: AgentStarter[];
}

// Replaces the greeting and the agent's whole own list; skill starters are
// untouched. An item with `id` keeps its identity, one without is new, and an
// own starter absent from the list is deleted.
export interface UpdateAgentStartersRequest {
  greeting?: string | null;
  starters: { id?: string; text: string }[];
}

export interface HideAgentStarterRequest {
  agentSkillId: string;
  text: string;
}

// Server-side limits, mirrored so the form says no before the 400 does.
export const STARTER_LIMITS = {
  maxOwn: 10,
  maxSkill: 5,
  textLength: 150,
  greetingLength: 1000,
} as const;
