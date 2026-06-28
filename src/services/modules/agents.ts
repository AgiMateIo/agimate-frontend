// modules/agents.ts
import { httpClient, buildPagedQuery } from '../httpClient';
import { API } from '@/config/constants';
import type {
  AgentResponse,
  AgentCreatedResponse,
  CreateAgentRequest,
  UpdateAgentRequest,
  PagedResponse,
  AgentConnectionResponse,
  BindConnectionRequest,
  AgentConnectionPolicyResponse,
  CreatePolicyRequest,
  UpdatePolicyRequest,
  AgentSkillResponse,
  CreateAgentSkillRequest,
  AgentLlmResponse,
  CreateAgentLlmRequest,
  UpdateAgentLlmRequest,
} from '@/types';

export const agentsApi = {
  // Agents
  async getAgentsList(params?: { agenticTeamId?: string; search?: string; page?: number; size?: number }): Promise<PagedResponse<AgentResponse>> {
    const query = buildPagedQuery({ agenticTeamId: params?.agenticTeamId, search: params?.search }, params);
    return httpClient.get<PagedResponse<AgentResponse>>(`${API.ENDPOINTS.CONTROL_API}/manage/agents/?${query}`);
  },

  async createAgent(data: CreateAgentRequest): Promise<AgentCreatedResponse> {
    return httpClient.post<AgentCreatedResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/agents/`, data);
  },

  async getAgent(id: string): Promise<AgentResponse> {
    return httpClient.get<AgentResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/agents/${id}`);
  },

  async updateAgent(id: string, data: UpdateAgentRequest): Promise<AgentResponse> {
    return httpClient.put<AgentResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/agents/${id}`, data);
  },

  async deleteAgent(id: string): Promise<void> {
    return httpClient.delete<void>(`${API.ENDPOINTS.CONTROL_API}/manage/agents/${id}`);
  },

  async regenerateAgentKey(id: string): Promise<AgentCreatedResponse> {
    return httpClient.post<AgentCreatedResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/agents/${id}/regenerate`, {});
  },

  // Agent connections (bindings) — give an agent access to a connector instance
  async getAgentConnections(agentId: string): Promise<AgentConnectionResponse[]> {
    return httpClient.get<AgentConnectionResponse[]>(`${API.ENDPOINTS.CONTROL_API}/manage/agents/${agentId}/connections/`);
  },

  async bindAgentConnection(agentId: string, data: BindConnectionRequest): Promise<AgentConnectionResponse> {
    return httpClient.post<AgentConnectionResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/agents/${agentId}/connections/`, data);
  },

  async unbindAgentConnection(agentId: string, connectionId: string): Promise<void> {
    return httpClient.delete<void>(`${API.ENDPOINTS.CONTROL_API}/manage/agents/${agentId}/connections/${connectionId}`);
  },

  // Connection policies — refine a binding (default-allow; policies narrow access)
  async getAgentConnectionPolicies(agentConnectionId: string): Promise<AgentConnectionPolicyResponse[]> {
    return httpClient.get<AgentConnectionPolicyResponse[]>(`${API.ENDPOINTS.CONTROL_API}/manage/agent-connections/${agentConnectionId}/policies/`);
  },

  async createAgentConnectionPolicy(agentConnectionId: string, data: CreatePolicyRequest): Promise<AgentConnectionPolicyResponse> {
    return httpClient.post<AgentConnectionPolicyResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/agent-connections/${agentConnectionId}/policies/`, data);
  },

  async updateAgentConnectionPolicy(agentConnectionId: string, policyId: string, data: UpdatePolicyRequest): Promise<AgentConnectionPolicyResponse> {
    return httpClient.patch<AgentConnectionPolicyResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/agent-connections/${agentConnectionId}/policies/${policyId}`, data);
  },

  async deleteAgentConnectionPolicy(agentConnectionId: string, policyId: string): Promise<void> {
    return httpClient.delete<void>(`${API.ENDPOINTS.CONTROL_API}/manage/agent-connections/${agentConnectionId}/policies/${policyId}`);
  },

  // Agent-Skill bindings
  async getAgentSkills(params: { agentId: string; page?: number; size?: number }): Promise<PagedResponse<AgentSkillResponse>> {
    return httpClient.get<PagedResponse<AgentSkillResponse>>(`${API.ENDPOINTS.CONTROL_API}/manage/agents/${params.agentId}/skills/?${buildPagedQuery({}, params)}`);
  },

  async bindAgentSkill(agentId: string, data: CreateAgentSkillRequest): Promise<AgentSkillResponse> {
    return httpClient.post<AgentSkillResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/agents/${agentId}/skills/`, data);
  },

  async unbindAgentSkill(agentId: string, skillId: string): Promise<void> {
    return httpClient.delete<void>(`${API.ENDPOINTS.CONTROL_API}/manage/agents/${agentId}/skills/${skillId}`);
  },

  // Agent ↔ LLM bindings
  async getAgentLlms(agentId: string): Promise<AgentLlmResponse[]> {
    return httpClient.get<AgentLlmResponse[]>(`${API.ENDPOINTS.CONTROL_API}/manage/agents/${agentId}/llms/`);
  },

  async createAgentLlm(agentId: string, data: CreateAgentLlmRequest): Promise<AgentLlmResponse> {
    return httpClient.post<AgentLlmResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/agents/${agentId}/llms/`, data);
  },

  async updateAgentLlm(agentId: string, name: string, data: UpdateAgentLlmRequest): Promise<AgentLlmResponse> {
    return httpClient.put<AgentLlmResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/agents/${agentId}/llms/${encodeURIComponent(name)}`, data);
  },

  async deleteAgentLlm(agentId: string, name: string): Promise<void> {
    return httpClient.delete<void>(`${API.ENDPOINTS.CONTROL_API}/manage/agents/${agentId}/llms/${encodeURIComponent(name)}`);
  },
};
