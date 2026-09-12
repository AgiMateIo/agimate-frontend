'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import apiService from '@/services/api';
import { ConnectionResponse, SkillResponse } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { getErrorMessage } from '@/utils/error';
import { skillRequirements } from '@/utils/skill';
import { SearchToolbar } from '@/components/ui/SearchToolbar';
import { FilterPill, FilterRow } from '@/components/ui/FilterPill';
import { useAgentSkillPlanQuery } from '@/queries/agents';
import { connectorCatalogOptions } from '@/queries/connectors';
import { useSkillPickerQuery, type SkillPickerSource } from '@/queries/skills';
import SkillRequirementChips from '@/components/skills/SkillRequirementChips';
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

const SOURCES: SkillPickerSource[] = ['all', 'my', 'public'];

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

  const [source, setSource] = useState<SkillPickerSource>('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [selectedSkill, setSelectedSkill] = useState<SkillResponse | null>(null);

  // Which instance the skill will work with, per requirement key, and the
  // connections created from inside the wizard. Reset with the selection: the
  // keys belong to the skill, not to the modal.
  const [choice, setChoice] = useState<RequirementChoices>({});
  const [created, setCreated] = useState<CreatedConnections>({});

  const {
    skills,
    isPending: skillsLoading,
    error: skillsError,
    truncated,
  } = useSkillPickerQuery(source, debouncedSearch);

  const { data: catalog } = useQuery(connectorCatalogOptions());
  const connectorName = (code: string) => catalog?.find((c) => c.code === code)?.name ?? code;

  // The plan is the backend's reading of the skill against this agent: what
  // fits, what is missing, and the rules that will be written.
  const { data: plan, isPending: planPending, error: planError } = useAgentSkillPlanQuery(
    agentId,
    selectedSkill?.id ?? null,
  );

  // How many rows are revealed, tied to the list it was counted for: a new
  // search or source collapses back to one chunk without an effect.
  const listKey = `${source}:${debouncedSearch}`;
  const [reveal, setReveal] = useState({ key: listKey, count: CHUNK });
  const visible = reveal.key === listKey ? reveal.count : CHUNK;

  const pickSkill = (skill: SkillResponse | null) => {
    setSelectedSkill(skill);
    setChoice({});
    setCreated({});
  };

  // The selection is dropped where the source changes rather than in an effect
  // watching it — the selected skill and its choices belong to one source, so
  // they die with the switch that caused it.
  const changeSource = (next: SkillPickerSource) => {
    setSource(next);
    pickSkill(null);
  };

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


  const shown = skills.slice(0, visible);

  return (
    <Modal isOpen={true} onClose={onClose} title={t('addSkill')} size="lg">
      {/* Not a <form>: the inline connection form of a step is one, and a form
          nested in a form submits both — Enter or "Create" in the inner one
          would also fire the binding. The one button below is the only submit. */}
      <div className="space-y-4">
        {/* Search, with the source (own skills vs the public catalogue, incl.
            system skills) folded behind the funnel — same as the Skills page. */}
        <SearchToolbar
          value={search}
          onChange={setSearch}
          placeholder={t('searchSkills')}
          size="sm"
          filtersActive={source !== 'all'}
          filters={
            <FilterRow label={tSkills('sourceLabel')}>
              {SOURCES.map((key) => (
                <FilterPill
                  key={key}
                  active={source === key}
                  onClick={() => changeSource(key)}
                >
                  {tSkills(`source_${key}`)}
                </FilterPill>
              ))}
            </FilterRow>
          }
        />

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

        {visible < skills.length && (
          <button
            type="button"
            onClick={() => setReveal({ key: listKey, count: visible + CHUNK })}
            className="w-full rounded-lg border border-dashed border-border py-2 text-sm font-medium text-muted transition-colors hover:border-accent/50 hover:text-foreground"
          >
            {tSkills('showMore', { count: skills.length - visible })}
          </button>
        )}

        {truncated && visible >= skills.length && (
          <p className="pt-1 text-center text-xs text-muted">{tSkills('refineSearch')}</p>
        )}

        {/* The plan — the skill cannot be bound without its instances, so the
            steps sit in the same modal rather than behind a second screen. */}
        {selectedSkill && (
          <div className="space-y-3 rounded-lg border border-border p-3">
            <p className="text-sm font-medium text-foreground">
              {t('skillConnectionsSubtitle', { skill: selectedSkill.title })}
            </p>
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
