import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { ArrowUpRightIcon } from '@heroicons/react/24/outline';
import type { TocEntry } from '@/utils/docs';

/**
 * The right column is not a table of contents that happens to be always on. On
 * a five-step task page a contents list of those five steps is noise, so the
 * rail carries the thing a generic docs engine cannot know instead: the screen
 * in the app this page is about. The contents list appears when a page is long
 * enough to need one.
 *
 * The link runs the other way too — the screen links back here — and that pair
 * is what keeps a page from quietly outliving the flow it describes.
 */
const TOC_MIN_HEADINGS = 3;

export default async function DocsRail({ toc, screen }: { toc: TocEntry[]; screen?: string }) {
    const t = await getTranslations('Docs');
    const showToc = toc.length >= TOC_MIN_HEADINGS;

    if (!showToc && !screen) return null;

    return (
        <div className="space-y-6 text-sm">
            {screen && (
                <Link
                    href={screen}
                    className="flex items-start gap-2 rounded-xl border border-border/60 bg-surface p-3 text-foreground transition-colors hover:border-accent/50"
                >
                    <ArrowUpRightIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <span>
                        <span className="block font-medium">{t('openScreen')}</span>
                        <span className="block text-xs text-muted">{screen}</span>
                    </span>
                </Link>
            )}

            {showToc && (
                <div>
                    <p className="pb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                        {t('onThisPage')}
                    </p>
                    <ul className="space-y-1.5 border-l border-border/60">
                        {toc.map((entry) => (
                            <li key={entry.id}>
                                <a
                                    href={`#${entry.id}`}
                                    className="-ml-px block border-l border-transparent pl-3 text-muted transition-colors hover:border-accent hover:text-foreground"
                                >
                                    {entry.text}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
