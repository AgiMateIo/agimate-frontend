'use client';

import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import FilesBrowser from '@/components/files/FilesBrowser';

// The agent's own files: the route answers the "which agent" question, so the
// browser runs without the agent filter.
export default function AgentFilesPage() {
  const t = useTranslations('Files');
  const agentId = useParams().id as string;

  return (
    <div className="bg-surface rounded-xl border border-border p-6 space-y-4">
      <p className="text-sm text-muted">{t('agentFilesHint')}</p>
      <FilesBrowser fixedAgentId={agentId} />
    </div>
  );
}
