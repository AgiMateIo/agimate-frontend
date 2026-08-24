'use client';

import { Suspense, useState, useSyncExternalStore } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import apiService from '@/services/api';
import { safeNextPath } from '@/utils/next-path';
import { readReferralCode } from '@/utils/referral';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import AuthShell from '@/components/landing/AuthShell';
import AuthCard from '@/components/auth/AuthCard';
import { Button } from '@/components/ui/Button';
import { FormField, Input } from '@/components/ui/FormField';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { EnvelopeIcon } from '@heroicons/react/24/outline';

const subscribe = () => () => {};
const getReferralSnapshot = () => readReferralCode();
const getReferralServerSnapshot = (): string | null => null;

function RegisterContent() {
  const t = useTranslations('Register');
  const next = safeNextPath(useSearchParams().get('next'));
  // Whoever's invite link brought this visitor here. Registration is the one
  // moment it can be applied; an unusable code is dropped by the backend and
  // never fails the request.
  const referral = useSyncExternalStore(subscribe, getReferralSnapshot, getReferralServerSnapshot);

  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [sent, setSent] = useState(false);
  const [resent, setResent] = useState(false);

  const { loading, error, handleSubmit } = useAsyncForm({
    onSuccess: () => setSent(true),
    defaultError: t('failed'),
  });

  const onSubmit = (e: React.FormEvent) =>
    handleSubmit(e, () =>
      apiService.registerAccount({
        email: email.trim(),
        displayName: displayName.trim() || undefined,
        ref: referral ?? undefined,
      }),
    ).catch(() => {});

  const resend = useAsyncForm({ onSuccess: () => setResent(true), defaultError: t('failed') });
  const onResend = (e: React.FormEvent) =>
    resend.handleSubmit(e, () => apiService.resendRegistrationEmail(email.trim())).catch(() => {});

  const signInHref = next ? `/login?next=${encodeURIComponent(next)}` : '/login';

  if (sent) {
    return (
      <AuthCard>
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-surface-secondary flex items-center justify-center">
            <EnvelopeIcon className="w-6 h-6 text-accent" />
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">{t('sentTitle')}</h1>
          {/* The answer is the same whether the address was free, taken, or has
              already had its letters this hour — this endpoint is otherwise a
              check of who is registered here. So the screen promises a
              condition, not a fact. */}
          <p className="text-muted text-sm mb-6">{t('sentBody', { email: email.trim() })}</p>
          <p className="text-muted text-xs mb-6">{t('sentNote')}</p>

          {resend.error && <div className="mb-4 text-left"><ErrorAlert>{resend.error}</ErrorAlert></div>}

          <form onSubmit={onResend}>
            <Button type="submit" variant="outline" loading={resend.loading} disabled={resent} className="w-full">
              {resent ? t('resent') : t('resend')}
            </Button>
          </form>

          <p className="mt-6 text-sm text-muted">
            <Link href={signInHref} className="text-accent hover:underline">{t('backToSignIn')}</Link>
          </p>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">{t('title')}</h1>
        <p className="text-muted text-sm">{t('subtitle')}</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {error && <ErrorAlert>{error}</ErrorAlert>}

        <FormField label={t('email')} required>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            maxLength={254}
          />
        </FormField>

        <FormField label={t('displayName')} hint={t('displayNameHint')}>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoComplete="name"
            maxLength={200}
          />
        </FormField>

        {/* No password field, and that is not an omission: it is named by
            whoever opens the letter. Otherwise one person picks the password
            and another proves the mailbox. */}
        <p className="text-xs text-muted">{t('passwordLater')}</p>

        <Button type="submit" loading={loading} className="w-full">{t('submit')}</Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        {t('haveAccount')}{' '}
        <Link href={signInHref} className="text-accent hover:underline">{t('signInLink')}</Link>
      </p>
    </AuthCard>
  );
}

export default function RegisterPage() {
  return (
    <AuthShell>
      <Suspense fallback={null}>
        <RegisterContent />
      </Suspense>
    </AuthShell>
  );
}
