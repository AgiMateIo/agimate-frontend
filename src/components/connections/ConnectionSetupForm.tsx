'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import apiService, { ApiError } from '@/services/api';
import { Link } from '@/i18n/navigation';
import type {
  ConnectionResponse,
  ConnectorCatalogEntry,
  CreateConnectionResult,
} from '@/types';
import { Button } from '@/components/ui/Button';
import { FormField, Input } from '@/components/ui/FormField';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { getErrorMessage } from '@/utils/error';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import { connectionsListOptions } from '@/queries/connections';
import { ConnectionAvatar } from './ConnectionAvatar';
import CredentialFieldsForm, { useCredentialFields } from './CredentialFieldsForm';

interface ConnectionSetupFormProps {
  connector: ConnectorCatalogEntry;
  initialName?: string;
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
 * page (`/connections/new?connector=…`), so both behave identically.
 */
export default function ConnectionSetupForm({
  connector,
  initialName = '',
  onSuccess,
  onCancel,
  cancelLabel,
}: ConnectionSetupFormProps) {
  const t = useTranslations('Connections');
  const tAuth = useTranslations('ConnectionAuth');
  const queryClient = useQueryClient();
  const [name, setName] = useState(initialName);
  // set when the backend rejects the credentials as a duplicate instance (409)
  const [conflict, setConflict] = useState<ConnectionResponse | null>(null);
  // the browser is on its way to the provider's consent screen — nothing left
  // to do here, but the form must not look idle while the navigation happens
  const [redirecting, setRedirecting] = useState(false);
  // created in PENDING_AUTH, but minting the consent URL failed: the row exists,
  // so send the user to its card rather than have them create a second one
  const [pendingAuth, setPendingAuth] = useState<ConnectionResponse | null>(null);

  const credentialFields = connector.integrationMeta?.credentialFields ?? {};
  const { credentials, handleFieldChange, canSubmit, filledCredentials } =
    useCredentialFields(credentialFields);

  // null result = we are leaving the SPA for the consent screen; routing to the
  // connection card now would fight the redirect.
  const { loading, error, fieldErrors, handleSubmit, setError } = useAsyncForm<ConnectionResponse | null>({
    onSuccess: (connection) => { if (connection) onSuccess(connection); },
    defaultError: t('createError'),
  });

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
      let created: CreateConnectionResult;
      try {
        created = await apiService.createConnection({
          connectorCode: connector.code,
          credentials: filledCredentials(),
          name: name.trim() || undefined,
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
    });

  // `loading` drops back to false the moment the action returns, but on the
  // OAuth path the browser is still navigating away — keep the form frozen.
  const busy = loading || redirecting;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-secondary border border-border">
        <ConnectionAvatar connectorCode={connector.code} connectorName={connector.name} />
        <div className="min-w-0">
          <div className="font-medium text-foreground">{connector.name}</div>
          {connector.description && (
            <p className="text-xs text-muted mt-0.5">{connector.description}</p>
          )}
        </div>
      </div>

      <FormField label={t('name')}>
        <Input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('namePlaceholder')}
          maxLength={100}
        />
      </FormField>

      <CredentialFieldsForm
        credentialFields={credentialFields}
        credentials={credentials}
        fieldErrors={fieldErrors}
        onFieldChange={handleFieldChange}
      />

      {error && <ErrorAlert>{error}</ErrorAlert>}

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
        <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
          {cancelLabel}
        </Button>
        <Button
          type="submit"
          disabled={busy || !canSubmit}
          loading={busy}
          className="flex-1"
        >
          {t('create')}
        </Button>
      </div>
    </form>
  );
}
