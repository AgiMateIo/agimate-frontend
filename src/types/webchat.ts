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

export interface WebchatSessionResponse {
  sessionId: string;
  channelId: string;
  agentId: string;
  title: string | null;
  lastMessageAt: string;
  closedAt: string | null;
  createdAt: string;
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
