// Webchat: the transport the dashboard's own chat runs on — starting a chat,
// sending a message, the live channel. The conversation itself (listing,
// history, read pointer, close, rename) is not webchat's any more: it lives in
// `./chat-sessions` under `/manage/sessions`, one resource for every channel.

import type { ChatDirection, ChatLastMessage, ChatPart, ChatStream } from './chat-sessions';

// A row of GET /manage/webchat/contacts/ and the `webchat.agent.updated` payload.
// `unreadCount` is the server's total across the agent's chats — never sum it locally.
export interface WebchatContactResponse {
  agentId: string;
  name: string;
  description: string | null;
  enabled: boolean;
  unreadCount: number;
  lastMessage: ChatLastMessage | null;
  lastSessionId: string | null;
  lastActivityAt: string | null;
  isRunning: boolean;
}

// Payload of the `webchat.message` event on the personal user:{userId} channel
// (it used to be `webchat_message` on webchat:{sessionId}; same payload).
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
