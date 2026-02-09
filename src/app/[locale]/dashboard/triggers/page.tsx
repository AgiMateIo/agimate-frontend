'use client';

import { useTranslations } from 'next-intl';

export default function TriggersPage() {
  const t = useTranslations('Triggers');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
      </div>
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-muted">{t('underConstruction')}</p>
      </div>
    </div>
  );
}
