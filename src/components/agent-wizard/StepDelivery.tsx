'use client';

import { useTranslations } from 'next-intl';
import { CheckIcon } from '@heroicons/react/24/solid';
import {
  ArrowPathRoundedSquareIcon,
  BoltIcon,
  PuzzlePieceIcon,
} from '@heroicons/react/24/outline';
import { AgentType } from '@/types';
import { FormField, Input } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import { WizardStepProps } from './AgentWizard';
import WizardActions from './WizardActions';

// The whole of what an external agent's type decides: which door incoming
// events use. Everything else — instructions, skills, connections, memory — is
// identical across the three.
const OPTIONS = [
  { value: 'MCP', icon: PuzzlePieceIcon },
  { value: 'CENTRIFUGO', icon: BoltIcon },
  { value: 'WEBHOOK', icon: ArrowPathRoundedSquareIcon },
] as const satisfies readonly { value: AgentType; icon: unknown }[];

const WEBHOOK_URL_RE = /^https?:\/\/.+/;

function deliveryReady(type: AgentType | null, webhookUrl: string): boolean {
  if (type === 'WEBHOOK') return WEBHOOK_URL_RE.test(webhookUrl.trim());
  return type !== null;
}

export default function StepDelivery({ data, setData, goNext, goBack }: WizardStepProps) {
  const t = useTranslations('AgentWizard');

  const tCommon = useTranslations('Common');
  const selected = data.agentType;
  const ready = deliveryReady(selected, data.webhookUrl);

  return (
    <div>
      <div className="space-y-5 p-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t('deliveryTitle')}</h2>
          <p className="text-sm text-muted mt-0.5">{t('deliverySubtitle')}</p>
        </div>

        <div role="radiogroup" aria-label={t('deliveryTitle')} className="space-y-2">
          {OPTIONS.map(({ value, icon: Icon }) => {
            const isSelected = selected === value;
            return (
              <div key={value}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  // The URL only matters for WEBHOOK; leaving a stale one behind
                  // would send it on the next switch back.
                  onClick={() => setData({ agentType: value, webhookUrl: '' })}
                  className={`relative flex w-full items-start gap-3 rounded-xl border p-4 pr-10 text-left transition-colors ${
                    isSelected
                      ? 'border-accent bg-accent/5'
                      : 'border-border hover:border-accent/50 hover:bg-surface-secondary'
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      isSelected ? 'bg-accent/15 text-accent' : 'bg-surface-secondary text-muted'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {t(`delivery_${value}`)}
                      </span>
                      {value === 'MCP' && (
                        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
                          {t('deliveryDefaultBadge')}
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-muted">
                      {t(`deliveryDesc_${value}`)}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={`absolute right-3 top-4 inline-flex h-5 w-5 items-center justify-center rounded-full border transition-colors ${
                      isSelected
                        ? 'border-transparent bg-accent text-accent-foreground'
                        : 'border-border bg-surface'
                    }`}
                  >
                    {isSelected && <CheckIcon className="h-3.5 w-3.5" strokeWidth={3} />}
                  </span>
                </button>

                {/* The only field of this step, and only for this option: the
                    backend rejects a WEBHOOK agent without a callback URL. */}
                {isSelected && value === 'WEBHOOK' && (
                  <div className="mt-2 pl-4">
                    <FormField label={t('webhookUrlLabel')} required hint={t('webhookUrlHint')}>
                      <Input
                        value={data.webhookUrl}
                        onChange={(e) => setData({ webhookUrl: e.target.value })}
                        placeholder="https://example.com/agimate"
                        autoFocus
                      />
                    </FormField>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <WizardActions
        left={
          <Button type="button" variant="secondary" onClick={goBack}>
            {tCommon('back')}
          </Button>
        }
      >
        <Button type="button" onClick={goNext} disabled={!ready}>
          {t('next')}
        </Button>
      </WizardActions>
    </div>
  );
}
