'use client';

import { useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { hasStoredSession } from '@/services/api';
import { usePrimaryHref } from '@/contexts/PrimaryOriginContext';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

const subscribe = () => () => {};
const getServerSnapshot = () => false;

const PRIMARY_CLASS =
  'inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-7 py-3.5 font-medium text-accent-foreground shadow-lg shadow-accent/25 transition-colors hover:bg-accent/90 sm:w-auto';

// "Create agent": straight into the wizard for someone signed in on this
// browser (registering again would open a second session), otherwise sign-up
// carrying the preset — /register and /login remember it for the dashboard.
export function CatalogCta({ presetName }: { presetName: string }) {
  const t = useTranslations('CatalogPage');
  const signedIn = useSyncExternalStore(subscribe, hasStoredSession, getServerSnapshot);
  const registerHref = usePrimaryHref('/register', { preset: presetName });
  const loginHref = usePrimaryHref('/login', { preset: presetName });

  if (signedIn) {
    return (
      <Link href={`/dashboard/agents/create?preset=${encodeURIComponent(presetName)}`} className={PRIMARY_CLASS}>
        {t('cta.create')}
        <ArrowRightIcon className="h-4 w-4" />
      </Link>
    );
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <Link href={registerHref} className={PRIMARY_CLASS}>
        {t('cta.create')}
        <ArrowRightIcon className="h-4 w-4" />
      </Link>
      <p className="text-sm text-muted">{t('cta.note')}</p>
      <Link href={loginHref} className="text-sm font-medium text-accent hover:underline">
        {t('cta.haveAccount')}
      </Link>
    </div>
  );
}
