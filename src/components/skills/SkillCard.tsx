'use client';

import { useTranslations, useLocale } from 'next-intl';
import { SkillResponse } from '@/types';
import { Link } from '@/i18n/navigation';
import { formatDate } from '@/utils/date';

interface SkillCardProps {
  skill: SkillResponse;
  /** When set, the card renders as a locale-aware <Link>. */
  href?: string;
  /** When set (and no href), the card renders as a clickable <div>. */
  onClick?: () => void;
  /** Render the connector code pills (defaults to false). */
  showConnectorCodes?: boolean;
  /** Right-side action buttons; wrapped so clicks don't trigger the card. */
  actions?: React.ReactNode;
}

export default function SkillCard({
  skill,
  href,
  onClick,
  showConnectorCodes = false,
  actions,
}: SkillCardProps) {
  const t = useTranslations('Skills');
  const locale = useLocale();

  const body = (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {skill.isPublic && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-success/10 text-success">
              {t('public')}
            </span>
          )}
          <span className="text-xs text-muted">
            {t('version', { version: skill.version })}
          </span>
        </div>

        <h3 className="font-medium text-foreground mt-1">{skill.name}</h3>

        {skill.description && (
          <p className="text-sm text-muted mt-0.5 line-clamp-2">
            {skill.description}
          </p>
        )}

        {showConnectorCodes && skill.connectorCodes.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {skill.connectorCodes.map((code) => (
              <span
                key={code}
                className="text-xs font-medium px-2 py-0.5 rounded-full bg-accent/10 text-accent"
              >
                {code}
              </span>
            ))}
          </div>
        )}

        <div className="text-xs text-muted mt-2">
          <span>{t('updatedAt')}: {formatDate(skill.updatedAt, locale)}</span>
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {actions}
        </div>
      )}
    </div>
  );

  const baseClass =
    'bg-surface-secondary rounded-lg p-4 border border-border hover:border-accent/30 transition-colors';

  if (href) {
    return (
      <Link href={href} className={`block ${baseClass}`}>
        {body}
      </Link>
    );
  }

  return (
    <div onClick={onClick} className={`${baseClass} cursor-pointer`}>
      {body}
    </div>
  );
}
