'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import {
  KeyIcon,
  LinkIcon,
  LockClosedIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import apiService, { ApiError } from '@/services/api';
import { API } from '@/config/constants';
import { getApiBaseUrl } from '@/utils/api-url';
import { useUser } from '@/contexts/UserContext';
import { useAuthMethodCacheActions, useAuthMethodsQuery } from '@/queries/auth-methods';
import { providerCodeFromEnum, providersForOrigin, type OfferedProvider } from '@/config/authProviders';
import { ProviderIcon } from '@/components/auth/ProviderIcon';
import ChangePasswordModal from '@/components/settings/ChangePasswordModal';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { RowAction } from '@/components/ui/RowAction';
import { getErrorMessage } from '@/utils/error';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import type { LinkOutcome } from '@/types';

// The host, read through an external store so the server and the first client
// render agree: SSR knows no origin, and deciding which providers to offer from
// `window` mid-render would hydrate differently than it rendered.
const subscribeToOrigin = () => () => {};
const getOrigin = () => window.location.origin;
const getServerOrigin = () => '';

// A proof is spent exactly once, and its outcome outlives the card that asked
// for it.
//
// Both facts have to live at the same level, and that level is the page load —
// not the component. A proof is spendable once, so the attempt cannot be
// repeated on a second mount; if the outcome were held in component state
// instead, anything that unmounts the card (a walk to another dashboard page
// and back) would strand it: the guard below blocks a retry, and the screen is
// left with a "linking…" nobody will ever finish, or with nothing at all. That
// is the bug this store exists to prevent, and holding the state here rather
// than in useMutation is the whole point.
const spentProofs = new Set<string>();

type LinkAttempt =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'done'; provider: string; outcome: LinkOutcome }
  // The proof was expired, already spent or forged — walk the round trip again.
  | { status: 'expired' }
  // Whatever the transport had to say; null when it had nothing of its own.
  | { status: 'failed'; message: string | null };

const IDLE: LinkAttempt = { status: 'idle' };
let linkAttempt: LinkAttempt = IDLE;
const linkListeners = new Set<() => void>();

// Identity is stable between transitions, which is what useSyncExternalStore
// needs: a fresh object per read would re-render forever.
const subscribeToLink = (listener: () => void) => {
  linkListeners.add(listener);
  return () => linkListeners.delete(listener);
};
const getLinkAttempt = () => linkAttempt;
const getServerLinkAttempt = () => IDLE;

const setLinkAttempt = (next: LinkAttempt) => {
  linkAttempt = next;
  linkListeners.forEach((listener) => listener());
};

// Step two of linking, fired once per proof. `onLinked` re-reads the ways-in
// list — only for the two outcomes that changed something.
function runLinkAttempt(proof: string, onLinked: () => void) {
  setLinkAttempt({ status: 'running' });
  apiService
    .linkAuthMethod(proof)
    .then((result) => {
      setLinkAttempt({ status: 'done', provider: result.provider, outcome: result.outcome });
      // Two of the four outcomes are refusals, and they arrive as 200 like the
      // other two — only the ones that changed something are worth a re-read.
      if (result.outcome === 'LINKED' || result.outcome === 'ALREADY_YOURS') onLinked();
    })
    .catch((err) => {
      if (err instanceof ApiError && err.status === 403) setLinkAttempt({ status: 'expired' });
      else setLinkAttempt({ status: 'failed', message: getErrorMessage(err, '') || null });
    });
}

/**
 * The ways into this account: linked providers and a password, each removable
 * as long as one is left.
 *
 * Also the return address of the provider linking round trip. The round trip
 * establishes *which provider* and nothing else — whose account it joins is
 * said by the request below, with an Authorization header a foreign page cannot
 * send. That is why linking is two steps and not one.
 */
export default function AuthMethodsCard() {
  const t = useTranslations('Settings');
  const tp = useTranslations('Common');
  const { user } = useUser();
  const origin = useSyncExternalStore(subscribeToOrigin, getOrigin, getServerOrigin);
  // The list and the link result name a provider in uppercase; a code this build
  // does not know falls back to whatever the backend called it.
  const providerLabel = useCallback(
    (value: string | null) => {
      const code = providerCodeFromEnum(value);
      return code ? tp(`providers.${code}`) : value ?? '';
    },
    [tp],
  );
  const { data, isPending, error } = useAuthMethodsQuery();
  const { invalidateAuthMethods } = useAuthMethodCacheActions();

  const [changingPassword, setChangingPassword] = useState(false);
  const [unlinking, setUnlinking] = useState<{ kind: 'oauth'; provider: string } | { kind: 'password' } | null>(null);
  const [passwordMailSent, setPasswordMailSent] = useState(false);
  const [passwordMailError, setPasswordMailError] = useState<string | null>(null);

  const link = useSyncExternalStore(subscribeToLink, getLinkAttempt, getServerLinkAttempt);

  // Read straight off the address bar rather than through useSearchParams: this
  // runs once on mount and has to rewrite the URL anyway, and reading it here
  // keeps the settings page out of a Suspense boundary it needs for nothing else.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const proof = params.get('link_proof');
    if (!proof) return;

    // Out of the address bar before anything else: left there they would travel
    // in `Referer` and settle into browser history, and a reload would replay a
    // proof that is already spent.
    params.delete('link_proof');
    params.delete('provider');
    const query = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`);

    if (spentProofs.has(proof)) return;
    spentProofs.add(proof);
    runLinkAttempt(proof, invalidateAuthMethods);
    // Once per page load, guarded above — `invalidateAuthMethods` closes over a
    // stable query client, so the identity it had on mount stays good.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The banner belongs to the return from the round trip, not to the rest of the
  // session — without this it would greet every later visit to settings in the
  // same page load. Only a settled attempt is cleared: dropping one still in
  // flight would strand exactly the outcome this store exists to keep.
  useEffect(
    () => () => {
      if (getLinkAttempt().status !== 'running') setLinkAttempt(IDLE);
    },
    [],
  );

  const startLinking = useCallback((provider: OfferedProvider) => {
    // A page navigation, not a fetch: it goes through the provider's domain.
    //
    // `redirect_to` is matched against the installation's allow-list character
    // for character, so it carries no locale prefix — the next-intl proxy adds
    // the visitor's own on the way in, exactly as it does for /login-check.
    const redirectTo = `${window.location.origin}/dashboard/settings`;
    const authorizationUrl = `${getApiBaseUrl()}${API.ENDPOINTS.USER_API}/oauth2/authorization/${provider}`
      + `?link=1&redirect_to=${encodeURIComponent(redirectTo)}`;
    window.location.assign(authorizationUrl);
  }, []);

  const methods = data ?? [];
  const passwordMethod = methods.find((m) => m.type === 'PASSWORD') ?? null;
  const oauthMethods = methods.filter((m) => m.type === 'OAUTH');
  const linkedCodes = new Set(oauthMethods.map((m) => providerCodeFromEnum(m.provider)).filter(Boolean));
  // Offered here on the same terms as on the sign-in screen: a provider you can
  // sign in with is a provider you can link.
  const available = providersForOrigin(origin).filter((p) => !linkedCodes.has(p));
  // The backend refuses to remove the last way in, with a 400. Better to grey
  // the button out than to hand someone a refusal they could not have foreseen.
  const isLastMethod = methods.length <= 1;

  const sendPasswordMail = async () => {
    if (!user?.email) return;
    setPasswordMailError(null);
    try {
      // "Add a password" and "forgot my password" are the same letter — there is
      // no endpoint that sets a password from inside a session.
      await apiService.requestPasswordReset(user.email);
      setPasswordMailSent(true);
    } catch (err) {
      setPasswordMailError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden">
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-surface-secondary">
            <KeyIcon className="h-5 w-5 text-muted" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">{t('authMethods.title')}</h2>
            <p className="text-sm text-muted">{t('authMethods.description')}</p>
          </div>
        </div>
      </div>

      {link.status !== 'idle' && (
        <div className="px-5 pt-5">
          {link.status === 'running' ? (
            <Alert variant="info">{t('authMethods.linking')}</Alert>
          ) : link.status === 'done' ? (
            // LINKED and ALREADY_YOURS are both success; TAKEN and
            // PROVIDER_OCCUPIED are refusals that arrive as 200 all the same, so
            // the status says nothing and the outcome says everything.
            <Alert variant={link.outcome === 'LINKED' || link.outcome === 'ALREADY_YOURS' ? 'success' : 'error'}>
              {t(`authMethods.outcome.${link.outcome}`, { provider: providerLabel(link.provider) })}
            </Alert>
          ) : link.status === 'expired' ? (
            // 403 is the proof itself: expired, already spent, or forged. Five
            // minutes is the trip from the callback to here, not time to think
            // it over — the answer is to walk the round trip again.
            <Alert variant="error">{t('authMethods.linkExpired')}</Alert>
          ) : (
            // ErrorAlert so a transport code (SERVICE_UNAVAILABLE) reads as a
            // sentence rather than as itself.
            <ErrorAlert>{link.message ?? t('authMethods.linkFailed')}</ErrorAlert>
          )}
        </div>
      )}

      {isPending ? (
        <div className="space-y-3 p-5">
          <div className="h-14 animate-pulse rounded-lg bg-surface-secondary" />
          <div className="h-14 animate-pulse rounded-lg bg-surface-secondary" />
        </div>
      ) : error ? (
        <p className="p-5 text-sm text-muted">{t('authMethods.error')}</p>
      ) : (
        <>
          <div className="divide-y divide-border">
            {/* Server order: providers oldest to newest, password last. */}
            {oauthMethods.map((method) => {
              const code = providerCodeFromEnum(method.provider);
              const name = providerLabel(method.provider);
              return (
                <div key={method.provider ?? name} className="px-5 py-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {code
                      ? <ProviderIcon provider={code} className="w-5 h-5 shrink-0" />
                      : <LinkIcon className="w-5 h-5 text-muted shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{name}</p>
                      {/* A provider linked by hand is free not to report an
                          address — null here is normal, not missing data. */}
                      <p className="text-xs text-muted truncate">{method.email ?? t('authMethods.noEmail')}</p>
                    </div>
                  </div>
                  <RowAction
                    icon={TrashIcon}
                    label={t('authMethods.unlink')}
                    disabled={isLastMethod}
                    onClick={() => setUnlinking({ kind: 'oauth', provider: method.provider ?? '' })}
                  />
                </div>
              );
            })}

            {passwordMethod && (
              <div className="px-5 py-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <LockClosedIcon className="w-5 h-5 text-muted shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{t('authMethods.password')}</p>
                    <p className="text-xs text-muted truncate">{passwordMethod.email ?? user?.email ?? ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <RowAction
                    icon={PencilSquareIcon}
                    label={t('authMethods.changePassword')}
                    onClick={() => setChangingPassword(true)}
                  />
                  <RowAction
                    icon={TrashIcon}
                    label={t('authMethods.removePassword')}
                    disabled={isLastMethod}
                    onClick={() => setUnlinking({ kind: 'password' })}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="p-5 border-t border-border space-y-3">
            {/* Only with a row on screen: an empty list means the shape came
                back unreadable, and "you cannot remove the last one" would be
                answering a question nobody asked. */}
            {methods.length === 1 && <p className="text-xs text-muted">{t('authMethods.lastMethodNote')}</p>}

            <p className="text-sm font-medium text-foreground">{t('authMethods.addTitle')}</p>

            <div className="flex flex-wrap gap-2">
              {available.map((provider) => (
                <Button
                  key={provider}
                  variant="outline"
                  className="px-3 py-2 text-sm"
                  onClick={() => startLinking(provider)}
                >
                  <ProviderIcon provider={provider} className="w-4 h-4" />
                  {tp(`providers.${provider}`)}
                </Button>
              ))}

              {!passwordMethod && user?.email && (
                <Button
                  variant="outline"
                  className="px-3 py-2 text-sm"
                  disabled={passwordMailSent}
                  onClick={sendPasswordMail}
                >
                  <LockClosedIcon className="w-4 h-4" />
                  {passwordMailSent ? t('authMethods.addPasswordSent') : t('authMethods.addPassword')}
                </Button>
              )}
            </div>

            {passwordMailSent && <p className="text-xs text-muted">{t('authMethods.addPasswordNote', { email: user?.email ?? '' })}</p>}
            {passwordMailError && <Alert variant="error">{passwordMailError}</Alert>}

            {/* Every change here sends the owner a letter — expected, and worth
                saying before it lands as a surprise. */}
            <p className="text-xs text-muted">{t('authMethods.emailNote')}</p>
          </div>
        </>
      )}

      {changingPassword && (
        <ChangePasswordModal
          onClose={() => setChangingPassword(false)}
          onChanged={() => {
            setChangingPassword(false);
            invalidateAuthMethods();
          }}
        />
      )}

      {unlinking && (
        <ConfirmDeleteModal
          title={unlinking.kind === 'password' ? t('authMethods.removePasswordTitle') : t('authMethods.unlinkTitle')}
          confirmLabel={unlinking.kind === 'password' ? t('authMethods.removePassword') : t('authMethods.unlink')}
          cancelLabel={tp('cancel')}
          defaultError={t('authMethods.unlinkError')}
          onConfirm={async () => {
            if (unlinking.kind === 'password') await apiService.unlinkPasswordMethod();
            else await apiService.unlinkOAuthMethod(unlinking.provider);
          }}
          onClose={() => setUnlinking(null)}
          onSuccess={() => {
            setUnlinking(null);
            invalidateAuthMethods();
          }}
        >
          <p className="text-sm text-foreground">
            {unlinking.kind === 'password'
              ? t('authMethods.removePasswordBody')
              : t('authMethods.unlinkBody', { provider: providerLabel(unlinking.provider) })}
          </p>
          <Alert variant="warning">{t('authMethods.unlinkNote')}</Alert>
        </ConfirmDeleteModal>
      )}
    </div>
  );
}
