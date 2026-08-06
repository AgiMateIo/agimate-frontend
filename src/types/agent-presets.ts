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
}
