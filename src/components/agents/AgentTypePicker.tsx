'use client';

import { useTranslations } from 'next-intl';
import { CheckIcon } from '@heroicons/react/24/solid';
import { AgentType } from '@/types';

interface AgentTypePickerProps {
  value: AgentType;
  onChange: (next: AgentType) => void;
  error?: string;
}

interface OptionMeta {
  value: AgentType;
  titleKey: string;
  shortKey: string;
  descKey: string;
  selectedClass: string;
  selectedTitleClass: string;
  checkClass: string;
}

const OPTIONS = [
  {
    value: 'GENERIC',
    titleKey: 'generic',
    shortKey: 'genericShort',
    descKey: 'genericDesc',
    selectedClass: 'border-accent bg-accent/10',
    selectedTitleClass: 'text-accent',
    checkClass: 'bg-accent text-accent-foreground',
  },
  {
    value: 'CENTRIFUGO',
    titleKey: 'centrifugo',
    shortKey: 'centrifugoShort',
    descKey: 'centrifugoDesc',
    selectedClass: 'border-accent bg-accent/10',
    selectedTitleClass: 'text-accent',
    checkClass: 'bg-accent text-accent-foreground',
  },
  {
    value: 'WEBHOOK',
    titleKey: 'webhook',
    shortKey: 'webhookShort',
    descKey: 'webhookDesc',
    selectedClass: 'border-success bg-success/10',
    selectedTitleClass: 'text-success',
    checkClass: 'bg-success text-white',
  },
  {
    value: 'MCP',
    titleKey: 'mcp',
    shortKey: 'mcpShort',
    descKey: 'mcpDesc',
    selectedClass: 'border-accent bg-accent/10',
    selectedTitleClass: 'text-accent',
    checkClass: 'bg-accent text-accent-foreground',
  },
] as const satisfies readonly OptionMeta[];

export default function AgentTypePicker({ value, onChange, error }: AgentTypePickerProps) {
  const t = useTranslations('Agents');

  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-2">
        {t('agentType')} <span className="text-error">*</span>
      </label>
      <div role="radiogroup" aria-label={t('agentType')} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {OPTIONS.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.value)}
              className={`relative text-left rounded-lg border p-3 pr-9 transition-colors focus:outline-none focus:ring-2 focus:ring-accent/40 ${
                selected
                  ? option.selectedClass
                  : 'border-border bg-surface-secondary hover:border-border/80 hover:bg-surface'
              }`}
            >
              <span
                aria-hidden="true"
                className={`absolute top-2.5 right-2.5 inline-flex h-5 w-5 items-center justify-center rounded-full border transition-colors ${
                  selected
                    ? `${option.checkClass} border-transparent`
                    : 'border-border bg-surface'
                }`}
              >
                {selected && <CheckIcon className="h-3.5 w-3.5" strokeWidth={3} />}
              </span>
              <div className="flex flex-col gap-0.5">
                <span className={`text-sm font-semibold ${selected ? option.selectedTitleClass : 'text-foreground'}`}>
                  {t(option.titleKey)}
                </span>
                <span className="text-[10px] uppercase tracking-wide text-muted">
                  {t(option.shortKey)}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-muted leading-relaxed">{t(option.descKey)}</p>
            </button>
          );
        })}
      </div>
      {error && <p className="text-xs text-error mt-1">{error}</p>}
    </div>
  );
}
