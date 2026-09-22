'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePathname } from '@/i18n/navigation';
import { usePersonalEvent } from '@/realtime/usePersonalEvent';
import { cachedAgentName } from '@/queries/webchat';
import type { WebchatMessagePayload } from '@/types';
import { dismissAgentReply, pushAgentReply } from './toastStore';

const MESSAGE_EVENTS = ['webchat.message'] as const;
const PREVIEW_LENGTH = 120;

// Delivery is at-least-once; remembers recent messageIds.
const seen = new Set<string>();
const SEEN_LIMIT = 200;

function firstSeen(messageId: string): boolean {
  if (seen.has(messageId)) return false;
  seen.add(messageId);
  if (seen.size > SEEN_LIMIT) seen.delete(seen.values().next().value!);
  return true;
}

const chatPathOf = (agentId: string) => `/dashboard/agents/${agentId}/chat`;

// Toasts an agent's answer/error unless its chat is open; opening the chat dismisses it.
export function useAgentReplyToasts(enabled: boolean) {
  const queryClient = useQueryClient();
  const pathname = usePathname();

  usePersonalEvent(enabled, MESSAGE_EVENTS, (_type, payload) => {
    const message = payload as WebchatMessagePayload | undefined;
    if (!message?.messageId || message.direction !== 'AGENT') return;
    if (message.stream !== 'answer' && message.stream !== 'error') return;
    if (!firstSeen(message.messageId)) return;
    if (pathname.startsWith(chatPathOf(message.agentId))) return;

    const agentName = cachedAgentName(queryClient, message.agentId);

    const text = message.text?.trim() || null;
    pushAgentReply({
      agentId: message.agentId,
      agentName,
      text: text && text.length > PREVIEW_LENGTH ? `${text.slice(0, PREVIEW_LENGTH)}…` : text,
      isError: message.stream === 'error',
    });
  });

  const inChat = pathname.match(/^\/dashboard\/agents\/([^/]+)\/chat/)?.[1];
  useEffect(() => {
    if (inChat) dismissAgentReply(inChat);
  }, [inChat]);
}
