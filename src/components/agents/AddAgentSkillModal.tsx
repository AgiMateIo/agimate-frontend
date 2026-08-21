'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQueries } from '@tanstack/react-query';
import apiService from '@/services/api';
import { SkillResponse } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Chip } from '@/components/ui/Chip';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { FormField, Select } from '@/components/ui/FormField';
import { Link } from '@/i18n/navigation';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { getErrorMessage } from '@/utils/error';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { SearchToolbar } from '@/components/ui/SearchToolbar';
import { agentConnectionsOptions } from '@/queries/agents';
import { connectionsListOptions } from '@/queries/connections';
import { connectorCatalogOptions } from '@/queries/connectors';
import { useSkillsListQuery } from '@/queries/skills';
import { openAgentAccess, splitSkillConnectors } from './skillAccess';

const PAGE_SIZE = 10;

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

  const [source, setSource] = useState<'my' | 'public'>('my');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [page, setPage] = useState(0);
  const [selectedSkill, setSelectedSkill] = useState<SkillResponse | null>(null);

  // Which instance the skill will work with, per external connector it declares.
  // Reset with the selection: the codes belong to the skill, not to the modal.
  const [choice, setChoice] = useState<Record<string, string>>({});

  const {
    data: pagedData,
    isPending: skillsLoading,
    error: skillsError,
  } = useSkillsListQuery(source, debouncedSearch, page, PAGE_SIZE);

  // Paging and the selection are reset where the change happens rather than in
  // an effect watching `source`/`search` — the selected skill and its connector
  // choices belong to one source, so they die with the switch that caused it.
  const changeSource = (next: 'my' | 'public') => {
    setSource(next);
    setPage(0);
    setSelectedSkill(null);
    setChoice({});
  };

  const changeSearch = (value: string) => {
    setSearch(value);
    setPage(0);
  };

  const [
    { data: userConnections },
    { data: agentConnections, isPending: agentConnectionsPending },
    { data: catalog },
  ] = useQueries({
    queries: [connectionsListOptions(), agentConnectionsOptions(agentId), connectorCatalogOptions()],
  });

  const { external, internal } = useMemo(
    () => splitSkillConnectors(selectedSkill?.connectorCodes ?? [], catalog),
    [selectedSkill, catalog],
  );
  const connectorName = (code: string) => catalog?.find((c) => c.code === code)?.name ?? code;
  const instancesOf = (code: string) =>
    (userConnections ?? []).filter((c) => c.connectorCode === code);

  const openIds = useMemo(
    () => new Set((agentConnections ?? []).map((c) => c.connectionId)),
    [agentConnections],
  );
  const openCodes = useMemo(
    () => new Set((agentConnections ?? []).map((c) => c.connectorCode)),
    [agentConnections],
  );

  const pickSkill = (skill: SkillResponse) => {
    setSelectedSkill(skill);
    // One instance of a connector is not a choice — preselect it, so the common
    // case stays a single click.
    const codes = splitSkillConnectors(skill.connectorCodes, catalog).external;
    setChoice(
      Object.fromEntries(
        codes.map((code) => {
          const instances = (userConnections ?? []).filter((c) => c.connectorCode === code);
          return [code, instances.length === 1 ? instances[0].id : ''];
        }),
      ),
    );
  };

  const { loading, error, handleSubmit } = useAsyncForm<void>({
    onSuccess,
    defaultError: 'Failed to bind skill',
  });

  const onSubmit = (e: React.FormEvent) =>
    handleSubmit(e, async () => {
      if (!selectedSkill) return;
      // Rebuilt from the external list rather than sent as collected: the split
      // depends on the connector catalog, and a code picked while it was still
      // loading could have landed in `choice` as external by mistake. Internal
      // codes must be left out — their instance is not the caller's to name.
      const connections = Object.fromEntries(
        external.map((code) => [code, choice[code]]).filter(([, id]) => !!id),
      );
      // Connections first: a skill may only point at what the agent can reach.
      await openAgentAccess(agentId, {
        connectionIds: Object.values(connections),
        connectorCodes: internal,
        openConnectionIds: openIds,
        openConnectorCodes: openCodes,
      });
      await apiService.bindAgentSkill(agentId, {
        skillId: selectedSkill.id,
        connections: Object.keys(connections).length > 0 ? connections : undefined,
      });
    });

  // Every external connector needs an instance: without one the backend refuses
  // the binding rather than guessing between two accounts. And until the agent's
  // own connections are known, opening one would re-open what is already open.
  const incomplete = external.some((code) => !choice[code]) || agentConnectionsPending;

  const skills = pagedData?.content ?? [];
  const totalElements = pagedData?.totalElements ?? 0;
  const totalPages = pagedData?.totalPages ?? 0;

  return (
    <Modal isOpen={true} onClose={onClose} title={t('addSkill')} size="lg">
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Source toggle: own skills vs the public catalogue (incl. system skills) */}
        <div className="inline-flex rounded-lg bg-surface-secondary p-1 gap-1">
          {(['my', 'public'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => changeSource(key)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                source === key
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              {key === 'my' ? t('skillsMine') : t('skillsPublic')}
            </button>
          ))}
        </div>

        {/* Search */}
        <SearchToolbar
          value={search}
          onChange={changeSearch}
          placeholder={t('searchSkills')}
          size="sm"
        />

        {/* Skills list */}
        <div className="min-h-[280px]">
          {skillsLoading ? (
            <div className="text-center py-12 text-muted text-sm">{t('loadingSkills')}</div>
          ) : skillsError ? (
            <ErrorAlert>{getErrorMessage(skillsError, 'Failed to load skills')}</ErrorAlert>
          ) : skills.length === 0 ? (
            <div className="text-center py-12 text-muted text-sm">{t('noSkillsFound')}</div>
          ) : (
            <div className="space-y-1">
              {skills.map((skill) => {
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
                    {skill.connectorCodes.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {skill.connectorCodes.map((code) => (
                          <Chip key={code} strong tone="accent">{code}</Chip>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-end gap-3 text-xs text-muted">
            <span>
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalElements)} / {totalElements}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 0}
                className="p-1 rounded hover:bg-surface-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages - 1}
                className="p-1 rounded hover:bg-surface-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Instance selection — the skill cannot be bound without it, so it sits
            in the same modal rather than behind a second step. */}
        {selectedSkill && (external.length > 0 || internal.length > 0) && (
          <div className="space-y-3 rounded-lg border border-border p-3">
            <p className="text-sm font-medium text-foreground">
              {t('skillConnectionsSubtitle', { skill: selectedSkill.title })}
            </p>

            {external.map((code) => {
              const instances = instancesOf(code);
              return (
                <FormField key={code} label={connectorName(code)} required>
                  {instances.length === 0 ? (
                    <Alert variant="warning">
                      {t('skillConnectorNoInstance', { name: connectorName(code) })}{' '}
                      <Link href="/dashboard/connections" className="underline">
                        {t('skillConnectorConnectLink')}
                      </Link>
                    </Alert>
                  ) : (
                    <Select
                      value={choice[code] ?? ''}
                      onChange={(e) => setChoice((prev) => ({ ...prev, [code]: e.target.value }))}
                    >
                      <option value="">{t('skillConnectorNotChosen')}</option>
                      {instances.map((instance) => (
                        <option key={instance.id} value={instance.id}>
                          {instance.name || instance.fullCode}
                          {openIds.has(instance.id) ? '' : ` — ${t('skillConnectorWillOpen')}`}
                        </option>
                      ))}
                    </Select>
                  )}
                </FormField>
              );
            })}

            {internal.length > 0 && (
              <div>
                <p className="text-sm font-medium text-foreground mb-2">
                  {t('skillConnectorsInternal')}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {internal.map((code) => (
                    <Chip key={code} tone={openCodes.has(code) ? 'success' : 'accent'}>
                      {connectorName(code)}
                    </Chip>
                  ))}
                </div>
                <p className="text-xs text-muted mt-1.5">{t('skillConnectorsInternalHint')}</p>
              </div>
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
            type="submit"
            disabled={loading || !selectedSkill || incomplete}
            loading={loading}
            className="flex-1"
          >
            {t('addSkill')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
