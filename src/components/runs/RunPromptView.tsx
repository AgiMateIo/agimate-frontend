'use client';

import { useTranslations } from 'next-intl';
import { Chip } from '@/components/ui/Chip';
import { PaperClipIcon } from '@heroicons/react/24/outline';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useRunPromptQuery } from '@/queries/runs';
import { getErrorMessage } from '@/utils/error';
import type { RunPromptMessage, RunPromptPart } from '@/types';
import {
  Collapsible,
  RoleIcon,
  TextBlock,
  ToolCallBlock,
  ToolResultBlock,
  previewOf,
} from './RunBlocks';

// System blocks are the long ones — the whole instruction set plus whatever was
// mixed in for this one request. Past this they get a spoiler instead of being
// laid out in full above the message that actually asked something.
const INLINE_TEXT_LIMIT = 600;

function formatSize(bytes: number | null): string | null {
  if (bytes === null) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentRow({ part }: { part: RunPromptPart }) {
  const size = formatSize(part.size);
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted" title={part.fileId}>
      <PaperClipIcon className="h-3.5 w-3.5 shrink-0" />
      {/* `name` is legitimately absent — fall back to what the file is, never to its id. */}
      <span className="min-w-0 truncate">{part.name || part.mime || part.type}</span>
      {size && <span className="text-muted/70">{size}</span>}
    </div>
  );
}

// Same table as the steps, one row per message. The index is the message's place
// in the snapshot, not a turn number — the snapshot is a list of what went in,
// and nothing in it is numbered by the backend.
function MessageRow({ message, index }: { message: RunPromptMessage; index: number }) {
  const t = useTranslations('Runs');
  const long = (message.text?.length ?? 0) > INLINE_TEXT_LIMIT;

  return (
    <tr className="border-b border-border align-top last:border-b-0 hover:bg-surface-secondary/40">
      <td className="py-2.5 pr-2 pl-1 text-xs font-mono text-muted/70">{index}</td>
      <td className="py-2.5 pr-3">
        <RoleIcon role={message.role} />
      </td>
      <td className="space-y-1.5 py-2.5 pr-3">
        {message.thinking && (
          <Chip tone="muted">{t('thinkingBlock')}</Chip>
        )}

        {message.text &&
          (long ? (
            <Collapsible label={t('messageText')} preview={previewOf(message.text)}>
              <TextBlock text={message.text} />
            </Collapsible>
          ) : (
            <div className="whitespace-pre-wrap break-words text-sm text-foreground">
              {message.text}
            </div>
          ))}

        {(message.toolCalls ?? []).map((call, i) => (
          <ToolCallBlock key={call.id || `call-${i}`} call={call} />
        ))}
        {(message.toolResults ?? []).map((result, i) => (
          <ToolResultBlock
            key={result.id || `result-${i}`}
            name={result.name}
            json={result.contentJson}
            failed={result.failed}
          />
        ))}

        {(message.parts?.length ?? 0) > 0 && (
          <div className="space-y-1 pt-1">
            {(message.parts ?? []).map((part) => (
              <AttachmentRow key={part.fileId} part={part} />
            ))}
          </div>
        )}
      </td>
    </tr>
  );
}

// What the model actually received before its first call: system blocks, the
// session history and the triggering turn. Worth its own tab because turn 0 of
// the journal is the user's question *without* the ephemeral blocks — memory
// notes and the like are kept out of the journal on purpose, so they show up
// nowhere else.
export default function RunPromptView({ runId }: { runId: string }) {
  const t = useTranslations('Runs');
  const { data, isPending, error } = useRunPromptQuery(runId);

  if (error && !data) {
    return <ErrorAlert>{getErrorMessage(error, t('loadPromptError'))}</ErrorAlert>;
  }
  if (isPending) {
    return <div className="py-8 text-center text-sm text-muted">{t('loadingPrompt')}</div>;
  }
  // A missing snapshot is an ordinary answer, not a failure: the run never
  // reached the loop, or it is older than the feature.
  if (!data?.messages) {
    return <div className="py-8 text-center text-sm text-muted">{t('promptNotSaved')}</div>;
  }

  return (
    // `table-fixed` for the same reason as in the steps table: a long unbroken
    // token inside a message must not be able to widen the whole table.
    <table className="w-full table-fixed">
      <thead>
        <tr className="border-b border-border">
          <th className="w-9 py-2 pr-2 pl-1 text-left text-xs font-medium text-muted">#</th>
          <th aria-label={t('turnRole')} className="w-10 py-2 pr-3" />
          <th className="py-2 pr-3 text-left text-xs font-medium text-muted">
            {t('turnContent')}
          </th>
        </tr>
      </thead>
      <tbody>
        {data.messages.map((message, i) => (
          <MessageRow key={i} message={message} index={i} />
        ))}
      </tbody>
    </table>
  );
}
