import {
  queryOptions,
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query';
import apiService from '@/services/api';
import type {
  ConnectionResponse,
  ConnectorCatalogEntry,
  IdentityScope,
  UpdateConnectionRequest,
} from '@/types';

export const connectionKeys = {
  all: ['connections'] as const,
  lists: () => [...connectionKeys.all, 'list'] as const,
  list: (connectorCode?: string, scope: IdentityScope | 'ALL' = 'INSTANCE') =>
    [...connectionKeys.lists(), scope, connectorCode ?? 'all'] as const,
  detail: (id: string) => [...connectionKeys.all, 'detail', id] as const,
};

export interface ConnectionWithConnector {
  connection: ConnectionResponse;
  connector: ConnectorCatalogEntry;
}

export const connectionsListOptions = (
  connectorCode?: string,
  scope: IdentityScope | 'ALL' = 'INSTANCE',
) =>
  queryOptions({
    queryKey: connectionKeys.list(connectorCode, scope),
    queryFn: () => apiService.getConnections(connectorCode, scope),
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
