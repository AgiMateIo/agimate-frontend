import { queryOptions, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import apiService from '@/services/api';
import type { UserFilesFilters } from '@/types';

export const fileKeys = {
  all: ['files'] as const,
  lists: () => [...fileKeys.all, 'list'] as const,
  list: (
    agentId: string,
    sessionId: string,
    name: string,
    page: number,
    size: number,
  ) => [...fileKeys.lists(), agentId, sessionId, name, page, size] as const,
};

// '' is the UI's "no filter" value for every dimension — the request omits them.
// `agentId` means "related to this agent" (produced it or was shown it), not
// "produced by"; `sessionId` narrows to one conversation's attachments.
//
// `staleTime: 0` on purpose: every row carries a signed `url` that expires in
// ~15 minutes, so a page served from a long-lived cache would hand out dead
// links. Re-reading the list is exactly how fresh signatures are obtained.
export const userFilesOptions = (
  agentId: string,
  name: string,
  page: number,
  size: number,
  sessionId = '',
) =>
  queryOptions({
    queryKey: fileKeys.list(agentId, sessionId, name, page, size),
    queryFn: () => {
      const filters: UserFilesFilters = {
        agentId: agentId || undefined,
        sessionId: sessionId || undefined,
        name: name || undefined,
      };
      return apiService.getUserFiles(filters, { page, size });
    },
    staleTime: 0,
    // The app disables focus refetching globally; here it is what keeps a tab
    // left open for an hour from handing out expired signatures.
    refetchOnWindowFocus: true,
  });

export function useUserFilesQuery(
  agentId: string,
  name: string,
  page: number,
  size: number,
  sessionId = '',
) {
  return useSuspenseQuery(userFilesOptions(agentId, name, page, size, sessionId));
}

export function useFileCacheActions() {
  const queryClient = useQueryClient();
  return {
    // Deletion and a fresh upload both shift every following row across page
    // boundaries, so the whole set is invalidated rather than the one page the
    // user is looking at.
    invalidateLists: () => queryClient.invalidateQueries({ queryKey: fileKeys.lists() }),
  };
}
