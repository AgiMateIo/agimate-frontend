import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Link } from '@/i18n/navigation';
import { Alert } from '@/components/ui/Alert';
import { slugify } from '@/utils/docs';

/**
 * Documentation markdown, rendered on the server. `react-markdown`'s default
 * export is synchronous and hook-free, so it runs inside a Server Component and
 * ships no client JavaScript for the prose itself — only the `Alert` islands.
 *
 * Raw HTML stays off (no `rehype-raw`): a docs page has no need for it, and
 * leaving it off means a page can be written by anyone, or by an agent, without
 * that being a way into the app.
 */

interface MdNode {
    type: string;
    value?: string;
    children?: MdNode[];
    data?: { hProperties?: Record<string, string> };
}

const ALERT_MARKER = /^\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION)\]\s*\n?/;

/**
 * GitHub's `> [!WARNING]` callout syntax, which `remark-gfm` does not itself
 * parse. Handled on the mdast rather than in the `blockquote` renderer, so the
 * marker is stripped from the source text and everything inside the callout —
 * links, emphasis, lists — keeps rendering normally.
 */
function remarkAlerts() {
    return (tree: MdNode) => {
        const walk = (node: MdNode) => {
            if (node.type === 'blockquote') {
                const paragraph = node.children?.[0];
                const text = paragraph?.children?.[0];
                if (paragraph?.type === 'paragraph' && text?.type === 'text') {
                    const match = ALERT_MARKER.exec(text.value ?? '');
                    if (match) {
                        text.value = (text.value ?? '').slice(match[0].length);
                        node.data = {
                            ...node.data,
                            hProperties: { 'data-alert': match[1].toLowerCase() },
                        };
                    }
                }
            }
            node.children?.forEach(walk);
        };
        walk(tree);
    };
}

const ALERT_VARIANTS: Record<string, 'info' | 'success' | 'warning' | 'error'> = {
    note: 'info',
    tip: 'success',
    important: 'info',
    warning: 'warning',
    caution: 'error',
};

/**
 * Flattens a heading's hast subtree to text, for the anchor id. Typed locally
 * rather than imported from `hast`: those types are a transitive dependency and
 * only the two fields below are ever read here.
 */
interface HastNode {
    type: string;
    value?: string;
    children?: HastNode[];
}

function nodeText(node: unknown): string {
    const hast = node as HastNode | undefined;
    if (!hast) return '';
    return (hast.children ?? [])
        .map((child) => (child.type === 'text' ? (child.value ?? '') : nodeText(child)))
        .join('');
}

const components: Components = {
    // The page title is rendered from frontmatter, so a body starts at h2 and the
    // right rail's table of contents is exactly the h2 list.
    h2: ({ node, children }) => (
        <h2
            id={slugify(nodeText(node))}
            className="scroll-mt-24 mt-10 mb-3 text-xl font-semibold tracking-tight first:mt-0"
        >
            {children}
        </h2>
    ),
    h3: ({ node, children }) => (
        <h3 id={slugify(nodeText(node))} className="scroll-mt-24 mt-6 mb-2 text-base font-semibold">
            {children}
        </h3>
    ),
    p: ({ children }) => <p className="my-4 leading-7 text-muted">{children}</p>,
    // An in-app path written in markdown carries no locale prefix, so it has to
    // go through the locale-aware Link — a plain <a href="/docs/start"> reaches
    // the proxy, which sends every reader to the default locale regardless of
    // the one they were reading in.
    a: ({ href, children }) => {
        if (href?.startsWith('/')) {
            return (
                <Link href={href} className="text-accent underline underline-offset-2 hover:opacity-80">
                    {children}
                </Link>
            );
        }
        return (
            <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline underline-offset-2 hover:opacity-80"
            >
                {children}
            </a>
        );
    },
    ul: ({ children }) => <ul className="my-4 list-disc space-y-2 pl-5 text-muted">{children}</ul>,
    ol: ({ children }) => (
        <ol className="my-4 list-decimal space-y-2 pl-5 text-muted">{children}</ol>
    ),
    li: ({ children }) => <li className="leading-7">{children}</li>,
    strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
    hr: () => <hr className="my-8 border-border/60" />,
    code: ({ className, children }) =>
        /language-/.test(className ?? '') ? (
            <code className="font-mono text-[0.85em]">{children}</code>
        ) : (
            <code className="rounded bg-surface-secondary px-1.5 py-0.5 font-mono text-[0.85em] text-foreground">
                {children}
            </code>
        ),
    pre: ({ children }) => (
        <pre className="my-4 overflow-x-auto rounded-lg border border-border/50 bg-surface p-4 text-sm">
            {children}
        </pre>
    ),
    table: ({ children }) => (
        <div className="my-4 overflow-x-auto">
            <table className="w-full border-collapse text-sm">{children}</table>
        </div>
    ),
    thead: ({ children }) => <thead className="border-b border-border">{children}</thead>,
    th: ({ children }) => <th className="px-3 py-2 text-left font-semibold">{children}</th>,
    td: ({ children }) => (
        <td className="border-b border-border/50 px-3 py-2 align-top text-muted">{children}</td>
    ),
    blockquote: ({ node, children }) => {
        const kind = node?.properties?.['data-alert'] ?? node?.properties?.dataAlert;
        if (typeof kind === 'string') {
            return (
                <div className="my-5 [&_p]:my-0 [&_p]:text-inherit">
                    <Alert variant={ALERT_VARIANTS[kind] ?? 'info'}>{children}</Alert>
                </div>
            );
        }
        return (
            <blockquote className="my-5 border-l-2 border-border pl-4 text-muted italic">
                {children}
            </blockquote>
        );
    },
};

export default function DocMarkdown({ body }: { body: string }) {
    return (
        <Markdown remarkPlugins={[remarkGfm, remarkAlerts]} components={components}>
            {body}
        </Markdown>
    );
}
