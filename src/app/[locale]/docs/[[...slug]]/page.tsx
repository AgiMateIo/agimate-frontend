import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { resolveLocale } from '@/i18n/routing';
import { buildAlternates } from '@/utils/seo';
import { getDocPage, getDocTree } from '@/utils/docs';
import DocMarkdown from '@/components/docs/DocMarkdown';
import DocsRail from '@/components/docs/DocsRail';

type Params = Promise<{ locale: string; slug?: string[] }>;

export async function generateMetadata({ params }: { params: Params }) {
    const { locale: requested, slug = [] } = await params;
    const locale = resolveLocale(requested);
    const page = getDocPage(locale, slug);
    if (!page) return {};

    return {
        title: page.frontmatter.title,
        description: page.frontmatter.description,
        alternates: buildAlternates(locale, ['/docs', ...slug].join('/')),
    };
}

export default async function DocsPage({ params }: { params: Params }) {
    const { locale: requested, slug = [] } = await params;
    const locale = resolveLocale(requested);

    const page = getDocPage(locale, slug);
    if (!page) notFound();

    const t = await getTranslations('Docs');
    const section = getDocTree(locale).find((item) => item.slug === (slug[0] ?? ''));

    // The breadcrumb carries the part of the tree the sidebar does not: which
    // section this page belongs to, for a reader who arrived from a deep link
    // on a screen and on a phone, where the sidebar is not rendered at all.
    const crumbs = [
        { href: '/docs', label: t('root') },
        ...(section && section.slug !== '' ? [{ href: section.href, label: section.title }] : []),
    ].filter((crumb) => crumb.href !== page.href);

    return (
        <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_200px] xl:gap-8">
            <article className="min-w-0 max-w-[72ch]">
                {crumbs.length > 0 && (
                    <nav className="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                        {crumbs.map((crumb) => (
                            <span key={crumb.href} className="flex items-center gap-1.5">
                                <Link href={crumb.href} className="transition-colors hover:text-foreground">
                                    {crumb.label}
                                </Link>
                                <span aria-hidden>›</span>
                            </span>
                        ))}
                        <span className="text-foreground">{page.frontmatter.title}</span>
                    </nav>
                )}

                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                    {page.frontmatter.title}
                </h1>
                {page.frontmatter.description && (
                    <p className="mt-3 text-lg text-muted">{page.frontmatter.description}</p>
                )}

                {/* On a narrow screen the rail's contents would push the article
                    below a fold of links, so only the deep link survives, here. */}
                <div className="mt-6 xl:hidden">
                    <DocsRail toc={[]} screen={page.frontmatter.screen} />
                </div>

                <div className="mt-8">
                    <DocMarkdown body={page.body} />
                </div>
            </article>

            <aside className="hidden xl:block">
                <div className="sticky top-24">
                    <DocsRail toc={page.toc} screen={page.frontmatter.screen} />
                </div>
            </aside>
        </div>
    );
}
