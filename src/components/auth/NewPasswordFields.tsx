'use client';

import { useTranslations } from 'next-intl';
import { FormField } from '@/components/ui/FormField';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { checkPassword, MAX_PASSWORD_BYTES, MIN_PASSWORD_LENGTH } from '@/utils/password';

export type NewPasswordProblem = 'tooShort' | 'tooLong' | 'mismatch';

// The three ways a new password can be wrong before the request is worth making:
// the backend's two rules, plus the repeat field this side adds.
export function newPasswordProblem(password: string, confirm: string): NewPasswordProblem | null {
  const problem = checkPassword(password);
  if (problem) return problem;
  if (password !== confirm) return 'mismatch';
  return null;
}

interface NewPasswordFieldsProps {
  password: string;
  onPasswordChange: (value: string) => void;
  confirm: string;
  onConfirmChange: (value: string) => void;
  // Shown only after a submit attempt: complaining about "too short" into a
  // field somebody is still typing into is noise.
  problem: NewPasswordProblem | null;
  label?: string;
}

export function NewPasswordFields({
  password,
  onPasswordChange,
  confirm,
  onConfirmChange,
  problem,
  label,
}: NewPasswordFieldsProps) {
  const t = useTranslations('Password');

  return (
    <>
      <FormField
        label={label ?? t('newPassword')}
        required
        hint={t('rules', { min: MIN_PASSWORD_LENGTH, max: MAX_PASSWORD_BYTES })}
        error={
          problem && problem !== 'mismatch'
            ? t(`problem.${problem}`, { min: MIN_PASSWORD_LENGTH, max: MAX_PASSWORD_BYTES })
            : undefined
        }
      >
        <PasswordInput
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          autoComplete="new-password"
          required
        />
      </FormField>

      <FormField
        label={t('repeatPassword')}
        required
        error={problem === 'mismatch' ? t('problem.mismatch') : undefined}
      >
        <PasswordInput
          value={confirm}
          onChange={(e) => onConfirmChange(e.target.value)}
          autoComplete="new-password"
          required
        />
      </FormField>
    </>
  );
}
