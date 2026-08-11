// Runs — /control/manage/runs
//
// A run is one agent's handling of one event: the row in the list, the turns it
// wrote, the message list it started from, and the request to stop it. All of
// it is scoped to the caller; someone else's run answers 404, never 403.

// Real run status column (unlike tool-call logs, where status is derived from fields).
export type RunStatus = 'ENQUEUED' | 'RUNNING' | 'DONE' | 'FAILED' | 'CANCELLED';

// What a run (or one of its turns) spent on the model.
//
// The cache counters are deliberately *not* part of `totalTokens`: providers
// bill them on their own line and at their own price, so adding them up would
// count the same prompt twice. One number in a column is `totalTokens`; the
// cache goes next to it, never inside it. And there is no money here — prices
// at the time of the call aren't recorded, and multiplying old runs by today's
// tariff would rewrite their cost on every price change.
export interface RunUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  // inputTokens + outputTokens
  totalTokens: number;
  // How many times the run went to the model.
  calls: number;
}

// A turn is exactly one model call, so the call counter would always be 1.
export type RunTurnUsage = Omit<RunUsage, 'calls'>;

// GET /manage/runs/ (one row) and GET /manage/runs/{runId} (the same row by id).
// One agent's run of one trigger — a trigger event fans out to several agents,
// and each row is a single agent's run.
export interface RunResponse {
  // runId — what addresses the turns, the prompt snapshot and the cancel call
  id: string;
  // id of the shared incoming event (one per several agents)
  triggerLogId: string;
  connectorCode: string;
  connectionId: string;
  externalId: string;
  name: string;
  occurredAt: string | null;
  input: Record<string, unknown>;
  status: RunStatus;
  result: string | null;
  error: string | null;
  // channel session the run writes to; null — direct run (WEBHOOK/CENTRIFUGO)
  sessionId: string | null;
  // `false` = the turn journal of this run is incomplete, and the one practical
  // consequence is worth surfacing: later runs of the same session don't see it,
  // so the agent doesn't remember it. Rare — if it isn't, that's a backend bug.
  turnsIntact: boolean;
  // Both exist so a run card draws itself without probing: how many steps there
  // are, and whether the input tab has anything behind it at all.
  turnsCount: number;
  hasPrompt: boolean;
  // Summed over every model call of the run. Zeroes (not null) for a run that
  // never reached the model — "it didn't call the model" is a statement we can
  // make.
  usage: RunUsage | null;
  lastActivityAt: string | null;
  createdAt: string;
}

// All optional and combined with AND. `sessionId` opens the conversation view,
// `triggerLogId` answers "who handled this one event".
export interface RunFilters {
  agentId?: string;
  sessionId?: string;
  triggerLogId?: string;
  connectorCode?: string;
  connectionId?: string;
  // case-insensitive substring match on the trigger name
  name?: string;
  status?: RunStatus;
}

// GET /manage/runs/{runId}/turns/ — the journal. SYSTEM never appears here: the
// system prompt is stored once per run and lives in the prompt snapshot.
export type RunTurnRole = 'USER' | 'ASSISTANT' | 'TOOL';

export interface RunToolCall {
  id: string;
  name: string;
  // raw JSON *string*, not an object — and possibly not valid JSON at all
  argumentsJson: string;
}

export interface RunToolResult {
  id: string;
  name: string;
  // raw JSON string; truncated by the worker past 64000 chars, so parsing can
  // legitimately fail. `{"error":"cancelled by the user"}` means the call was
  // never executed — the user stopped the run between decision and dispatch.
  outputJson: string;
  failed: boolean;
}

export interface RunTurnResponse {
  // continuous counter within the run, from 0
  turnIndex: number;
  role: RunTurnRole;
  // question on USER, answer or the preamble before a call on ASSISTANT,
  // empty on TOOL
  text: string | null;
  // the model's reasoning, whole and untruncated; null if it didn't reason
  thinkingText: string | null;
  // Null, not an empty array, on a turn that has none of them — the backend
  // omits the collection rather than serialising it empty.
  toolCalls: RunToolCall[] | null;
  toolResults: RunToolResult[] | null;
  finishReason: string | null;
  model: string | null;
  // LLM call id
  callId: string | null;
  // `null` means two different things, and neither is "free": there was no model
  // call at all (always so for USER and TOOL), or the spend report went missing
  // — it is sent separately from the turn and best-effort, so an ASSISTANT turn
  // with a `callId` and no usage means "unknown". Zeroes are never substituted;
  // show nothing instead.
  usage: RunTurnUsage | null;
  createdAt: string;
}

// GET /manage/runs/{runId}/prompt — the message list exactly as it went into the
// first model call. Not the same thing as turn 0: ephemeral blocks (memory notes
// and the like) are deliberately kept out of the journal, so this is the only
// place they are visible.
export type RunPromptRole = 'SYSTEM' | 'USER' | 'ASSISTANT' | 'TOOL';

// Same thing as RunToolResult, under a different name: the snapshot is written
// by the worker's own message model, the journal by another. Historical, and not
// fixable without breaking the reading of old snapshots.
export interface RunPromptToolResult {
  id: string;
  name: string;
  contentJson: string;
  failed: boolean;
}

// Attachments of an incoming message — links, not bytes.
export interface RunPromptPart {
  fileId: string;
  type: string;
  mime: string | null;
  size: number | null;
  name: string | null;
}

export interface RunPromptMessage {
  role: RunPromptRole;
  text: string | null;
  thinking: boolean;
  // Same as in the journal: absent collections come back as null.
  toolCalls: RunToolCall[] | null;
  toolResults: RunPromptToolResult[] | null;
  parts: RunPromptPart[] | null;
}

export interface RunPromptResponse {
  runId: string;
  // null when no snapshot was taken — the run never reached the loop, or it
  // predates the feature. Not an error state.
  messages: RunPromptMessage[] | null;
}

// Stopping a run — POST /control/manage/runs/…/cancel
//
// Cancellation is a *request*, not a switch: the backend records it and the run
// notices at its next seam — between model turns, or when a tool result comes
// back. Nothing in these responses means the run has stopped. The end arrives
// the way it always does: a `stream: "answer"` message, whose text lists what
// the agent managed to do before it let go.

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
  status: RunStatus;
  // Whether this call is what recorded the request. `requested: false` with
  // `alreadyFinished: false` is a repeat press: the run is alive and the
  // request was already standing.
  requested: boolean;
  // The run had ended on its own (DONE/FAILED) — nothing to stop.
  alreadyFinished: boolean;
}
