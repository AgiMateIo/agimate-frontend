'use client';

import { ToolJsonSchema } from '@/types';
import { FormField, Input } from '@/components/ui/FormField';
import { Toggle } from '@/components/ui/Toggle';

interface ConfigFieldRendererProps {
  name: string;
  schema: ToolJsonSchema;
  required: boolean;
  value: unknown;
  jsonText: string;
  addLabel: string;
  onValueChange: (value: unknown) => void;
  onJsonChange: (value: string) => void;
}

export function ConfigFieldRenderer({
  name,
  schema,
  required,
  value,
  jsonText,
  addLabel,
  onValueChange,
  onJsonChange,
}: ConfigFieldRendererProps) {
  const label = schema.title || name;
  const hint = schema.description;

  if (schema.type === 'boolean') {
    return (
      <FormField label={label} required={required} hint={hint} layout="inline">
        <Toggle checked={Boolean(value)} onChange={(checked) => onValueChange(checked)} />
      </FormField>
    );
  }

  if (schema.type === 'array') {
    const items = (value as string[] | undefined) ?? [];
    const numeric = schema.items?.type === 'integer' || schema.items?.type === 'number';
    const update = (next: string[]) => onValueChange(next);
    return (
      <FormField label={label} required={required} hint={hint}>
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={item}
                inputMode={numeric ? 'numeric' : undefined}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = e.target.value;
                  update(next);
                }}
              />
              <button
                type="button"
                onClick={() => update(items.filter((_, idx) => idx !== i))}
                className="shrink-0 px-2 py-1 rounded-lg text-muted hover:text-error hover:bg-error/10 transition-colors"
                aria-label="remove"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => update([...items, ''])}
            className="text-xs font-medium px-2 py-1 rounded bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
          >
            + {addLabel}
          </button>
        </div>
      </FormField>
    );
  }

  if (schema.type === 'object') {
    return (
      <FormField label={label} required={required} hint={hint}>
        <textarea
          value={jsonText}
          onChange={(e) => onJsonChange(e.target.value)}
          rows={6}
          spellCheck={false}
          placeholder="{ }"
          className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-foreground font-mono text-xs resize-y"
        />
      </FormField>
    );
  }

  if (schema.enum && schema.enum.length > 0) {
    return (
      <FormField label={label} required={required} hint={hint} layout="inline">
        <select
          value={String(value ?? '')}
          onChange={(e) => onValueChange(e.target.value)}
          className="w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-foreground"
        >
          <option value=""></option>
          {schema.enum.map((opt) => (
            <option key={String(opt)} value={String(opt)}>{String(opt)}</option>
          ))}
        </select>
      </FormField>
    );
  }

  const numeric = schema.type === 'integer' || schema.type === 'number';
  return (
    <FormField label={label} required={required} hint={hint} layout="inline">
      <Input
        type={numeric ? 'number' : 'text'}
        value={String(value ?? '')}
        onChange={(e) => onValueChange(e.target.value)}
      />
    </FormField>
  );
}
