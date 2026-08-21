'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQueries } from '@tanstack/react-query';
import {
  CheckCircleIcon,
  CheckIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { SearchToolbar } from '@/components/ui/SearchToolbar';
import { FilterPill, FilterRow } from '@/components/ui/FilterPill';
import { Button } from '@/components/ui/Button';
import { Chip, type ChipTone } from '@/components/ui/Chip';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { connectorCatalogOptions } from '@/queries/connectors';
import { useSkillPickerQuery, type SkillPickerSource } from '@/queries/skills';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { getErrorMessage } from '@/utils/error';
import { splitSkillConnectors } from '@/components/agents/skillAccess';
import { Select } from '@/components/ui/FormField';
import type { SkillResponse } from '@/types';
import { WizardStepProps } from './AgentWizard';
import { createAgentFromWizard, resolveSkillConnection } from './createAgent';
import WizardActions from './WizardActions';
import { Placeholder } from '@/components/ui/Placeholder';

// Rows revealed at once. "Show more" grows the list in place instead of paging,
// so the step keeps one scroll (the page's) and never nests another.
const CHUNK = 8;

const SOURCES: SkillPickerSource[] = ['all', 'my', 'public'];

// What the user still has to do about a connector a skill declares. Connections
// are never required to create the agent — this is a heads-up, not a blocker.
type ConnectorState = 'connected' | 'needsConnection' | 'builtIn';

const CONNECTOR_TONE: Record<ConnectorState, ChipTone> = {
  connected: 'success',
  needsConnection: 'warning',
  builtIn: 'accent',
};

const CONNECTOR_ICON = {
  connected: CheckCircleIcon,
  needsConnection: ExclamationTriangleIcon,
  builtIn: undefined,
} as const;

export default function StepSkills({ data, setData, goNext, goBack, teamId }: WizardStepProps) {
  const t = useTranslations('AgentWizard');

  const tCommon = useTranslations('Common');
  const [source, setSource] = useState<SkillPickerSource>('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  // How many rows are revealed, tied to the list it was counted for: a new
  // search or source collapses back to one chunk without an effect.
  const listKey = `${source}:${debouncedSearch}`;
  const [reveal, setReveal] = useState({ key: listKey, count: CHUNK });
  const visible = reveal.key === listKey ? reveal.count : CHUNK;

  const { skills, isPending, error: skillsError, truncated } = useSkillPickerQuery(
    source,
    debouncedSearch,
  );

  // Connector catalog (names, kind) → which connectors need an instance named.
  const [{ data: catalog }] = useQueries({ queries: [connectorCatalogOptions()] });

  const catalogByCode = useMemo(
    () => new Map((catalog ?? []).map((c) => [c.code, c])),
    [catalog],
  );
  // What matters now is not "the user owns a connection of this type" but "this
  // agent will have one open": the skill gate reads the agent's connections, and
  // those were chosen on the previous step.
  const openedByCode = useMemo(() => {
    const map = new Map<string, typeof data.connections>();
    for (const c of data.connections) {
      map.set(c.connectorCode, [...(map.get(c.connectorCode) ?? []), c]);
    }
    return map;
  }, [data.connections]);

  const connectorState = (code: string): ConnectorState => {
    if (openedByCode.has(code)) return 'connected';
    // Anything with instances of its own (integrations, device apps) needs a
    // connection opened on the previous step; internal ones (time, memory) are
    // opened for the agent automatically at creation.
    const { internal } = splitSkillConnectors([code], catalog);
    return internal.length > 0 ? 'builtIn' : 'needsConnection';
  };

  const selectedIds = useMemo(() => new Set(data.skills.map((s) => s.id)), [data.skills]);

  // Connectors an instance must be named for — the same split the create call
  // uses, so what the step shows is what gets sent.
  const externalCodesOf = (skill: { connectorCodes?: string[] }) =>
    splitSkillConnectors(skill.connectorCodes ?? [], catalog).external;

  const toggleSkill = (skill: SkillResponse) => {
    if (selectedIds.has(skill.id)) {
      const rest = { ...data.skillConnections };
      delete rest[skill.id];
      setData({
        skills: data.skills.filter((s) => s.id !== skill.id),
        skillConnections: rest,
      });
      return;
    }
    // No instance map is stored here: it is resolved from the connections that
    // are open at the moment of creation, so walking back and swapping them
    // cannot leave this skill pointing at a connection the agent lost.
    setData({
      skills: [
        ...data.skills,
        {
          id: skill.id,
          title: skill.title,
          description: skill.description,
          connectorCodes: skill.connectorCodes,
        },
      ],
    });
  };

  const setSkillConnection = (skillId: string, code: string, connectionId: string) =>
    setData({
      skillConnections: {
        ...data.skillConnections,
        [skillId]: { ...(data.skillConnections[skillId] ?? {}), [code]: connectionId },
      },
    });

  const { loading, error, handleSubmit } = useAsyncForm({
    defaultError: t('createError'),
  });

  // Creation is a sequence now, not one call: the agent, then the connections it
  // may reach, then the skills pointing at them. What fails after the agent
  // exists is reported on the next step rather than rolled back.
  const onSubmit = (e: React.FormEvent) =>
    handleSubmit(e, async () => {
      const result = await createAgentFromWizard(data, teamId, catalog);
      setData({
        created: result.created,
        failedConnections: result.failedConnections,
        failedSkills: result.failedSkills,
      });
      goNext();
    });

  // The search field lives inside this form, and implicit submission would create
  // the agent the moment someone hits Enter while browsing. Only the submit
  // button creates it; no field here wants Enter for anything.
  const blockImplicitSubmit = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
      e.preventDefault();
    }
  };

  const shown = skills.slice(0, visible);

  return (
    <form onSubmit={onSubmit} onKeyDown={blockImplicitSubmit}>
      <div className="space-y-5 p-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t('skillsTitle')}</h2>
          <p className="text-sm text-muted mt-0.5">{t('skillsSubtitle')}</p>
        </div>

        <div className="space-y-3">
          <SearchToolbar
            value={search}
            onChange={setSearch}
            placeholder={t('searchSkills')}
            filtersActive={source !== 'all'}
            filters={
              <FilterRow label={t('skillsSourceLabel')}>
                {SOURCES.map((key) => (
                  <FilterPill
                    key={key}
                    active={source === key}
                    onClick={() => setSource(key)}
                  >
                    {t(`skillsSource_${key}`)}
                  </FilterPill>
                ))}
              </FilterRow>
            }
          />

          {isPending ? (
            <div className="space-y-1.5">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 rounded-lg border border-border bg-surface-secondary animate-pulse"
                />
              ))}
            </div>
          ) : skillsError ? (
            <ErrorAlert>{getErrorMessage(skillsError, t('skillsLoadError'))}</ErrorAlert>
          ) : skills.length === 0 ? (
            <Placeholder size="sm">{t('noSkillsFound')}</Placeholder>
          ) : (
            <div className="space-y-1.5">
              {shown.map((skill) => {
                const isSelected = selectedIds.has(skill.id);
                // Only asked once the skill is taken, and only where there is a
                // real choice: two accounts of the same service open to the agent.
                const ambiguous = isSelected
                  ? externalCodesOf(skill).filter(
                      (code) => (openedByCode.get(code) ?? []).length > 1,
                    )
                  : [];
                return (
                  <div key={skill.id}>
                  <button
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    aria-pressed={isSelected}
                    className={`flex w-full items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                      isSelected
                        ? 'border-accent/50 bg-accent/5'
                        : 'border-border hover:bg-surface-secondary'
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border ${
                        isSelected
                          ? 'border-accent bg-accent text-accent-foreground'
                          : 'border-border'
                      }`}
                    >
                      {isSelected && <CheckIcon className="h-3 w-3" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-2">
                        <span className="truncate text-sm font-medium text-foreground">
                          {skill.title}
                        </span>
                        <span className="shrink-0 text-xs text-muted">v{skill.version}</span>
                      </span>
                      {skill.description && (
                        <span className="mt-0.5 line-clamp-1 block text-xs text-muted">
                          {skill.description}
                        </span>
                      )}
                      {skill.connectorCodes.length > 0 && (
                        <span className="mt-1.5 flex flex-wrap gap-1">
                          {skill.connectorCodes.map((code) => {
                            const state = connectorState(code);
                            return (
                              <span key={code} title={t(`connector_${state}`)}>
                                <Chip tone={CONNECTOR_TONE[state]} icon={CONNECTOR_ICON[state]}>
                                  {catalogByCode.get(code)?.name ?? code}
                                </Chip>
                              </span>
                            );
                          })}
                        </span>
                      )}
                    </span>
                  </button>

                  {ambiguous.length > 0 && (
                    <div className="mt-1.5 ml-7 space-y-2 rounded-lg border border-border bg-surface-secondary/50 p-3">
                      <p className="text-xs text-muted">{t('skillInstanceHint')}</p>
                      {ambiguous.map((code) => (
                        <label key={code} className="block">
                          <span className="mb-1 block text-xs font-medium text-foreground">
                            {catalogByCode.get(code)?.name ?? code}
                          </span>
                          <Select
                            value={resolveSkillConnection(data, skill.id, code)}
                            onChange={(e) => setSkillConnection(skill.id, code, e.target.value)}
                          >
                            <option value="">{t('skillInstanceNotChosen')}</option>
                            {(openedByCode.get(code) ?? []).map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name || c.fullCode}
                              </option>
                            ))}
                          </Select>
                        </label>
                      ))}
                    </div>
                  )}
                  </div>
                );
              })}

              {visible < skills.length && (
                <button
                  type="button"
                  onClick={() => setReveal({ key: listKey, count: visible + CHUNK })}
                  className="w-full rounded-lg border border-dashed border-border py-2 text-sm font-medium text-muted transition-colors hover:border-accent/50 hover:text-foreground"
                >
                  {t('showMore', { count: skills.length - visible })}
                </button>
              )}

              {truncated && visible >= skills.length && (
                <p className="pt-1 text-center text-xs text-muted">{t('refineSearch')}</p>
              )}
            </div>
          )}
        </div>

        {error && <ErrorAlert>{error}</ErrorAlert>}
      </div>

      <WizardActions
        left={
          <Button type="button" variant="secondary" onClick={goBack} disabled={loading}>
            {tCommon('back')}
          </Button>
        }
      >
        {/* Keeps the size of the selection on screen while the list is scrolled. */}
        <span className="hidden text-xs text-muted sm:inline">
          {t('selectedCount', { count: data.skills.length })}
        </span>
        <Button type="submit" loading={loading} disabled={loading || !data.name.trim()}>
          {t('createAgent')}
        </Button>
      </WizardActions>
    </form>
  );
}
