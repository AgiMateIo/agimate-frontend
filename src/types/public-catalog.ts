// Public catalog (GET /control/public/catalog/*, no token): what the site's
// catalog pages show. Every answer is in the language of `Accept-Language`, and
// a preset or a skill exists per language — the same `name` may be missing in
// the other one. Category and tag labels come from `taxonomy/`, never from here.

import type { AgentType } from './agents';
import type { ConnectorPresetAvailability, ConnectorPresetCard } from './connector-presets';

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

// A known MCP server on the public site: the card and availability, never the
// connection form or the instance identity. The card is the same shape the
// dashboard picker shows, so both read a server's name and badges alike.
export interface CatalogConnectorPresetResponse {
  // Stable slug: the page's address and the `?preset=` of the sign-up link.
  code: string;
  connectorCode: string;
  card: ConnectorPresetCard;
  connection: {
    availability: ConnectorPresetAvailability;
  };
}
