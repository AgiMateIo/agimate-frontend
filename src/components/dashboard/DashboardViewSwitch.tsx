'use client';

import { useTranslations } from 'next-intl';
import { FaceSmileIcon, Squares2X2Icon } from '@heroicons/react/24/outline';
import type { DashboardViewMode } from './viewMode';

interface DashboardViewSwitchProps {
  mode: DashboardViewMode;
  onChange: (mode: DashboardViewMode) => void;
  // Dot on the work-mode button — set once that mode has something worth a look
  // (failed jobs, denied tool calls). Keeps the friendly mode from hiding trouble.
  alert?: boolean;
}

export default function DashboardViewSwitch({
  mode,
  onChange,
  alert = false,
}: DashboardViewSwitchProps) {
  const t = useTranslations('DashboardHome');

  const options: { id: DashboardViewMode; label: string; icon: typeof FaceSmileIcon }[] = [
    { id: 'overview', label: t('modeOverview'), icon: FaceSmileIcon },
    { id: 'pro', label: t('modePro'), icon: Squares2X2Icon },
  ];

  return (
    <div
      role="group"
      aria-label={t('modeLabel')}
      className="inline-flex shrink-0 gap-0.5 rounded-lg border border-border bg-surface p-0.5"
    >
      {options.map(({ id, label, icon: Icon }) => {
        const active = mode === id;

        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-pressed={active}
            className={`relative flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? 'bg-surface-secondary text-foreground'
                : 'text-muted hover:text-foreground'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
            {id === 'pro' && alert && (
              <span
                aria-label={t('modeProAlert')}
                className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-error"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
