import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export default async function CatalogNotFound() {
  const t = await getTranslations('CatalogPage');
  return (
    <section className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('notFound.title')}</h1>
      <p className="mt-4 text-muted">{t('notFound.text')}</p>
      <Link
        href="/catalog/agents"
        className="mt-8 inline-flex items-center justify-center rounded-lg bg-accent px-6 py-3 font-medium text-accent-foreground transition-colors hover:bg-accent/90"
      >
        {t('notFound.back')}
      </Link>
    </section>
  );
}
