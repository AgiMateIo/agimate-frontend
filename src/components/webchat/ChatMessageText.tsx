'use client';

import type { ReactNode } from 'react';

// Minimal markdown rendering for the first webchat version: [label](url) links
// and bare URLs become anchors, the rest is pre-wrapped text. Agents may
// return file links as markdown in `text` — this keeps them clickable without
// pulling in a full markdown stack.
export function ChatMessageText({ text }: { text: string }) {
  const linkRe = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>()]+)/g;
  const nodes: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = linkRe.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const label = match[1] ?? match[3];
    const href = match[2] ?? match[3];
    nodes.push(
      <a
        key={match.index}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 break-all hover:opacity-80"
      >
        {label}
      </a>
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <span className="whitespace-pre-wrap break-words">{nodes}</span>;
}
