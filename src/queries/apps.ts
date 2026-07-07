import {
  queryOptions,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query';
import apiService from '@/services/api';
import type { AppResponse, PagedResponse } from '@/types';

export const appKeys = {
  all: ['apps'] as const,
  lists: () => [...appKeys.all, 'list'] as const,
  list: (page: number) => [...appKeys.lists(), page] as const,
  detail: (id: string) => [...appKeys.all, 'detail', id] as const,
};

export const appsListOptions = (page = 0) =>
  queryOptions({
    queryKey: appKeys.list(page),
    queryFn: () => apiService.getApps(page ? { page } : undefined),
  });

export const appDetailOptions = (id: string) =>
  queryOptions({
    queryKey: appKeys.detail(id),
    queryFn: () => apiService.getApp(id),
  });

export function useAppsQuery(page = 0) {
  return useSuspenseQuery(appsListOptions(page));
}

export function useAppDetailQuery(id: string) {
  return useSuspenseQuery(appDetailOptions(id));
}

export function useAppCacheActions() {
  const queryClient = useQueryClient();

  const patchAppInLists = (id: string, patch: Partial<AppResponse>) =>
    queryClient.setQueriesData<PagedResponse<AppResponse>>(
      { queryKey: appKeys.lists() },
      (old) =>
        old
          ? {
              ...old,
              content: old.content.map((a) =>
                a.id === id ? { ...a, ...patch } : a
              ),
            }
          : old
    );

  return {
    patchAppInLists,
    removeAppFromLists: (id: string) => {
      queryClient.setQueriesData<PagedResponse<AppResponse>>(
        { queryKey: appKeys.lists() },
        (old) =>
          old
            ? { ...old, content: old.content.filter((a) => a.id !== id) }
            : old
      );
      queryClient.invalidateQueries({ queryKey: appKeys.lists() });
    },
    invalidateLists: () =>
      queryClient.invalidateQueries({ queryKey: appKeys.lists() }),
  };
}
