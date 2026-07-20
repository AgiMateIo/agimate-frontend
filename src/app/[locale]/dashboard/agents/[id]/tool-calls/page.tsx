'use client';

import { useParams } from 'next/navigation';
import ToolUseLogsTab from '@/components/connectors/ToolUseLogsTab';

export default function AgentToolCallsPage() {
  const agentId = useParams().id as string;
  return (
    <div className="bg-surface rounded-xl border border-border p-6">
      <ToolUseLogsTab agentId={agentId} />
    </div>
  );
}
