// modules/runs.ts
import { httpClient } from '../httpClient';
import { API } from '@/config/constants';
import type { CancelRunResponse, CancelSessionRunsResponse } from '@/types';

export const runsApi = {
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
