'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQueries } from '@tanstack/react-query';
import apiService from '@/services/api';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Chip } from '@/components/ui/Chip';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { FormField, Select } from '@/components/ui/FormField';
import { Link } from '@/i18n/navigation';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import { agentConnectionsOptions } from '@/queries/agents';
import { connectionsListOptions } from '@/queries/connections';
import { connectorCatalogOptions } from '@/queries/connectors';
import { openAgentAccess } from './skillAccess';
import type { AgentSkillResponse } from '@/types';

interface SkillConnectionsModalProps {
  agentId: string;
  binding: AgentSkillResponse;
  onClose: () => void;
  onSuccess: () => void;
}

// Which instance a skill works with, per connector it declares. Internal
// connectors have nothing to choose — they only need to be open to the agent,
// which this modal does on the way out.
export default function SkillConnectionsModal({
  agentId,
  binding,
  onClose,
  onSuccess,
}: SkillConnectionsModalProps) {
  const t = useTranslations('Agents');

  const [
    { data: userConnections },
    { data: agentConnections, isPending: agentConnectionsPending },
    { data: catalog },
  ] = useQueries({
    queries: [connectionsListOptions(), agentConnectionsOptions(agentId), connectorCatalogOptions()],
  });

  const connectorName = (code: string) =>
    catalog?.find((c) => c.code === code)?.name ?? code;

  const external = binding.connectors.filter((c) => !c.internal);
  const internal = binding.connectors.filter((c) => c.internal);

  const instancesOf = (code: string) =>
    (userConnections ?? []).filter((c) => c.connectorCode === code);

  const [choice, setChoice] = useState<Record<string, string>>(() =>
    Object.fromEntries(external.map((c) => [c.connectorCode, c.connectionId ?? ''])),
  );

  // Instances already open to the agent — anything picked here that isn't gets
  // opened before the map is saved, otherwise the skill would come back yellow
  // the moment it was configured.
  const openIds = useMemo(
    () => new Set((agentConnections ?? []).map((c) => c.connectionId)),
    [agentConnections],
  );
  const openCodes = useMemo(
    () => new Set((agentConnections ?? []).map((c) => c.connectorCode)),
    [agentConnections],
  );

  const { loading, error, handleSubmit } = useAsyncForm({
    onSuccess,
    defaultError: t('skillConnectionsSaveError'),
  });

  const onSubmit = (e: React.FormEvent) =>
    handleSubmit(e, async () => {
      // Open first, choose second: the instance has to be reachable by the
      // agent before the skill points at it.
      await openAgentAccess(agentId, {
        connectionIds: Object.values(choice),
        connectorCodes: internal.map((c) => c.connectorCode),
        openConnectionIds: openIds,
        openConnectorCodes: openCodes,
      });

      // Internal codes are never sent — their instance is the user's only one.
      const map = Object.fromEntries(
        Object.entries(choice).filter(([, id]) => id !== ''),
      );
      await apiService.updateAgentSkillConnections(agentId, binding.skillId, map);
    });

  // Saving before the agent's own connections are known would re-open what is
  // already open — a request the backend has every right to refuse, and the
  // skill would never get its map.
  const notReady = agentConnectionsPending;

  return (
    <Modal isOpen onClose={onClose} title={t('skillConnectionsTitle')} size="md">
      <form onSubmit={onSubmit} className="space-y-4">
        <p className="text-sm text-muted">
          {t('skillConnectionsSubtitle', { skill: binding.skillName ?? binding.skillId })}
        </p>

        {external.map((c) => {
          const instances = instancesOf(c.connectorCode);
          return (
            <FormField key={c.connectorCode} label={connectorName(c.connectorCode)}>
              {instances.length === 0 ? (
                <Alert variant="warning">
                  {t('skillConnectorNoInstance', { name: connectorName(c.connectorCode) })}{' '}
                  <Link href="/dashboard/connections" className="underline">
                    {t('skillConnectorConnectLink')}
                  </Link>
                </Alert>
              ) : (
                <Select
                  value={choice[c.connectorCode] ?? ''}
                  onChange={(e) =>
                    setChoice((prev) => ({ ...prev, [c.connectorCode]: e.target.value }))
                  }
                >
                  <option value="">{t('skillConnectorNotChosen')}</option>
                  {instances.map((instance) => (
                    <option key={instance.id} value={instance.id}>
                      {instance.name || instance.fullCode}
                      {openIds.has(instance.id) ? '' : ` — ${t('skillConnectorWillOpen')}`}
                    </option>
                  ))}
                </Select>
              )}
            </FormField>
          );
        })}

        {internal.length > 0 && (
          <div>
            <p className="text-sm font-medium text-foreground mb-2">{t('skillConnectorsInternal')}</p>
            <div className="flex flex-wrap gap-1.5">
              {internal.map((c) => (
                <Chip key={c.connectorCode} tone={c.satisfied ? 'success' : 'warning'}>
                  {connectorName(c.connectorCode)}
                </Chip>
              ))}
            </div>
            <p className="text-xs text-muted mt-1.5">{t('skillConnectorsInternalHint')}</p>
          </div>
        )}

        {external.length === 0 && internal.length === 0 && (
          <Alert variant="info">{t('skillConnectorsNone')}</Alert>
        )}

        {error && <ErrorAlert>{error}</ErrorAlert>}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading} className="flex-1">
            {t('cancel')}
          </Button>
          {/* A connector with no instance at all does not block the rest: the
              map is replaced wholesale, and a code left out simply stays
              without an instance — that skill connector was broken already. */}
          <Button type="submit" loading={loading} disabled={loading || notReady} className="flex-1">
            {t('save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
