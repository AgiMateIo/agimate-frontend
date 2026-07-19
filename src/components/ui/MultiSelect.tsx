'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface MultiSelectProps {
  // Button caption; a selection count is appended when anything is picked.
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  clearLabel: string;
  disabled?: boolean;
  className?: string;
}

// Checkbox-dropdown counterpart to Select for multi-value filters. Options are
// plain strings shown as-is; selection state matches by exact value.
export function MultiSelect({
  label,
  options,
  selected,
  onChange,
  clearLabel,
  disabled,
  className = '',
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const toggle = (value: string) =>
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled || options.length === 0}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`w-full px-4 py-2.5 bg-surface-secondary border rounded-lg text-sm text-left flex items-center justify-between gap-2 disabled:opacity-50 transition-colors ${
          selected.length > 0 ? 'border-accent text-foreground' : 'border-border text-muted'
        }`}
      >
        <span className="truncate">
          {label}
          {selected.length > 0 && ` · ${selected.length}`}
        </span>
        <ChevronDownIcon className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full min-w-[12rem] bg-surface border border-border rounded-lg shadow-lg py-1 max-h-64 overflow-y-auto">
          {options.map((option) => (
            <label
              key={option}
              className="flex items-center gap-2.5 px-3 py-1.5 text-sm text-foreground hover:bg-surface-secondary cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.includes(option)}
                onChange={() => toggle(option)}
                className="h-4 w-4 rounded border-border accent-accent shrink-0"
              />
              <span className="truncate">{option}</span>
            </label>
          ))}
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full text-left px-3 py-1.5 text-sm text-muted hover:text-foreground hover:bg-surface-secondary border-t border-border mt-1"
            >
              {clearLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
