'use client';

import { useTranslations, useLocale } from 'next-intl';
import { AcademicCapIcon } from '@heroicons/react/24/outline';
import { Chip } from '@/components/ui/Chip';
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
    <div className="flex items-start gap-3">
      {/* Same tile as the connector's tool/trigger cards — the skill's icon is
          the one the sidebar and the agent tabs already use for skills. */}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
        <AcademicCapIcon className="h-5 w-5" />
      </div>

      <div className="flex-1 min-w-0">
        {/* Title leads; version and visibility trail it as metadata. */}
        <div className="flex items-baseline gap-2 flex-wrap">
          <h3 className="font-medium text-foreground">{skill.title}</h3>
          <span className="text-xs text-muted">
            {t('version', { version: skill.version })}
          </span>
          {skill.isPublic && (
            <Chip strong tone="success">{t('public')}</Chip>
          )}
        </div>

        {skill.description && (
          <p className="text-sm text-muted mt-1 line-clamp-2">
            {skill.description}
          </p>
        )}

        {showConnectorCodes && skill.connectorCodes.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {skill.connectorCodes.map((code) => (
              <Chip key={code} strong tone="accent">{code}</Chip>
            ))}
          </div>
        )}

        <div className="text-xs text-muted mt-2">
          <span>{t('updatedAt')}: {formatDate(skill.updatedAt, locale)}</span>
        </div>
      </div>

      {actions && (
        <div className="flex shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
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
