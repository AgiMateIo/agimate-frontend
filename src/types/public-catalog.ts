// Public catalog (GET /control/public/catalog/*, no token): what the site's
// catalog pages show. Every answer is in the language of `Accept-Language`, and
// a preset or a skill exists per language — the same `name` may be missing in
// the other one. Category and tag labels come from `taxonomy/`, never from here.

import type { AgentType } from './agents';

export interface CatalogConnectorRef {
  code: string;
  name: string;
  description: string | null;
}

export interface CatalogSkillRef {
  // Skill code — the address of its page.
  name: string;
  title: string;
  description: string | null;
}

export interface CatalogPresetRef {
  // Preset code — the address of its page.
  name: string;
  title: string;
}

export interface CatalogPresetResponse {
  // Stable code: the page's address and the `?preset=` of the sign-up link.
  name: string;
  title: string;
  description: string | null;
  agentType: AgentType | null;
  category: string;
  tags: string[];
  skills: CatalogSkillRef[];
  connectors: CatalogConnectorRef[];
}

export interface CatalogSkillResponse {
  name: string;
  title: string;
  description: string | null;
  category: string;
  tags: string[];
  connectors: CatalogConnectorRef[];
  presets: CatalogPresetRef[];
}
