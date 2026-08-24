'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import apiService from '@/services/api';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import AuthShell from '@/components/landing/AuthShell';
import AuthCard from '@/components/auth/AuthCard';
import { Button } from '@/components/ui/Button';
import { FormField, Input } from '@/components/ui/FormField';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { EnvelopeIcon } from '@heroicons/react/24/outline';

export default function ForgotPasswordPage() {
  const t = useTranslations('Password');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const { loading, error, handleSubmit } = useAsyncForm({
    onSuccess: () => setSent(true),
    defaultError: t('forgotFailed'),
  });

  const onSubmit = (e: React.FormEvent) =>
    handleSubmit(e, () => apiService.requestPasswordReset(email.trim())).catch(() => {});

  return (
    <AuthShell>
      <AuthCard>
        {sent ? (
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-surface-secondary flex items-center justify-center">
              <EnvelopeIcon className="w-6 h-6 text-accent" />
            </div>
            <h1 className="text-xl font-semibold text-foreground mb-2">{t('forgotSentTitle')}</h1>
            {/* Stated flatly, and identical whether the address is registered
                or not — that sameness is the point: worded conditionally on the
                address, this screen would answer "who has an account here",
                which is the one thing the endpoint refuses to answer. */}
            <p className="text-muted text-sm mb-6">{t('forgotSentBody', { email: email.trim() })}</p>
            <Link href="/login" className="text-sm text-accent hover:underline">{t('backToSignIn')}</Link>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-foreground mb-2">{t('forgotTitle')}</h1>
              {/* One operation with two doors: this screen, and "add a password"
                  in settings for an account that only has providers. */}
              <p className="text-muted text-sm">{t('forgotSubtitle')}</p>
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

              <Button type="submit" loading={loading} className="w-full">{t('forgotSubmit')}</Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted">
              <Link href="/login" className="text-accent hover:underline">{t('backToSignIn')}</Link>
            </p>
          </>
        )}
      </AuthCard>
    </AuthShell>
  );
}
