// modules/skills.ts
import { httpClient, buildPagedQuery } from '../httpClient';
import { API } from '@/config/constants';
import type {
  PagedResponse,
  AgentSummaryResponse,
  SkillResponse,
  SkillDetailResponse,
  CreateSkillRequest,
  UpdateSkillRequest,
} from '@/types';

export const skillsApi = {
  // ========== SKILLS ==========

  async getSkills(params?: { search?: string; connectorCode?: string; page?: number; size?: number }): Promise<PagedResponse<SkillResponse>> {
    const query = buildPagedQuery({ search: params?.search, connectorCode: params?.connectorCode }, params);
    return httpClient.get<PagedResponse<SkillResponse>>(`${API.ENDPOINTS.CONTROL_API}/manage/skills/?${query}`);
  },

  async getPublicSkills(params?: { search?: string; connectorCode?: string; page?: number; size?: number }): Promise<PagedResponse<SkillResponse>> {
    const query = buildPagedQuery({ search: params?.search, connectorCode: params?.connectorCode }, params);
    return httpClient.get<PagedResponse<SkillResponse>>(`${API.ENDPOINTS.CONTROL_API}/manage/skills/public/?${query}`);
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
