'use client';

import { useCallback, useEffect, useState } from 'react';
import apiService from '@/services/api';
import {
  AppResponse,
  ChannelHandlerResponse,
  ChannelResponse,
  ConnectorCatalogEntry,
  IntegrationResponse,
} from '@/types';
import { getConnectorKind, ConnectorKind } from '@/utils/connector';

export interface IdentityOption {
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
// identity options for the selected connector. `connectorType` is derived from
// the catalog but also driven by the connector picker, so its setter is exposed.
export function useChannelConfigData({ channel, connectorCode }: UseChannelConfigDataParams) {
  const isEdit = !!channel;

  const [handlers, setHandlers] = useState<ChannelHandlerResponse[]>([]);
  const [connectors, setConnectors] = useState<ConnectorCatalogEntry[]>([]);
  const [connectorType, setConnectorType] = useState<ConnectorKind | null>(null);
  const [identities, setIdentities] = useState<IdentityOption[]>([]);

  // Load handlers + connector catalog once.
  useEffect(() => {
    apiService.getChannelHandlers().then(setHandlers).catch(() => {});
    apiService
      .getConnectorCatalog()
      .then((all) => {
        const filtered = all.filter((c) => getConnectorKind(c) !== 'SERVICE');
        setConnectors(filtered);
        const conn = filtered.find((c) => c.code === channel?.connectorCode);
        if (conn) setConnectorType(getConnectorKind(conn));
      })
      .catch(() => {});
  }, [channel?.connectorCode]);

  const loadIdentities = useCallback(
    async (code: string, type: ConnectorKind | null): Promise<IdentityOption[]> => {
      if (!code || !type) return [];
      if (type === 'INTEGRATION') {
        const creds = await apiService.getIntegrationCredentials(code);
        return creds.map((c: IntegrationResponse) => ({
          value: c.id,
          label: c.name || c.fullCode,
          hint: c.name ? c.subCode : undefined,
        }));
      }
      const apps = await apiService.getApps({ size: 100 });
      return apps.content.map((a: AppResponse) => ({ value: a.id, label: a.name }));
    },
    [],
  );

  useEffect(() => {
    if (isEdit || !connectorCode || !connectorType) return;
    let cancelled = false;
    loadIdentities(connectorCode, connectorType)
      .then((opts) => { if (!cancelled) setIdentities(opts); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isEdit, connectorCode, connectorType, loadIdentities]);

  return { handlers, connectors, connectorType, setConnectorType, identities };
}
