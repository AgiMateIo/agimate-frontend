// Stopping a run — POST /control/manage/runs/…/cancel
//
// Cancellation is a *request*, not a switch: the backend records it and the run
// notices at its next seam — between model turns, or when a tool result comes
// back. Nothing in these responses means the run has stopped. The end arrives
// the way it always does: a `stream: "answer"` message, whose text lists what
// the agent managed to do before it let go.

import type { TriggerRunStatus } from './apps';

// POST /manage/runs/sessions/{sessionId}/cancel — what webchat's stop button
// hits. Keyed by session and not by run on purpose: the frontend never sees a
// runId, and the user stops a conversation, not one run — anything queued
// behind the working run has to go out with it.
export interface CancelSessionRunsResponse {
  sessionId: string;
  // Live runs the request was recorded for: the working one plus whatever was
  // queued behind it. `0` is not an error — there was nothing left to stop
  // (the run finished, or the request was already in from an earlier press).
  // A number above 1 still produces exactly one "stopped" message: only the
  // run that had started speaks, the queued ones exit silently. Not for display.
  cancelled: number;
}

// POST /manage/runs/{runId}/cancel — for surfaces that show runs as rows,
// including background ones the user never saw start.
export interface CancelRunResponse {
  runId: string;
  // Status as of the request, not after it.
  status: TriggerRunStatus;
  // Whether this call is what recorded the request. `requested: false` with
  // `alreadyFinished: false` is a repeat press: the run is alive and the
  // request was already standing.
  requested: boolean;
  // The run had ended on its own (DONE/FAILED) — nothing to stop.
  alreadyFinished: boolean;
}
