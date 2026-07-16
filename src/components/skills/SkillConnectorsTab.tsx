'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { PencilIcon, PuzzlePieceIcon } from '@heroicons/react/24/outline';
import { SkillDetailResponse } from '@/types';
import { connectorCatalogOptions } from '@/queries/connectors';
import { Button } from '@/components/ui/Button';
import EditSkillConnectorsModal from './EditSkillConnectorsModal';

interface SkillConnectorsTabProps {
  skill: SkillDetailResponse;
  isEditable: boolean;
}

export default function SkillConnectorsTab({ skill, isEditable }: SkillConnectorsTabProps) {
  const t = useTranslations('Skills');
  const [showEdit, setShowEdit] = useState(false);

  const { data: catalog } = useQuery(connectorCatalogOptions());
  const catalogByCode = useMemo(
    () => new Map((catalog ?? []).map((c) => [c.code, c])),
    [catalog],
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-muted">
          {t('connectorsCount', { count: skill.connectorCodes.length })}
        </div>
        {isEditable && (
          <Button onClick={() => setShowEdit(true)} className="flex items-center gap-2">
            <PencilIcon className="h-4 w-4" />
            {t('editConnectors')}
          </Button>
        )}
      </div>

      {skill.connectorCodes.length === 0 ? (
        <div className="bg-surface-secondary rounded-lg border border-border/50 p-8 text-center text-sm text-muted">
          {t('noConnectors')}
        </div>
      ) : (
        <ul className="space-y-2">
          {skill.connectorCodes.map((code) => {
            const entry = catalogByCode.get(code);
            return (
              <li
                key={code}
                className="flex items-start gap-3 rounded-lg border border-border bg-surface-secondary px-4 py-3"
              >
                <PuzzlePieceIcon className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {entry?.name ?? code}
                  </p>
                  <p className="text-xs text-muted font-mono">{code}</p>
                  {entry?.description && (
                    <p className="text-xs text-muted mt-1 line-clamp-2">
                      {entry.description}
                    </p>
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
