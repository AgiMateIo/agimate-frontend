'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

export type JsonLeaf = string | number | boolean | null;

type MessageModeProps = {
  mode: 'message';
  sample: Record<string, unknown>;
  currentPath: string;
  suggestedPath?: string | null;
  onPickPath: (path: string) => void;
};

type FilterModeProps = {
  mode: 'filter';
  sample: Record<string, unknown>;
  currentFilter: Record<string, unknown>;
  onAddFilter: (path: string, value: JsonLeaf) => void;
  disabled?: boolean;
  disabledReason?: string | null;
};

type CapturedSamplePanelProps = MessageModeProps | FilterModeProps;

type JsonValue = string | number | boolean | null | { [k: string]: JsonValue } | JsonValue[];

const isObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

export function CapturedSamplePanel(props: CapturedSamplePanelProps) {
  const t = useTranslations('Channels');
  const [open, setOpen] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const title = props.mode === 'message' ? t('capturedSampleTitle') : t('capturedSampleTitleFilter');
  const hint = props.mode === 'message' ? t('capturedSampleHint') : t('capturedSampleHintFilter');
  const suggestedTitle = t('capturedSampleSuggested');

  const isDisabled = props.mode === 'filter' && !!props.disabled;

  const handlePick = (path: string, value: JsonLeaf) => {
    let message: string;
    if (props.mode === 'filter') {
      if (isDisabled) return;
      props.onAddFilter(path, value);
      message = t('capturedSampleInsertedFilter', { path, value: JSON.stringify(value) });
    } else {
      props.onPickPath(path);
      message = t('capturedSampleInserted', { path });
    }
    setToast(message);
    setTimeout(() => setToast((curr) => (curr === message ? null : curr)), 2400);
  };

  const getLeafState = (path: string): 'current' | 'suggested' | 'normal' => {
    if (!path) return 'normal';
    if (props.mode === 'message') {
      if (path === props.currentPath) return 'current';
      if (props.suggestedPath && path === props.suggestedPath) return 'suggested';
      return 'normal';
    }
    // filter mode: leaf "selected" if its path is already a key in the filter object
    return Object.prototype.hasOwnProperty.call(props.currentFilter, path) ? 'current' : 'normal';
  };

  return (
    <div className="border border-border rounded-lg bg-surface-secondary/50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-left"
      >
        <span className="text-xs font-semibold text-foreground">{title}</span>
        <ChevronDownIcon
          className={`h-4 w-4 text-muted transition-transform ${open ? '' : '-rotate-90'}`}
        />
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2">
          <div className="text-[11px] text-muted">{hint}</div>
          {isDisabled && props.mode === 'filter' && (
            <div className="text-[11px] text-warning bg-warning/10 border border-warning/20 rounded px-2 py-1.5">
              {props.disabledReason}
            </div>
          )}
          <div
            className={`font-mono text-xs text-foreground bg-surface rounded border border-border p-2 overflow-x-auto ${
              isDisabled ? 'opacity-60' : ''
            }`}
          >
            <JsonNode
              value={props.sample as JsonValue}
              path=""
              getLeafState={getLeafState}
              suggestedTitle={suggestedTitle}
              disabled={isDisabled}
              onPick={handlePick}
            />
          </div>
          {toast && <div className="text-[11px] text-success">{toast}</div>}
        </div>
      )}
    </div>
  );
}

interface JsonNodeProps {
  value: JsonValue;
  path: string;
  getLeafState: (path: string) => 'current' | 'suggested' | 'normal';
  suggestedTitle: string;
  disabled: boolean;
  onPick: (path: string, value: JsonLeaf) => void;
}

function JsonNode({ value, path, getLeafState, suggestedTitle, disabled, onPick }: JsonNodeProps) {
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
              <JsonNode
                value={child as JsonValue}
                path={childPath}
                getLeafState={getLeafState}
                suggestedTitle={suggestedTitle}
                disabled={disabled}
                onPick={onPick}
              />
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
            <JsonNode
              value={child as JsonValue}
              path={path}
              getLeafState={getLeafState}
              suggestedTitle={suggestedTitle}
              disabled={disabled}
              onPick={onPick}
            />
          </div>
        ))}
      </div>
    );
  }

  const display =
    value === null ? 'null'
    : typeof value === 'string' ? `"${value}"`
    : String(value);

  const state = getLeafState(path);
  const isSuggested = state === 'suggested';

  const stateClass =
    state === 'current'
      ? 'bg-accent/20 ring-1 ring-accent text-foreground'
      : state === 'suggested'
        ? 'border border-dashed border-accent/60 bg-accent/5 text-foreground'
        : 'hover:bg-accent/10 text-foreground/90';

  const interactive = !!path && !disabled;

  return (
    <button
      type="button"
      onClick={() => interactive && onPick(path, value as JsonLeaf)}
      disabled={!interactive}
      title={isSuggested ? suggestedTitle : (path || undefined)}
      className={`px-1.5 py-0.5 rounded transition-colors text-left inline-flex items-baseline gap-1 ${stateClass} ${interactive ? 'cursor-pointer' : 'cursor-default'}`}
    >
      {isSuggested && <span aria-hidden className="text-[10px]">🪄</span>}
      <span>{display}</span>
    </button>
  );
}
