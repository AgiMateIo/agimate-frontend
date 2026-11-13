// A known connector instance a user can create from a catalogue card
// (GET /control/manage/connector-presets/). The preset only prefills the
// ordinary connection form — it takes no part in the created connection, and
// POST /connections/ receives no preset code. Everything here is in the
// language of the request: `card.name`/`description` and the field labels.

import type { CredentialFieldSpec } from './skills';

// The badge on a card. UNKNOWN is response-only: it means no supported method.
export type ConnectorPresetAuth = 'OAUTH' | 'TOKEN' | 'NONE' | 'UNKNOWN';

// A hint for the card, not a creation gate: the live credential probe decides
// whether the server actually answers. Only AVAILABLE opens the form.
export type ConnectorPresetAvailability =
  | 'AVAILABLE'
  | 'DOWN'
  | 'TRANSPORT_UNSUPPORTED'
  | 'PROTOCOL_UNSUPPORTED'
  | 'AUTH_UNSUPPORTED';

export interface ConnectorPresetCard {
  name: string;
  description: string | null;
  // Vendor icon; the frontend falls back to a monogram.
  iconUrl: string | null;
  // Taxonomy code — its label comes from GET /manage/taxonomy/.
  category: string;
  // ISO 3166-1 alpha-2; null when the vendor's country is not researched.
  jurisdiction: string | null;
  auth: ConnectorPresetAuth;
  // Where to get a token; https or null.
  docsUrl: string | null;
}

// One extra HTTP header the form asks for. `valuePrefix` is prepended on
// submit; `keyPrefix` is shown as a hint and never prepended.
export interface PresetHeaderField {
  name: string;
  label: string;
  secret: boolean;
  required: boolean;
  valuePrefix: string;
  keyPrefix: string | null;
}

// Headers of which exactly one is sent.
export interface PresetHeaderGroup {
  id: string;
  oneOf: string[];
  required: boolean;
}

export interface ConnectorPresetForm {
  // Non-secret form values; for MCP the server URL.
  params: Record<string, string>;
  // The connector's credential fields minus `url` and whatever the preset
  // replaces with dedicated header inputs.
  credentialFields: Record<string, CredentialFieldSpec>;
  headerFields: PresetHeaderField[];
  headerGroups: PresetHeaderGroup[];
  // Supported methods; empty means the card is not connectable.
  authMethods: ConnectorPresetAuth[];
}

export interface ConnectorPresetConnection {
  // What MCP puts into ConnectionResponse.subCode — compare byte for byte.
  identity: string;
  availability: ConnectorPresetAvailability;
}

export interface ConnectorPresetResponse {
  // Stable slug: the React key and the `?preset=` of the deep link.
  code: string;
  connectorCode: string;
  card: ConnectorPresetCard;
  form: ConnectorPresetForm;
  connection: ConnectorPresetConnection;
}
