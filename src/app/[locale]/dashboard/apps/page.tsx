'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { ClipboardDocumentIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';
import { Tabs } from '@/components/ui/Tabs';
import { useClipboard } from '@/hooks/useClipboard';
import { getApiBaseUrl } from '@/utils/api-url';
import AppsTab from '@/components/apps/AppsTab';
import TriggerLogsTab from '@/components/apps/TriggerLogsTab';
import ToolUseLogsTab from '@/components/apps/ToolUseLogsTab';

export default function AppsPage() {
  const t = useTranslations('Apps');
  const locale = useLocale();
  const [activeTab, setActiveTab] = useState('apps');
  const { copied, copy } = useClipboard();
  const apiBaseUrl = getApiBaseUrl();

  const tabs = [
    {
      id: 'apps',
      label: t('appsTab'),
      content: <AppsTab />,
    },
    {
      id: 'trigger-logs',
      label: t('triggerLogsTab'),
      content: (
        <div className="bg-surface rounded-xl border border-border p-6">
          <TriggerLogsTab />
        </div>
      ),
    },
    {
      id: 'tool-use-logs',
      label: t('toolUseLogsTab'),
      content: (
        <div className="bg-surface rounded-xl border border-border p-6">
          <ToolUseLogsTab />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
        <p className="text-muted mt-1">{t('subtitle')}</p>
      </div>

      {/* Getting Started */}
      <div className="bg-surface rounded-xl border border-border p-6 space-y-3">
        <h2 className="text-lg font-semibold text-foreground">{t('gettingStartedTitle')}</h2>
        <ol className="list-decimal list-inside text-sm text-muted space-y-1.5">
          <li>{t('gettingStartedStep1')}</li>
          <li>
            {t('gettingStartedStep2')}{' '}
            <Link href={`/${locale}/desktop`} target="_blank" className="text-accent hover:underline">{t('desktopApp')}</Link>
            {' / '}
            <Link href={`/${locale}/android`} target="_blank" className="text-accent hover:underline">{t('androidApp')}</Link>
          </li>
        </ol>
        <div className="flex items-center gap-2 pt-1">
          <span className="text-sm text-muted shrink-0">API URL:</span>
          <code className="flex-1 bg-surface-secondary border border-border/50 rounded-lg px-4 py-2.5 text-sm font-mono text-foreground truncate">
            {apiBaseUrl}
          </code>
          <button
            onClick={() => copy(apiBaseUrl)}
            className="shrink-0 p-2.5 rounded-lg border border-border/50 hover:bg-surface-secondary transition-colors text-muted hover:text-foreground"
            title="Copy API URL"
          >
            {copied ? (
              <ClipboardDocumentCheckIcon className="w-5 h-5 text-success" />
            ) : (
              <ClipboardDocumentIcon className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
