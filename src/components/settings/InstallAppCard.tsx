'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowDownTrayIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { promptInstall, useInstallPrompt } from '@/utils/installPrompt';

type Browser = 'ios' | 'safari' | 'firefox' | 'other';

// Only what decides which instruction to show. iPadOS claims to be a Mac, and
// the touch points are what give it away; every iOS browser installs through
// Safari's share sheet, so the engine is not asked about there. Chrome, Edge
// and Opera all say "Safari/", hence the exclusion.
function detectBrowser(): Browser {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Firefox\/|FxiOS/.test(ua)) return 'firefox';
  if (/Safari\//.test(ua) && !/Chrome\/|Chromium\/|Edg|OPR\//.test(ua)) return 'safari';
  return 'other';
}

/**
 * Offers to install the dashboard as an app, on the settings page.
 *
 * Chromium hands us a prompt to show on click; the others have a menu item
 * instead, so the card names it. Hidden inside an installed app — the offer
 * has been taken — and until the first client render, since the server cannot
 * tell the display mode.
 */
export default function InstallAppCard() {
  const t = useTranslations('Settings');
  const state = useInstallPrompt();
  const [prompting, setPrompting] = useState(false);

  if (!state || state.standalone) return null;

  const handleInstall = async () => {
    setPrompting(true);
    try {
      await promptInstall();
    } finally {
      setPrompting(false);
    }
  };

  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden">
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-surface-secondary">
            <ArrowDownTrayIcon className="h-5 w-5 text-muted" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">{t('installApp.title')}</h2>
            <p className="text-sm text-muted">{t('installApp.description')}</p>
          </div>
        </div>
      </div>
      <div className="px-5 py-4">
        {state.installed ? (
          <p className="flex items-start gap-2 text-sm text-foreground">
            <CheckCircleIcon className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
            <span>{t('installApp.installed')}</span>
          </p>
        ) : state.canPrompt ? (
          <Button variant="primary" loading={prompting} onClick={handleInstall}>
            {t('installApp.install')}
          </Button>
        ) : (
          <p className="text-sm text-muted">{t(`installApp.hint.${detectBrowser()}`)}</p>
        )}
      </div>
    </div>
  );
}
