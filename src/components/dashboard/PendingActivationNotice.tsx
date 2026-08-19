'use client';

import { useTranslations } from 'next-intl';
import { ClockIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { Link } from '@/i18n/navigation';
import { useUser } from '@/contexts/UserContext';

// Shown in place of every dashboard page while the account is still a GUEST.
// The only actions left are re-checking the role (activation happens outside the
// app, so nothing pushes it here), signing out, and the one page a pending
// account may still open — the device list, which is where a lost phone gets
// its sign-in revoked.
export default function PendingActivationNotice() {
  const t = useTranslations('PendingActivation');
  const { user, loading, fetchUser, logout } = useUser();

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-warning/10">
          <ClockIcon className="h-7 w-7 text-warning" />
        </div>

        <h1 className="mt-5 text-xl font-semibold text-foreground">{t('title')}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t('description')}</p>

        {user?.email && (
          <p className="mt-4 truncate text-sm text-muted">
            {t('signedInAs')} <span className="font-medium text-foreground">{user.email}</span>
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button onClick={() => fetchUser()} loading={loading}>
            {t('checkAgain')}
          </Button>
          <Button variant="secondary" onClick={() => logout()}>
            {t('logOut')}
          </Button>
        </div>

        <Link
          href="/dashboard/settings"
          className="mt-5 inline-block text-sm text-accent hover:underline"
        >
          {t('myDevices')}
        </Link>
      </div>
    </div>
  );
}
