import apiService from '@/services/api';
import { isInternalConnector } from '@/utils/connector';
import { skillRequirements } from '@/utils/skill';
import { splitSkillConnectors } from '@/components/agents/skillAccess';
import type { AgentCreatedResponse, ConnectorCatalogEntry, SkillConnectorRequirement } from '@/types';
import type { WizardData, WizardFailure } from './AgentWizard';

// The single write of the wizard is no longer single: a skill only reaches the
// agent when its connectors are open to that agent, and neither an opening nor
// an instance choice can travel inside the create call. So: create, open, bind —
// in that order, because a skill may only point at what the agent can reach.

export interface WizardCreationResult {
  created: AgentCreatedResponse;
  // The agent exists by the time these happen, so a failure is a to-do on its
  // page rather than a failed creation.
  failedConnections: WizardFailure[];
  failedSkills: WizardFailure[];
}

// Internal connectors the chosen skills need. They have one instance per user
// and no instance to choose, but they still have to be opened — an unopened one
// leaves the skill red exactly like a missing telegram.
export function internalCodesFor(
  data: WizardData,
  catalog: ConnectorCatalogEntry[] | undefined,
): string[] {
  const codes = new Set([
    ...data.presetConnectorCodes,
    ...data.skills.flatMap((s) => s.connectorCodes ?? []),
  ]);
  return [...codes].filter((code) => {
    const entry = catalog?.find((c) => c.code === code);
    return !!entry && isInternalConnector(entry);
  });
}

// The open connections that fit one requirement. There is no agent yet to ask
// a plan for, so the identity match is done here the way the backend does it:
// a requirement naming an MCP address fits the connection whose `subCode` is
// that address, and a requirement without one fits every instance of the code.
export function fittingConnections(data: WizardData, requirement: SkillConnectorRequirement) {
  const ofCode = data.connections.filter((c) => c.connectorCode === requirement.code);
  const identity = requirement.params?.url;
  if (!identity) return ofCode;
  const same = ofCode.filter((c) => c.subCode === identity);
  return same.length > 0 ? same : ofCode;
}

// Which instance a picked skill will use for one of its external requirements.
// Resolved at the moment it is needed rather than stored at pick time: the user
// can walk back to the connections step and swap instances, and a choice that
// points at a connection no longer open to the agent is no choice at all. With
// exactly one fitting connection there is nothing to ask about.
export function resolveSkillConnection(
  data: WizardData,
  skillId: string,
  requirement: SkillConnectorRequirement,
): string {
  const fitting = fittingConnections(data, requirement);
  const chosen = data.skillConnections[skillId]?.[requirement.key ?? requirement.code];
  if (chosen && fitting.some((c) => c.id === chosen)) return chosen;
  return fitting.length === 1 ? fitting[0].id : '';
}

// The requirements of a picked skill the user must name an instance for.
export function externalRequirements(
  skill: { connectors?: SkillConnectorRequirement[]; connectorCodes?: string[] },
  catalog: ConnectorCatalogEntry[] | undefined,
): SkillConnectorRequirement[] {
  const requirements = skillRequirements({
    connectorCodes: skill.connectorCodes ?? [],
    connectors: skill.connectors,
  });
  return requirements.filter(
    (r) => splitSkillConnectors([r.code], catalog).external.length > 0,
  );
}

export async function createAgentFromWizard(
  data: WizardData,
  teamId: string | null,
  catalog: ConnectorCatalogEntry[] | undefined,
): Promise<WizardCreationResult> {
  const internalCodes = internalCodesFor(data, catalog);
  // Preset skills keep riding along with the create call: their requirements
  // never reach the frontend, so there is nothing to map them by. Skills the
  // user picked from the library do carry theirs and get an explicit binding
  // with the instance chosen for each, keyed by requirement key.
  const presetSkills = data.skills.filter((s) => s.fromPreset);
  const pickedSkills = data.skills.filter((s) => !s.fromPreset);

  const created = await apiService.createAgent({
    name: data.name.trim(),
    description: data.description.trim() || undefined,
    instructions: data.instructions.trim() || undefined,
    type: data.agentType ?? 'GENERIC',
    webhookUrl: data.agentType === 'WEBHOOK' ? data.webhookUrl.trim() : undefined,
    agenticTeamId: teamId || null,
    skillIds: presetSkills.map((s) => s.id),
    presetName: data.presetName ?? undefined,
  });
  const agentId = created.agent.id;

  const failedConnections: WizardFailure[] = [];
  for (const connection of data.connections) {
    try {
      await apiService.bindAgentConnection(agentId, { connectionId: connection.id });
    } catch {
      failedConnections.push({ id: connection.id, name: connection.name || connection.fullCode });
    }
  }
  for (const connectorCode of internalCodes) {
    try {
      await apiService.bindAgentConnection(agentId, { connectorCode });
    } catch {
      failedConnections.push({ id: connectorCode, name: connectorCode });
    }
  }

  const failedSkills: WizardFailure[] = [];
  for (const skill of pickedSkills) {
    try {
      const connections: Record<string, string> = {};
      for (const requirement of externalRequirements(skill, catalog)) {
        const connectionId = resolveSkillConnection(data, skill.id, requirement);
        if (connectionId) connections[requirement.key ?? requirement.code] = connectionId;
      }
      await apiService.bindAgentSkill(agentId, {
        skillId: skill.id,
        connections: Object.keys(connections).length > 0 ? connections : undefined,
      });
    } catch {
      failedSkills.push({ id: skill.id, name: skill.title });
    }
  }

  return { created, failedConnections, failedSkills };
}
