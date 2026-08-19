'use client';

import { useTranslations } from 'next-intl';
import { Alert } from '@/components/ui/Alert';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { useUser } from '@/contexts/UserContext';
import apiService, { ApiError } from '@/services/api';
import type { UserSessionResponse } from '@/types';

interface RevokeSessionModalProps {
  session: UserSessionResponse;
  /** Human-readable name of the device, as shown on the row. */
  deviceName: string;
  /** The sign-in this browser is using — revoking it is a sign-out, not a row edit. */
  isCurrent: boolean;
  onClose: () => void;
  onRevoked: () => void;
}

/**
 * Confirmation for revoking one sign-in.
 *
 * Two different questions behind one button: another device is a row that
 * disappears from a list, the current one is "sign me out here", and they get
 * their own wording rather than a shared "revoke?".
 */
export default function RevokeSessionModal({
  session,
  deviceName,
  isCurrent,
  onClose,
  onRevoked,
}: RevokeSessionModalProps) {
  const t = useTranslations('Settings');
  const tCommon = useTranslations('Common');
  const { logout } = useUser();

  const handleConfirm = async () => {
    try {
      await apiService.revokeUserSession(session.id);
    } catch (error) {
      // Already revoked (or never ours): the list is about to be re-read, and
      // it will simply not contain the row — that is the outcome asked for.
      if (!(error instanceof ApiError && error.status === 404)) throw error;
    }

    if (isCurrent) {
      // The refresh token is dead server-side; clearing local state and leaving
      // the dashboard is the rest of a sign-out. The access token in this tab
      // still works until it expires, so staying on a dashboard page would look
      // like the revoke did nothing.
      await logout();
      window.location.href = '/';
    }
  };

  return (
    <ConfirmDeleteModal
      title={isCurrent ? t('sessions.revokeCurrentTitle') : t('sessions.revokeTitle')}
      confirmLabel={isCurrent ? t('sessions.revokeCurrentConfirm') : t('sessions.revokeConfirm')}
      cancelLabel={tCommon('cancel')}
      onConfirm={handleConfirm}
      onClose={onClose}
      onSuccess={onRevoked}
      defaultError={t('sessions.revokeError')}
      blockCloseWhileLoading
    >
      {isCurrent ? (
        <p className="text-sm text-foreground">{t('sessions.revokeCurrentBody')}</p>
      ) : (
        <>
          <p className="text-sm text-foreground">
            {t('sessions.revokeBody', { device: deviceName })}
          </p>
          {/* Nothing here is instant, and saying otherwise is the one way this
              screen can mislead someone who is trying to lock an attacker out. */}
          <Alert variant="warning">{t('sessions.revokeNote')}</Alert>
        </>
      )}
    </ConfirmDeleteModal>
  );
}
