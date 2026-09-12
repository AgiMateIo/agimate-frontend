'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Chip } from '@/components/ui/Chip';
import apiService from '@/services/api';
import { agentSkillPlanOptions, useAgentsPickerQuery } from '@/queries/agents';
import { AgentResponse } from '@/types';
import { getErrorMessage } from '@/utils/error';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import { SearchToolbar } from '@/components/ui/SearchToolbar';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { Placeholder } from '@/components/ui/Placeholder';
import { Pagination } from '@/components/ui/Pagination';
import SkillRequirementSteps from '@/components/agents/SkillRequirementSteps';
import {
  choicesComplete,
  openRequiredAccess,
  type CreatedConnections,
  type RequirementChoices,
} from '@/components/agents/skillAccess';

const PAGE_SIZE = 10;

interface AddSkillAgentModalProps {
  skillId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddSkillAgentModal({ skillId, onClose, onSuccess }: AddSkillAgentModalProps) {
  const t = useTranslations('SkillAgents');
  const tAgents = useTranslations('Agents');
  const tCommon = useTranslations('Common');

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [page, setPage] = useState(0);
  const [selectedAgent, setSelectedAgent] = useState<AgentResponse | null>(null);
  // The instances the skill will use on that agent, per requirement key, and
  // the connections created on the way. Reset with the agent: what fits one
  // agent says nothing about another.
  const [choice, setChoice] = useState<RequirementChoices>({});
  const [created, setCreated] = useState<CreatedConnections>({});

  const {
    data: pagedData,
    isPending: agentsLoading,
    error: agentsError,
  } = useAgentsPickerQuery(debouncedSearch, page, PAGE_SIZE);

  // Same plan as the agent side asks for: the skill's requirements read
  // against the chosen agent. Binding without it 400s on any external one.
  const { data: plan, isPending: planPending, error: planError } = useQuery({
    ...agentSkillPlanOptions(selectedAgent?.id ?? '', skillId),
    enabled: !!selectedAgent,
  });

  // Paging resets where the search changes, not in an effect watching it.
  const changeSearch = (value: string) => {
    setSearch(value);
    setPage(0);
  };

  const pickAgent = (agent: AgentResponse) => {
    setSelectedAgent(agent);
    setChoice({});
    setCreated({});
  };

  const { loading, error, handleSubmit } = useAsyncForm<void>({
    onSuccess,
    defaultError: 'Failed to bind skill',
  });

  const onSubmit = (e: React.SyntheticEvent) =>
    handleSubmit(e, async () => {
      if (!selectedAgent || !plan) return;
      const connections = await openRequiredAccess(selectedAgent.id, plan.connectors, choice, created);
      await apiService.bindAgentSkill(selectedAgent.id, {
        skillId,
        connections: Object.keys(connections).length > 0 ? connections : undefined,
      });
    });

  const incomplete = !plan || !choicesComplete(plan.connectors, choice, created);


  const agents = pagedData?.content ?? [];
  const totalElements = pagedData?.totalElements ?? 0;
  const totalPages = pagedData?.totalPages ?? 0;

  return (
    <Modal isOpen={true} onClose={onClose} title={t('addAgent')} size="lg">
      {/* Not a <form>: the inline connection form of a step is one, and a form
          nested in a form submits both — Enter or "Create" in the inner one
          would also fire the binding. The one button below is the only submit. */}
      <div className="space-y-4">
        {/* Search */}
        <SearchToolbar
          value={search}
          onChange={changeSearch}
          placeholder={t('searchAgents')}
          size="sm"
        />

        {/* Agents list */}
        <div className="min-h-[280px]">
          {agentsLoading ? (
            <Placeholder size="sm">{t('loading')}</Placeholder>
          ) : agentsError ? (
            <ErrorAlert>{getErrorMessage(agentsError, 'Failed to load agents')}</ErrorAlert>
          ) : agents.length === 0 ? (
            <Placeholder size="sm">{t('noAgentsFound')}</Placeholder>
          ) : (
            <div className="space-y-1">
              {agents.map((agent) => {
                const isBound = agent.skills.some(s => s.id === skillId);
                return (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => !isBound && pickAgent(agent)}
                    disabled={isBound}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                      isBound
                        ? 'border-transparent opacity-50 cursor-not-allowed'
                        : selectedAgent?.id === agent.id
                          ? 'border-accent bg-accent/5'
                          : 'border-transparent hover:bg-surface-secondary'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">{agent.name}</span>
                      {!agent.enabled && (
                        <Chip strong tone="muted">{t('disabled')}</Chip>
                      )}
                      {isBound && (
                        <span className="text-xs text-muted">({t('alreadyBound')})</span>
                      )}
                    </div>
                    {agent.description && (
                      <p className="text-xs text-muted mt-0.5 line-clamp-1">{agent.description}</p>
                    )}
                    {agent.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {agent.skills.map((skill) => (
                          <span
                            key={skill.id}
                            className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium border ${
                              skill.id === skillId
                                ? 'bg-accent/10 border-accent text-accent'
                                : 'bg-surface border-border text-muted'
                            }`}
                            title={skill.name}
                          >
                            {skill.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          totalElements={totalElements}
          totalPages={totalPages}
          onPageChange={setPage}
        />

        {/* What the skill needs on that agent — same steps as on the agent's
            own skills tab, so the two doors lead into one room. */}
        {selectedAgent && (
          <div className="space-y-3 rounded-lg border border-border p-3">
            <p className="text-sm font-medium text-foreground">
              {t('planTitle', { agent: selectedAgent.name })}
            </p>
            {planError ? (
              <ErrorAlert>{getErrorMessage(planError, tAgents('skillPlanLoadError'))}</ErrorAlert>
            ) : planPending || !plan ? (
              <Placeholder size="sm">{tAgents('skillPlanLoading')}</Placeholder>
            ) : (
              <SkillRequirementSteps
                connectors={plan.connectors}
                choice={choice}
                onChoice={(key, id) => setChoice((prev) => ({ ...prev, [key]: id }))}
                created={created}
                onCreated={(key, connection) =>
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
            disabled={loading || !selectedAgent || incomplete}
            loading={loading}
            className="flex-1"
          >
            {t('addAgent')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
