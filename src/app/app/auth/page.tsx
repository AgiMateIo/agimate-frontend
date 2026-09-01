import { getTranslations } from 'next-intl/server';
import { ArrowTopRightOnSquareIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import AuthShell from '@/components/landing/AuthShell';
import AuthCard from '@/components/auth/AuthCard';
import { resolveHeaderLocale } from './locale';

// Where the Android chat client is distributed. The repository page rather than
// a release asset: there is no published release yet, and a download link to an
// empty releases page is worse than the README that tells you how to get one.
const INSTALL_URL = 'https://github.com/AgiMateIo/agimate-chat-android';

export default async function AppAuthPage() {
  const locale = await resolveHeaderLocale();
  const t = await getTranslations({ locale, namespace: 'AppAuth' });

  // Nothing reads `searchParams`, on purpose — see the layout. The single-use
  // credentials in the URL belong to the app, and this page's whole job is to be
  // the harmless place they land when the app did not get them.
  return (
    <AuthShell>
      <AuthCard>
        <div className="flex flex-col items-center text-center">
          <CheckCircleIcon className="h-12 w-12 text-success" />
          <h1 className="mt-4 text-2xl font-semibold text-foreground">{t('title')}</h1>
          <p className="mt-3 text-muted leading-relaxed">{t('description')}</p>
          <a
            href={INSTALL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 font-medium text-foreground transition-colors hover:bg-surface-secondary"
          >
            {t('install')}
            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
          </a>
        </div>
      </AuthCard>
    </AuthShell>
  );
}
