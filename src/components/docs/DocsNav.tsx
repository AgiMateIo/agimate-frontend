'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import type { DocSection } from '@/utils/docs';

/**
 * The documentation sidebar: every section is listed, each one expands, and any
 * number of them can be open at once.
 *
 * It is rendered by the docs layout rather than by the page, which is what makes
 * the open sections survive a navigation — a layout is not re-mounted when its
 * child page changes, so the accordion keeps its state instead of snapping shut
 * on every click. That also means the active page comes from `usePathname`
 * (locale-stripped by `@/i18n/navigation`, so it compares directly against the
 * `/docs/...` hrefs) rather than from props.
 *
 * A section's title is a link to its own index page and the chevron beside it is
 * the disclosure control, so opening a section and going to it are separate
 * gestures.
 */
export default function DocsNav({ sections }: { sections: DocSection[] }) {
    const t = useTranslations('Docs');
    const pathname = usePathname();
    const activeSection = pathname.split('/')[2] ?? '';

    // Only sections the reader has actually toggled live here. Everything else
    // falls back to "open if it holds the current page", so arriving on a deep
    // link shows that section unfolded without an effect writing state.
    const [toggled, setToggled] = useState<Record<string, boolean>>({});
    const isOpen = (slug: string) => toggled[slug] ?? slug === activeSection;

    return (
        <nav className="text-sm">
            <ul className="space-y-0.5">
                {sections.map((section) => {
                    const active = pathname === section.href;

                    if (section.slug === '') {
                        return (
                            <li key={section.href}>
                                <Link
                                    href={section.href}
                                    aria-current={active ? 'page' : undefined}
                                    className={`block rounded-lg px-3 py-1.5 transition-colors ${
                                        active
                                            ? 'bg-accent/10 font-medium text-accent'
                                            : 'font-medium text-foreground hover:bg-surface-secondary'
                                    }`}
                                >
                                    {section.title}
                                </Link>
                            </li>
                        );
                    }

                    const open = isOpen(section.slug);
                    return (
                        <li key={section.href}>
                            <div className="flex items-center gap-1">
                                <Link
                                    href={section.href}
                                    aria-current={active ? 'page' : undefined}
                                    className={`min-w-0 flex-1 rounded-lg px-3 py-1.5 transition-colors ${
                                        active
                                            ? 'bg-accent/10 font-medium text-accent'
                                            : 'font-medium text-foreground hover:bg-surface-secondary'
                                    }`}
                                >
                                    {section.title}
                                </Link>
                                {section.pages.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setToggled((state) => ({
                                                ...state,
                                                [section.slug]: !open,
                                            }))
                                        }
                                        aria-expanded={open}
                                        aria-label={t('toggleSection', { section: section.title })}
                                        className="shrink-0 rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-secondary hover:text-foreground"
                                    >
                                        <ChevronRightIcon
                                            className={`h-4 w-4 transition-transform duration-150 ${
                                                open ? 'rotate-90' : ''
                                            }`}
                                        />
                                    </button>
                                )}
                            </div>

                            {open && section.pages.length > 0 && (
                                <ul className="mt-0.5 ml-4 space-y-0.5 border-l border-border/60 pl-2">
                                    {section.pages.map((page) => {
                                        const current = pathname === page.href;
                                        return (
                                            <li key={page.href}>
                                                <Link
                                                    href={page.href}
                                                    aria-current={current ? 'page' : undefined}
                                                    className={`block rounded-lg px-3 py-1.5 transition-colors ${
                                                        current
                                                            ? 'bg-accent/10 font-medium text-accent'
                                                            : 'text-muted hover:bg-surface-secondary hover:text-foreground'
                                                    }`}
                                                >
                                                    {page.title}
                                                </Link>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
