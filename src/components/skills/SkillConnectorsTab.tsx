'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { PencilIcon, PuzzlePieceIcon } from '@heroicons/react/24/outline';
import { SkillDetailResponse } from '@/types';
import { connectorCatalogOptions } from '@/queries/connectors';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { skillRequirements } from '@/utils/skill';
import EditSkillConnectorsModal from './EditSkillConnectorsModal';
import SkillAccessRulesSummary from './SkillAccessRulesSummary';

interface SkillConnectorsTabProps {
  skill: SkillDetailResponse;
  isEditable: boolean;
}

// One row per requirement, not per connector code: a skill may want two MCP
// servers, and what tells them apart — the key, the address, the rules — is
// exactly what the row shows.
export default function SkillConnectorsTab({ skill, isEditable }: SkillConnectorsTabProps) {
  const t = useTranslations('Skills');
  const [showEdit, setShowEdit] = useState(false);

  const { data: catalog } = useQuery(connectorCatalogOptions());
  const catalogByCode = useMemo(
    () => new Map((catalog ?? []).map((c) => [c.code, c])),
    [catalog],
  );

  const requirements = skillRequirements(skill);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-muted">
          {t('connectorsCount', { count: requirements.length })}
        </div>
        {isEditable && (
          <Button onClick={() => setShowEdit(true)} className="flex items-center gap-2">
            <PencilIcon className="h-4 w-4" />
            {t('editConnectors')}
          </Button>
        )}
      </div>

      {requirements.length === 0 ? (
        <div className="bg-surface-secondary rounded-lg border border-border/50 p-8 text-center text-sm text-muted">
          {t('noConnectors')}
        </div>
      ) : (
        <ul className="space-y-2">
          {requirements.map((r) => {
            const key = r.key ?? r.code;
            const entry = catalogByCode.get(r.code);
            const name = entry?.name ?? r.code;
            const params = Object.entries(r.params ?? {});
            return (
              <li
                key={key}
                className="flex items-start gap-3 rounded-lg border border-border bg-surface-secondary px-4 py-3"
              >
                <PuzzlePieceIcon className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground">{r.title ?? name}</p>
                    {r.title && r.title !== name && <Chip>{name}</Chip>}
                    {key !== r.code && (
                      <Chip tone="muted" title={t('requirementKeyHint')}>
                        {key}
                      </Chip>
                    )}
                  </div>
                  <p className="text-xs text-muted font-mono">{r.code}</p>
                  {params.length > 0 && (
                    <dl className="text-xs text-muted">
                      {params.map(([field, value]) => (
                        <div key={field} className="flex gap-2">
                          <dt className="font-mono shrink-0">{field}:</dt>
                          <dd className="font-mono break-all">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  <SkillAccessRulesSummary requirement={r} />
                  {entry?.description && !r.title && (
                    <p className="text-xs text-muted line-clamp-2">{entry.description}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {showEdit && (
        <EditSkillConnectorsModal
          skill={skill}
          onClose={() => setShowEdit(false)}
        />
      )}
    </div>
  );
}
