import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query';
import apiService from '@/services/api';
import { newestFirst } from '@/utils/date';
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
  tools: (id: string) => [...connectionKeys.detail(id), 'tools'] as const,
  triggers: (id: string) => [...connectionKeys.detail(id), 'triggers'] as const,
  jobs: (id: string) => [...connectionKeys.detail(id), 'jobs'] as const,
  // Deliberately NOT under detail(id): testing reaches out to the provider for
  // real, and nesting it there would let any invalidation of the detail page —
  // including the one the test dialog fires as it closes — re-run the call.
  test: (id: string) => [...connectionKeys.all, 'test', id] as const,
};

export interface ConnectionWithConnector {
  connection: ConnectionResponse;
  connector: ConnectorCatalogEntry;
}

// Newest first. The endpoint returns the whole list rather than a page, so
// sorting here covers every connection, not just what one page happened to hold.
const byCreatedAtDesc = (connections: ConnectionResponse[]) => [...connections].sort(newestFirst);

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

// The connector's tool and trigger definitions as this connection resolves them.
// Nested under the detail key for the same reason as the agents list above.
export const connectionToolsOptions = (id: string) =>
  queryOptions({
    queryKey: connectionKeys.tools(id),
    queryFn: () => apiService.getConnectionTools(id),
  });

export function useConnectionToolsQuery(id: string) {
  return useQuery(connectionToolsOptions(id));
}

export const connectionTriggersOptions = (id: string) =>
  queryOptions({
    queryKey: connectionKeys.triggers(id),
    queryFn: () => apiService.getConnectionTriggers(id),
  });

export function useConnectionTriggersQuery(id: string) {
  return useQuery(connectionTriggersOptions(id));
}

// Background jobs scheduled for one connection. Lifecycle actions go by job id
// through the shared connector-jobs endpoints, so they invalidate this key
// rather than owning a cache of their own.
export const connectionJobsOptions = (id: string) =>
  queryOptions({
    queryKey: connectionKeys.jobs(id),
    queryFn: () => apiService.getConnectionJobs(id),
  });

export function useConnectionJobsQuery(id: string) {
  return useQuery(connectionJobsOptions(id));
}

// Reaching out to the provider on demand: never cached and never retried, so
// opening the dialog always reports the connection's state right now and a
// failure is the answer rather than something to paper over with a second try.
export function useConnectionTestQuery(id: string) {
  return useQuery({
    queryKey: connectionKeys.test(id),
    queryFn: () => apiService.testConnection(id),
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    // A reconnect must not silently re-POST the test behind the user's back.
    refetchOnReconnect: false,
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
