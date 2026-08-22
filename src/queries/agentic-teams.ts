import {
  queryOptions,
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query';
import apiService from '@/services/api';
import type { AgenticTeam, PatchAgenticTeamRequest } from '@/types/agentic-teams';

export const agenticTeamKeys = {
  all: ['agentic-teams'] as const,
  list: () => [...agenticTeamKeys.all, 'list'] as const,
  detail: (id: string) => [...agenticTeamKeys.all, 'detail', id] as const,
};

export const agenticTeamsListOptions = () =>
  queryOptions({
    queryKey: agenticTeamKeys.list(),
    queryFn: () => apiService.getAgenticTeams(),
  });

export const agenticTeamOptions = (id: string) =>
  queryOptions({
    queryKey: agenticTeamKeys.detail(id),
    queryFn: () => apiService.getAgenticTeam(id),
  });

export function useAgenticTeamsQuery() {
  return useSuspenseQuery(agenticTeamsListOptions());
}

export function useAgenticTeamQuery(id: string) {
  return useSuspenseQuery(agenticTeamOptions(id));
}

// What the server will make of this patch, applied to the cached team so the
// screen does not sit on stale values through the round trip. An empty string
// clears a field, and the team comes back with null there rather than "".
function applyTeamPatch(team: AgenticTeam, patch: PatchAgenticTeamRequest): AgenticTeam {
  const patched = (sent: string | null | undefined, current: string | null) =>
    sent === undefined || sent === null ? current : sent === '' ? null : sent;
  return {
    ...team,
    name: patch.name || team.name,
    description: patched(patch.description, team.description),
  };
}

// One mutation behind every field the team page edits in place: callers send
// only what they changed. PATCH rather than the PUT beside it, which wants a
// name on every call — resending an unchanged one could trip the name-taken
// check on a team that never renamed.
export function useUpdateAgenticTeamMutation(teamId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: PatchAgenticTeamRequest) =>
      apiService.patchAgenticTeam(teamId, patch),
    // Paint the change immediately, roll back if the server refuses it.
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: agenticTeamKeys.detail(teamId) });
      const previous = queryClient.getQueryData<AgenticTeam>(agenticTeamKeys.detail(teamId));
      if (previous) {
        queryClient.setQueryData<AgenticTeam>(
          agenticTeamKeys.detail(teamId),
          applyTeamPatch(previous, patch)
        );
      }
      return { previous };
    },
    onError: (_err, _patch, context) => {
      if (context?.previous) {
        queryClient.setQueryData(agenticTeamKeys.detail(teamId), context.previous);
      }
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<AgenticTeam>(agenticTeamKeys.detail(teamId), updated);
    },
    // The name shows up on the cards behind this page, and `updatedAt` on the
    // page itself only comes back with a fresh read.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: agenticTeamKeys.list() });
    },
  });
}

export function useAgenticTeamCacheActions() {
  const queryClient = useQueryClient();
  return {
    invalidateAll: () =>
      queryClient.invalidateQueries({ queryKey: agenticTeamKeys.all }),
  };
}
