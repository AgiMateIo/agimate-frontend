// Webchat (dashboard chat with agents) types

export type WebchatDirection = 'USER' | 'AGENT';

// null on USER messages; AGENT messages carry the stream kind.
export type WebchatStream = 'progress' | 'answer' | 'error';

// How to render an attachment part.
export type WebchatPartType = 'image' | 'video' | 'audio' | 'file';

// An attachment on a message — AGENT answers and USER uploads alike. `url` is
// a signed, short-lived (~15 min) link relative to the control context path —
// do not persist it; re-read history for a fresh one (dedupe/cache by `fileId`).
// Optimistic USER messages temporarily carry a local `blob:` URL here instead.
export interface WebchatPart {
  type: WebchatPartType;
  fileId: string;
  mime: string;
  size: number;
  url: string;
}

// Response of POST /manage/webchat/files. Reference the upload via its fileId
// in a message's `parts` before `expiresAt`; unsent uploads expire server-side.
export interface WebchatFileUploadResponse {
  fileId: string;
  mime: string;
  size: number;
  // Name the file was stored under (taken from the uploaded file's name).
  name: string;
  expiresAt: string;
}

// Preview of a session's newest message, for a list row. `text` is cut to 160
// characters server-side, and is null on an attachment-only message — render
// "attachment" from `hasAttachments` rather than an empty line.
export interface WebchatLastMessage {
  text: string | null;
  direction: WebchatDirection;
  hasAttachments: boolean;
  createdAt: string;
}

export interface WebchatSessionResponse {
  sessionId: string;
  channelId: string;
  agentId: string;
  title: string | null;
  lastMessageAt: string;
  closedAt: string | null;
  createdAt: string;
  // AGENT messages with stream answer/error past this session's read pointer —
  // `progress` never counts (one reply would read as a dozen), own messages
  // never count. Closing a session marks it read, so a closed row shows 0.
  unreadCount: number;
  // Null until the session has a message.
  lastMessage: WebchatLastMessage | null;
  // An agent run for this session is executing or queued — "working…". Only for
  // restoring the state when a screen opens: it goes out live with the
  // answer/error event, and a run stuck in the queue stops counting after 15 min.
  isRunning: boolean;
}

// History item from GET /manage/webchat/sessions/{id}/messages/
export interface WebchatMessageResponse {
  id: string;
  messageId: string;
  direction: WebchatDirection;
  stream: WebchatStream | null;
  // Null on attachment-only messages.
  text: string | null;
  // Attachments (AGENT answers and USER uploads); absent/null without files.
  parts: WebchatPart[] | null;
  createdAt: string;
}

// Acknowledgement of POST .../messages; the agent reply arrives via Centrifugo.
export interface WebchatSendMessageResponse {
  sessionId: string;
  messageId: string;
}

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
  stream: Extract<WebchatStream, 'answer' | 'error'>;
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
  direction: WebchatDirection;
  stream: WebchatStream | null;
  // Null on attachment-only messages.
  text: string | null;
  // AGENT: attachments arrive only with stream=answer. USER echoes carry the
  // uploaded parts with signed urls. Null/absent otherwise.
  parts: WebchatPart[] | null;
  createdAt: string;
}
