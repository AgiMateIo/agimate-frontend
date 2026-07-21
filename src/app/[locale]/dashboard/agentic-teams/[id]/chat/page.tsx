'use client';

import { useTranslations } from 'next-intl';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { useSetBreadcrumb } from '@/contexts/BreadcrumbContext';

export default function TeamAgentChatPage() {
  const t = useTranslations('AgenticTeams');
  useSetBreadcrumb('chat', t('agentChat'));

  return (
    <div className="bg-surface rounded-xl border border-border p-12 text-center">
      <ChatBubbleLeftRightIcon className="mx-auto h-10 w-10 text-muted" />
      <h2 className="mt-3 text-lg font-semibold text-foreground">{t('agentChat')}</h2>
      <p className="mt-1 text-sm text-muted">{t('comingSoon')}</p>
    </div>
  );
}
