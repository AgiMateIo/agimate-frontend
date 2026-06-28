// api.ts
// Facade composing the per-domain API modules over the shared transport core.
// The public surface is intentionally identical to the former ApiService class:
// `import apiService from '@/services/api'` exposes every method, and
// `import { ApiError } from '@/services/api'` keeps working.
import { httpClient, ApiError } from './httpClient';
import { agentsApi } from './modules/agents';
import { appsApi } from './modules/apps';
import { skillsApi } from './modules/skills';
import { llmProvidersApi } from './modules/llmProviders';
import { channelsApi } from './modules/channels';
import { boardsApi } from './modules/boards';
import { integrationsApi } from './modules/integrations';
import { connectorsApi } from './modules/connectors';
import { agenticTeamsApi } from './modules/agenticTeams';
import { logsApi } from './modules/logs';
import { miscApi } from './modules/misc';

const apiService = {
  ...agentsApi,
  ...appsApi,
  ...skillsApi,
  ...llmProvidersApi,
  ...channelsApi,
  ...boardsApi,
  ...integrationsApi,
  ...connectorsApi,
  ...agenticTeamsApi,
  ...logsApi,
  ...miscApi,
  // Generic transport methods were public on the former ApiService class; keep them
  // exposed for surface compatibility. Delegate via arrow funcs so `this` binds to
  // httpClient (its inflight-request map / token-refresh state).
  get: <T>(endpoint: string): Promise<T> => httpClient.get<T>(endpoint),
  post: <T>(endpoint: string, data: unknown): Promise<T> => httpClient.post<T>(endpoint, data),
  put: <T>(endpoint: string, data: unknown): Promise<T> => httpClient.put<T>(endpoint, data),
  patch: <T>(endpoint: string, data: unknown): Promise<T> => httpClient.patch<T>(endpoint, data),
  delete: <T>(endpoint: string): Promise<T> => httpClient.delete<T>(endpoint),
  // Auth/session methods live on the transport client; delegate via arrow funcs
  // so `this` binds correctly to httpClient.
  refreshAuthTokens: (refreshTokenId: string): Promise<boolean> => httpClient.refreshAuthTokens(refreshTokenId),
  logout: (): Promise<boolean> => httpClient.logout(),
};

export default apiService;
export { ApiError };
