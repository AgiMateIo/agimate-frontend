'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import {
  AcademicCapIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { Chip, type ChipTone } from '@/components/ui/Chip';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Select } from '@/components/ui/FormField';
import { Placeholder } from '@/components/ui/Placeholder';
import { connectorCatalogOptions } from '@/queries/connectors';
import { useSkillPickerQuery } from '@/queries/skills';
import {
  SkillCatalogToolbar,
  SkillListTail,
  useRevealedRows,
  useSkillCatalogFilters,
} from '@/components/skills/SkillCatalogToolbar';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import { getErrorMessage } from '@/utils/error';
import { splitSkillConnectors } from '@/components/agents/skillAccess';
import { skillRequirements } from '@/utils/skill';
import type { SkillConnectorRequirement, SkillResponse } from '@/types';
import { WizardStepProps } from './AgentWizard';
import {
  createAgentFromWizard,
  externalRequirements,
  fittingConnections,
  resolveSkillConnection,
} from './createAgent';
import WizardActions from './WizardActions';

// Rows revealed at once. "Show more" grows the list in place instead of paging,
// so the step keeps one scroll (the page's) and never nests another.
const CHUNK = 8;

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

// A skill as the wizard holds it or as the catalog answers it — whichever
// carries the requirements.
type RequirementSource = { connectors?: SkillConnectorRequirement[]; connectorCodes?: string[] };

// One skill line, the same in the included block and in the catalog: a mark
// on the left, title and description, whatever the caller adds below, and an
// optional control on the right. The block's rows are static with a remove
// button; the catalog's are one button each, so `onClick` picks the element.
function SkillRow({
  icon,
  title,
  meta,
  description,
  onClick,
  trailing,
  children,
}: {
  icon: ReactNode;
  title: string;
  meta?: ReactNode;
  description: string | null;
  onClick?: () => void;
  trailing?: ReactNode;
  children?: ReactNode;
}) {
  const body = (
    <>
      <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="truncate text-sm font-medium text-foreground">{title}</span>
          {meta}
        </span>
        {description && (
          <span className="mt-0.5 line-clamp-1 block text-xs text-muted">{description}</span>
        )}
        {children}
      </span>
      {trailing}
    </>
  );
  const layout = 'flex w-full items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left';
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      className={`${layout} border-border transition-colors hover:bg-surface-secondary`}
    >
      {body}
    </button>
  ) : (
    <div className={`${layout} border-accent/50 bg-accent/5`}>{body}</div>
  );
}

export default function StepSkills({ data, setData, goNext, goBack, teamId }: WizardStepProps) {
  const t = useTranslations('AgentWizard');
  const tCommon = useTranslations('Common');

  const catalogFilters = useSkillCatalogFilters();
  const { skills, isPending, error: skillsError, truncated } = useSkillPickerQuery(
    catalogFilters.source,
    catalogFilters.debouncedSearch,
    catalogFilters.filters,
  );
  const { visible, revealMore } = useRevealedRows(catalogFilters.listKey, CHUNK);

  // Connector catalog (names, kind) → which connectors need an instance named.
  const { data: catalog } = useQuery(connectorCatalogOptions());
  const catalogByCode = useMemo(
    () => new Map((catalog ?? []).map((c) => [c.code, c])),
    [catalog],
  );
  const requirementLabel = (r: SkillConnectorRequirement) =>
    r.title ?? catalogByCode.get(r.code)?.name ?? r.code;

  // What matters now is not "the user owns a connection of this type" but "this
  // agent will have one open": the skill gate reads the agent's connections, and
  // those were chosen on the previous step.
  const openedCodes = useMemo(
    () => new Set(data.connections.map((c) => c.connectorCode)),
    [data.connections],
  );
  const connectorState = (code: string): ConnectorState => {
    if (openedCodes.has(code)) return 'connected';
    // Anything with instances of its own (integrations, device apps) needs a
    // connection opened on the previous step; internal ones (time, memory) are
    // opened for the agent automatically at creation.
    const { internal } = splitSkillConnectors([code], catalog);
    return internal.length > 0 ? 'builtIn' : 'needsConnection';
  };

  // What the agent still has to be given for a skill: one chip per requirement,
  // green when a connection is open, yellow when one is missing, plain for a
  // built-in connector.
  const requirementChips = (requirements: SkillConnectorRequirement[]) =>
    requirements.length > 0 && (
      <span className="mt-1.5 flex flex-wrap gap-1">
        {requirements.map((r) => {
          const state = connectorState(r.code);
          return (
            <span key={r.key ?? r.code} title={t(`connector_${state}`)}>
              <Chip tone={CONNECTOR_TONE[state]} icon={CONNECTOR_ICON[state]}>
                {requirementLabel(r)}
              </Chip>
            </span>
          );
        })}
      </span>
    );

  // What the role brought is shown first, as the answer to "what does this
  // agent already know"; the catalog is one click further, unless there is
  // nothing to show first — an agent from scratch, or one whose skills were
  // picked here (walking back must not fold a list with a choice in it).
  const [pickerOpen, setPickerOpen] = useState(
    data.skills.length === 0 || data.skills.some((s) => !s.fromPreset),
  );
  const included = [
    ...data.skills.filter((s) => s.fromPreset),
    ...data.skills.filter((s) => !s.fromPreset),
  ];
  const includedIds = new Set(data.skills.map((s) => s.id));

  // A skill already included lives in the block above; the catalog offers the
  // rest. Cut here rather than in the request — the listing has no exclusion
  // parameter, and the picker merges whole scopes client-side anyway.
  const offered = skills.filter((skill) => !includedIds.has(skill.id));

  // A role's skills arrive without their requirements (the preset carries one
  // merged code list), so the marks for them are read off the catalog — the
  // unfiltered set of every scope, which the facets already hold in cache.
  const { skills: catalogSkills } = useSkillPickerQuery('all', '');
  const catalogById = useMemo(
    () => new Map(catalogSkills.map((skill) => [skill.id, skill])),
    [catalogSkills],
  );
  const requirementsOf = (skill: { id: string } & RequirementSource) => {
    const source = skill.connectorCodes ? skill : catalogById.get(skill.id);
    return skillRequirements({
      connectorCodes: source?.connectorCodes ?? [],
      connectors: source?.connectors,
    });
  };

  const addSkill = (skill: SkillResponse) =>
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
          connectors: skillRequirements(skill),
        },
      ],
    });

  const removeSkill = (id: string) => {
    const rest = { ...data.skillConnections };
    delete rest[id];
    setData({
      skills: data.skills.filter((s) => s.id !== id),
      skillConnections: rest,
    });
  };

  const setSkillConnection = (skillId: string, key: string, connectionId: string) =>
    setData({
      skillConnections: {
        ...data.skillConnections,
        [skillId]: { ...(data.skillConnections[skillId] ?? {}), [key]: connectionId },
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

  return (
    <form onSubmit={onSubmit} onKeyDown={blockImplicitSubmit}>
      <div className="space-y-5 p-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t('skillsTitle')}</h2>
          <p className="text-sm text-muted mt-0.5">{t('skillsSubtitle')}</p>
        </div>

        {included.length > 0 && (
          <div className="space-y-1.5">
            <h3 className="text-sm font-medium text-foreground">{t('includedSkillsTitle')}</h3>
            {included.map((skill) => {
              // Only where there is a real choice: two fitting accounts of the
              // same service open to the agent — the same fit the create call
              // resolves by.
              const ambiguous = externalRequirements(skill, catalog).filter(
                (r) => fittingConnections(data, r).length > 1,
              );
              return (
                <SkillRow
                  key={skill.id}
                  // The skill's own icon, not a checked box: a box reads as a
                  // toggle, and the one way out of this list is the cross.
                  icon={<AcademicCapIcon className="h-4 w-4 text-accent" />}
                  title={skill.title}
                  meta={skill.fromPreset && <Chip tone="accent">{t('skillFromRole')}</Chip>}
                  description={skill.description}
                  trailing={
                    <button
                      type="button"
                      onClick={() => removeSkill(skill.id)}
                      title={t('removeSkill')}
                      aria-label={t('removeSkill')}
                      className="shrink-0 rounded-md p-1 text-muted transition-colors hover:bg-surface-secondary hover:text-foreground"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  }
                >
                  {requirementChips(requirementsOf(skill))}
                  {ambiguous.length > 0 && (
                    <span className="mt-2 block space-y-2 rounded-lg border border-border bg-surface p-3">
                      <span className="block text-xs text-muted">{t('skillInstanceHint')}</span>
                      {ambiguous.map((r) => (
                        <label key={r.key ?? r.code} className="block">
                          <span className="mb-1 block text-xs font-medium text-foreground">
                            {requirementLabel(r)}
                          </span>
                          <Select
                            value={resolveSkillConnection(data, skill.id, r)}
                            onChange={(e) => setSkillConnection(skill.id, r.key ?? r.code, e.target.value)}
                          >
                            <option value="">{t('skillInstanceNotChosen')}</option>
                            {fittingConnections(data, r).map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name || c.fullCode}
                              </option>
                            ))}
                          </Select>
                        </label>
                      ))}
                    </span>
                  )}
                </SkillRow>
              );
            })}
          </div>
        )}

        {pickerOpen ? (
          <div className="space-y-3">
            <SkillCatalogToolbar state={catalogFilters} placeholder={t('searchSkills')} />

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
            ) : offered.length === 0 ? (
              <Placeholder size="sm">{t('noSkillsFound')}</Placeholder>
            ) : (
              <div className="space-y-1.5">
                {offered.slice(0, visible).map((skill) => (
                  <SkillRow
                    key={skill.id}
                    icon={
                      <span className="flex h-full w-full items-center justify-center rounded border border-border text-muted">
                        <PlusIcon className="h-3 w-3" />
                      </span>
                    }
                    title={skill.title}
                    meta={<span className="shrink-0 text-xs text-muted">v{skill.version}</span>}
                    description={skill.description}
                    onClick={() => addSkill(skill)}
                  >
                    {requirementChips(skillRequirements(skill))}
                  </SkillRow>
                ))}
                <SkillListTail
                  total={offered.length}
                  visible={visible}
                  truncated={truncated}
                  onMore={revealMore}
                />
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2.5 text-sm font-medium text-muted transition-colors hover:border-accent/50 hover:text-foreground"
          >
            <PlusIcon className="h-4 w-4" />
            {t('addMoreSkills')}
          </button>
        )}

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
