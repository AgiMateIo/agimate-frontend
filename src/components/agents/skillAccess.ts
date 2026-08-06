import apiService from '@/services/api';
import { isInternalConnector } from '@/utils/connector';
import type { ConnectorCatalogEntry } from '@/types';

// A skill only reaches the agent when every connector it declares is open to
// that agent. Choosing an instance and opening it are two different requests,
// and the order matters — hence one place that does both.

// Splits the codes a skill declares into the ones the user must choose an
// instance for and the ones that have exactly one. An unknown code (a connector
// the platform doesn't ship) is treated as external: it needs an instance that
// doesn't exist, which is exactly the "forever unsatisfied" case.
export function splitSkillConnectors(
  codes: string[],
  catalog: ConnectorCatalogEntry[] | undefined,
): { external: string[]; internal: string[] } {
  const external: string[] = [];
  const internal: string[] = [];
  for (const code of codes) {
    const entry = catalog?.find((c) => c.code === code);
    (entry && isInternalConnector(entry) ? internal : external).push(code);
  }
  return { external, internal };
}

// Opens to the agent everything a skill binding is about to point at. Internal
// connectors go by code — their single instance may not exist yet, and the
// backend materializes it. Sequential on purpose: these are a handful of
// requests and a partial failure should stop rather than fan out.
export async function openAgentAccess(
  agentId: string,
  params: {
    connectionIds: string[];
    connectorCodes: string[];
    openConnectionIds: Set<string>;
    openConnectorCodes: Set<string>;
  },
): Promise<void> {
  for (const connectionId of new Set(params.connectionIds)) {
    if (connectionId && !params.openConnectionIds.has(connectionId)) {
      await apiService.bindAgentConnection(agentId, { connectionId });
    }
  }
  for (const connectorCode of new Set(params.connectorCodes)) {
    if (!params.openConnectorCodes.has(connectorCode)) {
      await apiService.bindAgentConnection(agentId, { connectorCode });
    }
  }
}
