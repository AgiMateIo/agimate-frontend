'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import SkillRequirementSteps from './SkillRequirementSteps';
import {
  openRequiredAccess,
  type CreatedConnections,
  type RequirementChoices,
} from './skillAccess';
import type { AgentSkillResponse } from '@/types';

interface SkillConnectionsModalProps {
  agentId: string;
  binding: AgentSkillResponse;
  onClose: () => void;
  onSuccess: () => void;
}

// Which instance a bound skill works with, per requirement it declares. The
// binding row already carries the plan's record for each requirement — the
// fitting connections, the create form, the rules — so nothing is fetched
// here: the same steps as at binding time, seeded with the current choice.
export default function SkillConnectionsModal({
  agentId,
  binding,
  onClose,
  onSuccess,
}: SkillConnectionsModalProps) {
  const t = useTranslations('Agents');
  const tCommon = useTranslations('Common');

  const [choice, setChoice] = useState<RequirementChoices>({});
  const [created, setCreated] = useState<CreatedConnections>({});

  const { loading, error, handleSubmit } = useAsyncForm({
    onSuccess,
    defaultError: t('skillConnectionsSaveError'),
  });

  const onSubmit = (e: React.SyntheticEvent) =>
    handleSubmit(e, async () => {
      // Open first, choose second: the instance has to be reachable by the
      // agent before the skill points at it, and the skill's rules are written
      // on that binding when the map is saved.
      const map = await openRequiredAccess(agentId, binding.connectors, choice, created);
      await apiService.updateAgentSkillConnections(agentId, binding.skillId, map);
    });

  return (
    <Modal isOpen onClose={onClose} title={t('skillConnectionsTitle')} size="lg">
      {/* Not a <form>: the inline connection form of a step is one, and a form
          nested in a form submits both. The one button below is the only submit. */}
      <div className="space-y-4">
        <p className="text-sm text-muted">
          {t('skillConnectionsSubtitle', { skill: binding.skillName ?? binding.skillId })}
        </p>

        <SkillRequirementSteps
          agentId={agentId}
          connectors={binding.connectors}
          choice={choice}
          onChoice={(key, id) => setChoice((prev) => ({ ...prev, [key]: id }))}
          created={created}
          onCreated={(key, connection) =>
            setCreated((prev) => ({ ...prev, [key]: [...(prev[key] ?? []), connection] }))
          }
          disabled={loading}
        />

        {error && <ErrorAlert>{error}</ErrorAlert>}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading} className="flex-1">
            {tCommon('cancel')}
          </Button>
          {/* A requirement with no instance at all does not block the rest: the
              map is replaced wholesale, and a key left out simply stays
              without an instance — that requirement was broken already. */}
          <Button type="button" onClick={onSubmit} loading={loading} disabled={loading} className="flex-1">
            {tCommon('save')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
