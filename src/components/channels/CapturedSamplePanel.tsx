'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface CapturedSamplePanelProps {
  sample: Record<string, unknown>;
  // Dot-paths already present in the input filter, highlighted in the tree.
  activePaths: string[];
  // Add a leaf as a filter condition: inputFilter[path] = value.
  onPick: (path: string, value: string | number | boolean | null) => void;
}

type JsonValue = string | number | boolean | null | { [k: string]: JsonValue } | JsonValue[];

const isObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

export function CapturedSamplePanel({ sample, activePaths, onPick }: CapturedSamplePanelProps) {
  const t = useTranslations('Channels');
  const [open, setOpen] = useState(true);
  const [insertedPath, setInsertedPath] = useState<string | null>(null);

  const handlePick = (path: string, value: JsonValue) => {
    if (isObject(value) || Array.isArray(value)) return;
    onPick(path, value);
    setInsertedPath(path);
    setTimeout(() => setInsertedPath((p) => (p === path ? null : p)), 2200);
  };

  return (
    <div className="border border-border rounded-lg bg-surface-secondary/50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-left"
      >
        <span className="text-xs font-semibold text-foreground">{t('capturedSampleTitle')}</span>
        <ChevronDownIcon
          className={`h-4 w-4 text-muted transition-transform ${open ? '' : '-rotate-90'}`}
        />
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2">
          <div className="text-[11px] text-muted">{t('capturedSampleHint')}</div>
          <div className="font-mono text-xs text-foreground bg-surface rounded border border-border p-2 overflow-x-auto">
            <JsonNode value={sample as JsonValue} path="" activePaths={activePaths} onPick={handlePick} />
          </div>
          {insertedPath && (
            <div className="text-[11px] text-success">
              {t('capturedSampleInserted', { path: insertedPath })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface JsonNodeProps {
  value: JsonValue;
  path: string;
  activePaths: string[];
  onPick: (path: string, value: JsonValue) => void;
}

function JsonNode({ value, path, activePaths, onPick }: JsonNodeProps) {
  if (isObject(value)) {
    const entries = Object.entries(value);
    if (entries.length === 0) return <span className="text-muted">{'{}'}</span>;
    return (
      <div className="pl-3 border-l border-border/50 space-y-0.5">
        {entries.map(([key, child]) => {
          const childPath = path ? `${path}.${key}` : key;
          return (
            <div key={childPath} className="flex flex-wrap items-baseline gap-1.5">
              <span className="text-accent">{key}:</span>
              <JsonNode value={child as JsonValue} path={childPath} activePaths={activePaths} onPick={onPick} />
            </div>
          );
        })}
      </div>
    );
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted">[]</span>;
    return (
      <div className="pl-3 border-l border-border/50 space-y-0.5">
        {value.map((child, idx) => (
          <div key={idx} className="flex flex-wrap items-baseline gap-1.5">
            <span className="text-muted">[{idx}]:</span>
            <JsonNode value={child as JsonValue} path={path} activePaths={activePaths} onPick={onPick} />
          </div>
        ))}
      </div>
    );
  }

  const display =
    value === null ? 'null'
    : typeof value === 'string' ? `"${value}"`
    : String(value);

  const isActive = !!path && activePaths.includes(path);

  return (
    <button
      type="button"
      onClick={() => path && onPick(path, value)}
      disabled={!path}
      title={path || undefined}
      className={`px-1.5 py-0.5 rounded transition-colors text-left ${
        isActive
          ? 'bg-accent/20 ring-1 ring-accent text-foreground'
          : 'hover:bg-accent/10 text-foreground/90'
      } ${!path ? 'cursor-default' : 'cursor-pointer'}`}
    >
      {display}
    </button>
  );
}
