import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import apiService from '@/services/api';
import type { PagedResponse, SkillResponse } from '@/types';

export type SkillListTab = 'my' | 'public';

export const skillKeys = {
  all: ['skills'] as const,
  lists: () => [...skillKeys.all, 'list'] as const,
  list: (tab: SkillListTab, search: string, page: number) =>
    [...skillKeys.lists(), tab, search, page] as const,
};

export function useSkillsListQuery(tab: SkillListTab, search: string, page: number) {
  return useSuspenseQuery({
    queryKey: skillKeys.list(tab, search, page),
    queryFn: () => {
      const params = { search: search || undefined, page, size: 20 };
      return tab === 'my'
        ? apiService.getSkills(params)
        : apiService.getPublicSkills(params);
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
  };
}
