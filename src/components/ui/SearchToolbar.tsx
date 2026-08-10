'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FunnelIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface SearchToolbarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  // md — list pages; sm — modals and dense panels.
  size?: 'md' | 'sm';
  // Filter controls (FilterRow/FilterPill rows etc.). When provided, a funnel
  // button appears in the input and toggles their visibility.
  filters?: React.ReactNode;
  // Highlights the funnel while filters are collapsed but in effect.
  filtersActive?: boolean;
}

const SIZES = {
  md: { input: 'pl-10 py-2.5', icon: 'h-5 w-5', funnel: 'h-5 w-5' },
  sm: { input: 'pl-9 py-2', icon: 'h-4 w-4', funnel: 'h-4 w-4' },
};

// The standard search field: magnifier icon, shared styling, and optional
// filters folded behind a funnel toggle (the Connections-page pattern).
export function SearchToolbar({
  value,
  onChange,
  placeholder,
  disabled,
  size = 'md',
  filters,
  filtersActive = false,
}: SearchToolbarProps) {
  const t = useTranslations('Common');
  const [showFilters, setShowFilters] = useState(false);
  const s = SIZES[size];

  return (
    <div className="space-y-2">
      <div className="relative">
        <MagnifyingGlassIcon
          className={`absolute left-3 top-1/2 -translate-y-1/2 ${s.icon} text-muted pointer-events-none`}
        />
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          // 16px below `sm`: iOS Safari zooms the page in when a focused field's
          // font is smaller, and never zooms back out.
          className={`w-full ${s.input} ${filters ? 'pr-11' : 'pr-4'} bg-surface-secondary border border-border rounded-lg text-base text-foreground placeholder:text-muted sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-50`}
        />
        {filters && (
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            disabled={disabled}
            aria-label={t('filters')}
            aria-pressed={showFilters}
            className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-colors ${
              showFilters || filtersActive
                ? 'text-accent bg-accent/10'
                : 'text-muted hover:text-foreground'
            }`}
          >
            <FunnelIcon className={s.funnel} />
          </button>
        )}
      </div>

      {showFilters && filters}
    </div>
  );
}
