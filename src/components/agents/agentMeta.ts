import type { ComponentType, SVGProps } from 'react';
import {
  BoltIcon,
  ArrowsRightLeftIcon,
  CpuChipIcon,
  PuzzlePieceIcon,
} from '@heroicons/react/24/outline';
import type { AgentResponse, AgentType } from '@/types';

// Glyph + i18n label key per delivery type — realtime, HTTP callback, in-platform.
export const TYPE_META: Record<
  AgentType,
  { icon: ComponentType<SVGProps<SVGSVGElement>>; labelKey: 'centrifugo' | 'webhook' | 'generic' | 'mcp' }
> = {
  CENTRIFUGO: { icon: BoltIcon, labelKey: 'centrifugo' },
  WEBHOOK: { icon: ArrowsRightLeftIcon, labelKey: 'webhook' },
  GENERIC: { icon: CpuChipIcon, labelKey: 'generic' },
  MCP: { icon: PuzzlePieceIcon, labelKey: 'mcp' },
};

// An MCP agent has no chat to open — it leads to the page that does carry its
// point: the connection details. Every view of the list agrees on this, which
// is the reason it lives here and not in one of them.
export function agentHref(agent: AgentResponse): string {
  return agent.type === 'MCP'
    ? `/dashboard/agents/${agent.id}`
    : `/dashboard/agents/${agent.id}/chat`;
}

// What stands in for the agent in a list: its description, or its prompt when
// nobody wrote one. Callers render the prompt in mono — it is the agent's own
// text, not a sentence about it.
export function agentPreview(agent: AgentResponse): string | null {
  return agent.description || agent.instructions || null;
}

// A prompt runs to kilobytes, and a native tooltip has no line-clamp — the
// first line, cut, is all a hover should ever show.
export function previewTooltip(agent: AgentResponse): string | null {
  const preview = agentPreview(agent);
  if (!preview) return null;
  const firstLine = preview.split('\n', 1)[0].trim();
  return firstLine.length > 160 ? `${firstLine.slice(0, 160)}…` : firstLine;
}
