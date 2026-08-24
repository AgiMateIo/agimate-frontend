'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Alert } from '@/components/ui/Alert';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { NewPasswordFields, newPasswordProblem, type NewPasswordProblem } from '@/components/auth/NewPasswordFields';

/**
 * Changing a password from inside a live session.
 *
 * Ends every *other* session and keeps this one: knowing the current password is
 * no reason to make someone sign in again on all their devices.
 */
export default function ChangePasswordModal({
  onClose,
  onChanged,
}: {
  onClose: () => void;
  onChanged: () => void;
}) {
  const t = useTranslations('Settings');
  const tp = useTranslations('Password');
  const tc = useTranslations('Common');

  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [problem, setProblem] = useState<NewPasswordProblem | null>(null);

  const { loading, error, handleSubmit } = useAsyncForm({
    onSuccess: onChanged,
    defaultError: t('authMethods.changePasswordError'),
  });

  const onSubmit = (e: React.FormEvent) => {
    const found = newPasswordProblem(password, confirm);
    setProblem(found);
    if (found) {
      e.preventDefault();
      return;
    }
    handleSubmit(e, () => apiService.changePassword(current, password)).catch(() => {});
  };

  return (
    <Modal isOpen onClose={loading ? () => {} : onClose} title={t('authMethods.changePassword')}>
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <ErrorAlert>{error}</ErrorAlert>}

        <FormField label={tp('currentPassword')} required>
          <PasswordInput
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
            required
          />
        </FormField>

        <NewPasswordFields
          password={password}
          onPasswordChange={setPassword}
          confirm={confirm}
          onConfirmChange={setConfirm}
          problem={problem}
        />

        <Alert variant="warning">{t('authMethods.changePasswordNote')}</Alert>

        <div className="flex gap-3 pt-2 justify-end">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            {tc('cancel')}
          </Button>
          <Button type="submit" loading={loading}>{tc('save')}</Button>
        </div>
      </form>
    </Modal>
  );
}
