import type { ConnectorPresetAuth, ConnectorPresetAvailability } from '@/types';

// i18n keys of the `CatalogPage.connector` namespace. The public catalogue has
// its own wording, so it does not borrow the dashboard's `ConnectorPresets`
// namespace — the two bundles are merged at runtime, but their audiences differ.

export const CATALOG_AUTH_LABEL = {
  OAUTH: 'authOauth',
  TOKEN: 'authToken',
  NONE: 'authNone',
  UNKNOWN: 'authUnknown',
} as const satisfies Record<ConnectorPresetAuth, string>;

export const CATALOG_AVAILABILITY_LABEL = {
  DOWN: 'availabilityDown',
  TRANSPORT_UNSUPPORTED: 'availabilityTransportUnsupported',
  PROTOCOL_UNSUPPORTED: 'availabilityProtocolUnsupported',
  AUTH_UNSUPPORTED: 'availabilityAuthUnsupported',
} as const satisfies Record<Exclude<ConnectorPresetAvailability, 'AVAILABLE'>, string>;
