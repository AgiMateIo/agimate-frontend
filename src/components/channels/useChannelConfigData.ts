'use client';

import { useEffect, useState } from 'react';
import apiService from '@/services/api';
import {
  ChannelHandlerResponse,
  ChannelResponse,
  ConnectorCatalogEntry,
  ConnectionResponse,
} from '@/types';
import { getConnectorKind } from '@/utils/connector';

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
// the channel-handler list, the (non-SERVICE) connector catalog, and the
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
      .then((all) => setConnectors(all.filter((c) => getConnectorKind(c) !== 'SERVICE')))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isEdit || !connectorCode) return;
    let cancelled = false;
    apiService
      .getConnections(connectorCode)
      .then((creds) => {
        if (cancelled) return;
        setConnections(
          creds.map((c: ConnectionResponse) => ({
            value: c.id,
            label: c.name || c.fullCode,
            hint: c.name ? c.subCode : undefined,
          })),
        );
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isEdit, connectorCode]);

  return { handlers, connectors, connections };
}
