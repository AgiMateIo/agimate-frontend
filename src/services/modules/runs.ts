// modules/runs.ts
import { httpClient, buildPagedQuery } from '../httpClient';
import { API } from '@/config/constants';
import type {
  CancelRunResponse,
  CancelSessionRunsResponse,
  PagedResponse,
  RunFilters,
  RunPromptResponse,
  RunResponse,
  RunTurnResponse,
} from '@/types';

export const runsApi = {
  // Runs, newest first; every filter is optional and they combine with AND.
  // Replaces the deprecated /trigger-logs/agent-runs/, which required agentId.
  async getRuns(params?: RunFilters & { page?: number; size?: number }): Promise<PagedResponse<RunResponse>> {
    const query = buildPagedQuery(
      {
        agentId: params?.agentId,
        sessionId: params?.sessionId,
        triggerLogId: params?.triggerLogId,
        connectorCode: params?.connectorCode,
        connectionId: params?.connectionId,
        name: params?.name,
        status: params?.status,
      },
      params,
    );
    return httpClient.get<PagedResponse<RunResponse>>(
      `${API.ENDPOINTS.CONTROL_API}/manage/runs/?${query}`,
    );
  },

  // The same row as in the list, by id — what a deep link to a run needs when
  // no list page is at hand. 404 = unknown run, or someone else's.
  async getRun(runId: string): Promise<RunResponse> {
    return httpClient.get<RunResponse>(
      `${API.ENDPOINTS.CONTROL_API}/manage/runs/${encodeURIComponent(runId)}`,
    );
  },

  // The turn journal of one run — newest first (turnIndex DESC), like the list.
  // Reverse a page to read the transcript top-down. Nothing here is truncated:
  // one turn with a heavy tool result runs to tens of kilobytes, so keep `size`
  // modest. 404 = unknown run, or someone else's.
  async getRunTurns(runId: string, params?: { page?: number; size?: number }): Promise<PagedResponse<RunTurnResponse>> {
    const query = buildPagedQuery({}, { page: params?.page, size: params?.size ?? 50 });
    return httpClient.get<PagedResponse<RunTurnResponse>>(
      `${API.ENDPOINTS.CONTROL_API}/manage/runs/${encodeURIComponent(runId)}/turns/?${query}`,
    );
  },

  // What actually went into the first model call. `messages: null` is a legal
  // answer ("no snapshot"), not a failure.
  async getRunPrompt(runId: string): Promise<RunPromptResponse> {
    return httpClient.get<RunPromptResponse>(
      `${API.ENDPOINTS.CONTROL_API}/manage/runs/${encodeURIComponent(runId)}/prompt`,
    );
  },

  // Stop the conversation: every live run of the session — the working one and
  // anything queued behind it. `sessionId` is the webchat session id, the same
  // one that comes back from a send and rides on every Centrifugo event.
  // 404 = no such session, or someone else's (deliberately indistinguishable).
  async cancelSessionRuns(sessionId: string): Promise<CancelSessionRunsResponse> {
    return httpClient.post<CancelSessionRunsResponse>(
      `${API.ENDPOINTS.CONTROL_API}/manage/runs/sessions/${sessionId}/cancel`,
      {},
    );
  },

  // Stop one run by id (`id` of a trigger-run row). Idempotent: pressing twice
  // is answered, not rejected. 404 = unknown run or someone else's.
  async cancelRun(runId: string): Promise<CancelRunResponse> {
    return httpClient.post<CancelRunResponse>(
      `${API.ENDPOINTS.CONTROL_API}/manage/runs/${runId}/cancel`,
      {},
    );
  },
};
