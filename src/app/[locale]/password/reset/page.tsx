'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from '@/i18n/navigation';
import apiService, { ApiError } from '@/services/api';
import { userKeys } from '@/contexts/UserContext';
import type { User } from '@/services/types';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import AuthShell from '@/components/landing/AuthShell';
import AuthCard from '@/components/auth/AuthCard';
import { NewPasswordFields, newPasswordProblem, type NewPasswordProblem } from '@/components/auth/NewPasswordFields';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ErrorAlert } from '@/components/ui/ErrorAlert';

function ResetContent() {
  const t = useTranslations('Password');
  const queryClient = useQueryClient();
  const token = useSearchParams().get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [problem, setProblem] = useState<NewPasswordProblem | null>(null);
  const [expired, setExpired] = useState(false);
  const [done, setDone] = useState(false);

  const { loading, error, handleSubmit } = useAsyncForm({
    onSuccess: () => {
      // The reset ended every session of the account, this browser's included —
      // the transport has already dropped the local tokens, and the cached user
      // has to go with them or the shell would keep rendering a signed-in one.
      queryClient.setQueryData<User | null>(userKeys.me(), null);
      setDone(true);
    },
    defaultError: t('resetFailed'),
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
        await apiService.resetPassword(token, password);
      } catch (err) {
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
            href="/password/forgot"
            className="inline-flex w-full items-center justify-center py-2.5 px-4 rounded-lg bg-accent text-accent-foreground font-medium hover:bg-accent/90 transition-colors"
          >
            {t('linkDeadAction')}
          </Link>
        </div>
      </AuthCard>
    );
  }

  if (done) {
    return (
      <AuthCard>
        <div className="text-center">
          <h1 className="text-xl font-semibold text-foreground mb-2">{t('resetDoneTitle')}</h1>
          <p className="text-muted text-sm mb-6">{t('resetDoneBody')}</p>
          <Link
            href="/login"
            className="inline-flex w-full items-center justify-center py-2.5 px-4 rounded-lg bg-accent text-accent-foreground font-medium hover:bg-accent/90 transition-colors"
          >
            {t('backToSignIn')}
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">{t('resetTitle')}</h1>
        <p className="text-muted text-sm">{t('resetSubtitle')}</p>
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

        {/* Not a side effect worth hiding: whoever has forgotten their password
            has no session worth keeping, and the plausible reason they are here
            is that somebody else is holding one. */}
        <Alert variant="warning">{t('resetSignsOutEverywhere')}</Alert>

        <Button type="submit" loading={loading} className="w-full">{t('resetSubmit')}</Button>
      </form>
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell>
      <Suspense fallback={null}>
        <ResetContent />
      </Suspense>
    </AuthShell>
  );
}
