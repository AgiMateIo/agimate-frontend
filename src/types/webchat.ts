// Webchat: the transport the dashboard's own chat runs on — starting a chat,
// sending a message, the live channel. The conversation itself (listing,
// history, read pointer, close, rename) is not webchat's any more: it lives in
// `./chat-sessions` under `/manage/sessions`, one resource for every channel.

import type { ChatDirection, ChatPart, ChatStream } from './chat-sessions';

// Payload of the `webchat_activity` event published to the personal
// user:{userId} channel — the thin twin of `webchat_message` that keeps unread
// badges alive while no conversation is open. Published for `answer` and
// `error` only, never for `progress` or for an echo of the user's own message.
// Best-effort: a failed publish is simply lost and the next listing fixes the
// count, so it must never be the only source of truth for a badge.
export interface WebchatActivityPayload {
  agentId: string;
  sessionId: string;
  messageId: string;
  stream: Extract<ChatStream, 'answer' | 'error'>;
  preview: string | null;
  createdAt: string;
}

// Payload of the `webchat_message` event published to webchat:{sessionId}.
// Delivery is at-least-once — consumers must dedupe by messageId.
export interface WebchatMessagePayload {
  sessionId: string;
  channelId: string;
  agentId: string;
  messageId: string;
  direction: ChatDirection;
  stream: ChatStream | null;
  // Null on attachment-only messages.
  text: string | null;
  // AGENT: attachments arrive only with stream=answer. USER echoes carry the
  // uploaded parts with signed urls. Null/absent otherwise.
  parts: ChatPart[] | null;
  createdAt: string;
}

// Acknowledgement of POST .../messages; the agent reply arrives via Centrifugo.
export interface WebchatSendMessageResponse {
  sessionId: string;
  messageId: string;
}
