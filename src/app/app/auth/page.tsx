import { getTranslations } from 'next-intl/server';
import { ArrowTopRightOnSquareIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import AuthShell from '@/components/landing/AuthShell';
import AuthCard from '@/components/auth/AuthCard';
import { resolveHeaderLocale } from './locale';

// Where the Android chat client is distributed.
const INSTALL_URL = 'https://www.rustore.ru/catalog/app/ru.agimate.chat';

export default async function AppAuthPage() {
  const locale = await resolveHeaderLocale();
  const t = await getTranslations({ locale, namespace: 'AppAuth' });

  // Nothing reads `searchParams`, on purpose — see the layout. The single-use
  // credentials in the URL belong to the app, and this page's whole job is to be
  // the harmless place they land when the app did not get them. The "back to
  // the app" button carries no link: the layout's script holds it and shows the
  // button only on Android with credentials in the URL.
  return (
    <AuthShell>
      <AuthCard>
        <div className="flex flex-col items-center text-center">
          <CheckCircleIcon className="h-12 w-12 text-success" />
          <h1 className="mt-4 text-2xl font-semibold text-foreground">{t('title')}</h1>
          <p data-app-return-hidden className="mt-3 text-muted leading-relaxed">
            {t('description')}
          </p>
          <p data-app-return-only className="mt-3 text-muted leading-relaxed">
            {t('returnDescription')}
          </p>
          <div className="mt-8 flex flex-col items-center gap-3">
            <button
              type="button"
              data-app-return-link
              className="items-center justify-center gap-2 rounded-lg bg-accent px-5 py-2.5 font-medium text-accent-foreground transition-colors hover:bg-accent/90 disabled:cursor-default disabled:opacity-60"
            >
              <span data-app-returning-hidden>{t('return')}</span>
              <span data-app-returning-only>{t('returning')}</span>
            </button>
            <a
              href={INSTALL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 font-medium text-foreground transition-colors hover:bg-surface-secondary"
            >
              {t('install')}
              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            </a>
          </div>
        </div>
      </AuthCard>
    </AuthShell>
  );
}
