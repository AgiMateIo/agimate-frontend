'use client';

import { useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import { CheckIcon, ClipboardDocumentIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/FormField';
import { useClipboard } from '@/hooks/useClipboard';
import { useIsGuest } from '@/hooks/useIsGuest';
import { useReferralQuery } from '@/queries/referral';
import { buildReferralLink } from '@/utils/referral';

const subscribe = () => () => {};
const getSnapshot = () => window.location.origin;
const getServerSnapshot = () => '';

/**
 * The user's own invite link, on the settings page.
 *
 * The link is assembled here — the backend hands out the code alone, and the
 * host it should point at is whichever domain this instance is served from.
 */
export default function ReferralCard() {
  const t = useTranslations('Settings');
  const tCommon = useTranslations('Common');
  const origin = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isGuest = useIsGuest();
  // An account still awaiting approval gets 403 here, and it has nobody to
  // invite yet anyway — don't ask.
  const { data, isPending, error } = useReferralQuery(!isGuest);
  const { copied, copy } = useClipboard();

  if (isGuest) return null;

  const link = data && origin ? buildReferralLink(origin, data.code) : '';

  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden">
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-surface-secondary">
            <UserPlusIcon className="h-5 w-5 text-muted" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">{t('referral.title')}</h2>
            <p className="text-sm text-muted">{t('referral.description')}</p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {isPending ? (
          <div className="h-11 rounded-lg bg-surface-secondary animate-pulse" />
        ) : error ? (
          <p className="text-sm text-muted">{t('referral.error')}</p>
        ) : (
          <>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                type="text"
                readOnly
                aria-label={t('referral.link')}
                // Empty only until hydration tells us the host; the field is
                // rendered from the start so the card does not jump.
                value={link}
                className="flex-1 font-mono text-sm select-all"
              />
              <Button
                onClick={() => copy(link)}
                disabled={!link}
                className="whitespace-nowrap"
              >
                {copied ? (
                  <>
                    <CheckIcon className="h-5 w-5" />
                    {tCommon('copied')}
                  </>
                ) : (
                  <>
                    <ClipboardDocumentIcon className="h-5 w-5" />
                    {tCommon('copy')}
                  </>
                )}
              </Button>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">{t('referral.invited')}</span>
              <span className="font-medium text-foreground">{data?.invitedCount ?? 0}</span>
            </div>

            {/* The link attributes a sign-up and nothing else: whoever comes in
                through it still waits for approval, and neither side is
                credited anything. Promising more here would be a lie. */}
            <p className="text-xs leading-relaxed text-muted">{t('referral.note')}</p>
          </>
        )}
      </div>
    </div>
  );
}
