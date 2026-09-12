import apiService from '@/services/api';
import { isInternalConnector } from '@/utils/connector';
import type {
  AgentSkillConnectorStatus,
  ConnectionResponse,
  ConnectorCatalogEntry,
} from '@/types';

// A skill only reaches the agent when every requirement it declares resolves
// to an instance open to that agent. Choosing an instance, opening it and
// binding the skill are separate requests, and the order matters: the rules
// the skill declares are written on the binding at the last step and need it
// to exist — hence one place that walks the sequence.

// Splits the codes a skill declares into the ones the user must choose an
// instance for and the ones that have exactly one. An unknown code (a connector
// the platform doesn't ship) is treated as external: it needs an instance that
// doesn't exist, which is exactly the "forever unsatisfied" case. Used where
// there is no agent yet to ask a plan for (the creation wizard).
export function splitSkillConnectors(
  codes: string[],
  catalog: ConnectorCatalogEntry[] | undefined,
): { external: string[]; internal: string[] } {
  const external: string[] = [];
  const internal: string[] = [];
  for (const code of codes) {
    const entry = catalog?.find((c) => c.code === code);
    (entry && isInternalConnector(entry) ? internal : external).push(code);
  }
  return { external, internal };
}

// Defensive readers for a requirement record: a backend that predates keys
// answers with the code alone, and every list may be missing there.
export const requirementKey = (c: AgentSkillConnectorStatus) => c.key ?? c.connectorCode;
export const requirementMatches = (c: AgentSkillConnectorStatus) => c.matches ?? [];
export const requirementPolicies = (c: AgentSkillConnectorStatus) => c.policies ?? [];
export const requirementConflicts = (c: AgentSkillConnectorStatus) => c.policyConflicts ?? [];

// Requirement key → connection id ('' = nothing chosen). Only external
// requirements have an entry; an internal one has nothing to choose.
export type RequirementChoices = Record<string, string>;
// Connections created from inside the wizard, per requirement key. Held apart
// from `matches`: a refetched plan lists a new connection only when its
// identity fits, and the user may have changed the pre-filled address.
export type CreatedConnections = Record<string, ConnectionResponse[]>;

// What the select shows for one requirement before the user touched it: the
// instance the binding already points at, else the only candidate, else the
// only candidate already open to the agent — anything more is a guess between
// two accounts, which the backend refuses to make and so do we.
export function defaultChoice(c: AgentSkillConnectorStatus, created: CreatedConnections): string {
  if (c.connectionId) return c.connectionId;
  const own = created[requirementKey(c)] ?? [];
  if (own.length > 0) return own[own.length - 1].id;
  const matches = requirementMatches(c);
  if (matches.length === 1) return matches[0].connectionId;
  const bound = matches.filter((m) => m.boundToAgent);
  return bound.length === 1 ? bound[0].connectionId : '';
}

export function resolveChoice(
  c: AgentSkillConnectorStatus,
  choice: RequirementChoices,
  created: CreatedConnections,
): string {
  const key = requirementKey(c);
  return key in choice ? choice[key] : defaultChoice(c, created);
}

// Every external requirement has an instance named. Without one the backend
// refuses the binding rather than guessing, so the button stays disabled.
export function choicesComplete(
  connectors: AgentSkillConnectorStatus[],
  choice: RequirementChoices,
  created: CreatedConnections,
): boolean {
  return connectors.every((c) => c.internal || resolveChoice(c, choice, created) !== '');
}

// Steps two and three of the plan, minus the skill call itself: opens to the
// agent every instance the skill is about to point at, and answers the
// connections map (keyed by requirement key) the skill call takes. Internal
// connectors go by code — their single instance may not exist yet, and the
// backend materializes it. Sequential on purpose: these are a handful of
// requests and a partial failure should stop rather than fan out.
export async function openRequiredAccess(
  agentId: string,
  connectors: AgentSkillConnectorStatus[],
  choice: RequirementChoices,
  created: CreatedConnections,
): Promise<Record<string, string>> {
  const connections: Record<string, string> = {};
  const opened = new Set<string>();
  for (const c of connectors) {
    if (c.internal) {
      if (!c.satisfied && !opened.has(c.connectorCode)) {
        await apiService.bindAgentConnection(agentId, { connectorCode: c.connectorCode });
        opened.add(c.connectorCode);
      }
      continue;
    }
    const connectionId = resolveChoice(c, choice, created);
    if (!connectionId) continue;
    connections[requirementKey(c)] = connectionId;
    // A match says whether it is open already; a connection created here never
    // is; and the binding's current instance is, exactly when the row is
    // satisfied — even one that fits no match (a pre-identity binding).
    const bound =
      (connectionId === c.connectionId && c.satisfied) ||
      requirementMatches(c).some((m) => m.connectionId === connectionId && m.boundToAgent);
    if (!bound && !opened.has(connectionId)) {
      await apiService.bindAgentConnection(agentId, { connectionId });
      opened.add(connectionId);
    }
  }
  return connections;
}
