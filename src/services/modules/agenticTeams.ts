// modules/agenticTeams.ts
import { httpClient } from '../httpClient';
import { API } from '@/config/constants';
import type {
  AgenticTeam,
  CreateAgenticTeamRequest,
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
};
