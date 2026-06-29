'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import apiService from '@/services/api';
import {
  ConnectorCatalogEntry,
  ConnectionResponse,
  SkillResponse,
} from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/FormField';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import { isIntegrationConnector } from '@/utils/connector';
import AddConnectionModal from '@/components/connections/AddConnectionModal';
import { WizardStepProps } from './AgentWizard';

export default function Step4Skills({ data, setData, goNext, goBack }: WizardStepProps) {
  const t = useTranslations('AgentWizard');

  const [skills, setSkills] = useState<SkillResponse[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Record<string, SkillResponse>>(
    Object.fromEntries(data.skills.map((s) => [s.id, s])),
  );

  const [catalog, setCatalog] = useState<ConnectorCatalogEntry[]>([]);
  const [creds, setCreds] = useState<ConnectionResponse[]>([]);
  const [showAddConnection, setShowAddConnection] = useState(false);

  const { loading, error, handleSubmit } = useAsyncForm({ defaultError: t('step4Error') });

  useEffect(() => {
    Promise.all([
      apiService.getSkills({ size: 100 }),
      apiService.getPublicSkills({ size: 100 }),
    ])
      .then(([mine, pub]) => {
        const byId = new Map<string, SkillResponse>();
        [...mine.content, ...pub.content].forEach((s) => byId.set(s.id, s));
        setSkills([...byId.values()]);
      })
      .catch(() => {});
    apiService.getConnectorCatalog().then(setCatalog).catch(() => {});
    apiService.getConnections().then(setCreds).catch(() => {});
  }, []);

  const integrationCodes = useMemo(
    () => new Set(catalog.filter(isIntegrationConnector).map((c) => c.code)),
    [catalog],
  );
  const credCodes = useMemo(() => new Set(creds.map((c) => c.connectorCode)), [creds]);
  const catalogByCode = useMemo(
    () => new Map(catalog.map((c) => [c.code, c])),
    [catalog],
  );

  const toggle = (skill: SkillResponse) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[skill.id]) delete next[skill.id];
      else next[skill.id] = skill;
      return next;
    });
  };

  // Integration connector codes required by the currently selected skills.
  const requiredIntegrations = useMemo(() => {
    const codes = new Set<string>();
    for (const skill of Object.values(selected)) {
      for (const code of skill.connectorCodes) {
        if (integrationCodes.has(code)) codes.add(code);
      }
    }
    return [...codes];
  }, [selected, integrationCodes]);

  const filtered = skills.filter(
    (s) =>
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.description ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  const onSubmit = (e: React.FormEvent) =>
    handleSubmit(e, async () => {
      if (!data.agent) return;
      const boundIds = new Set(data.skills.map((s) => s.id));
      const toBind = Object.values(selected).filter((s) => !boundIds.has(s.id));
      for (const skill of toBind) {
        await apiService.bindAgentSkill(data.agent.id, { skillId: skill.id });
      }
      setData({ skills: Object.values(selected) });
      goNext();
    });

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{t('step4Title')}</h2>
        <p className="text-sm text-muted mt-0.5">{t('step4Subtitle')}</p>
      </div>

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('searchSkills')}
      />

      <div className="border border-border rounded-lg divide-y divide-border max-h-72 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted p-4">{t('noSkills')}</p>
        ) : (
          filtered.map((skill) => {
            const isSelected = !!selected[skill.id];
            return (
              <button
                key={skill.id}
                type="button"
                onClick={() => toggle(skill)}
                className="flex items-start gap-3 w-full p-3 text-left hover:bg-surface-secondary transition-colors"
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded border shrink-0
                    ${isSelected ? 'bg-accent border-accent text-accent-foreground' : 'border-border'}`}
                >
                  {isSelected && <CheckIcon className="h-3.5 w-3.5" />}
                </span>
                <div className="min-w-0">
                  <div className="font-medium text-foreground truncate">{skill.name}</div>
                  {skill.description && (
                    <p className="text-xs text-muted line-clamp-2">{skill.description}</p>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      {requiredIntegrations.length > 0 && (
        <div className="border border-border rounded-lg p-4 space-y-2">
          <h3 className="text-sm font-semibold text-foreground">{t('requiredIntegrations')}</h3>
          {requiredIntegrations.map((code) => {
            const configured = credCodes.has(code);
            const name = catalogByCode.get(code)?.name ?? code;
            return (
              <div key={code} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-foreground">{name}</span>
                {configured ? (
                  <span className="inline-flex items-center gap-1 text-success text-xs">
                    <CheckIcon className="h-4 w-4" />
                    {t('integrationConfigured')}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowAddConnection(true)}
                    className="inline-flex items-center gap-1 text-warning text-xs hover:underline"
                  >
                    <ExclamationTriangleIcon className="h-4 w-4" />
                    {t('integrationMissing')} · {t('addIntegration')}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {error && <ErrorAlert>{error}</ErrorAlert>}

      <div className="flex justify-between gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={goBack}>{t('back')}</Button>
        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={goNext}>{t('skipStep')}</Button>
          <Button type="submit" loading={loading} disabled={loading}>
            {Object.keys(selected).length > 0 ? t('bindSkills') : t('next')}
          </Button>
        </div>
      </div>

      {showAddConnection && (
        <AddConnectionModal
          platforms={catalog}
          onClose={() => setShowAddConnection(false)}
          onSuccess={(connection) => {
            setCreds((prev) => [connection, ...prev]);
            setShowAddConnection(false);
          }}
        />
      )}
    </form>
  );
}
