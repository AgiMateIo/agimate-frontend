// modules/agents.ts
import { httpClient, buildPagedQuery } from '../httpClient';
import { API } from '@/config/constants';
import type {
  AgentResponse,
  AgentCreatedResponse,
  CreateAgentRequest,
  PatchAgentRequest,
  PagedResponse,
  AgentConnectionResponse,
  BindConnectionRequest,
  AgentConnectionPolicyResponse,
  CreatePolicyRequest,
  UpdatePolicyRequest,
  AgentSkillResponse,
  CreateAgentSkillRequest,
  UpdateAgentSkillConnectionsRequest,
  UpdateAgentSkillDisclosureRequest,
  SkillBindingPlanResponse,
  AgentLlmResponse,
  AgentLlmPurpose,
  CreateAgentLlmRequest,
  UpdateAgentLlmRequest,
} from '@/types';

export const agentsApi = {
  // Agents
  // `sort` is a Spring Pageable sort ("createdAt,desc"). Callers that care about
  // order also sort what comes back, since an endpoint that builds its own
  // PageRequest would drop the parameter silently.
  async getAgentsList(params?: { agenticTeamId?: string; search?: string; sort?: string; page?: number; size?: number }): Promise<PagedResponse<AgentResponse>> {
    const query = buildPagedQuery(
      { agenticTeamId: params?.agenticTeamId, search: params?.search, sort: params?.sort },
      params,
    );
    return httpClient.get<PagedResponse<AgentResponse>>(`${API.ENDPOINTS.CONTROL_API}/manage/agents/?${query}`);
  },

  async createAgent(data: CreateAgentRequest): Promise<AgentCreatedResponse> {
    return httpClient.post<AgentCreatedResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/agents/`, data);
  },

  async getAgent(id: string): Promise<AgentResponse> {
    return httpClient.get<AgentResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/agents/${id}`);
  },

  // PATCH, not the PUT next to it on the server: that one replaces the agent,
  // so a body carrying one field empties everything else.
  async patchAgent(id: string, data: PatchAgentRequest): Promise<AgentResponse> {
    return httpClient.patch<AgentResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/agents/${id}`, data);
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

  // Addressed by the *connection* id (not the binding id), and it now works for
  // internal connectors too — nothing is "managed by skills" any more.
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

  // What binding this skill to this agent would take: per requirement, the
  // user's fitting connections (with whether each is already open to the
  // agent), the create form with the skill's pre-fills, and the access rules
  // that will be written. Answers for a bound skill too, resolved as if it
  // were not — the binding row is the truth once it exists.
  async getAgentSkillPlan(agentId: string, skillId: string): Promise<SkillBindingPlanResponse> {
    return httpClient.get<SkillBindingPlanResponse>(
      `${API.ENDPOINTS.CONTROL_API}/manage/agents/${agentId}/skills/plan?skillId=${encodeURIComponent(skillId)}`,
    );
  },

  async bindAgentSkill(agentId: string, data: CreateAgentSkillRequest): Promise<AgentSkillResponse> {
    return httpClient.post<AgentSkillResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/agents/${agentId}/skills/`, data);
  },

  async unbindAgentSkill(agentId: string, skillId: string): Promise<void> {
    return httpClient.delete<void>(`${API.ENDPOINTS.CONTROL_API}/manage/agents/${agentId}/skills/${skillId}`);
  },

  // Replaces the binding's whole key→instance map (a key left out of the body
  // ends up without an instance) and re-applies the skill's rules to the
  // bindings the chosen instances have.
  async updateAgentSkillConnections(
    agentId: string,
    skillId: string,
    data: UpdateAgentSkillConnectionsRequest,
  ): Promise<AgentSkillResponse> {
    return httpClient.put<AgentSkillResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/agents/${agentId}/skills/${skillId}/connections`, data);
  },

  // Whether this agent gets the skill's body in the prompt or fetches it on
  // demand. `disclosure: 'INHERIT'` clears the override — the skill's own
  // default is in effect again. Answers the same binding row the listing does.
  async updateAgentSkillDisclosure(
    agentId: string,
    skillId: string,
    data: UpdateAgentSkillDisclosureRequest,
  ): Promise<AgentSkillResponse> {
    return httpClient.patch<AgentSkillResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/agents/${agentId}/skills/${skillId}`, data);
  },

  // Marks the agent's skills as installed at their current version — the only
  // way to clear `needsReinstall` — and RESETS every skill's access rules to
  // what its author declared, re-creating rows the user deleted. It still
  // creates no connector bindings. Confirm before calling.
  async refreshAgentSkills(agentId: string): Promise<void> {
    return httpClient.post<void>(`${API.ENDPOINTS.CONTROL_API}/manage/agents/${agentId}/skills/refresh`, {});
  },

  // Agent ↔ LLM bindings — keyed by purpose (one model per purpose per agent).
  async getAgentLlms(agentId: string): Promise<AgentLlmResponse[]> {
    return httpClient.get<AgentLlmResponse[]>(`${API.ENDPOINTS.CONTROL_API}/manage/agents/${agentId}/llms/`);
  },

  async createAgentLlm(agentId: string, data: CreateAgentLlmRequest): Promise<AgentLlmResponse> {
    return httpClient.post<AgentLlmResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/agents/${agentId}/llms/`, data);
  },

  // {purpose} must be the uppercase enum value — lowercase gives 400.
  async updateAgentLlm(agentId: string, purpose: AgentLlmPurpose, data: UpdateAgentLlmRequest): Promise<AgentLlmResponse> {
    return httpClient.put<AgentLlmResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/agents/${agentId}/llms/${purpose}`, data);
  },

  async deleteAgentLlm(agentId: string, purpose: AgentLlmPurpose): Promise<void> {
    return httpClient.delete<void>(`${API.ENDPOINTS.CONTROL_API}/manage/agents/${agentId}/llms/${purpose}`);
  },
};
