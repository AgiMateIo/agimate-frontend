import type { ConnectorCatalogEntry } from '@/types';

// The backend no longer sends an explicit connector `type`; it is derived from
// `capabilities` + the presence of `integrationMeta.credentialFields`.
export type ConnectorKind = 'INTEGRATION' | 'APP' | 'SERVICE';

export function getConnectorKind(
  c: Pick<ConnectorCatalogEntry, 'integrationMeta' | 'capabilities'>,
): ConnectorKind {
  // anything you connect to with credentials is an integration (telegram, mcp)
  if (c.integrationMeta) return 'INTEGRATION';
  // DEVICE execution = a user device/app connects to us
  if (c.capabilities?.executionKind === 'DEVICE') return 'APP';
  return 'SERVICE';
}

export function isIntegrationConnector(
  c: Pick<ConnectorCatalogEntry, 'integrationMeta'>,
): boolean {
  return c.integrationMeta != null;
}

// Internal (system-managed) connector: board, persist-memory, time, media,
// webchat, acp, claude-code. Its single per-user connection row is created by
// the backend, and agent bindings are synced from skills — the UI must not
// offer create/delete/bind/unbind for it.
export function isInternalConnector(
  c: Pick<ConnectorCatalogEntry, 'integrationMeta' | 'capabilities'>,
): boolean {
  return getConnectorKind(c) === 'SERVICE';
}
