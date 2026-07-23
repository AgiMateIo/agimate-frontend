// modules/skills.ts
import { httpClient, buildPagedQuery } from '../httpClient';
import { API } from '@/config/constants';
import type {
  PagedResponse,
  AgentSummaryResponse,
  SkillResponse,
  SkillScope,
  SkillDetailResponse,
  CreateSkillRequest,
  UpdateSkillRequest,
  UpdateSkillConnectorsRequest,
} from '@/types';

export const skillsApi = {
  // ========== SKILLS ==========

  // scope: MINE (default) = own skills of any visibility; PUBLIC = all public skills.
  async getSkills(params?: { search?: string; connectorCode?: string; scope?: SkillScope; page?: number; size?: number }): Promise<PagedResponse<SkillResponse>> {
    const query = buildPagedQuery(
      { search: params?.search, connectorCode: params?.connectorCode, scope: params?.scope },
      params,
    );
    return httpClient.get<PagedResponse<SkillResponse>>(`${API.ENDPOINTS.CONTROL_API}/manage/skills/?${query}`);
  },

  async getSkill(id: string): Promise<SkillDetailResponse> {
    return httpClient.get<SkillDetailResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/skills/${id}`);
  },

  async createSkill(data: CreateSkillRequest): Promise<SkillResponse> {
    return httpClient.post<SkillResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/skills/`, data);
  },

  async updateSkill(id: string, data: UpdateSkillRequest): Promise<SkillResponse> {
    return httpClient.put<SkillResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/skills/${id}`, data);
  },

  // Replace only the required-connector list (bumps version). Does not
  // rebuild the SKILL.md body — use updateSkill for that.
  async updateSkillConnectors(id: string, data: UpdateSkillConnectorsRequest): Promise<SkillResponse> {
    return httpClient.put<SkillResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/skills/${id}/connectors`, data);
  },

  async deleteSkill(id: string): Promise<void> {
    return httpClient.delete<void>(`${API.ENDPOINTS.CONTROL_API}/manage/skills/${id}`);
  },

  async getSkillAgents(
    skillId: string,
    params?: { search?: string; page?: number; size?: number }
  ): Promise<PagedResponse<AgentSummaryResponse>> {
    const query = buildPagedQuery({ search: params?.search }, params);
    return httpClient.get<PagedResponse<AgentSummaryResponse>>(
      `${API.ENDPOINTS.CONTROL_API}/manage/skills/${skillId}/agents/?${query}`
    );
  },
};
