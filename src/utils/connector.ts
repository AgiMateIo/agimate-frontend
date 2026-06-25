import type { ConnectorCatalogEntry } from '@/types';

// The backend no longer sends an explicit connector `type`; it is derived from
// `capabilities` + the presence of `integrationMeta.credentialFields`.
export type ConnectorKind = 'INTEGRATION' | 'APP' | 'SERVICE';

export function getConnectorKind(
  c: Pick<ConnectorCatalogEntry, 'integrationMeta' | 'capabilities'>,
): ConnectorKind {
  // anything you connect to with credentials is an integration (OUTBOUND)
  if (c.integrationMeta) return 'INTEGRATION';
  // INBOUND transport = a device/app connects to us
  if (c.capabilities?.transportDirection === 'INBOUND') return 'APP';
  return 'SERVICE';
}

export function isIntegrationConnector(
  c: Pick<ConnectorCatalogEntry, 'integrationMeta'>,
): boolean {
  return c.integrationMeta != null;
}
