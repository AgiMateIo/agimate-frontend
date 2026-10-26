'use client';

import { useRef } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Input } from '@/components/ui/FormField';
import { RowAction } from '@/components/ui/RowAction';
import { STARTER_LIMITS } from '@/types';

export interface StarterRow {
  // The server id of an agent's existing starter; new rows and preset rows have none.
  id?: string;
  key: string;
  text: string;
}

export const toStarterRows = (texts: string[]): StarterRow[] =>
  texts.map((text, i) => ({ key: `row-${i}`, text }));

// Blank rows are dropped rather than refused — an "add" pressed once too often.
export const starterTexts = (rows: StarterRow[]) => rows.map((r) => r.text.trim()).filter(Boolean);

export const hasDuplicateStarters = (rows: StarterRow[]) => {
  const texts = starterTexts(rows);
  return new Set(texts).size !== texts.length;
};

// The ordered list of one-line starters: edit, reorder, add, remove. Shared by
// the agent's own starters and the preset admin form — the rules are the same.
export function StarterListEditor({
  rows,
  onChange,
  disabled,
  max = STARTER_LIMITS.maxOwn,
}: {
  rows: StarterRow[];
  onChange: (rows: StarterRow[]) => void;
  disabled?: boolean;
  max?: number;
}) {
  const t = useTranslations('Agents');
  const newKey = useRef(0);

  const move = (index: number, delta: number) => {
    const next = [...rows];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    onChange(next);
  };

  return (
    <div>
      <ul className="space-y-2">
        {rows.map((row, i) => (
          <li key={row.key} className="flex items-center gap-1.5">
            {/* A single-line input on purpose: a starter is one line, and the
                input itself drops a pasted line break. */}
            <Input
              value={row.text}
              onChange={(e) =>
                onChange(rows.map((r) => (r.key === row.key ? { ...r, text: e.target.value } : r)))
              }
              disabled={disabled}
              maxLength={STARTER_LIMITS.textLength}
              placeholder={t('starterPlaceholder')}
              aria-label={t('starterAria', { index: i + 1 })}
            />
            <IconButton label={t('starterUp')} onClick={() => move(i, -1)} disabled={disabled || i === 0}>
              <ArrowUpIcon className="h-4 w-4" />
            </IconButton>
            <IconButton
              label={t('starterDown')}
              onClick={() => move(i, 1)}
              disabled={disabled || i === rows.length - 1}
            >
              <ArrowDownIcon className="h-4 w-4" />
            </IconButton>
            <IconButton
              label={t('starterRemove')}
              onClick={() => onChange(rows.filter((r) => r.key !== row.key))}
              disabled={disabled}
            >
              <XMarkIcon className="h-4 w-4" />
            </IconButton>
          </li>
        ))}
      </ul>
      <div className={rows.length > 0 ? 'mt-2' : ''}>
        <RowAction
          icon={PlusIcon}
          label={t('starterAdd')}
          disabled={disabled || rows.length >= max}
          onClick={() => onChange([...rows, { key: `new-${++newKey.current}`, text: '' }])}
        />
      </div>
      {hasDuplicateStarters(rows) && <p className="mt-1 text-xs text-error">{t('startersDuplicate')}</p>}
      {/* It goes out under the user's name, and the agent will remember
          whatever it says as fact. */}
      <p className="mt-2 text-xs text-muted">
        {t('startersHint', { max, length: STARTER_LIMITS.textLength })}
      </p>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-secondary hover:text-foreground disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}
