'use client';

import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Full markdown rendering for webchat agent/user text via react-markdown + GFM
// (tables, headings, lists, task lists, strikethrough, autolinks). Raw HTML is
// NOT enabled (no rehype-raw), so untrusted agent output can't inject markup —
// react-markdown escapes it. Element styling is mapped to Tailwind here so we
// don't depend on a prose plugin; links keep the target=_blank behavior the
// hand-rolled version had. Image markdown is intentionally rendered as a link,
// since files/attachments arrive separately via ChatMessageAttachments.
const components: Components = {
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="underline underline-offset-2 break-all hover:opacity-80"
    >
      {children}
    </a>
  ),
  p: ({ children }) => <p className="whitespace-pre-wrap break-words">{children}</p>,
  h1: ({ children }) => <h1 className="text-base font-bold mt-3 mb-1 first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="text-base font-bold mt-3 mb-1 first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-bold mt-3 mb-1 first:mt-0">{children}</h3>,
  h4: ({ children }) => <h4 className="text-sm font-semibold mt-2 mb-1 first:mt-0">{children}</h4>,
  h5: ({ children }) => <h5 className="text-sm font-semibold mt-2 mb-1 first:mt-0">{children}</h5>,
  h6: ({ children }) => <h6 className="text-sm font-semibold mt-2 mb-1 first:mt-0">{children}</h6>,
  ul: ({ children }) => <ul className="list-disc pl-5 my-1 space-y-0.5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 my-1 space-y-0.5">{children}</ol>,
  li: ({ children }) => <li className="break-words">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  del: ({ children }) => <del className="line-through opacity-70">{children}</del>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-border pl-3 my-1 text-muted">{children}</blockquote>
  ),
  hr: () => <hr className="my-2 border-border" />,
  code: ({ className, children }) => {
    // Inline code has no language className; fenced blocks carry `language-*`.
    const isBlock = /language-/.test(className ?? '');
    if (isBlock) {
      return (
        <code className="font-mono text-[0.85em] break-words whitespace-pre-wrap">{children}</code>
      );
    }
    return (
      <code className="font-mono text-[0.85em] bg-border/50 rounded px-1 py-0.5 break-words">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="my-1 overflow-x-auto rounded-lg bg-surface border border-border/50 p-3 text-xs">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="my-1 overflow-x-auto">
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="border-b border-border">{children}</thead>,
  th: ({ children }) => <th className="px-2 py-1 text-left font-semibold">{children}</th>,
  td: ({ children }) => <td className="px-2 py-1 border-b border-border/50 align-top">{children}</td>,
};

export function ChatMessageText({ text }: { text: string }) {
  return (
    <div className="space-y-1">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
