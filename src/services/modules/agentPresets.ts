// modules/agentPresets.ts
import { httpClient } from '../httpClient';
import { API } from '@/config/constants';
import type { AgentPresetResponse } from '@/types';

export const agentPresetsApi = {
  // Role preset gallery for the agent creation wizard.
  // Returns a plain array, already sorted for display.
  async getAgentPresets(): Promise<AgentPresetResponse[]> {
    return httpClient.get<AgentPresetResponse[]>(`${API.ENDPOINTS.CONTROL_API}/manage/agent-presets/`);
  },
};
