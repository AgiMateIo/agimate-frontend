'use client';

import { useTranslations } from 'next-intl';
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import type { SubagentRequest } from '@/utils/subagent';

// The first message of a subagent's session is the errand it was sent on — the
// same XML block that went to the model, attributes and escaped bodies and all.
// Drawn as a card rather than a chat bubble: nobody said it to anybody, and a
// bubble would put the reader in front of the wire format.
//
// The caller parses (`parseSubagentRequest`) and keeps the raw bubble for
// anything that doesn't come back — a block we failed to read is shown as it
// stands, never hidden.
export function SubagentRequestCard({ request }: { request: SubagentRequest }) {
  const t = useTranslations('Subagents');

  return (
    <div className="rounded-lg border border-border bg-surface-secondary/60 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <ClipboardDocumentListIcon className="h-4 w-4 shrink-0 text-muted" />
        <span className="text-xs font-medium text-muted">{t('requestLabel')}</span>
        {request.mode && (
          <span className="rounded bg-surface px-1.5 py-0.5 font-mono text-[10px] text-muted">
            {request.mode}
          </span>
        )}
      </div>

      {/* The title is the session's own name too — repeated here because the
          transcript can be opened where that name isn't on screen. */}
      {request.title && (
        <div className="mt-1.5 text-sm font-medium text-foreground">{request.title}</div>
      )}

      <div className="mt-2 text-sm break-words whitespace-pre-wrap text-foreground">
        {request.instructions}
      </div>

      {/* Context is whatever the parent decided the errand needed to know, and
          it runs long — folded away, but present: half of "why did it do that"
          is in there. */}
      {request.context && (
        <details className="mt-2 group">
          <summary className="cursor-pointer list-none text-xs text-accent transition-colors hover:text-accent/80">
            <span className="group-open:hidden">▸ {t('contextShow')}</span>
            <span className="hidden group-open:inline">▾ {t('contextHide')}</span>
          </summary>
          <div className="mt-1.5 rounded-md bg-background px-2 py-1.5 text-xs break-words whitespace-pre-wrap text-foreground/80">
            {request.context}
          </div>
        </details>
      )}
    </div>
  );
}
