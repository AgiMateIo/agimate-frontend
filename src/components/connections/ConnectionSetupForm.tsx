'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import apiService, { ApiError } from '@/services/api';
import { Link } from '@/i18n/navigation';
import type {
  ConnectionResponse,
  ConnectorCatalogEntry,
  ConnectorPresetResponse,
  CreateConnectionResult,
  CredentialFieldSpec,
} from '@/types';
import { Button } from '@/components/ui/Button';
import { FormField, Input } from '@/components/ui/FormField';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { getErrorMessage } from '@/utils/error';
import { connectionNameFromUrl } from '@/utils/connection-name';
import { parseHttpsUrl } from '@/utils/mcp-view';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import { connectionsListOptions } from '@/queries/connections';
import { ConnectionAvatar } from './ConnectionAvatar';
import CredentialFieldsForm, { useCredentialFields } from './CredentialFieldsForm';
import {
  PresetAuthMethodField,
  PresetHeaderFields,
  usePresetFields,
} from './PresetFields';

interface ConnectionSetupFormProps {
  connector: ConnectorCatalogEntry;
  // A catalogue preset to prefill the form from: its card, the merged
  // credential fields, the extra header inputs and the auth-method choice.
  // The request itself stays an ordinary create.
  preset?: ConnectorPresetResponse;
  initialName?: string;
  // Pre-filled values (a skill's declared instance — the MCP server's URL);
  // secrets are never among them. Read once, on mount.
  initialCredentials?: Record<string, string> | null;
  // The form to render instead of the catalog entry's — a skill binding plan
  // carries its own copy, and the two are meant to be the same declaration.
  credentialFields?: Record<string, CredentialFieldSpec>;
  // The connector header is redundant where the caller already names the
  // connector (a wizard step titled after it).
  hideHeader?: boolean;
  // No way back from this form (a wizard step that has nothing else to offer).
  hideCancel?: boolean;
  onSuccess: (connection: ConnectionResponse) => void;
  onCancel: () => void;
  cancelLabel: string;
}

// The backend reports a duplicate instance as
// `... already exists for <connector>: <subCode>`.
function parseConflictSubCode(message: string): string | null {
  const match = /already exists for [^:]+:\s*(.+)$/i.exec(message.trim());
  return match ? match[1].trim() : null;
}

/**
 * Step "configure connection": credential fields for one connector plus an
 * optional display name. Shared by the add-connection modal and the deep-link
 * page (`/dashboard/connections/create?connector=…`), so both behave
 * identically; a catalogue preset only prefills it.
 */
export default function ConnectionSetupForm({
  connector,
  preset,
  initialName = '',
  initialCredentials,
  credentialFields: credentialFieldsOverride,
  hideHeader = false,
  hideCancel = false,
  onSuccess,
  onCancel,
  cancelLabel,
}: ConnectionSetupFormProps) {
  const t = useTranslations('Connections');
  const tAuth = useTranslations('ConnectionAuth');
  const tPresets = useTranslations('ConnectorPresets');
  const queryClient = useQueryClient();
  const presetFields = usePresetFields(preset);
  const startingName = preset?.card.name ?? initialName;
  const [name, setName] = useState(startingName);
  // Until the user types a name of their own, it follows the server address
  // (a preset already starts with the service's name).
  const [nameEdited, setNameEdited] = useState(startingName !== '');
  // set when the backend rejects the credentials as a duplicate instance (409)
  const [conflict, setConflict] = useState<ConnectionResponse | null>(null);
  // the browser is on its way to the provider's consent screen — nothing left
  // to do here, but the form must not look idle while the navigation happens
  const [redirecting, setRedirecting] = useState(false);
  // created in PENDING_AUTH, but minting the consent URL failed: the row exists,
  // so send the user to its card rather than have them create a second one
  const [pendingAuth, setPendingAuth] = useState<ConnectionResponse | null>(null);

  const credentialFields = preset
    ? presetFields.visibleCredentialFields
    : (credentialFieldsOverride ?? connector.integrationMeta?.credentialFields ?? {});
  // A preset's non-secret values (the MCP URL) ride in `params`; they are
  // ordinary credentials once the form starts.
  const presetInitialValues = preset ? { ...initialCredentials, ...preset.form.params } : initialCredentials;
  const { credentials, handleFieldChange, canSubmit, filledCredentials } =
    useCredentialFields(credentialFields, presetInitialValues);

  const urlField = Object.entries(credentialFields).find(
    ([, spec]) => spec.required && spec.type === 'URL',
  )?.[0];
  const presetUrl = preset?.form.params.url;
  const suggestedName = urlField
    ? connectionNameFromUrl(credentials[urlField])
    : presetUrl
      ? connectionNameFromUrl(presetUrl)
      : null;
  // A cleared name still falls back to the service's own name, not to nothing.
  const fallbackName = preset?.card.name ?? suggestedName;
  const shownName = nameEdited ? name : (fallbackName ?? '');
  const docsUrl = parseHttpsUrl(preset?.card.docsUrl);

  // null result = we are leaving the SPA for the consent screen; routing to the
  // connection card now would fight the redirect.
  const { loading, error, fieldErrors, handleSubmit, setError } = useAsyncForm<ConnectionResponse | null>({
    onSuccess: (connection) => { if (connection) onSuccess(connection); },
    defaultError: t('createError'),
  });

  // A detail keyed to a field this form does not render (a preset's URL, a
  // token hidden under OAuth) has no slot of its own — it goes into the alert.
  const unshownFieldErrors = Object.entries(fieldErrors)
    .filter(([field]) => !Object.hasOwn(credentialFields, field))
    .map(([, message]) => message)
    .filter(Boolean);
  const shownError = [error, ...unshownFieldErrors].filter(Boolean).join('; ') || null;

  // 409 → point the user at the connection that already holds this instance.
  const findConflictingConnection = async (message: string) => {
    const subCode = parseConflictSubCode(message);
    try {
      const connections = await queryClient.fetchQuery(connectionsListOptions());
      const sameConnector = connections.filter((c) => c.connectorCode === connector.code);
      return (
        sameConnector.find((c) => subCode != null && c.subCode === subCode) ??
        (sameConnector.length === 1 ? sameConnector[0] : null)
      );
    } catch {
      return null;
    }
  };

  const onSubmit = (e: React.FormEvent) =>
    handleSubmit(e, async () => {
      setConflict(null);
      setPendingAuth(null);
      const credentialValues = filledCredentials();
      if (preset) {
        // A hidden token must not ride along after switching to OAuth, and the
        // dedicated header inputs are assembled the way a hand-filled MCP form
        // sends them.
        if (!presetFields.tokenVisible) delete credentialValues.auth_token;
        const headers = presetFields.buildHeaders();
        if (headers) credentialValues.headers = headers;
      }
      let created: CreateConnectionResult;
      try {
        created = await apiService.createConnection({
          connectorCode: connector.code,
          credentials: credentialValues,
          name: shownName.trim() || fallbackName || undefined,
        });
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          setConflict(await findConflictingConnection(err.message));
        }
        throw err;
      }

      // The server asked for OAuth: the row exists but has no tokens yet, so
      // there is nothing to discover and nothing to show as "connected". Keep
      // it one continuous step — straight on to the provider's consent screen.
      if (created.status === 'authorization_required') {
        setRedirecting(true);
        try {
          const { authorizationUrl } = await apiService.startConnectionAuthorization(
            created.connection.id,
          );
          window.location.assign(authorizationUrl);
        } catch (err) {
          // Creation itself worked, so `createError` would be a lie — and the
          // row must not be created twice. Report the authorization failure and
          // point at the card the user can retry from.
          setRedirecting(false);
          setPendingAuth(created.connection);
          setError(getErrorMessage(err, tAuth('startError')));
        }
        return null;
      }

      // DYNAMIC connectors (e.g. MCP) discover tools per instance — warm the
      // tools cache right after connecting. Don't fail creation if this errors.
      if (connector.capabilities?.definitionBinding === 'DYNAMIC') {
        try {
          await apiService.testConnection(created.connection.id);
        } catch (err) {
          console.error('Failed to discover tools for new connection:', err);
        }
      }
      return created.connection;
    }).catch(() => {});

  // `loading` drops back to false the moment the action returns, but on the
  // OAuth path the browser is still navigating away — keep the form frozen.
  const busy = loading || redirecting;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {!hideHeader &&
        (preset ? (
          <div className="space-y-2 rounded-lg border border-border bg-surface-secondary p-3">
            <div className="flex items-start gap-3">
              <ConnectionAvatar
                connectorCode={preset.code}
                connectorName={preset.card.name}
                iconUrl={preset.card.iconUrl}
              />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-foreground">{preset.card.name}</div>
                {presetUrl && <p className="mt-0.5 break-all text-xs text-muted">{presetUrl}</p>}
                {docsUrl && (
                  <a
                    href={docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block text-xs text-accent underline hover:no-underline"
                  >
                    {tPresets('whereToGetToken')}
                  </a>
                )}
              </div>
            </div>
            {preset.card.description && (
              <p className="text-xs text-muted">{preset.card.description}</p>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-secondary border border-border">
            <ConnectionAvatar connectorCode={connector.code} connectorName={connector.name} />
            <div className="min-w-0">
              <div className="font-medium text-foreground">{connector.name}</div>
              {connector.description && (
                <p className="text-xs text-muted mt-0.5">{connector.description}</p>
              )}
            </div>
          </div>
        ))}

      {preset && <PresetAuthMethodField state={presetFields} />}

      <CredentialFieldsForm
        credentialFields={credentialFields}
        credentials={credentials}
        fieldErrors={fieldErrors}
        onFieldChange={handleFieldChange}
        afterRequired={
          preset ? undefined : (
            <FormField label={t('name')}>
              <Input
                type="text"
                value={shownName}
                onChange={(e) => {
                  setNameEdited(true);
                  setName(e.target.value);
                }}
                placeholder={suggestedName ?? t('namePlaceholder')}
                maxLength={100}
              />
            </FormField>
          )
        }
      />

      {preset && <PresetHeaderFields state={presetFields} />}

      {preset && (
        <FormField label={t('name')}>
          <Input
            type="text"
            value={shownName}
            onChange={(e) => {
              setNameEdited(true);
              setName(e.target.value);
            }}
            placeholder={fallbackName ?? t('namePlaceholder')}
            maxLength={100}
          />
        </FormField>
      )}

      {shownError && <ErrorAlert>{shownError}</ErrorAlert>}

      {conflict && (
        <Link
          href={`/dashboard/connections/${conflict.id}`}
          className="block text-sm text-accent underline hover:no-underline"
        >
          {t('openExistingConnection', { name: conflict.name || conflict.fullCode })}
        </Link>
      )}

      {pendingAuth && (
        <Link
          href={`/dashboard/connections/${pendingAuth.id}`}
          className="block text-sm text-accent underline hover:no-underline"
        >
          {t('openPendingConnection', { name: pendingAuth.name || pendingAuth.fullCode })}
        </Link>
      )}

      {loading && !redirecting && <p className="text-xs text-muted">{t('validatingHint')}</p>}
      {redirecting && <p className="text-xs text-muted">{t('authorizingHint')}</p>}

      <div className="flex gap-3 pt-2">
        {!hideCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
        )}
        <Button
          type="submit"
          disabled={busy || !canSubmit || !presetFields.complete}
          loading={busy}
          className="flex-1"
        >
          {t('create')}
        </Button>
      </div>
    </form>
  );
}
