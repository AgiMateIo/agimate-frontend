'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { CheckCircleIcon, ExclamationTriangleIcon, PlusIcon } from '@heroicons/react/24/outline';
import { Alert } from '@/components/ui/Alert';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { FormField, Select } from '@/components/ui/FormField';
import { Link } from '@/i18n/navigation';
import ConnectionSetupForm from '@/components/connections/ConnectionSetupForm';
import { connectorCatalogOptions } from '@/queries/connectors';
import type {
  AgentSkillConnectorStatus,
  ConnectionResponse,
  ConnectorCatalogEntry,
  SkillDesiredPolicy,
} from '@/types';
import {
  requirementConflicts,
  requirementKey,
  requirementMatches,
  requirementPolicies,
  resolveChoice,
  type CreatedConnections,
  type RequirementChoices,
} from './skillAccess';

// The wizard's body: one step per requirement of the skill, in the order the
// plan lists them. Each step is the diagnosis and the fix on one card — a
// built-in that will be opened, a select over the connections that fit, or
// the create form with the skill's pre-fills — followed by the access rules
// the skill will put on the binding, so nothing narrows the agent unseen.
// State lives in the caller: the plan arrives asynchronously, and the modal
// that submits needs the same choices to walk the sequence.
interface SkillRequirementStepsProps {
  // Where the "rules of this binding" link points; absent on a not-yet-bound
  // skill, where there is no binding to look at.
  agentId?: string;
  connectors: AgentSkillConnectorStatus[];
  choice: RequirementChoices;
  onChoice: (key: string, connectionId: string) => void;
  created: CreatedConnections;
  onCreated: (key: string, connection: ConnectionResponse) => void;
  disabled?: boolean;
}

export default function SkillRequirementSteps({
  agentId,
  connectors,
  choice,
  onChoice,
  created,
  onCreated,
  disabled = false,
}: SkillRequirementStepsProps) {
  const t = useTranslations('Agents');
  const { data: catalog } = useQuery(connectorCatalogOptions());

  if (connectors.length === 0) {
    return <Alert variant="info">{t('skillConnectorsNone')}</Alert>;
  }

  return (
    <ol className="space-y-3">
      {connectors.map((c, index) => (
        <RequirementStep
          key={requirementKey(c)}
          index={index}
          agentId={agentId}
          connector={c}
          connectorName={catalog?.find((e) => e.code === c.connectorCode)?.name ?? c.connectorCode}
          catalogEntry={catalog?.find((e) => e.code === c.connectorCode)}
          value={resolveChoice(c, choice, created)}
          onChoice={(id) => onChoice(requirementKey(c), id)}
          created={created[requirementKey(c)] ?? []}
          onCreated={(connection) => onCreated(requirementKey(c), connection)}
          disabled={disabled}
        />
      ))}
    </ol>
  );
}

function RequirementStep({
  index,
  agentId,
  connector: c,
  connectorName,
  catalogEntry,
  value,
  onChoice,
  created,
  onCreated,
  disabled,
}: {
  index: number;
  agentId?: string;
  connector: AgentSkillConnectorStatus;
  connectorName: string;
  catalogEntry: ConnectorCatalogEntry | undefined;
  value: string;
  onChoice: (connectionId: string) => void;
  created: ConnectionResponse[];
  onCreated: (connection: ConnectionResponse) => void;
  disabled: boolean;
}) {
  const t = useTranslations('Agents');

  const matches = requirementMatches(c);
  const policies = requirementPolicies(c);
  const conflicts = requirementConflicts(c);
  const canCreate = !c.internal && !!catalogEntry && !!(c.credentialFields ?? catalogEntry.integrationMeta?.credentialFields);
  const [creating, setCreating] = useState(false);

  // Which instance the select offers: what the plan matched, plus what was
  // created here (never bound yet, hence the "will be opened" suffix), plus
  // the instance the binding already points at when it fits no match — a
  // binding from before identities existed, deliberately kept working.
  const options = [
    ...matches.map((m) => ({
      id: m.connectionId,
      label: m.name || m.connectionId,
      bound: m.boundToAgent,
    })),
    ...created
      .filter((cc) => !matches.some((m) => m.connectionId === cc.id))
      .map((cc) => ({ id: cc.id, label: cc.name || cc.fullCode, bound: false })),
  ];
  if (c.connectionId && !options.some((o) => o.id === c.connectionId)) {
    options.unshift({ id: c.connectionId, label: c.connectionName || c.connectionId, bound: c.satisfied });
  }
  // With nothing to choose from, the form is the step — open from the start.
  const forcedForm = matches.length === 0 && created.length === 0 && !c.connectionId;
  const showForm = canCreate && (creating || forcedForm);

  const done = c.internal ? c.satisfied : value !== '' && options.find((o) => o.id === value)?.bound === true;

  return (
    <li className="rounded-lg border border-border p-3 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-[11px] font-medium text-muted">
          {index + 1}
        </span>
        <span className="text-sm font-medium text-foreground">{c.title ?? connectorName}</span>
        {c.title && c.title !== connectorName && <Chip>{connectorName}</Chip>}
        {done ? (
          <Chip tone="success" icon={CheckCircleIcon}>{t('skillStepDone')}</Chip>
        ) : (
          <Chip tone="warning" icon={PlusIcon}>{t('skillStepWillOpen')}</Chip>
        )}
      </div>

      {c.identity && (
        <p className="text-xs text-muted font-mono break-all">{c.identity}</p>
      )}

      {c.internal ? (
        <p className="text-xs text-muted">
          {c.satisfied ? t('skillStepBuiltInOpen') : t('skillStepBuiltIn')}
        </p>
      ) : showForm ? (
        <div className="space-y-2">
          <p className="text-xs text-muted">
            {forcedForm ? t('skillStepCreateHint') : t('skillStepCreateAnotherHint')}
          </p>
          {catalogEntry && (
            <ConnectionSetupForm
              connector={catalogEntry}
              credentialFields={c.credentialFields ?? undefined}
              initialCredentials={c.params}
              initialName={c.title ?? undefined}
              hideHeader
              onSuccess={(connection) => {
                onCreated(connection);
                onChoice(connection.id);
                setCreating(false);
              }}
              onCancel={() => setCreating(false)}
              cancelLabel={t('skillStepPickExisting')}
              // With nothing to pick from, the form is the step: there is
              // nowhere for a cancel to go back to.
              hideCancel={forcedForm}
            />
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {options.length > 0 || canCreate ? (
            <div className="flex items-end gap-2">
              <div className="flex-1 min-w-0">
                <FormField label={t('skillStepConnection')} required>
                  <Select value={value} onChange={(e) => onChoice(e.target.value)} disabled={disabled}>
                    <option value="">{t('skillConnectorNotChosen')}</option>
                    {options.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                        {o.bound ? '' : ` — ${t('skillConnectorWillOpen')}`}
                      </option>
                    ))}
                  </Select>
                </FormField>
              </div>
              {canCreate && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setCreating(true)}
                  disabled={disabled}
                  className="shrink-0"
                >
                  {t('skillStepCreateNew')}
                </Button>
              )}
            </div>
          ) : (
            // The catalog has no form for this connector (an app, or a code
            // the platform doesn't ship): nothing can be created from here.
            <Alert variant="warning">
              {t('skillConnectorNoInstance', { name: connectorName })}{' '}
              <Link href="/dashboard/connections" className="underline">
                {t('skillConnectorConnectLink')}
              </Link>
            </Alert>
          )}
        </div>
      )}

      {policies.length > 0 && <DesiredPolicies policies={policies} />}

      {conflicts.length > 0 && (
        <Alert variant="warning">
          {t('skillPolicyConflicts', { count: conflicts.length, list: conflicts.join(', ') })}
          {agentId && (
            <>
              {' '}
              <Link href={`/dashboard/agents/${agentId}/connections`} className="underline">
                {t('skillPolicyConflictsLink')}
              </Link>
            </>
          )}
        </Alert>
      )}
    </li>
  );
}

// The rows the skill will write on the agent's binding to this instance. An
// allow-list is the case worth a warning: its binding-wide DENY takes every
// unlisted tool away from the agent on that connection, whether or not the
// call comes through the skill.
export function DesiredPolicies({ policies }: { policies: SkillDesiredPolicy[] }) {
  const t = useTranslations('Agents');
  const allowList = policies.some((p) => p.name === null && p.effect === 'DENY');

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted uppercase tracking-wide">{t('skillPoliciesTitle')}</p>
      <ul className="space-y-1">
        {policies.map((p, i) => (
          <li key={i} className="flex items-center gap-2 text-xs">
            <span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-medium bg-surface-secondary text-muted">
              {p.kind === 'TOOL' ? t('kindTool') : t('kindTrigger')}
            </span>
            <span className="font-mono text-foreground truncate">{p.name ?? t('policyResourceAll')}</span>
            {p.paramsFilter && Object.keys(p.paramsFilter).length > 0 && (
              <span className="font-mono text-muted truncate max-w-[40%]" title={JSON.stringify(p.paramsFilter)}>
                {JSON.stringify(p.paramsFilter)}
              </span>
            )}
            <span
              className={`ml-auto shrink-0 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${
                p.effect === 'ALLOW' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
              }`}
            >
              {p.effect === 'ALLOW' ? t('effectAllow') : t('effectDeny')}
            </span>
          </li>
        ))}
      </ul>
      {allowList && (
        <p className="flex items-start gap-1.5 text-xs text-warning">
          <ExclamationTriangleIcon className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          {t('skillPoliciesAllowListWarning')}
        </p>
      )}
    </div>
  );
}
