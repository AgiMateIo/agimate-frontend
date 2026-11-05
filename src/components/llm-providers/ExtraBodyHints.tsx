'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClipboardDocumentIcon,
  LightBulbIcon,
} from '@heroicons/react/24/outline';
import { copyToClipboard } from '@/utils/clipboard';
import { exampleGroupsFor, type ExtraBodyHintsScope } from './extraBodyExamples';

interface ExtraBodyHintsProps {
  baseUrl?: string | null;
  scope: ExtraBodyHintsScope;
}

// Compact cheat sheet: collapsed by default, one provider-tagged group at a time.
export function ExtraBodyHints({ baseUrl, scope }: ExtraBodyHintsProps) {
  const t = useTranslations('LlmProviders');
  const tCommon = useTranslations('Common');
  const [open, setOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const groups = exampleGroupsFor(baseUrl, scope);
  // The routing group disappears with a non-OpenRouter URL; fall back to the first.
  const currentGroup = groups.find((group) => group.id === activeGroup) ?? groups[0];
  const ToggleIcon = open ? ChevronDownIcon : ChevronRightIcon;

  const copy = async (id: string, code: string) => {
    if (!(await copyToClipboard(code))) return;
    setCopiedId(id);
    window.setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 2000);
  };

  if (!currentGroup) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-foreground"
      >
        <ToggleIcon className="h-3.5 w-3.5" />
        <LightBulbIcon className="h-3.5 w-3.5" />
        {t('extraBodyHintsToggle')}
      </button>

      {open && (
        <div className="mt-2 space-y-3 rounded-lg bg-surface-secondary/50 p-3">
          {scope === 'provider' && (
            <p className="text-xs text-muted">{t('extraBodyProviderScopeHint')}</p>
          )}

          <div className="flex flex-wrap gap-1.5">
            {groups.map((group) => {
              const active = group.id === currentGroup.id;
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => setActiveGroup(group.id)}
                  aria-pressed={active}
                  className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                    active
                      ? 'border-accent/40 bg-accent/10 text-accent'
                      : 'border-border text-muted hover:text-foreground'
                  }`}
                >
                  {t(group.labelKey)}
                </button>
              );
            })}
          </div>

          {currentGroup.hintKey && <p className="text-xs text-muted">{t(currentGroup.hintKey)}</p>}

          <div className="space-y-3">
            {currentGroup.examples.map((example) => (
              <div key={example.id}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs text-foreground">
                    {t(example.labelKey)}{' '}
                    <span className="text-[11px] text-muted">{example.providers.join(' · ')}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => copy(example.id, example.code)}
                    title={copiedId === example.id ? tCommon('copied') : tCommon('copy')}
                    aria-label={copiedId === example.id ? tCommon('copied') : tCommon('copy')}
                    className="shrink-0 rounded p-1 text-muted transition-colors hover:bg-surface-secondary hover:text-foreground"
                  >
                    {copiedId === example.id ? (
                      <CheckIcon className="h-3.5 w-3.5 text-success" />
                    ) : (
                      <ClipboardDocumentIcon className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
                <pre className="mt-1.5 overflow-x-auto rounded-md border border-border bg-surface px-2.5 py-2 font-mono text-[11px] leading-relaxed text-foreground">{example.code}</pre>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
