'use client';

import { useTranslations } from 'next-intl';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlusCircleIcon,
} from '@heroicons/react/24/outline';
import { Chip } from '@/components/ui/Chip';
import type { AgentSkillConnectorStatus } from '@/types';

// What is wrong with one connector of a skill, and therefore what fixes it.
// The three unsatisfied cases look alike in the API and need different words:
// "no instance of this service at all" is not "you never said which telegram"
// is not "that telegram isn't open to this agent".
export type ConnectorFix = 'ok' | 'open' | 'choose' | 'connect';

export function connectorFix(
  connector: AgentSkillConnectorStatus,
  hasInstances: boolean,
): ConnectorFix {
  if (connector.satisfied !== false) return 'ok';
  // An instance is chosen (or, for an internal connector, implied) — all that is
  // missing is opening it to the agent, which is one request from here.
  if (connector.connectionId || connector.internal) return 'open';
  // Instances exist but none is picked: the fix is choosing, not connecting.
  return hasInstances ? 'choose' : 'connect';
}

const TONE = {
  ok: 'success',
  open: 'warning',
  choose: 'warning',
  connect: 'error',
} as const;

const ICON = {
  ok: CheckCircleIcon,
  open: PlusCircleIcon,
  choose: ExclamationTriangleIcon,
  connect: ExclamationTriangleIcon,
} as const;

// One connector of one skill. Reads as a status when there is nothing to do and
// as a button when there is — the fix is always one click from the diagnosis.
export default function SkillConnectorChip({
  connector,
  connectorName,
  fix,
  onClick,
  pending,
}: {
  connector: AgentSkillConnectorStatus;
  // Display name from the catalog; falls back to the raw code.
  connectorName: string;
  fix: ConnectorFix;
  onClick?: () => void;
  pending?: boolean;
}) {
  const t = useTranslations('Agents');

  const label =
    fix === 'ok' || fix === 'open'
      ? connector.connectionName || connectorName
      : connectorName;
  const title = t(`skillConnector_${fix}`, { name: connector.connectionName || connectorName });

  const chip = (
    <Chip tone={TONE[fix]} icon={ICON[fix]}>
      {label}
    </Chip>
  );

  if (fix === 'ok' || !onClick) {
    return <span title={title}>{chip}</span>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      title={title}
      className="rounded-full transition-opacity hover:opacity-80 disabled:opacity-50"
    >
      {chip}
    </button>
  );
}
