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
import { SearchToolbar } from '@/components/ui/SearchToolbar';
import { FilterPill, FilterRow } from '@/components/ui/FilterPill';
import { agentConnectionsOptions } from '@/queries/agents';
import { connectionsListOptions } from '@/queries/connections';
import { connectorCatalogOptions } from '@/queries/connectors';
import { useSkillPickerQuery, type SkillPickerSource } from '@/queries/skills';
import { openAgentAccess, splitSkillConnectors } from './skillAccess';
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

  // Which instance the skill will work with, per external connector it declares.
  // Reset with the selection: the codes belong to the skill, not to the modal.
  const [choice, setChoice] = useState<Record<string, string>>({});

  const {
    skills,
    isPending: skillsLoading,
    error: skillsError,
    truncated,
  } = useSkillPickerQuery(source, debouncedSearch);

  // How many rows are revealed, tied to the list it was counted for: a new
  // search or source collapses back to one chunk without an effect.
  const listKey = `${source}:${debouncedSearch}`;
  const [reveal, setReveal] = useState({ key: listKey, count: CHUNK });
  const visible = reveal.key === listKey ? reveal.count : CHUNK;

  // The selection is dropped where the source changes rather than in an effect
  // watching it — the selected skill and its connector choices belong to one
  // source, so they die with the switch that caused it.
  const changeSource = (next: SkillPickerSource) => {
    setSource(next);
    setSelectedSkill(null);
    setChoice({});
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

  // The search field lives inside this form, and implicit submission would bind
  // the selected skill (or close the modal having bound nothing) the moment
  // someone hits Enter while browsing. Only the button submits.
  const blockImplicitSubmit = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
      e.preventDefault();
    }
  };

  const shown = skills.slice(0, visible);

  return (
    <Modal isOpen={true} onClose={onClose} title={t('addSkill')} size="lg">
      <form onSubmit={onSubmit} onKeyDown={blockImplicitSubmit} className="space-y-4">
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
