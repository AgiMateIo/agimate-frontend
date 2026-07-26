'use client';

import { useTranslations } from 'next-intl';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Link } from '@/i18n/navigation';

/**
 * The overview's one concession to bad news: a single line saying how many
 * signals are waiting, linking into the work mode that details them. Keeps the
 * friendly home friendly without letting it lie.
 */
export default function AttentionBanner({ count }: { count: number }) {
  const t = useTranslations('DashboardHome');

  if (count === 0) return null;

  return (
    <Link
      href="/dashboard?view=pro"
      className="group flex items-center gap-3 rounded-xl border border-warning/20 bg-warning/10 px-4 py-3 transition-colors hover:bg-warning/15"
    >
      <ExclamationTriangleIcon className="h-5 w-5 shrink-0 text-warning" />
      <span className="text-sm text-foreground">{t('attentionBanner', { count })}</span>
      <span className="ml-auto shrink-0 text-sm font-medium text-warning">
        {t('attentionBannerAction')} →
      </span>
    </Link>
  );
}
