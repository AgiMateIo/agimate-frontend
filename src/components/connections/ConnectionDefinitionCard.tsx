'use client';

import type { ComponentType, ReactNode, SVGProps } from 'react';
import { useTranslations } from 'next-intl';
import { Chip } from '@/components/ui/Chip';

export interface DefinitionParam {
  name: string;
  required?: boolean;
  // JSON-schema type, when known — shown as a hover hint on the chip.
  type?: string;
}

interface ConnectionDefinitionCardProps {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  // Machine code — the primary identifier, rendered mono.
  name: string;
  // Human-readable label, shown after "name - " when present and distinct.
  title?: string;
  description?: string;
  params: DefinitionParam[];
  // Extra tone-colored chips shown in the header (e.g. tool annotations).
  badges?: ReactNode;
}

// Shared card for a connector definition (tool or trigger). Keeps the Tools and
// Triggers tabs on one visual format: "name - title", description, param chips.
export function ConnectionDefinitionCard({
  icon: Icon,
  name,
  title,
  description,
  params,
  badges,
}: ConnectionDefinitionCardProps) {
  const t = useTranslations('ConnectionDetail');
  const showTitle = title && title !== name;

  return (
    <div className="rounded-lg border border-border bg-surface-secondary p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          {/* Header: name - title */}
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-mono text-sm font-medium text-foreground break-all">
              {name}
            </span>
            {showTitle && (
              <span className="text-sm text-muted">- {title}</span>
            )}
            {badges && <span className="flex items-center gap-1.5">{badges}</span>}
          </div>

          {description && (
            <p className="text-sm text-muted mt-1">{description}</p>
          )}

          {/* Parameters */}
          <div className="mt-3">
            <span className="text-xs font-medium text-muted">
              {t('paramsLabel')}
            </span>
            {params.length === 0 ? (
              <span className="text-xs text-muted/70 ml-2 italic">
                {t('noParams')}
              </span>
            ) : (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {params.map((p) => (
                  <span key={p.name} title={p.type}>
                    <Chip tone={p.required ? 'accent' : 'default'}>
                      {p.name}
                      {p.required && <span className="ml-0.5">*</span>}
                    </Chip>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
