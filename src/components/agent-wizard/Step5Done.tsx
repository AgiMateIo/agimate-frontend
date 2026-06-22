'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  AcademicCapIcon,
  BoltIcon,
  CheckBadgeIcon,
  ChatBubbleLeftRightIcon,
  CpuChipIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import { useRouter } from '@/i18n/navigation';
import apiService from '@/services/api';
import { ConnectorCatalogEntry, SkillConnectorResponse } from '@/types';
import { Button } from '@/components/ui/Button';
import { WizardStepProps } from './AgentWizard';

interface Step5Props extends WizardStepProps {
  onReset: () => void;
}

interface SummaryItem {
  label: string;
  sub?: string;
}

export default function Step5Done({ data, goBack, onReset }: Step5Props) {
  const t = useTranslations('AgentWizard');
  const router = useRouter();
  const [tools, setTools] = useState<SummaryItem[]>([]);
  const [triggers, setTriggers] = useState<SummaryItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const catalog: ConnectorCatalogEntry[] = await apiService.getConnectorCatalog().catch(() => []);
      const byCode = new Map(catalog.map((c) => [c.code, c.name]));

      const perSkill = await Promise.all(
        data.skills.map((s) => apiService.getSkillConnectors(s.id).catch(() => [] as SkillConnectorResponse[])),
      );
      if (cancelled) return;

      const toolItems: SummaryItem[] = [];
      const triggerItems: SummaryItem[] = [];
      for (const conns of perSkill) {
        for (const conn of conns) {
          const label = byCode.get(conn.connectorCode) ?? conn.connectorCode;
          const item: SummaryItem = { label, sub: conn.name ?? undefined };
          if (conn.type === 'TOOL') toolItems.push(item);
          else if (conn.type === 'TRIGGER') triggerItems.push(item);
          else toolItems.push(item);
        }
      }
      if (data.channel) {
        triggerItems.unshift({ label: t('telegramMessages'), sub: data.channel.name });
      }
      setTools(toolItems);
      setTriggers(triggerItems);
    })();
    return () => {
      cancelled = true;
    };
  }, [data.skills, data.channel, t]);

  const capabilities: SummaryItem[] = data.skills.map((s) => ({
    label: s.name,
    sub: s.description ?? undefined,
  }));

  return (
    <div className="space-y-6">
      <div className="text-center py-2">
        <div className="mx-auto h-14 w-14 rounded-full bg-success/15 flex items-center justify-center">
          <CheckBadgeIcon className="h-8 w-8 text-success" />
        </div>
        <h2 className="text-xl font-bold text-foreground mt-3">{t('step5Title')}</h2>
        <p className="text-muted mt-1">
          {t('step5Subtitle', { name: data.agent?.name ?? '' })}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SummaryCard icon={CpuChipIcon} title={t('summaryModel')}>
          {data.binding ? (
            <SummaryLine label={data.binding.model} sub={data.binding.llmProviderName} />
          ) : (
            <Empty t={t} />
          )}
        </SummaryCard>

        <SummaryCard icon={ChatBubbleLeftRightIcon} title={t('summaryChannel')}>
          {data.channel ? <SummaryLine label={data.channel.name} /> : <Empty t={t} />}
        </SummaryCard>

        <SummaryCard icon={AcademicCapIcon} title={t('summaryCapabilities')}>
          {capabilities.length ? (
            capabilities.map((c, i) => <SummaryLine key={i} label={c.label} sub={c.sub} />)
          ) : (
            <Empty t={t} />
          )}
        </SummaryCard>

        <SummaryCard icon={WrenchScrewdriverIcon} title={t('summaryTools')}>
          {tools.length ? (
            tools.map((c, i) => <SummaryLine key={i} label={c.label} sub={c.sub} />)
          ) : (
            <Empty t={t} />
          )}
        </SummaryCard>

        <SummaryCard icon={BoltIcon} title={t('summaryTriggers')} wide>
          {triggers.length ? (
            triggers.map((c, i) => <SummaryLine key={i} label={c.label} sub={c.sub} />)
          ) : (
            <Empty t={t} />
          )}
        </SummaryCard>
      </div>

      <div className="flex flex-wrap justify-between gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={goBack}>{t('back')}</Button>
        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={onReset}>{t('createAnother')}</Button>
          {data.agent && (
            <Button type="button" onClick={() => router.push(`/dashboard/agents/${data.agent!.id}`)}>
              {t('openAgent')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  title,
  children,
  wide,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={`rounded-lg border border-border bg-surface-secondary p-4 ${wide ? 'sm:col-span-2' : ''}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function SummaryLine({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="text-sm">
      <span className="text-foreground">{label}</span>
      {sub && <span className="text-muted"> · {sub}</span>}
    </div>
  );
}

function Empty({ t }: { t: ReturnType<typeof useTranslations> }) {
  return <p className="text-sm text-muted">{t('summaryEmpty')}</p>;
}
