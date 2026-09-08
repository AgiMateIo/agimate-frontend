import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

/**
 * The documentation loader: plain `.md` files on disk, read and parsed on the
 * server, never bundled. Sources live in `content/docs/<locale>/…`, so the URL
 * path is the file path and there is no hand-maintained sidebar file to drift
 * away from the tree.
 *
 * Node APIs only — this module must never be imported from a client component.
 *
 * Deployment note: `output: 'standalone'` traces imports, and a file read by a
 * computed path is invisible to it. `content/` has to be listed in
 * `outputFileTracingIncludes` or the image builds fine and answers 404 for
 * every page here — the same failure the `@swc/helpers` entry in next.config.ts
 * already documents.
 */

const CONTENT_ROOT = join(process.cwd(), 'content', 'docs');

export interface DocFrontmatter {
    title: string;
    description?: string;
    /** Sort key inside a section; a section's own order comes from its index.md. */
    order: number;
    /** In-app screen this page describes — rendered as a deep link in the right rail. */
    screen?: string;
}

export interface TocEntry {
    id: string;
    text: string;
}

export interface DocPage {
    /** Locale-less path segments: [] for the docs root, ['connections', 'telegram'] for a page. */
    slug: string[];
    href: string;
    frontmatter: DocFrontmatter;
    /** Markdown body with the frontmatter block removed. */
    body: string;
    toc: TocEntry[];
}

export interface DocNavItem {
    href: string;
    title: string;
}

export interface DocSection {
    /** '' for the docs root page, the directory name otherwise. */
    slug: string;
    title: string;
    order: number;
    href: string;
    pages: DocNavItem[];
}

/**
 * Parsed pages, keyed by `locale/slug`. Markdown of this size parses in single
 * digit milliseconds, so this is cheap insurance rather than the load-bearing
 * part — but it does mean the work happens once per process instead of once per
 * request.
 *
 * Production only: in `next dev` a module-level map never invalidates, so an
 * edited `.md` would keep serving the version from the first request.
 */
const CACHE_ENABLED = process.env.NODE_ENV === 'production';
const cache = new Map<string, unknown>();

function memo<T>(key: string, compute: () => T): T {
    if (!CACHE_ENABLED) return compute();
    if (!cache.has(key)) cache.set(key, compute());
    return cache.get(key) as T;
}

/**
 * Frontmatter is a flat `key: value` block — deliberately not YAML. The four
 * keys below are the whole vocabulary, and a parser that reads exactly them
 * cannot silently accept a document it doesn't understand.
 */
function parseFrontmatter(raw: string): { data: DocFrontmatter; body: string } {
    const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
    const fields: Record<string, string> = {};
    if (match) {
        for (const line of match[1].split(/\r?\n/)) {
            const pair = /^([a-zA-Z]+):\s*(.*)$/.exec(line.trim());
            if (pair) fields[pair[1]] = pair[2].replace(/^['"]|['"]$/g, '');
        }
    }
    return {
        data: {
            title: fields.title ?? 'Untitled',
            description: fields.description,
            order: Number(fields.order ?? 100),
            screen: fields.screen,
        },
        body: match ? raw.slice(match[0].length) : raw,
    };
}

/**
 * Heading anchors. Cyrillic is kept as-is: a transliterated anchor is no more
 * readable and breaks the moment the transliteration table changes.
 */
export function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, '-')
        .replace(/^-|-$/g, '');
}

/** Second-level headings only — deeper ones make the rail a second document. */
function extractToc(body: string): TocEntry[] {
    const toc: TocEntry[] = [];
    let inFence = false;
    for (const line of body.split(/\r?\n/)) {
        if (line.startsWith('```')) inFence = !inFence;
        if (inFence) continue;
        const heading = /^##\s+(.+?)\s*$/.exec(line);
        if (heading) toc.push({ id: slugify(heading[1]), text: heading[1] });
    }
    return toc;
}

function docsRoot(locale: string) {
    return join(CONTENT_ROOT, locale);
}

/**
 * Slug segments arrive from the URL, and `join` resolves `..` — an unchecked
 * segment walks out of the content directory and turns this route into a reader
 * of any `.md` file on the host. Next normalises most of that away before
 * routing, but that is the router's behaviour, not a guarantee this module can
 * make, and `getDocPage` is an ordinary exported function. Hence two
 * independent guards: the shape a segment is allowed to have, and containment
 * of the path it resolves to.
 */
const SAFE_SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function resolveDocFile(locale: string, slug: string[]): string | null {
    if (!slug.every((segment) => SAFE_SEGMENT.test(segment))) return null;

    const root = resolve(docsRoot(locale));
    // `index.md` for a directory, `<name>.md` for a leaf.
    const candidates = [join(root, ...slug, 'index.md'), join(root, ...slug) + '.md'];

    for (const candidate of candidates) {
        const full = resolve(candidate);
        if (full.startsWith(root + sep) && existsSync(full)) return full;
    }
    return null;
}

function readPage(locale: string, slug: string[]): DocPage | null {
    const path = resolveDocFile(locale, slug);
    if (!path) return null;

    const { data, body } = parseFrontmatter(readFileSync(path, 'utf8'));
    return {
        slug,
        href: ['/docs', ...slug].join('/'),
        frontmatter: data,
        body,
        toc: extractToc(body),
    };
}

export function getDocPage(locale: string, slug: string[]): DocPage | null {
    return memo(`page:${locale}:${slug.join('/')}`, () => readPage(locale, slug));
}

/**
 * The navigation tree, built from the directory listing: a directory is a
 * section, its `index.md` names it and is its landing page, the other files
 * inside are its pages. The docs root page is section `''` with no pages.
 */
export function getDocTree(locale: string): DocSection[] {
    return memo(`tree:${locale}`, () => {
        const root = docsRoot(locale);
        if (!existsSync(root)) return [];

        const rootPage = readPage(locale, []);
        const sections: DocSection[] = rootPage
            ? [
                  {
                      slug: '',
                      title: rootPage.frontmatter.title,
                      order: rootPage.frontmatter.order,
                      href: '/docs',
                      pages: [],
                  },
              ]
            : [];

        for (const entry of readdirSync(root, { withFileTypes: true })) {
            if (!entry.isDirectory()) continue;
            const index = readPage(locale, [entry.name]);
            if (!index) continue;

            // The section's own index.md is the section header in the nav, not a
            // row inside it — listing it twice under its own name is what made
            // the drill version read as a duplicate.
            const pages: Array<DocNavItem & { order: number }> = [];
            for (const file of readdirSync(join(root, entry.name))) {
                if (!file.endsWith('.md') || file === 'index.md') continue;
                const page = readPage(locale, [entry.name, file.replace(/\.md$/, '')]);
                if (page) {
                    pages.push({
                        href: page.href,
                        title: page.frontmatter.title,
                        order: page.frontmatter.order,
                    });
                }
            }
            pages.sort((a, b) => a.order - b.order);

            sections.push({
                slug: entry.name,
                title: index.frontmatter.title,
                order: index.frontmatter.order,
                href: index.href,
                pages: pages.map(({ href, title }) => ({ href, title })),
            });
        }

        return sections.sort((a, b) => a.order - b.order);
    });
}
