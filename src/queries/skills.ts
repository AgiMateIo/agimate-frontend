import {
  queryOptions,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query';
import apiService from '@/services/api';
import type { PagedResponse, SkillResponse } from '@/types';

export type SkillListTab = 'my' | 'public';

export const skillKeys = {
  all: ['skills'] as const,
  lists: () => [...skillKeys.all, 'list'] as const,
  list: (tab: SkillListTab, search: string, page: number) =>
    [...skillKeys.lists(), tab, search, page] as const,
  detail: (id: string) => [...skillKeys.all, 'detail', id] as const,
};

export const skillDetailOptions = (id: string) =>
  queryOptions({
    queryKey: skillKeys.detail(id),
    queryFn: () => apiService.getSkill(id),
  });

// Suspense variant for the detail view page (rendered inside ErrorBoundary + Suspense).
export function useSkillDetailSuspenseQuery(id: string) {
  return useSuspenseQuery(skillDetailOptions(id));
}

// Non-suspense variant for the edit page, which seeds form state from the data
// and renders its own loading/error UI.
export function useSkillDetailQuery(id: string) {
  return useQuery(skillDetailOptions(id));
}

export function useSkillsListQuery(tab: SkillListTab, search: string, page: number) {
  return useSuspenseQuery({
    queryKey: skillKeys.list(tab, search, page),
    queryFn: () => {
      return apiService.getSkills({
        search: search || undefined,
        scope: tab === 'my' ? 'MINE' : 'PUBLIC',
        page,
        size: 20,
      });
    },
  });
}

export function useSkillsCacheActions() {
  const queryClient = useQueryClient();
  return {
    // Optimistically drop the skill from every cached list page, then refetch
    // so pagination counts stay correct.
    removeSkillFromLists: (skillId: string) => {
      queryClient.setQueriesData<PagedResponse<SkillResponse>>(
        { queryKey: skillKeys.lists() },
        (old) =>
          old
            ? { ...old, content: old.content.filter((s) => s.id !== skillId) }
            : old
      );
      queryClient.invalidateQueries({ queryKey: skillKeys.lists() });
    },
    invalidateLists: () =>
      queryClient.invalidateQueries({ queryKey: skillKeys.lists() }),
    invalidateSkill: (id: string) =>
      queryClient.invalidateQueries({ queryKey: skillKeys.detail(id) }),
  };
}
