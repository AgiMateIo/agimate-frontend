// Webchat (dashboard chat with agents) types

export type WebchatDirection = 'USER' | 'AGENT';

// null on USER messages; AGENT messages carry the stream kind.
export type WebchatStream = 'progress' | 'answer' | 'error';

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
  text: string;
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
  text: string;
  createdAt: string;
}
