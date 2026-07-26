'use client';

import { useTranslations } from 'next-intl';
import {
  ChatBubbleOvalLeftEllipsisIcon,
  CpuChipIcon,
  PlusCircleIcon,
} from '@heroicons/react/24/outline';
import { Link } from '@/i18n/navigation';

interface QuickAction {
  key: 'actionChat' | 'actionCreateAgent' | 'actionConnect';
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  href: string;
}

export default function QuickActions({
  firstAgentId,
}: {
  firstAgentId: string | null;
}) {
  const t = useTranslations('DashboardHome');

  const actions: QuickAction[] = [
    // Chat lives under an agent, so the tile only makes sense once one exists.
    ...(firstAgentId
      ? [
          {
            key: 'actionChat' as const,
            icon: ChatBubbleOvalLeftEllipsisIcon,
            href: `/dashboard/agents/${firstAgentId}/chat`,
          },
        ]
      : []),
    {
      key: 'actionCreateAgent',
      icon: PlusCircleIcon,
      href: '/dashboard/agents/create',
    },
    {
      key: 'actionConnect',
      icon: CpuChipIcon,
      href: '/dashboard/connectors',
    },
  ];

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium text-muted">{t('quickActionsTitle')}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {actions.map(({ key, icon: Icon, href }) => (
          <Link
            key={key}
            href={href}
            className="group flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 transition-colors hover:border-accent/40"
          >
            <Icon className="h-5 w-5 shrink-0 text-accent" />
            <span className="text-sm font-medium text-foreground">{t(key)}</span>
            <span className="ml-auto text-accent opacity-0 transition-opacity group-hover:opacity-100">
              →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
