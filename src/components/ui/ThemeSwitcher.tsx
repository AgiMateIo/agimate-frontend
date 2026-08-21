'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ComputerDesktopIcon, MoonIcon, SunIcon } from '@heroicons/react/24/outline';
import { useTheme } from '@/hooks/useTheme';
import type { ThemePreference } from '@/utils/theme';

// Same shape as LocaleSwitcher — button plus a small dropdown — because the two
// sit side by side and a different mechanism for the neighbouring control reads
// as an accident.
const OPTIONS: { value: ThemePreference; Icon: typeof SunIcon; key: 'system' | 'light' | 'dark' }[] = [
  { value: 'system', Icon: ComputerDesktopIcon, key: 'system' },
  { value: 'light', Icon: SunIcon, key: 'light' },
  { value: 'dark', Icon: MoonIcon, key: 'dark' },
];

export default function ThemeSwitcher() {
  const t = useTranslations('Common');
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // No mounted flag here on purpose: the store's getServerSnapshot returns
  // 'system', so React hydrates the neutral icon and swaps it on the first
  // client render. That is what useSyncExternalStore is for, and the guarded
  // store exists precisely to keep preferences out of a setState-in-effect.

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const TriggerIcon = (OPTIONS.find((o) => o.value === theme) ?? OPTIONS[0]).Icon;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t('theme')}
        title={t('theme')}
        className="flex items-center rounded-lg bg-surface-secondary px-2 py-1 text-muted transition-colors hover:text-foreground"
      >
        <TriggerIcon className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 rounded-lg border border-border bg-surface-secondary py-1 shadow-lg">
          {OPTIONS.map(({ value, Icon, key }) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setTheme(value);
                setOpen(false);
              }}
              // `text-left` is not decorative: a button centres its text by default, and
              // the longest label wraps without `whitespace-nowrap` — together they made
              // the first option sit centred over two lines while the others were flush.
              className={`flex w-full items-center gap-2 whitespace-nowrap px-3 py-1.5 text-left text-xs font-medium transition-colors ${
                value === theme ? 'text-accent' : 'text-muted hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {t(`theme_${key}`)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
