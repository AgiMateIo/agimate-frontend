// One agent of a team handing a piece of work to another — the correspondence
// of a team, read from outside both conversations.
//
// A request is a branch: a session belonging to the *addressee*
// (`connectorCode: 'agents'`, in its `Agents: <name>` channel) whose
// `parentSessionId` is the conversation the sender was in. The thread id below
// is that session's id — the two are one thing seen from two sides, which is
// why a link into the addressee's runs is addressed by it.

// How the branch is doing. Computed by the backend off the branch's runs, not
// stored — hence no server-side filter by it, and the filtering of a loaded
// page happens here.
//
// `STALLED` is the one that must never read as "in work": the errand was
// handed over and the run never reached the queue. Nothing is executing and
// nothing will, without a person noticing.
export type AgentRequestStatus = 'WORKING' | 'DONE' | 'FAILED' | 'CANCELLED' | 'STALLED';

// Either end of a request. Both agents belong to the team the listing is asked
// about, so the name is the one shown and the id is what links out.
export interface AgentRequestParty {
  agentId: string;
  agentName: string;
}

// The conversation the errand came out of — the sender's, not the addressee's.
// Its connector is whatever carried that conversation (webchat, a messenger),
// and its title is the conversation's own.
export interface AgentRequestOrigin {
  sessionId: string;
  title: string | null;
  connectorCode: string;
}

// The last thing the addressee reported back. `reportedAt: null` on a finished
// request is not a detail: the addressee answered and the answer never reached
// the sender's conversation, which is the difference between "done" and "done
// and acted upon".
export interface AgentRequestReport {
  status: 'DONE' | 'FAILED';
  preview: string | null;
  at: string;
  reportedAt: string | null;
}

// A row of GET /manage/agentic-teams/{teamId}/requests/ — and the payload of
// every `agent.request.*` event, so one can go straight into the other's list.
export interface AgentRequestRow {
  // The thread id, which is also the id of the addressee's branch session.
  id: string;
  title: string | null;
  from: AgentRequestParty;
  to: AgentRequestParty;
  origin: AgentRequestOrigin;
  status: AgentRequestStatus;
  // How many errands went into this one branch: a sender can append to a branch
  // that is still running instead of opening another.
  requestsCount: number;
  lastReport: AgentRequestReport | null;
  createdAt: string;
  lastActivityAt: string;
  closedAt: string | null;
}

// One errand handed over. `absorbed` marks the one appended to a branch that
// was already running: the run that was working picked the message up, so this
// errand has no report of its own and none should be drawn under it.
export interface AgentRequestExchangeRequest {
  kind: 'REQUEST';
  at: string;
  runId: string;
  mode: 'new' | 'append';
  title: string | null;
  instructions: string;
  context: string | null;
  absorbed: boolean;
}

// What went back. `runId` here is the addressee's run — the work itself.
export interface AgentRequestExchangeReport {
  kind: 'REPORT';
  at: string;
  runId: string;
  status: 'DONE' | 'FAILED';
  text: string | null;
  reportedAt: string | null;
}

export type AgentRequestExchangeItem = AgentRequestExchangeRequest | AgentRequestExchangeReport;

// GET /manage/agentic-teams/{teamId}/requests/{threadId}: the same row as the
// listing, plus the correspondence in time order.
export interface AgentRequestThread {
  request: AgentRequestRow;
  exchange: AgentRequestExchangeItem[];
}

// Filters of the listing, all optional and ANDed. `agentId` is "either end",
// the other two are one end each; `since` is ISO-8601 against `lastActivityAt`.
// There is no status filter — see AgentRequestStatus.
export interface AgentRequestFilters {
  agentId?: string;
  fromAgentId?: string;
  toAgentId?: string;
  since?: string;
}
