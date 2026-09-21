// modules/agenticTeams.ts
import { httpClient, buildPagedQuery } from '../httpClient';
import { API } from '@/config/constants';
import type {
  AgenticTeam,
  AgentRequestFilters,
  AgentRequestRow,
  AgentRequestThread,
  CreateAgenticTeamRequest,
  PagedResponse,
  PatchAgenticTeamRequest,
} from '@/types';

export const agenticTeamsApi = {
  // Agentic Teams
  async getAgenticTeams(): Promise<AgenticTeam[]> {
    return httpClient.get<AgenticTeam[]>(`${API.ENDPOINTS.CONTROL_API}/manage/agentic-teams/`);
  },

  async getAgenticTeam(id: string): Promise<AgenticTeam> {
    return httpClient.get<AgenticTeam>(`${API.ENDPOINTS.CONTROL_API}/manage/agentic-teams/${id}`);
  },

  async createAgenticTeam(data: CreateAgenticTeamRequest): Promise<AgenticTeam> {
    return httpClient.post<AgenticTeam>(`${API.ENDPOINTS.CONTROL_API}/manage/agentic-teams/`, data);
  },

  // PATCH rather than the PUT beside it: PUT wants a name every time, so the
  // description could not be edited without resending one — and resending it
  // could trip the name-taken check on a team that never renamed.
  async patchAgenticTeam(id: string, data: PatchAgenticTeamRequest): Promise<AgenticTeam> {
    return httpClient.patch<AgenticTeam>(`${API.ENDPOINTS.CONTROL_API}/manage/agentic-teams/${id}`, data);
  },

  async deleteAgenticTeam(id: string): Promise<void> {
    return httpClient.delete<void>(`${API.ENDPOINTS.CONTROL_API}/manage/agentic-teams/${id}`);
  },

  // The team's correspondence: one row per branch an agent opened at another,
  // by last activity, newest first. Every filter is optional and ANDed —
  // `agentId` matches either end, the other two one end each. There is no
  // status filter: the status is computed off the branch's runs, so filtering
  // by it happens over the loaded page (see AgentRequestStatus).
  async getAgentRequests(
    teamId: string,
    params?: AgentRequestFilters & { page?: number; size?: number },
  ): Promise<PagedResponse<AgentRequestRow>> {
    const query = buildPagedQuery(
      {
        agentId: params?.agentId,
        fromAgentId: params?.fromAgentId,
        toAgentId: params?.toAgentId,
        since: params?.since,
      },
      params,
    );
    return httpClient.get<PagedResponse<AgentRequestRow>>(
      `${API.ENDPOINTS.CONTROL_API}/manage/agentic-teams/${teamId}/requests/?${query}`,
    );
  },

  // One branch: the same row the listing answers, plus the errands and the
  // reports in time order.
  async getAgentRequest(teamId: string, threadId: string): Promise<AgentRequestThread> {
    return httpClient.get<AgentRequestThread>(
      `${API.ENDPOINTS.CONTROL_API}/manage/agentic-teams/${teamId}/requests/${threadId}`,
    );
  },
};
