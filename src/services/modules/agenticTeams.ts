// modules/agenticTeams.ts
import { httpClient } from '../httpClient';
import { API } from '@/config/constants';
import type {
  AgenticTeam,
  CreateAgenticTeamRequest,
  UpdateAgenticTeamRequest,
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

  async updateAgenticTeam(id: string, data: UpdateAgenticTeamRequest): Promise<AgenticTeam> {
    return httpClient.put<AgenticTeam>(`${API.ENDPOINTS.CONTROL_API}/manage/agentic-teams/${id}`, data);
  },

  async deleteAgenticTeam(id: string): Promise<void> {
    return httpClient.delete<void>(`${API.ENDPOINTS.CONTROL_API}/manage/agentic-teams/${id}`);
  },
};
