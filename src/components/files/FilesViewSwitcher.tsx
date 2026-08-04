'use client';

import { useTranslations } from 'next-intl';
import {
  RectangleGroupIcon,
  Squares2X2Icon,
  TableCellsIcon,
} from '@heroicons/react/24/outline';
import type { FilesViewMode } from './filesViewMode';

const MODES: {
  value: FilesViewMode;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  labelKey: 'viewTable' | 'viewCompact' | 'viewCards';
}[] = [
  { value: 'table', icon: TableCellsIcon, labelKey: 'viewTable' },
  { value: 'compact', icon: Squares2X2Icon, labelKey: 'viewCompact' },
  { value: 'cards', icon: RectangleGroupIcon, labelKey: 'viewCards' },
];

// Segmented icon control. Icon-only on purpose: it sits next to the page title
// and the mode is obvious from the layout it produces.
export function FilesViewSwitcher({
  mode,
  onChange,
}: {
  mode: FilesViewMode;
  onChange: (mode: FilesViewMode) => void;
}) {
  const t = useTranslations('Files');

  return (
    <div
      role="group"
      aria-label={t('viewModeLabel')}
      className="flex shrink-0 items-center gap-0.5 rounded-lg border border-border bg-surface-secondary p-0.5"
    >
      {MODES.map(({ value, icon: Icon, labelKey }) => {
        const active = mode === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            aria-pressed={active}
            title={t(labelKey)}
            aria-label={t(labelKey)}
            className={`grid h-8 w-8 place-items-center rounded-md transition-colors ${
              active
                ? 'bg-accent text-accent-foreground'
                : 'text-muted hover:bg-surface hover:text-foreground'
            }`}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
