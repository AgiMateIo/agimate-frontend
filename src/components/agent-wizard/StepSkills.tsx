'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  CheckIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import { SearchToolbar } from '@/components/ui/SearchToolbar';
import apiService from '@/services/api';
import {
  ConnectionResponse,
  ConnectorCatalogEntry,
  PagedResponse,
  SkillResponse,
} from '@/types';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { getErrorMessage } from '@/utils/error';
import { isIntegrationConnector } from '@/utils/connector';
import { WizardStepProps, WizardSkill } from './AgentWizard';

const PAGE_SIZE = 10;

// A skill picked for the detail panel at the bottom. Connector codes are known
// for library skills up front; preset skills are enriched lazily on focus.
interface FocusedSkill {
  id: string;
  name: string;
  description: string | null;
  connectorCodes?: string[];
}

export default function StepSkills({ data, setData, goNext, goBack, teamId }: WizardStepProps) {
  const t = useTranslations('AgentWizard');

  // Library browser (own + public skills, server-side search & pagination).
  const [source, setSource] = useState<'my' | 'public'>('public');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [page, setPage] = useState(0);
  const [pagedData, setPagedData] = useState<PagedResponse<SkillResponse> | null>(null);
  const [skillsLoading, setSkillsLoading] = useState(true);
  const [skillsError, setSkillsError] = useState('');

  // Detail panel state: which skill is shown at the bottom, and connector codes
  // resolved per skill id (seeded from library rows, fetched for preset skills).
  const [focused, setFocused] = useState<FocusedSkill | null>(
    data.skills[0]
      ? { id: data.skills[0].id, name: data.skills[0].name, description: data.skills[0].description, connectorCodes: data.skills[0].connectorCodes }
      : null,
  );
  const [connectorCodesById, setConnectorCodesById] = useState<Record<string, string[]>>({});
  const [detailLoading, setDetailLoading] = useState(false);

  // Connector catalog + the user's existing connections → status in the detail.
  const [catalog, setCatalog] = useState<ConnectorCatalogEntry[]>([]);
  const [connections, setConnections] = useState<ConnectionResponse[]>([]);

  useEffect(() => {
    apiService.getConnectorCatalog().then(setCatalog).catch(() => {});
    apiService.getConnections().then(setConnections).catch(() => {});
  }, []);

  const catalogByCode = useMemo(
    () => new Map(catalog.map((c) => [c.code, c])),
    [catalog],
  );
  const configuredCodes = useMemo(
    () => new Set(connections.map((c) => c.connectorCode)),
    [connections],
  );

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, source]);

  const fetchSkills = useCallback(async () => {
    setSkillsLoading(true);
    setSkillsError('');
    try {
      const result = await apiService.getSkills({
        search: debouncedSearch || undefined,
        scope: source === 'my' ? 'MINE' : 'PUBLIC',
        page,
        size: PAGE_SIZE,
      });
      setPagedData(result);
      // Seed connector codes for the detail panel from the loaded rows.
      setConnectorCodesById((prev) => {
        const next = { ...prev };
        result.content.forEach((s) => { next[s.id] = s.connectorCodes; });
        return next;
      });
    } catch (err) {
      setSkillsError(getErrorMessage(err, t('skillsLoadError')));
    } finally {
      setSkillsLoading(false);
    }
  }, [source, debouncedSearch, page, t]);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  // Enrich the focused skill's connectors if unknown (e.g. a preset skill).
  useEffect(() => {
    if (!focused) return;
    if (focused.connectorCodes || connectorCodesById[focused.id]) return;
    let cancelled = false;
    setDetailLoading(true);
    apiService
      .getSkill(focused.id)
      .then((detail) => {
        if (cancelled) return;
        setConnectorCodesById((prev) => ({ ...prev, [detail.id]: detail.connectorCodes }));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [focused, connectorCodesById]);

  const selectedIds = useMemo(() => new Set(data.skills.map((s) => s.id)), [data.skills]);

  const addSkill = (skill: SkillResponse) => {
    if (selectedIds.has(skill.id)) return;
    setData({
      skills: [
        ...data.skills,
        {
          id: skill.id,
          name: skill.name,
          description: skill.description,
          connectorCodes: skill.connectorCodes,
        },
      ],
    });
  };

  const removeSkill = (id: string) =>
    setData({ skills: data.skills.filter((s) => s.id !== id) });

  const toggleFromLibrary = (skill: SkillResponse) => {
    setFocused({
      id: skill.id,
      name: skill.name,
      description: skill.description,
      connectorCodes: skill.connectorCodes,
    });
    if (selectedIds.has(skill.id)) removeSkill(skill.id);
    else addSkill(skill);
  };

  const focusSkill = (skill: WizardSkill) =>
    setFocused({
      id: skill.id,
      name: skill.name,
      description: skill.description,
      connectorCodes: skill.connectorCodes,
    });

  const { loading, error, handleSubmit } = useAsyncForm({
    defaultError: t('createError'),
  });

  // The one and only server call of the wizard: agent + skill bindings are
  // created in a single transaction; the preset code rides along for analytics.
  const onSubmit = (e: React.FormEvent) =>
    handleSubmit(e, async () => {
      const created = await apiService.createAgent({
        name: data.name.trim(),
        description: data.description.trim() || undefined,
        instructions: data.instructions.trim() || undefined,
        type: 'GENERIC',
        agenticTeamId: teamId || null,
        skillIds: data.skills.map((s) => s.id),
        presetCode: data.presetCode ?? undefined,
      });
      setData({ created });
      goNext();
    });

  const skills = pagedData?.content ?? [];
  const totalElements = pagedData?.totalElements ?? 0;
  const totalPages = pagedData?.totalPages ?? 0;

  const focusedConnectorCodes = focused
    ? focused.connectorCodes ?? connectorCodesById[focused.id]
    : undefined;

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{t('skillsTitle')}</h2>
        <p className="text-sm text-muted mt-0.5">{t('skillsSubtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left — selected skills (preset skills arrive pre-enabled). */}
        <div className="flex flex-col rounded-lg border border-border">
          <div className="px-3 py-2.5 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">
              {t('selectedSkills', { count: data.skills.length })}
            </h3>
          </div>
          <div className="min-h-[16rem] max-h-80 overflow-y-auto p-1.5 space-y-1">
            {data.skills.length === 0 ? (
              <div className="flex h-full min-h-[15rem] items-center justify-center px-4 text-center text-sm text-muted">
                {t('noSelectedSkills')}
              </div>
            ) : (
              data.skills.map((skill) => (
                <div
                  key={skill.id}
                  onClick={() => focusSkill(skill)}
                  className={`group flex items-start justify-between gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                    focused?.id === skill.id
                      ? 'border-accent bg-accent/5'
                      : 'border-transparent hover:bg-surface-secondary'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{skill.name}</div>
                    {skill.description && (
                      <p className="text-xs text-muted mt-0.5 line-clamp-1">{skill.description}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSkill(skill.id);
                    }}
                    className="shrink-0 p-1 rounded text-muted hover:text-error hover:bg-error/10 transition-colors"
                    title={t('removeSkill')}
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right — library: add any other skill; connections come later. */}
        <div className="flex flex-col rounded-lg border border-border">
          <div className="px-3 py-2.5 border-b border-border space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-foreground">{t('libraryTitle')}</h3>
              <div className="inline-flex rounded-lg bg-surface-secondary p-0.5 gap-0.5">
                {(['public', 'my'] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSource(key)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                      source === key
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted hover:text-foreground'
                    }`}
                  >
                    {key === 'my' ? t('skillsMine') : t('skillsPublic')}
                  </button>
                ))}
              </div>
            </div>
            <SearchToolbar
              value={search}
              onChange={setSearch}
              placeholder={t('searchSkills')}
              size="sm"
            />
          </div>

          <div className="min-h-[13rem] max-h-72 overflow-y-auto p-1.5">
            {skillsLoading ? (
              <div className="text-center py-10 text-muted text-sm">{t('loadingSkills')}</div>
            ) : skillsError ? (
              <div className="p-2"><ErrorAlert>{skillsError}</ErrorAlert></div>
            ) : skills.length === 0 ? (
              <div className="text-center py-10 text-muted text-sm">{t('noSkillsFound')}</div>
            ) : (
              <div className="space-y-1">
                {skills.map((skill) => {
                  const isSelected = selectedIds.has(skill.id);
                  return (
                    <button
                      key={skill.id}
                      type="button"
                      onClick={() => toggleFromLibrary(skill)}
                      className={`w-full text-left px-2.5 py-2 rounded-lg border transition-colors ${
                        focused?.id === skill.id
                          ? 'border-accent bg-accent/5'
                          : isSelected
                            ? 'border-accent/40 bg-accent/5'
                            : 'border-transparent hover:bg-surface-secondary'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex h-4.5 w-4.5 items-center justify-center rounded border shrink-0 ${
                            isSelected
                              ? 'bg-accent border-accent text-accent-foreground'
                              : 'border-border'
                          }`}
                        >
                          {isSelected && <CheckIcon className="h-3 w-3" />}
                        </span>
                        <span className="text-sm font-medium text-foreground truncate">{skill.name}</span>
                        <span className="text-xs text-muted shrink-0">v{skill.version}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-end gap-3 px-3 py-2 border-t border-border text-xs text-muted">
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
        </div>
      </div>

      {/* Bottom — focused skill: description + required connectors/connections. */}
      <div className="rounded-lg border border-border bg-surface-secondary/40 p-4 min-h-[7rem]">
        {!focused ? (
          <div className="flex h-full min-h-[5rem] items-center justify-center gap-2 text-sm text-muted">
            <Squares2X2Icon className="h-5 w-5" />
            {t('detailPlaceholder')}
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-semibold text-foreground">{focused.name}</h4>
              <p className="text-sm text-muted mt-0.5">
                {focused.description || t('noDescription')}
              </p>
            </div>

            <div>
              <h5 className="text-xs font-semibold uppercase tracking-wide text-muted mb-1.5">
                {t('requiredConnectors')}
              </h5>
              {detailLoading && !focusedConnectorCodes ? (
                <p className="text-sm text-muted">{t('loading')}</p>
              ) : !focusedConnectorCodes || focusedConnectorCodes.length === 0 ? (
                <p className="text-sm text-muted">{t('noConnectorsNeeded')}</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {focusedConnectorCodes.map((code) => {
                    const entry = catalogByCode.get(code);
                    const name = entry?.name ?? code;
                    const configured = configuredCodes.has(code);
                    // Integrations need a user-created connection; contextual
                    // connectors (time, memory) connect in one click later.
                    const needsConnection = entry ? isIntegrationConnector(entry) : true;
                    return (
                      <span
                        key={code}
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                          configured
                            ? 'bg-success/10 text-success'
                            : needsConnection
                              ? 'bg-warning/10 text-warning'
                              : 'bg-accent/10 text-accent'
                        }`}
                        title={
                          configured
                            ? t('connectorConnected')
                            : needsConnection
                              ? t('connectorNeedsConnection')
                              : t('connectorBuiltIn')
                        }
                      >
                        {configured ? (
                          <CheckCircleIcon className="h-3.5 w-3.5" />
                        ) : needsConnection ? (
                          <ExclamationTriangleIcon className="h-3.5 w-3.5" />
                        ) : null}
                        {name}
                      </span>
                    );
                  })}
                </div>
              )}
              {focusedConnectorCodes && focusedConnectorCodes.length > 0 && (
                <p className="text-xs text-muted mt-2">{t('connectorsHint')}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {error && <ErrorAlert>{error}</ErrorAlert>}

      <div className="flex justify-between gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={goBack} disabled={loading}>
          {t('back')}
        </Button>
        <Button type="submit" loading={loading} disabled={loading || !data.name.trim()}>
          {t('createAgent')}
        </Button>
      </div>
    </form>
  );
}
