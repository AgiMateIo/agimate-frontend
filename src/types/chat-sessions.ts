// A conversation with an agent — one resource for every channel it can go
// through: the dashboard's own webchat, a messenger, an IDE. `/manage/sessions`
// is the single listing, history and lifecycle; `connectorCode` says what the
// conversation is carried by (`webchat`, `telegram`, `acp`, …).
//
// Not to be confused with `UserSessionResponse` in `./sessions` — that is a
// sign-in on a device, from another service entirely.

export type ChatDirection = 'USER' | 'AGENT';

// null on USER messages; AGENT messages carry the stream kind.
export type ChatStream = 'progress' | 'answer' | 'error';

// How to render an attachment part.
export type ChatPartType = 'image' | 'video' | 'audio' | 'file';

// An attachment on a message — AGENT answers and USER uploads alike. `fileId`
// is the file layer's `agf_…` id; the row itself lives in `/manage/files/` and
// outlives the message. `url` is a signed, short-lived (~15 min) link — either
// relative to the control context path or an absolute storage URL — so do not
// persist it; re-read history for a fresh one (dedupe/cache by `fileId`).
// Optimistic USER messages temporarily carry a local `blob:` URL here instead.
export interface ChatPart {
  type: ChatPartType;
  fileId: string;
  mime: string;
  size: number;
  url: string;
}

// Preview of a session's newest message, for a list row. `text` is cut to 160
// characters server-side, and is null on an attachment-only message — render
// "attachment" from `hasAttachments` rather than an empty line.
export interface ChatLastMessage {
  text: string | null;
  direction: ChatDirection;
  hasAttachments: boolean;
  createdAt: string;
}

// One row of GET /manage/sessions/ — and the answer of every other call about a
// session (by id, rename, close, and the webchat start), so a response can go
// straight back into the list.
export interface ChatSessionResponse {
  id: string;
  agentId: string;
  // The channel this conversation arrived through; null for a webchat session
  // and for a connection's channel-less event stream.
  channelId: string | null;
  // What carries the conversation: `webchat`, `telegram`, `acp`, …
  connectorCode: string;
  title: string | null;
  lastActivityAt: string;
  closedAt: string | null;
  createdAt: string;
  // AGENT messages with stream answer/error past this session's read pointer —
  // `progress` never counts (one reply would read as a dozen), own messages
  // never count. Closing a session marks it read, so a closed row shows 0.
  //
  // Counted off the webchat log alone: outside webchat it is always 0, because
  // the messenger itself owns what is unread there. Never badge such a row.
  unreadCount: number;
  // Null until the session has a message — and outside webchat, always.
  lastMessage: ChatLastMessage | null;
  // An agent run for this session is executing or queued — "working…". Only for
  // restoring the state when a screen opens: it goes out live with the
  // answer/error event, and a run stuck in the queue stops counting after 15 min.
  // False outside webchat, like the two fields above.
  isRunning: boolean;
}

// History item from GET /manage/sessions/{id}/messages/, one shape whatever
// storage answered.
export interface ChatSessionMessageResponse {
  // The row's own id — what the read pointer is addressed by.
  id: string;
  // Delivery key, shared with the live `webchat_message` event and what dedupes
  // against it. **Null outside webchat**: an external channel has no such id, so
  // dedupe those by `id`.
  messageId: string | null;
  direction: ChatDirection;
  stream: ChatStream | null;
  // Null on attachment-only messages.
  text: string | null;
  // Attachments with freshly signed urls; null without files — and null outside
  // webchat, where attachments don't exist in this shape.
  parts: ChatPart[] | null;
  createdAt: string;
}
