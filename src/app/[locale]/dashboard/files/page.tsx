'use client';

import { useTranslations } from 'next-intl';
import FilesBrowser from '@/components/files/FilesBrowser';

export default function FilesPage() {
  const t = useTranslations('Files');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
        <p className="text-muted mt-1">{t('subtitle')}</p>
      </div>

      <FilesBrowser />
    </div>
  );
}
