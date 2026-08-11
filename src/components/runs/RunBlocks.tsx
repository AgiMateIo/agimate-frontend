'use client';

import { ReactNode, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  ChevronRightIcon,
  Cog6ToothIcon,
  SparklesIcon,
  UserIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import type { RunPromptRole, RunToolCall, RunTurnUsage, RunUsage } from '@/types';

// The role of a turn or of a snapshot message, as one icon. Both transcripts
// are tables, and a column of three or four repeating words is noise — the shape
// of the run (who spoke, where the tools came in) reads far better down a column
// of icons. The word itself stays in the tooltip and for screen readers.
const ROLE_STYLE = {
  SYSTEM: { icon: Cog6ToothIcon, className: 'bg-muted/10 text-muted', labelKey: 'roleSystem' },
  USER: { icon: UserIcon, className: 'bg-accent/10 text-accent', labelKey: 'roleUser' },
  ASSISTANT: {
    icon: SparklesIcon,
    className: 'bg-surface-secondary text-foreground',
    labelKey: 'roleAssistant',
  },
  TOOL: {
    icon: WrenchScrewdriverIcon,
    className: 'bg-warning/10 text-warning',
    labelKey: 'roleTool',
  },
} as const satisfies Record<
  RunPromptRole,
  { icon: typeof UserIcon; className: string; labelKey: string }
>;

export function RoleIcon({ role }: { role: RunPromptRole }) {
  const t = useTranslations('Runs');
  const style = ROLE_STYLE[role] ?? ROLE_STYLE.ASSISTANT;
  const Icon = style.icon;
  const label = t(style.labelKey);

  // The name comes from `aria-label`, not from a visually-hidden span. Tailwind's
  // `sr-only` is `position: absolute`, and with no positioned ancestor its
  // containing block is the page itself — so it escapes the dashboard shell's
  // clipping and stretches the *document* down to wherever it sits. One per row
  // in a long transcript is enough to give the page a second scrollbar next to
  // the one `main` already has.
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={`grid h-6 w-6 place-items-center rounded-full ${style.className}`}
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5" />
    </span>
  );
}

// Thin spaces every three digits, computed the same on the server and in the
// browser — `toLocaleString` would depend on the runtime's locale and rehydrate
// differently.
export const formatTokens = (n: number): string =>
  String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

// The breakdown behind a token count, as a tooltip. Cache lines are listed apart
// from the total on purpose — they are billed separately, and folding them in
// would count the same prompt twice.
export function useUsageTooltip() {
  const t = useTranslations('Runs');

  return (usage: RunUsage | RunTurnUsage): string =>
    [
      t('usageInput', { value: formatTokens(usage.inputTokens) }),
      t('usageOutput', { value: formatTokens(usage.outputTokens) }),
      usage.cacheReadTokens > 0 &&
        t('usageCacheRead', { value: formatTokens(usage.cacheReadTokens) }),
      usage.cacheWriteTokens > 0 &&
        t('usageCacheWrite', { value: formatTokens(usage.cacheWriteTokens) }),
      'calls' in usage && t('usageCalls', { value: String(usage.calls) }),
    ]
      .filter(Boolean)
      .join('\n');
}

// A labelled spoiler. Everything heavy in a run — the reasoning, a tool's
// arguments, a tool's output — is collapsed by default: the transcript has to
// stay scannable, and one reasoning block is routinely longer than the answer
// it produced.
export function Collapsible({
  label,
  preview,
  tone = 'default',
  children,
}: {
  label: ReactNode;
  // One line of what's inside, shown while collapsed, so the block can be
  // skipped without opening it.
  preview?: string;
  tone?: 'default' | 'error';
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg bg-background/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-xs transition-colors hover:bg-surface-secondary/60 rounded-lg"
      >
        <ChevronRightIcon
          className={`h-3.5 w-3.5 shrink-0 text-muted transition-transform ${open ? 'rotate-90' : ''}`}
        />
        {/* The label keeps its width, the preview gives way: `min-w-0` is what
            lets `truncate` actually cut it — a flex item's default minimum is
            its content, so without it the line pushes the row wider instead. */}
        <span className={`min-w-0 truncate font-medium ${tone === 'error' ? 'text-error' : 'text-foreground'}`}>
          {label}
        </span>
        {!open && preview && (
          <span className="min-w-0 truncate font-mono text-muted/80">{preview}</span>
        )}
      </button>
      {open && <div className="px-2 pb-2">{children}</div>}
    </div>
  );
}

// Raw JSON as it came off the wire: `argumentsJson` / `outputJson` /
// `contentJson` are strings, and a heavy tool output may have been cut off by
// the worker at 64000 chars — at which point it is no longer valid JSON. So
// parsing is best-effort and the fallback is simply showing the text.
function formatJson(raw: string): { text: string; parsed: boolean } {
  try {
    return { text: JSON.stringify(JSON.parse(raw), null, 2), parsed: true };
  } catch {
    return { text: raw, parsed: false };
  }
}

// No scroll of its own, in either direction: the text wraps (`break-words` takes
// care of the tokens long enough to overflow a line) and grows the page instead.
// A scroll region nested in the page scroll means two bars side by side, and the
// spoiler already decides how much of the page this block gets to take.
const BLOCK_CLASS =
  'rounded-lg bg-background p-3 text-xs font-mono text-foreground/80 whitespace-pre-wrap break-words';

export function JsonBlock({ raw }: { raw: string }) {
  const t = useTranslations('Runs');
  const { text, parsed } = useMemo(() => formatJson(raw), [raw]);

  return (
    <>
      {!parsed && <div className="mb-1 text-[11px] text-warning">{t('notJson')}</div>}
      <pre className={BLOCK_CLASS}>{text}</pre>
    </>
  );
}

// Same content, unformatted — reasoning and message text are prose, not JSON.
export function TextBlock({ text }: { text: string }) {
  return <pre className={BLOCK_CLASS}>{text}</pre>;
}

// One line of a JSON string for a collapsed spoiler's preview.
export function previewOf(raw: string, max = 160): string {
  const flat = raw.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

// A tool call and its result are two neighbouring entries — in the journal two
// turns, in the prompt snapshot two messages — so both views draw them the same
// way. The snapshot calls the result field `contentJson` and the journal
// `outputJson`; the caller passes whichever it has.

export function ToolCallBlock({ call }: { call: RunToolCall }) {
  const t = useTranslations('Runs');
  return (
    <Collapsible
      label={
        <span className="font-mono">
          <span className="text-muted">→ </span>
          {call.name}
        </span>
      }
      preview={previewOf(call.argumentsJson)}
    >
      <div className="mb-1 text-[11px] text-muted">{t('arguments')}</div>
      <JsonBlock raw={call.argumentsJson} />
    </Collapsible>
  );
}

// A failure with exactly this text is not a failure of the tool: the call was
// never executed, because the user pressed stop between the model deciding to
// call it and the call going out. Reading it as an error would invent work that
// never happened.
const CANCELLED_BEFORE_CALL = 'cancelled by the user';

function isCancelledCall(json: string, failed: boolean): boolean {
  if (!failed) return false;
  try {
    const parsed = JSON.parse(json) as { error?: unknown };
    return parsed?.error === CANCELLED_BEFORE_CALL;
  } catch {
    return false;
  }
}

export function ToolResultBlock({
  name,
  json,
  failed,
}: {
  name: string;
  json: string;
  failed: boolean;
}) {
  const t = useTranslations('Runs');

  if (isCancelledCall(json, failed)) {
    return (
      <div className="rounded-lg bg-background/60 px-2 py-1.5 text-xs">
        <span className="font-mono font-medium text-foreground">
          <span className="text-muted">← </span>
          {name}
        </span>
        <span className="ml-2 text-muted">{t('notExecuted')}</span>
      </div>
    );
  }

  return (
    <Collapsible
      tone={failed ? 'error' : 'default'}
      label={
        <span className="font-mono">
          <span className="text-muted">← </span>
          {name}
          {failed && <span className="ml-1.5">{t('failed')}</span>}
        </span>
      }
      preview={previewOf(json)}
    >
      <div className="mb-1 text-[11px] text-muted">{t('output')}</div>
      <JsonBlock raw={json} />
    </Collapsible>
  );
}
