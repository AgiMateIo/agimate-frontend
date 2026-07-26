import {
  queryOptions,
  useQueries,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query';
import apiService from '@/services/api';
import type { PagedResponse, SkillResponse, SkillScope } from '@/types';

export type SkillListTab = 'my' | 'public';

export const skillKeys = {
  all: ['skills'] as const,
  lists: () => [...skillKeys.all, 'list'] as const,
  list: (tab: SkillListTab, search: string, page: number) =>
    [...skillKeys.lists(), tab, search, page] as const,
  byConnector: (connectorCode: string, scope: SkillScope) =>
    [...skillKeys.lists(), 'by-connector', connectorCode, scope] as const,
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

// One page per scope, deliberately large: the two scopes are merged client-side
// (see useConnectorSkillsQuery), and paging a merged list against two
// independently paged sources would silently drop rows.
const CONNECTOR_SKILLS_SIZE = 100;

export const connectorSkillsOptions = (connectorCode: string, scope: SkillScope) =>
  queryOptions({
    queryKey: skillKeys.byConnector(connectorCode, scope),
    queryFn: () =>
      apiService.getSkills({ connectorCode, scope, size: CONNECTOR_SKILLS_SIZE }),
  });

// Every skill declaring this connector, own and public alike. The endpoint has
// no "all" scope, so MINE (own skills of any visibility) and PUBLIC (everyone's
// public ones) are fetched in parallel and merged; own rows win the dedupe,
// since a skill that is both mine and public is still mine.
export function useConnectorSkillsQuery(connectorCode: string) {
  const [mine, publics] = useQueries({
    queries: [
      connectorSkillsOptions(connectorCode, 'MINE'),
      connectorSkillsOptions(connectorCode, 'PUBLIC'),
    ],
  });

  const byId = new Map<string, SkillResponse>();
  for (const skill of publics.data?.content ?? []) byId.set(skill.id, skill);
  for (const skill of mine.data?.content ?? []) byId.set(skill.id, skill);

  const pageOf = (data: PagedResponse<SkillResponse> | undefined) =>
    data ? data.totalElements > data.content.length : false;

  return {
    skills: [...byId.values()].sort((a, b) => a.title.localeCompare(b.title)),
    isPending: mine.isPending || publics.isPending,
    error: mine.error ?? publics.error,
    // True when a scope had more rows than one page — the list is not the whole set.
    truncated: pageOf(mine.data) || pageOf(publics.data),
  };
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
