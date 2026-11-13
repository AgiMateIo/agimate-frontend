import type { ConnectorPresetAuth, ConnectorPresetAvailability } from '@/types';

// i18n keys of the `ConnectorPresets` namespace. Keys rather than strings:
// the card and the deep-link screen must say the same thing about a state.

export const PRESET_AUTH_LABEL = {
  OAUTH: 'authOauth',
  TOKEN: 'authToken',
  NONE: 'authNone',
  UNKNOWN: 'authUnknown',
} as const satisfies Record<ConnectorPresetAuth, string>;

export const PRESET_AVAILABILITY_LABEL = {
  DOWN: 'availabilityDown',
  TRANSPORT_UNSUPPORTED: 'availabilityTransportUnsupported',
  PROTOCOL_UNSUPPORTED: 'availabilityProtocolUnsupported',
  AUTH_UNSUPPORTED: 'availabilityAuthUnsupported',
} as const satisfies Record<Exclude<ConnectorPresetAvailability, 'AVAILABLE'>, string>;
