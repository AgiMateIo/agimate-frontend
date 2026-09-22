'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import apiService from '@/services/api';
import { ConnectionResponse, SkillResponse } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Chip } from '@/components/ui/Chip';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import { getErrorMessage } from '@/utils/error';
import { skillRequirements } from '@/utils/skill';
import { agentDetailOptions, useAgentSkillPlanQuery } from '@/queries/agents';
import { connectorCatalogOptions } from '@/queries/connectors';
import { connectorNameOf } from '@/utils/connector';
import { useSkillPickerQuery } from '@/queries/skills';
import SkillRequirementChips from '@/components/skills/SkillRequirementChips';
import {
  SkillCatalogToolbar,
  SkillListTail,
  useRevealedRows,
  useSkillCatalogFilters,
} from '@/components/skills/SkillCatalogToolbar';
import SkillRequirementSteps from './SkillRequirementSteps';
import {
  choicesComplete,
  openRequiredAccess,
  type CreatedConnections,
  type RequirementChoices,
} from './skillAccess';
import { Placeholder } from '@/components/ui/Placeholder';

// Rows revealed at once; "show more" grows the list in place. Both scopes are
// merged client-side, so there is no server page to walk (see the query module).
const CHUNK = 8;

// The connector behind the "team agents" skill — handing work to another agent
// of the same team. An agent outside a team can hold the skill but has nobody
// to hand anything to, and nothing in the binding says so: the code is what
// tells the skill apart, the skill's own name is the author's to change.
const TEAM_AGENTS_CODE = 'agents';

interface AddAgentSkillModalProps {
  agentId: string;
  boundSkillIds: Set<string>;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddAgentSkillModal({ agentId, boundSkillIds, onClose, onSuccess }: AddAgentSkillModalProps) {
  const t = useTranslations('Agents');
  const tCommon = useTranslations('Common');
  const tSkills = useTranslations('Skills');

  const [selectedSkill, setSelectedSkill] = useState<SkillResponse | null>(null);

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

  // The selection is dropped where the source changes rather than in an effect
  // watching it — the selected skill and its choices belong to one source, so
  // they die with the switch that caused it.
  const catalogFilters = useSkillCatalogFilters({ onSourceChange: () => pickSkill(null) });

  const {
    skills,
    isPending: skillsLoading,
    error: skillsError,
    truncated,
  } = useSkillPickerQuery(catalogFilters.source, catalogFilters.debouncedSearch, catalogFilters.filters);

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

  const { visible, revealMore } = useRevealedRows(catalogFilters.listKey, CHUNK);

  const { loading, error, handleSubmit } = useAsyncForm<void>({
    onSuccess,
    defaultError: 'Failed to bind skill',
  });

  const onSubmit = (e: React.SyntheticEvent) =>
    handleSubmit(e, async () => {
      if (!selectedSkill || !plan) return;
      // Connections first: a skill may only point at what the agent can reach,
      // and the rules are written on the binding at the last step.
      const connections = await openRequiredAccess(agentId, plan.connectors, choice, created);
      await apiService.bindAgentSkill(agentId, {
        skillId: selectedSkill.id,
        connections: Object.keys(connections).length > 0 ? connections : undefined,
      });
    });

  // Every external requirement needs an instance: without one the backend
  // refuses the binding rather than guessing between two accounts.
  const incomplete = !plan || !choicesComplete(plan.connectors, choice, created);

  // Binding is allowed and does nothing: the agent would get a skill whose
  // whole subject is the colleagues it doesn't have. A note rather than a
  // refusal — the team can be given to it right after.
  const teamlessTeamSkill =
    !!selectedSkill &&
    !agent?.agenticTeamId &&
    skillRequirements(selectedSkill).some((r) => r.code === TEAM_AGENTS_CODE);


  const shown = skills.slice(0, visible);

  return (
    <Modal isOpen={true} onClose={onClose} title={t('addSkill')} size="lg">
      {/* Not a <form>: the inline connection form of a step is one, and a form
          nested in a form submits both — Enter or "Create" in the inner one
          would also fire the binding. The one button below is the only submit. */}
      <div className="space-y-4">
        {/* Same toolbar as the Skills page: source and tags behind the funnel,
            the catalog's sections in the open. */}
        <SkillCatalogToolbar state={catalogFilters} placeholder={t('searchSkills')} size="sm" />

        {/* Skills list */}
        <div className="min-h-[280px]">
          {skillsLoading ? (
            <Placeholder size="sm">{t('loadingSkills')}</Placeholder>
          ) : skillsError ? (
            <ErrorAlert>{getErrorMessage(skillsError, 'Failed to load skills')}</ErrorAlert>
          ) : skills.length === 0 ? (
            <Placeholder size="sm">{t('noSkillsFound')}</Placeholder>
          ) : (
            <div className="space-y-1">
              {shown.map((skill) => {
                const isBound = boundSkillIds.has(skill.id);
                return (
                  <button
                    key={skill.id}
                    type="button"
                    onClick={() => !isBound && pickSkill(skill)}
                    disabled={isBound}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                      isBound
                        ? 'border-transparent opacity-50 cursor-not-allowed'
                        : selectedSkill?.id === skill.id
                          ? 'border-accent bg-accent/5'
                          : 'border-transparent hover:bg-surface-secondary'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{skill.title}</span>
                      <span className="text-xs text-muted">v{skill.version}</span>
                      {skill.isPublic && (
                        <Chip strong tone="success">{tSkills('public')}</Chip>
                      )}
                      {isBound && (
                        <span className="text-xs text-muted">({t('alreadyBound')})</span>
                      )}
                    </div>
                    {skill.description && (
                      <p className="text-xs text-muted mt-0.5 line-clamp-1">{skill.description}</p>
                    )}
                    <div className="mt-1">
                      <SkillRequirementChips requirements={skillRequirements(skill)} nameOf={connectorName} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <SkillListTail total={skills.length} visible={visible} truncated={truncated} onMore={revealMore} />

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
                choice={choice}
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
            disabled={loading || !selectedSkill || incomplete}
            loading={loading}
            className="flex-1"
          >
            {t('addSkill')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
