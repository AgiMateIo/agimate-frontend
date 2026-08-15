import type { ConnectorCatalogEntry } from '@/types';

// The backend no longer sends an explicit connector `type`; it is derived from
// `capabilities` + the presence of `integrationMeta.credentialFields`.
export type ConnectorKind = 'INTEGRATION' | 'APP' | 'SERVICE';

export function getConnectorKind(
  c: Pick<ConnectorCatalogEntry, 'integrationMeta' | 'capabilities'>,
): ConnectorKind {
  // anything you connect to with credentials is an integration (telegram, mcp)
  if (c.integrationMeta) return 'INTEGRATION';
  // APP execution = a user device/app connects to us
  if (c.capabilities?.executionKind === 'APP') return 'APP';
  return 'SERVICE';
}

export function isIntegrationConnector(
  c: Pick<ConnectorCatalogEntry, 'integrationMeta'>,
): boolean {
  return c.integrationMeta != null;
}

// Internal (system-managed) connector: board, persist-memory, time, media,
// webchat, acp, claude-code. It has exactly one connection row per user, which
// the backend materializes on first use — so the UI never offers to *create*
// one, but it does open and close it for an agent by connector code, like any
// other connection.
export function isInternalConnector(
  c: Pick<ConnectorCatalogEntry, 'integrationMeta' | 'capabilities'>,
): boolean {
  return getConnectorKind(c) === 'SERVICE';
}
