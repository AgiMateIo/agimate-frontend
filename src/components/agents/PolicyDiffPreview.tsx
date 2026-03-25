'use client';

import { useTranslations } from 'next-intl';
import { PolicyDiffResponse } from '@/types';

interface PolicyDiffPreviewProps {
  diff: PolicyDiffResponse;
}

export default function PolicyDiffPreview({ diff }: PolicyDiffPreviewProps) {
  const t = useTranslations('Agents');

  const hasAdd = diff.policiesToAdd.length > 0;
  const hasRemove = diff.policiesToRemove.length > 0;

  if (!hasAdd && !hasRemove) {
    return (
      <div className="text-xs text-muted italic">{t('noPolicyChanges')}</div>
    );
  }

  const formatEntry = (entry: { policyType: string; connectorCode: string; name: string | null }) => {
    const typeBadge = entry.policyType === 'TOOL' ? t('policyTypeTool') : t('policyTypeTrigger');
    const name = entry.name || '*';
    return `${entry.connectorCode} / ${name}`;
  };

  return (
    <div className="space-y-2 text-xs">
      {hasAdd && (
        <div>
          <div className="font-medium text-success mb-1">{t('policiesToAdd')}:</div>
          <ul className="space-y-0.5">
            {diff.policiesToAdd.map((entry, i) => (
              <li key={i} className="flex items-center gap-2 text-muted">
                <span className="text-success">+</span>
                <span className={`inline-block rounded px-1.5 py-0.5 font-medium ${
                  entry.policyType === 'TOOL' ? 'bg-primary/10 text-primary' : 'bg-warning/10 text-warning'
                }`}>
                  {entry.policyType === 'TOOL' ? t('policyTypeTool') : t('policyTypeTrigger')}
                </span>
                <span className="font-mono">{formatEntry(entry)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {hasRemove && (
        <div>
          <div className="font-medium text-error mb-1">{t('policiesToRemove')}:</div>
          <ul className="space-y-0.5">
            {diff.policiesToRemove.map((entry, i) => (
              <li key={i} className="flex items-center gap-2 text-muted">
                <span className="text-error">−</span>
                <span className={`inline-block rounded px-1.5 py-0.5 font-medium ${
                  entry.policyType === 'TOOL' ? 'bg-primary/10 text-primary' : 'bg-warning/10 text-warning'
                }`}>
                  {entry.policyType === 'TOOL' ? t('policyTypeTool') : t('policyTypeTrigger')}
                </span>
                <span className="font-mono">{formatEntry(entry)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
