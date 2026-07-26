import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query';
import apiService from '@/services/api';
import { parseBackendDate } from '@/utils/date';
import type {
  ConnectionResponse,
  ConnectorCatalogEntry,
  UpdateConnectionRequest,
} from '@/types';

export const connectionKeys = {
  all: ['connections'] as const,
  lists: () => [...connectionKeys.all, 'list'] as const,
  list: (connectorCode?: string) =>
    [...connectionKeys.lists(), connectorCode ?? 'all'] as const,
  detail: (id: string) => [...connectionKeys.all, 'detail', id] as const,
  agents: (id: string) => [...connectionKeys.detail(id), 'agents'] as const,
};

export interface ConnectionWithConnector {
  connection: ConnectionResponse;
  connector: ConnectorCatalogEntry;
}

// Newest first. The endpoint returns the whole list rather than a page, so
// sorting here covers every connection, not just what one page happened to hold.
const byCreatedAtDesc = (connections: ConnectionResponse[]) =>
  [...connections].sort(
    (a, b) =>
      parseBackendDate(b.createdAt).getTime() - parseBackendDate(a.createdAt).getTime(),
  );

export const connectionsListOptions = (connectorCode?: string) =>
  queryOptions({
    queryKey: connectionKeys.list(connectorCode),
    queryFn: () => apiService.getConnections(connectorCode),
    select: byCreatedAtDesc,
  });

// The detail page needs the connection plus its connector-catalog entry
// (name, credential fields); fetch them as one unit so they never diverge.
export function useConnectionDetailQuery(id: string) {
  return useSuspenseQuery({
    queryKey: connectionKeys.detail(id),
    queryFn: async (): Promise<ConnectionWithConnector> => {
      const connection = await apiService.getConnection(id);
      const connector = await apiService.getConnector(connection.connectorCode);
      return { connection, connector };
    },
  });
}

// Agents the connection is available to. Nested under the detail key so removing
// a connection from the cache drops this list with it.
export const connectionAgentsOptions = (id: string) =>
  queryOptions({
    queryKey: connectionKeys.agents(id),
    queryFn: () => apiService.getConnectionAgents(id),
  });

export function useConnectionAgentsQuery(id: string) {
  return useQuery(connectionAgentsOptions(id));
}

export function useUpdateConnectionMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateConnectionRequest) =>
      apiService.updateConnection(id, data),
    // Optimistically flip the detail cache (used by the enabled toggle),
    // roll back on error.
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: connectionKeys.detail(id) });
      const previous = queryClient.getQueryData<ConnectionWithConnector>(
        connectionKeys.detail(id)
      );
      if (previous) {
        queryClient.setQueryData<ConnectionWithConnector>(
          connectionKeys.detail(id),
          { ...previous, connection: { ...previous.connection, ...data } }
        );
      }
      return { previous };
    },
    onError: (_err, _data, context) => {
      if (context?.previous) {
        queryClient.setQueryData(connectionKeys.detail(id), context.previous);
      }
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<ConnectionWithConnector>(
        connectionKeys.detail(id),
        (old) => (old ? { ...old, connection: updated } : old)
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: connectionKeys.lists() });
    },
  });
}

// Lets modals that already performed a mutation push the fresh entity into
// the cache and refresh the lists.
export function useConnectionCacheActions() {
  const queryClient = useQueryClient();
  return {
    setConnection: (updated: ConnectionResponse) => {
      queryClient.setQueryData<ConnectionWithConnector>(
        connectionKeys.detail(updated.id),
        (old) => (old ? { ...old, connection: updated } : old)
      );
      queryClient.invalidateQueries({ queryKey: connectionKeys.lists() });
    },
    invalidateConnection: (id: string) => {
      queryClient.invalidateQueries({ queryKey: connectionKeys.detail(id) });
    },
    invalidateLists: () => {
      queryClient.invalidateQueries({ queryKey: connectionKeys.lists() });
    },
    removeConnection: (id: string) => {
      queryClient.removeQueries({ queryKey: connectionKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: connectionKeys.lists() });
    },
  };
}
