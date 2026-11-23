'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import apiService from '@/services/api';
import { AgentSkillResponse, ConnectionResponse, SkillResponse } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import { getErrorMessage } from '@/utils/error';
import { skillRequirements } from '@/utils/skill';
import { agentDetailOptions, useAgentSkillPlanQuery } from '@/queries/agents';
import { connectorCatalogOptions } from '@/queries/connectors';
import { connectorNameOf } from '@/utils/connector';
import SkillRequirementSteps from './SkillRequirementSteps';
import SkillPickerList from './SkillPickerList';
import ConnectionSkillList from './ConnectionSkillList';
import {
  choicesComplete,
  openRequiredAccess,
  withPreferredConnection,
  type CreatedConnections,
  type RequirementChoices,
} from './skillAccess';
import { Placeholder } from '@/components/ui/Placeholder';

// The connector behind the "team agents" skill — handing work to another agent
// of the same team. An agent outside a team can hold the skill but has nobody
// to hand anything to, and nothing in the binding says so: the code is what
// tells the skill apart, the skill's own name is the author's to change.
const TEAM_AGENTS_CODE = 'agents';

interface AddAgentSkillModalProps {
  agentId: string;
  // The bindings themselves: a bound skill is re-pointed, not refused.
  boundSkills: AgentSkillResponse[];
  // Still loading — the footer waits, so an unknown binding cannot 409.
  boundSkillsPending?: boolean;
  // The bindings could not be read: same gate, and the reason is shown.
  boundSkillsError?: string | null;
  // Opened from a connection row: the list narrows to skills that fit it, and
  // the fitting requirement is prefilled with it.
  connection?: { id: string; label: string };
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddAgentSkillModal({
  agentId,
  boundSkills,
  boundSkillsPending = false,
  boundSkillsError = null,
  connection,
  onClose,
  onSuccess,
}: AddAgentSkillModalProps) {
  const t = useTranslations('Agents');
  const tCommon = useTranslations('Common');

  const [selectedSkill, setSelectedSkill] = useState<SkillResponse | null>(null);

  const boundSkillIds = useMemo(
    () => new Set(boundSkills.map((b) => b.skillId)),
    [boundSkills],
  );
  const skillLocked = selectedSkill
    ? boundSkills.find((b) => b.skillId === selectedSkill.id)
    : undefined;

  // Which instance the skill will work with, per requirement key, and the
  // connections created from inside the wizard. Reset with the selection: the
  // keys belong to the skill, not to the modal.
  const [choice, setChoice] = useState<RequirementChoices>({});
  const [created, setCreated] = useState<CreatedConnections>({});

  const pickSkill = (skill: SkillResponse | null) => {
    setSelectedSkill(skill);
    setChoice({});
    setCreated({});
  };

  const { data: catalog } = useQuery(connectorCatalogOptions());
  // Cached by the agent's own pages, which this modal always opens from.
  const { data: agent } = useQuery(agentDetailOptions(agentId));
  const connectorName = (code: string) => connectorNameOf(catalog, code);

  // The plan is the backend's reading of the skill against this agent: what
  // fits, what is missing, and the rules that will be written.
  const { data: plan, isPending: planPending, error: planError } = useAgentSkillPlanQuery(
    agentId,
    selectedSkill?.id ?? null,
  );

  // The plan is not suspense — on the render that follows a pick it is undefined.
  const effectiveChoice = plan
    ? withPreferredConnection(plan.connectors, choice, connection?.id)
    : choice;

  const { loading, error, handleSubmit } = useAsyncForm<void>({
    onSuccess,
    defaultError: 'Failed to bind skill',
  });

  const onSubmit = (e: React.SyntheticEvent) =>
    handleSubmit(e, async () => {
      if (!selectedSkill || !plan) return;
      // Connections first: a skill may only point at what the agent can reach,
      // and the rules are written on the binding at the last step.
      const connections = await openRequiredAccess(
        agentId,
        plan.connectors,
        effectiveChoice,
        created,
      );
      if (skillLocked) {
        // The skill exists and points elsewhere — move it, don't bind it twice.
        await apiService.updateAgentSkillConnections(agentId, skillLocked.skillId, connections);
      } else {
        await apiService.bindAgentSkill(agentId, {
          skillId: selectedSkill.id,
          connections: Object.keys(connections).length > 0 ? connections : undefined,
        });
      }
    });

  // Every external requirement needs an instance: without one the backend
  // refuses the binding rather than guessing between two accounts.
  const incomplete = !plan || !choicesComplete(plan.connectors, effectiveChoice, created);

  // Binding is allowed and does nothing: the agent would get a skill whose
  // whole subject is the colleagues it doesn't have. A note rather than a
  // refusal — the team can be given to it right after.
  const teamlessTeamSkill =
    !!selectedSkill &&
    !agent?.agenticTeamId &&
    skillRequirements(selectedSkill).some((r) => r.code === TEAM_AGENTS_CODE);



  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={connection ? t('pickSkillForConnection', { label: connection.label }) : t('addSkill')}
      size="lg"
    >
      {/* Not a <form>: the inline connection form of a step is one, and a form
          nested in a form submits both — Enter or "Create" in the inner one
          would also fire the binding. The one button below is the only submit. */}
      <div className="space-y-4">
        {connection && <p className="text-sm text-muted">{t('pickSkillForConnectionHint')}</p>}
        {connection && boundSkillsError && <ErrorAlert>{boundSkillsError}</ErrorAlert>}

        {connection ? (
          <ConnectionSkillList
            connectionId={connection.id}
            boundSkillIds={boundSkillIds}
            selectedSkillId={selectedSkill?.id ?? null}
            connectorName={connectorName}
            onPick={pickSkill}
          />
        ) : (
          <SkillPickerList
            boundSkillIds={boundSkillIds}
            selectedSkillId={selectedSkill?.id ?? null}
            connectorName={connectorName}
            onPick={pickSkill}
            onSourceChange={() => pickSkill(null)}
          />
        )}

        {/* The plan — the skill cannot be bound without its instances, so the
            steps sit in the same modal rather than behind a second screen. */}
        {selectedSkill && (
          <div className="space-y-3 rounded-lg border border-border p-3">
            <p className="text-sm font-medium text-foreground">
              {t('skillConnectionsSubtitle', { skill: selectedSkill.title })}
            </p>
            {teamlessTeamSkill && <Alert variant="warning">{t('teamSkillNeedsTeam')}</Alert>}
            {planError ? (
              <ErrorAlert>{getErrorMessage(planError, t('skillPlanLoadError'))}</ErrorAlert>
            ) : planPending || !plan ? (
              <Placeholder size="sm">{t('skillPlanLoading')}</Placeholder>
            ) : (
              <SkillRequirementSteps
                connectors={plan.connectors}
                choice={effectiveChoice}
                onChoice={(key, id) => setChoice((prev) => ({ ...prev, [key]: id }))}
                created={created}
                onCreated={(key, connection: ConnectionResponse) =>
                  setCreated((prev) => ({ ...prev, [key]: [...(prev[key] ?? []), connection] }))
                }
                disabled={loading}
              />
            )}
          </div>
        )}

        {error && <ErrorAlert>{error}</ErrorAlert>}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
            className="flex-1"
          >
            {tCommon('cancel')}
          </Button>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={loading || !selectedSkill || incomplete || boundSkillsPending || !!boundSkillsError}
            loading={loading}
            className="flex-1"
          >
            {skillLocked ? t('changeConnection') : t('addSkill')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
