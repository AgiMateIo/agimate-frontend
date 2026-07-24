'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import apiService, { ApiError } from '@/services/api';
import { Link } from '@/i18n/navigation';
import type { ConnectionResponse, ConnectorCatalogEntry } from '@/types';
import { Button } from '@/components/ui/Button';
import { FormField, Input } from '@/components/ui/FormField';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
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
  const queryClient = useQueryClient();
  const [name, setName] = useState(initialName);
  // set when the backend rejects the credentials as a duplicate instance (409)
  const [conflict, setConflict] = useState<ConnectionResponse | null>(null);

  const credentialFields = connector.integrationMeta?.credentialFields ?? {};
  const { credentials, handleFieldChange, allFieldsFilled, filledCredentials } =
    useCredentialFields(credentialFields);

  const { loading, error, fieldErrors, handleSubmit } = useAsyncForm<ConnectionResponse>({
    onSuccess,
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
      let created: ConnectionResponse;
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
      // DYNAMIC connectors (e.g. MCP) discover tools per instance — warm the
      // tools cache right after connecting. Don't fail creation if this errors.
      if (connector.capabilities?.definitionBinding === 'DYNAMIC') {
        try {
          await apiService.testConnection(created.id);
        } catch (err) {
          console.error('Failed to discover tools for new connection:', err);
        }
      }
      return created;
    });

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

      {loading && <p className="text-xs text-muted">{t('validatingHint')}</p>}

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          type="submit"
          disabled={loading || !allFieldsFilled}
          loading={loading}
          className="flex-1"
        >
          {t('create')}
        </Button>
      </div>
    </form>
  );
}
