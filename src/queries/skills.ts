import {
  keepPreviousData,
  queryOptions,
  useQueries,
  useQuery,
  useQueryClient,
  useSuspenseQueries,
  useSuspenseQuery,
} from '@tanstack/react-query';
import apiService from '@/services/api';
import type { PagedResponse, SkillResponse, SkillScope } from '@/types';

export type SkillListTab = 'my' | 'public';

export const skillKeys = {
  all: ['skills'] as const,
  lists: () => [...skillKeys.all, 'list'] as const,
  list: (tab: SkillListTab, search: string, page: number, size: number) =>
    [...skillKeys.lists(), tab, search, page, size] as const,
  byConnector: (connectorCode: string, scope: SkillScope) =>
    [...skillKeys.lists(), 'by-connector', connectorCode, scope] as const,
  picker: (scope: SkillScope, search: string) =>
    [...skillKeys.lists(), 'picker', scope, search] as const,
  detail: (id: string) => [...skillKeys.all, 'detail', id] as const,
  agents: (id: string, search: string, page: number) =>
    [...skillKeys.detail(id), 'agents', search, page] as const,
};

// Agents this skill is bound to. Search and page are part of the key so a
// back-and-forth between pages is served from the cache; `placeholderData`
// keeps the previous page on screen while the next one loads.
export const skillAgentsOptions = (skillId: string, search = '', page = 0) =>
  queryOptions({
    queryKey: skillKeys.agents(skillId, search, page),
    queryFn: () =>
      apiService.getSkillAgents(skillId, {
        search: search || undefined,
        page,
        size: 20,
      }),
    placeholderData: keepPreviousData,
  });

export function useSkillAgentsQuery(skillId: string, search = '', page = 0) {
  return useQuery(skillAgentsOptions(skillId, search, page));
}

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

// `size` is part of the key: the Skills page and the add-skill modal show the
// same list at different page sizes, and sharing one key would serve each the
// other's page.
export const skillsListOptions = (
  tab: SkillListTab,
  search = '',
  page = 0,
  size = 20,
) =>
  queryOptions({
    queryKey: skillKeys.list(tab, search, page, size),
    queryFn: () =>
      apiService.getSkills({
        search: search || undefined,
        scope: tab === 'my' ? 'MINE' : 'PUBLIC',
        page,
        size,
      }),
  });

export function useSkillsListQuery(
  tab: SkillListTab,
  search = '',
  page = 0,
  size = 20,
) {
  return useQuery(skillsListOptions(tab, search, page, size));
}

// The skill picker (agent wizard, Skills page): one searchable list over both
// scopes, since "where does this skill come from" is a filter there, not the
// primary axis.
export type SkillPickerSource = 'all' | 'my' | 'public';

export type PickedSkill = SkillResponse & {
  // Came from the MINE scope — an own skill of any visibility. The scope is the
  // dependable ownership signal: every field of the User payload is optional,
  // so comparing userId against the current user's id can silently fail.
  mine: boolean;
};

const PICKER_SCOPES: Record<SkillPickerSource, SkillScope[]> = {
  all: ['MINE', 'PUBLIC'],
  my: ['MINE'],
  public: ['PUBLIC'],
};

// Same trade-off as the by-connector list below: merging two independently paged
// sources would drop rows, so take one large page per scope and report
// `truncated` instead of paging.
const PICKER_SIZE = 100;

export const skillsPickerOptions = (scope: SkillScope, search: string) =>
  queryOptions({
    queryKey: skillKeys.picker(scope, search),
    queryFn: () =>
      apiService.getSkills({
        search: search || undefined,
        scope,
        size: PICKER_SIZE,
      }),
  });

function mergePickerPages(
  scopes: SkillScope[],
  pages: (PagedResponse<SkillResponse> | undefined)[],
) {
  // Scopes are mine-first, so insert back-to-front: a skill that is both mine
  // and public keeps its MINE row, and with it `mine: true`.
  const byId = new Map<string, PickedSkill>();
  for (let i = pages.length - 1; i >= 0; i--) {
    for (const skill of pages[i]?.content ?? []) {
      byId.set(skill.id, { ...skill, mine: scopes[i] === 'MINE' });
    }
  }

  return {
    skills: [...byId.values()].sort((a, b) => a.title.localeCompare(b.title)),
    // A scope had more rows than one page — narrowing the search is the only way
    // to reach the rest.
    truncated: pages.some((p) => p && p.totalElements > p.content.length),
  };
}

// Non-suspense: the wizard step renders its own inline loading and error states
// and must not suspend the step it lives in.
export function useSkillPickerQuery(source: SkillPickerSource, search: string) {
  const scopes = PICKER_SCOPES[source];
  const results = useQueries({
    queries: scopes.map((scope) => skillsPickerOptions(scope, search)),
  });

  return {
    ...mergePickerPages(scopes, results.map((r) => r.data)),
    isPending: results.some((r) => r.isPending),
    error: results.find((r) => r.error)?.error ?? null,
  };
}

// Suspense variant for the Skills page, which keeps its toolbar outside the
// ErrorBoundary + Suspense shell so typing never unmounts the search field.
export function useSkillPickerSuspenseQuery(source: SkillPickerSource, search: string) {
  const scopes = PICKER_SCOPES[source];
  const results = useSuspenseQueries({
    queries: scopes.map((scope) => skillsPickerOptions(scope, search)),
  });

  return mergePickerPages(scopes, results.map((r) => r.data));
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

export function useSkillCacheActions() {
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
