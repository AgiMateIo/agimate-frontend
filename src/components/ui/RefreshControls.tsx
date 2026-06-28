'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

export const REFRESH_OPTIONS = [
  { value: null, label: 'Off' },
  { value: 5, label: '5s' },
  { value: 10, label: '10s' },
  { value: 30, label: '30s' },
] as const;

interface RefreshControlsProps {
  value: number | null;
  onChange: (v: number | null) => void;
  onRefresh: () => void;
}

export function RefreshControls({ value, onChange, onRefresh }: RefreshControlsProps) {
  const [refreshOpen, setRefreshOpen] = useState(false);
  const refreshRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (refreshRef.current && !refreshRef.current.contains(e.target as Node)) {
        setRefreshOpen(false);
      }
    };
    if (refreshOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [refreshOpen]);

  const currentLabel = REFRESH_OPTIONS.find((o) => o.value === value)?.label ?? 'Off';

  return (
    <div className="flex items-center gap-2">
      <div ref={refreshRef} className="relative">
        <button
          onClick={() => setRefreshOpen((v) => !v)}
          className="px-2 py-1 rounded-lg bg-surface-secondary text-xs font-medium text-muted hover:text-foreground transition-colors"
        >
          {value === null ? 'Auto' : currentLabel}
        </button>
        {refreshOpen && (
          <div className="absolute right-0 mt-1 rounded-lg bg-surface-secondary shadow-lg border border-border py-1 z-50 min-w-[48px]">
            {REFRESH_OPTIONS.map(({ value: optionValue, label }) => (
              <button
                key={label}
                onClick={() => {
                  onChange(optionValue);
                  setRefreshOpen(false);
                }}
                className={`block w-full px-3 py-1 text-xs font-medium transition-colors ${
                  optionValue === value
                    ? 'text-accent'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        onClick={onRefresh}
        className="p-1 rounded-lg text-muted hover:text-foreground hover:bg-surface-secondary transition-colors"
        title="Refresh"
      >
        <ArrowPathIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
