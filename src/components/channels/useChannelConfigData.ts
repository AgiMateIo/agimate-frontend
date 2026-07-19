'use client';

import { useEffect, useState } from 'react';
import apiService from '@/services/api';
import {
  ChannelHandlerResponse,
  ChannelResponse,
  ConnectorCatalogEntry,
  ConnectionResponse,
} from '@/types';

export interface ConnectionOption {
  value: string;
  label: string;
  hint?: string;
}

interface UseChannelConfigDataParams {
  channel: ChannelResponse | null;
  connectorCode: string;
}

// Owns the three remote reads backing the channel config form:
// the channel-handler list, the full connector catalog, and the
// connection options (connections.id) for the selected connector.
export function useChannelConfigData({ channel, connectorCode }: UseChannelConfigDataParams) {
  const isEdit = !!channel;

  const [handlers, setHandlers] = useState<ChannelHandlerResponse[]>([]);
  const [connectors, setConnectors] = useState<ConnectorCatalogEntry[]>([]);
  const [connections, setConnections] = useState<ConnectionOption[]>([]);

  // Load handlers + connector catalog once.
  useEffect(() => {
    apiService.getChannelHandlers().then(setHandlers).catch(() => {});
    apiService
      .getConnectorCatalog()
      .then(setConnectors)
      .catch(() => {});
  }, []);

  // Connections are fetched with the connector's default scope (e.g. USER for
  // acp/webchat, INSTANCE for telegram/mcp); until the catalog loads, INSTANCE.
  const scope = connectors.find((c) => c.code === connectorCode)?.capabilities?.supportedScopes[0];

  useEffect(() => {
    if (isEdit || !connectorCode) return;
    let cancelled = false;
    apiService
      .getConnections(connectorCode, scope ?? 'INSTANCE')
      .then((creds) => {
        if (cancelled) return;
        setConnections(
          creds.map((c: ConnectionResponse) => ({
            value: c.id,
            label: c.name || c.fullCode,
            hint: c.name ? c.subCode ?? undefined : undefined,
          })),
        );
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isEdit, connectorCode, scope]);

  return { handlers, connectors, connections };
}
