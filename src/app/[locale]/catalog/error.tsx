'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';

// The backend did not answer: a page that says so, inside the landing shell,
// rather than a catalog that looks empty.
export default function CatalogError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const t = useTranslations('CatalogPage');
  const common = useTranslations('Common');
  return (
    <section className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('error.title')}</h1>
      <p className="mt-4 text-muted">{t('error.text')}</p>
      <div className="mt-8">
        <Button variant="primary" onClick={retry}>
          {common('retry')}
        </Button>
      </div>
    </section>
  );
}
