// Agent role preset types (GET /control/manage/agent-presets/)
//
// A preset is a pure wizard prefill: the frontend fills the editable fields
// with it and sends the *final* values via the regular create-agent request.
// The backend knows nothing about "applying" a preset.

import type { AgentType } from './agents';

// Resolved system skill of a preset — real ids, bindable via `skillIds`.
export interface AgentPresetSkill {
  id: string;
  // Machine code (slug) — not for display.
  name: string;
  title: string;
  description: string | null;
}

export interface AgentPresetResponse {
  id: string;
  // Machine code (slug). Sent back as `presetName` on agent creation.
  name: string;
  // Which wizard the preset opens: null → the regular agent wizard (every
  // preset that existed before), an external type → the "external AI" wizard,
  // where the value is only the default of its delivery step.
  agentType: AgentType | null;
  // Display name.
  title: string;
  description: string;
  // Full instructions draft; must stay user-editable before creation.
  instructions: string;
  skills: AgentPresetSkill[];
  // Union of connector codes across the preset's skills — display only.
  connectorCodes: string[];
  // Gallery section and filter tags — taxonomy codes, same contract as on a
  // skill (see `SkillResponse`); the gallery groups and cuts client-side, since
  // the endpoint has no filter and presets number in the dozens.
  category?: string;
  tags?: string[];
}

// The two preset catalogs; the admin calls send it as Accept-Language.
export type PresetCatalogLocale = 'ru' | 'en';

// Admin view of a preset (GET /control/manage/agent-presets/all/, ADMIN only):
// the gallery row plus what only an admin edits. The catalog is picked by
// Accept-Language — `ru` and `en` are separate presets with their own ids, not
// translations of one.
export interface AdminAgentPresetResponse extends AgentPresetResponse {
  // Copied into an agent at creation only; editing the preset leaves created
  // agents as they are.
  greeting?: string | null;
  starters?: string[];
  // System skill names; the gallery row resolves them into `skills`.
  skillNames?: string[];
  sortOrder?: number;
  enabled?: boolean;
}

// PATCH: an absent/null field is left alone; `greeting: ''` clears it and
// `starters` replaces the whole list. `name` is immutable and set on create.
export interface AdminAgentPresetRequest {
  name?: string;
  title?: string;
  description?: string;
  instructions?: string;
  greeting?: string;
  starters?: string[];
  // An unknown name is a 400.
  skillNames?: string[];
  agentType?: AgentType | null;
  category?: string;
  tags?: string[];
  sortOrder?: number;
  enabled?: boolean;
}
