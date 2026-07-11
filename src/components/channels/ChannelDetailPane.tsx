'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { ChannelResponse } from '@/types';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/utils/date';
import ChannelConfigForm from './ChannelConfigForm';
import ChannelSessionsList from './ChannelSessionsList';
import DeleteChannelModal from './DeleteChannelModal';

type Mode = 'view' | 'edit' | 'create';
type SubTab = 'config' | 'sessions' | 'test';

interface ChannelDetailPaneProps {
  agentId: string;
  channel: ChannelResponse | null;
  mode: Mode;
  onModeChange: (m: Mode) => void;
  onChannelSaved: (channel: ChannelResponse) => void;
  onChannelDeleted: (id: string) => void;
}

export default function ChannelDetailPane({
  agentId,
  channel,
  mode,
  onModeChange,
  onChannelSaved,
  onChannelDeleted,
}: ChannelDetailPaneProps) {
  const t = useTranslations('Channels');
  const locale = useLocale();
  const [subTab, setSubTab] = useState<SubTab>('config');
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (mode === 'create') {
    return (
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">{t('createChannel')}</h2>
        <ChannelConfigForm
          agentId={agentId}
          channel={null}
          onCancel={() => onModeChange('view')}
          onSuccess={(c) => { onChannelSaved(c); onModeChange('view'); }}
        />
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="h-full flex items-center justify-center text-muted text-sm">
        {t('selectChannelHint')}
      </div>
    );
  }

  if (mode === 'edit') {
    return (
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">{t('editChannel')}</h2>
        <ChannelConfigForm
          agentId={agentId}
          channel={channel}
          onCancel={() => onModeChange('view')}
          onSuccess={(c) => { onChannelSaved(c); onModeChange('view'); }}
        />
      </div>
    );
  }

  const subTabs: { key: SubTab; label: string }[] = [
    { key: 'config', label: t('subTabConfig') },
    { key: 'sessions', label: t('subTabSessions') },
    { key: 'test', label: t('subTabTest') },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-foreground truncate">{channel.name}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
            <span>{t('createdAt')}: {formatDate(channel.createdAt, locale)}</span>
            <span>·</span>
            <span>{t('updatedAt')}: {formatDate(channel.updatedAt, locale)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="secondary"
            onClick={() => onModeChange('edit')}
            className="flex items-center gap-2"
          >
            <PencilIcon className="h-4 w-4" />
            {t('edit')}
          </Button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="p-2 rounded-lg text-muted hover:text-error hover:bg-error/10 transition-colors"
            title={t('delete')}
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="border-b border-border">
        <div className="flex gap-4">
          {subTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSubTab(tab.key)}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                subTab === tab.key
                  ? 'border-accent text-foreground'
                  : 'border-transparent text-muted hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {subTab === 'config' && <ConfigView channel={channel} />}
      {subTab === 'sessions' && <ChannelSessionsList channelId={channel.id} />}
      {subTab === 'test' && (
        <div className="py-12 text-center text-sm text-muted">
          {t('testComingSoon')}
        </div>
      )}

      {confirmDelete && (
        <DeleteChannelModal
          channel={channel}
          onClose={() => setConfirmDelete(false)}
          onSuccess={() => { setConfirmDelete(false); onChannelDeleted(channel.id); }}
        />
      )}
    </div>
  );
}

function ConfigView({ channel }: { channel: ChannelResponse }) {
  const t = useTranslations('Channels');
  return (
    <div className="space-y-4">
      <Section title={t('sectionBinding')}>
        <Row label={t('fieldHandler')} value={channel.channelHandler} mono />
        <Row label={t('fieldConnector')} value={channel.connectorCode} mono />
        <Row
          label={t('fieldConnection')}
          value={channel.connectionName || channel.connectionId || '—'}
          mono={!channel.connectionName}
        />
      </Section>

      <Section title={t('sectionConfig')}>
        <pre className="text-xs font-mono bg-surface-secondary border border-border rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
          {JSON.stringify(channel.config, null, 2)}
        </pre>
      </Section>

      {channel.inputFilter && (
        <Section title={t('fieldInputFilter')}>
          <pre className="text-xs font-mono bg-surface-secondary border border-border rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(channel.inputFilter, null, 2)}
          </pre>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-border rounded-lg p-4 space-y-2">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline gap-2 text-xs">
      <span className="text-muted w-32 shrink-0">{label}</span>
      <span className={`text-foreground break-all ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}
