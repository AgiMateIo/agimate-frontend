'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import apiService, { ApiError } from '@/services/api';
import { useUser } from '@/contexts/UserContext';
import { clearReferralCode } from '@/utils/referral';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import AuthShell from '@/components/landing/AuthShell';
import AuthCard from '@/components/auth/AuthCard';
import { NewPasswordFields, newPasswordProblem, type NewPasswordProblem } from '@/components/auth/NewPasswordFields';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';

function ConfirmContent() {
  const t = useTranslations('Register');
  const router = useRouter();
  const { fetchUser } = useUser();
  // The link out of the letter; the account does not exist until it is spent.
  const token = useSearchParams().get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [problem, setProblem] = useState<NewPasswordProblem | null>(null);
  const [expired, setExpired] = useState(false);

  const { loading, error, handleSubmit } = useAsyncForm({
    onSuccess: async () => {
      // The invite code travelled with the registration request and has had its
      // only chance to apply; keeping it would re-send it on the next sign-in.
      clearReferralCode();
      await fetchUser();
      router.replace('/dashboard');
    },
    defaultError: t('confirmFailed'),
  });

  const onSubmit = (e: React.FormEvent) => {
    const found = newPasswordProblem(password, confirm);
    setProblem(found);
    if (found || !token) {
      e.preventDefault();
      return;
    }
    handleSubmit(e, async () => {
      try {
        await apiService.confirmRegistration(token, password);
      } catch (err) {
        // 403 is the link itself: expired, already spent, or forged. Nothing
        // about this form can fix that — the way out is a fresh letter.
        if (err instanceof ApiError && err.status === 403) setExpired(true);
        throw err;
      }
    }).catch(() => {});
  };

  if (!token || expired) {
    return (
      <AuthCard>
        <div className="text-center">
          <h1 className="text-xl font-semibold text-foreground mb-2">{t('linkDeadTitle')}</h1>
          <p className="text-muted text-sm mb-6">{t('linkDeadBody')}</p>
          <Link
            href="/register"
            className="inline-flex w-full items-center justify-center py-2.5 px-4 rounded-lg bg-accent text-accent-foreground font-medium hover:bg-accent/90 transition-colors"
          >
            {t('linkDeadAction')}
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">{t('confirmTitle')}</h1>
        <p className="text-muted text-sm">{t('confirmSubtitle')}</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {error && <ErrorAlert>{error}</ErrorAlert>}

        <NewPasswordFields
          password={password}
          onPasswordChange={setPassword}
          confirm={confirm}
          onConfirmChange={setConfirm}
          problem={problem}
        />

        <Button type="submit" loading={loading} className="w-full">{t('confirmSubmit')}</Button>
      </form>
    </AuthCard>
  );
}

export default function RegisterConfirmPage() {
  return (
    <AuthShell>
      <Suspense fallback={null}>
        <ConfirmContent />
      </Suspense>
    </AuthShell>
  );
}
