'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { FormField, TextArea } from '@/components/ui/FormField';

interface ExtraBodyFieldProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string | null;
  placeholder?: string;
}

// Collapsed-by-default "advanced" JSON editor for provider-level extra_body.
export function ExtraBodyField({ value, onChange, disabled, error, placeholder }: ExtraBodyFieldProps) {
  const t = useTranslations('LlmProviders');
  // Start expanded when a value is already configured, so edits don't hide it.
  const [open, setOpen] = useState(value.trim() !== '');
  const Icon = open ? ChevronDownIcon : ChevronRightIcon;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground transition-colors"
      >
        <Icon className="h-4 w-4" />
        {t('extraBodyToggle')}
      </button>
      {open && (
        <div className="mt-3">
          <FormField label={t('extraBodyLabel')} hint={t('extraBodySecretsWarning')} error={error ?? undefined}>
            <TextArea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder ?? '{ "transforms": ["middle-out"] }'}
              rows={5}
              disabled={disabled}
              spellCheck={false}
              className="font-mono text-xs"
            />
          </FormField>
        </div>
      )}
    </div>
  );
}
