'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Chip } from '@/components/ui/Chip';
import apiService from '@/services/api';
import { useAgentsPickerQuery } from '@/queries/agents';
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

const PAGE_SIZE = 10;

interface AddSkillAgentModalProps {
  skillId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddSkillAgentModal({ skillId, onClose, onSuccess }: AddSkillAgentModalProps) {
  const t = useTranslations('SkillAgents');
  const tCommon = useTranslations('Common');

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [page, setPage] = useState(0);
  const [selectedAgent, setSelectedAgent] = useState<AgentResponse | null>(null);

  const {
    data: pagedData,
    isPending: agentsLoading,
    error: agentsError,
  } = useAgentsPickerQuery(debouncedSearch, page, PAGE_SIZE);

  // Paging resets where the search changes, not in an effect watching it.
  const changeSearch = (value: string) => {
    setSearch(value);
    setPage(0);
  };

  const { loading, error, handleSubmit } = useAsyncForm<void>({
    onSuccess,
    defaultError: 'Failed to bind skill',
  });

  const onSubmit = (e: React.FormEvent) =>
    handleSubmit(e, async () => {
      if (!selectedAgent) return;
      await apiService.bindAgentSkill(selectedAgent.id, { skillId: skillId });
    });

  const agents = pagedData?.content ?? [];
  const totalElements = pagedData?.totalElements ?? 0;
  const totalPages = pagedData?.totalPages ?? 0;

  return (
    <Modal isOpen={true} onClose={onClose} title={t('addAgent')} size="lg">
      <form onSubmit={onSubmit} className="space-y-4">
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
                    onClick={() => !isBound && setSelectedAgent(agent)}
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
            type="submit"
            disabled={loading || !selectedAgent}
            loading={loading}
            className="flex-1"
          >
            {t('addAgent')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
