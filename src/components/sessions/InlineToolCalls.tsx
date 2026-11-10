import InlineToolCallView from './InlineToolCallView';
import type { InlineToolCall, InlineViewDescriptor } from './useInlineToolViews';

// The views of one progress line, in the call order the line carries. The one
// place the id array becomes a stack, shared by the chat and the read-only
// transcript.
export default function InlineToolCalls({
  toolCallIds,
  views,
  descriptors,
  agentId,
  sessionId,
  onResolve,
}: {
  toolCallIds: string[];
  views: Record<string, InlineToolCall>;
  descriptors: Record<string, InlineViewDescriptor>;
  agentId: string;
  sessionId: string;
  onResolve: (toolCallId: string) => void;
}) {
  const calls = toolCallIds.flatMap((id) => {
    const descriptor = descriptors[id];
    return descriptor ? [[id, descriptor] as const] : [];
  });

  if (calls.length === 0) return null;

  return (
    <div className="mt-2 space-y-2">
      {calls.map(([id, descriptor]) => (
        <InlineToolCallView
          key={id}
          agentId={agentId}
          sessionId={sessionId}
          descriptor={descriptor}
          call={views[id]}
          onResolve={onResolve}
        />
      ))}
    </div>
  );
}
