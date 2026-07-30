'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Chip, type ChipTone } from '@/components/ui/Chip';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Select } from '@/components/ui/FormField';
import { localeMap } from '@/i18n/routing';
import { useUpdateUserRoleMutation } from '@/queries/admin';
import type { AdminUserResponse, UserRole } from '@/types';
import { formatDate, formatDateTimeFull } from '@/utils/date';
import { getErrorMessage } from '@/utils/error';
import AdminUserUsage from './AdminUserUsage';

const ROLES: UserRole[] = ['GUEST', 'USER', 'ADMIN'];

// GUEST is a state to act on (the account waits for approval), ADMIN carries
// weight, USER is the ordinary case.
const ROLE_TONE = {
  GUEST: 'warning',
  USER: 'default',
  ADMIN: 'accent',
} as const satisfies Record<UserRole, ChipTone>;

const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
};

export default function AdminUserRow({
  user,
  expanded,
  onToggle,
  isSelf,
}: {
  user: AdminUserResponse;
  expanded: boolean;
  onToggle: () => void;
  isSelf: boolean;
}) {
  const t = useTranslations('Admin');
  const tCommon = useTranslations('Common');
  const locale = useLocale();

  const mutation = useUpdateUserRoleMutation();
  const [selectedRole, setSelectedRole] = useState<UserRole>(user.role);
  const [error, setError] = useState('');
  const [changed, setChanged] = useState(false);

  // Display name when the provider gave one, otherwise whatever of the real name
  // came through — both may be missing, email is the only guaranteed field.
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
  const secondaryName = user.displayName ?? fullName;

  const submitRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setChanged(false);
    try {
      await mutation.mutateAsync({ id: user.id, role: selectedRole });
      setChanged(true);
    } catch (err) {
      setError(getErrorMessage(err, t('roleChangeFailed')));
    }
  };

  return (
    <>
      <tr
        onClick={onToggle}
        className="border-b border-border last:border-b-0 cursor-pointer transition-colors hover:bg-surface-secondary/50"
      >
        <td className="py-3 pl-4 align-top">
          <button
            type="button"
            aria-expanded={expanded}
            aria-label={t('toggleDetails')}
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="grid h-6 w-6 place-items-center rounded-md text-muted transition-colors hover:bg-surface-secondary hover:text-foreground"
          >
            <ChevronRightIcon
              className={`h-4 w-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
            />
          </button>
        </td>
        <td className="py-3 px-4 align-top">
          <div className="text-sm text-foreground break-all">{user.email}</div>
          {secondaryName && <div className="text-xs text-muted">{secondaryName}</div>}
        </td>
        <td className="py-3 px-4 align-top">
          <Chip tone={ROLE_TONE[user.role]}>{t(`role_${user.role}`)}</Chip>
        </td>
        <td
          className="py-3 px-4 align-top text-sm text-muted whitespace-nowrap"
          title={formatDateTimeFull(user.createdAt)}
        >
          {formatDate(user.createdAt, localeMap[locale], DATE_OPTIONS)}
        </td>
      </tr>

      {expanded && (
        <tr className="border-b border-border last:border-b-0 bg-surface-secondary/30">
          <td colSpan={4} className="px-4 py-4">
            <div className="grid gap-6 md:grid-cols-2">
              <form onSubmit={submitRole} className="space-y-3">
                <div className="text-sm font-medium text-foreground">{t('changeRoleTitle')}</div>
                <p className="text-xs text-muted">{t('roleMeaningHint')}</p>

                <div className="flex items-center gap-2">
                  <div className="w-44">
                    <Select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                      disabled={isSelf}
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {t(`role_${role}`)}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <Button
                    type="submit"
                    loading={mutation.isPending}
                    disabled={isSelf || selectedRole === user.role}
                  >
                    {tCommon('save')}
                  </Button>
                </div>

                {/* Changing your own role is rejected by the backend — an admin
                    must not be able to lock themselves (or everyone) out. */}
                {isSelf && <p className="text-xs text-muted">{t('selfRoleHint')}</p>}
                {error && <ErrorAlert>{error}</ErrorAlert>}
                {changed && <Alert variant="info">{t('roleChangeDelayNotice')}</Alert>}
              </form>

              <AdminUserUsage userId={user.id} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
