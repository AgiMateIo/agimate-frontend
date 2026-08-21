'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ClipboardDocumentIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';
import { useClipboard } from '@/hooks/useClipboard';
import { getApiBaseUrl } from '@/utils/api-url';
import ConnectorsTab from '@/components/connectors/ConnectorsTab';

export default function ConnectorsPage() {
  const t = useTranslations('Connectors');
  const tCommon = useTranslations('Common');
  const { copied, copy } = useClipboard();
  const apiBaseUrl = getApiBaseUrl();

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
            <Link href="/desktop" target="_blank" className="text-accent hover:underline">{t('desktopApp')}</Link>
            {' / '}
            <Link href="/android" target="_blank" className="text-accent hover:underline">{t('androidApp')}</Link>
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
            title={tCommon('copy')}
          >
            {copied ? (
              <ClipboardDocumentCheckIcon className="w-5 h-5 text-success" />
            ) : (
              <ClipboardDocumentIcon className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Connectors */}
      <ConnectorsTab />
    </div>
  );
}
