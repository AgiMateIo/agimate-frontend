import { useSyncExternalStore } from 'react';

// One toast per agent: a new reply updates it in place instead of stacking.
export interface AgentReplyToast {
  agentId: string;
  agentName: string | null;
  // null for an attachment-only reply.
  text: string | null;
  isError: boolean;
  count: number;
  version: number;
}

const MAX_TOASTS = 3;

let toasts: AgentReplyToast[] = [];
const listeners = new Set<() => void>();

function set(next: AgentReplyToast[]) {
  toasts = next;
  listeners.forEach((listener) => listener());
}

export function pushAgentReply(reply: Omit<AgentReplyToast, 'count' | 'version'>) {
  const existing = toasts.find((t) => t.agentId === reply.agentId);
  const toast: AgentReplyToast = existing
    ? { ...reply, count: existing.count + 1, version: existing.version + 1 }
    : { ...reply, count: 1, version: 0 };
  set([toast, ...toasts.filter((t) => t.agentId !== reply.agentId)].slice(0, MAX_TOASTS));
}

export function dismissAgentReply(agentId: string) {
  set(toasts.filter((t) => t.agentId !== agentId));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const empty: AgentReplyToast[] = [];

export function useAgentReplyToastList(): AgentReplyToast[] {
  return useSyncExternalStore(subscribe, () => toasts, () => empty);
}
