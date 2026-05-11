// Channel: declarative binding between a dialog trigger (incoming user message) and
// a reply tool-call with a parameter template.
export interface ChannelResponse {
  pubId: string;
  agentPubId: string;
  name: string;

  // Trigger side
  triggerConnectorCode: string;
  triggerIdentity: string;
  triggerIdentityName: string | null;
  triggerName: string;
  triggerMessageField: string;

  // Reply side
  replyConnectorCode: string;
  replyIdentity: string;
  replyIdentityName: string | null;
  replyToolName: string;
  replyToolParams: Record<string, unknown>;

  // Optional filter stored on the underlying AgentTriggerPolicy
  inputFilter: Record<string, unknown> | null;

  createdAt: string;
  updatedAt: string;
}

export interface CreateChannelRequest {
  agentPubId: string;
  name: string;
  triggerConnectorCode: string;
  triggerIdentity: string;
  triggerName: string;
  triggerMessageField: string;
  replyConnectorCode: string;
  replyIdentity: string;
  replyToolName: string;
  replyToolParams: Record<string, unknown>;
  inputFilter?: Record<string, unknown> | null;
}

export interface UpdateChannelRequest {
  name?: string;
  triggerMessageField?: string;
  replyToolParams?: Record<string, unknown>;
  inputFilter?: Record<string, unknown> | null;
  clearInputFilter?: boolean;
}

export interface ChannelSessionResponse {
  pubId: string;
  title: string | null;
  lastMessageAt: string;
  closedAt: string | null;
  createdAt: string;
}

export type ChannelMessageDirection = 'IN' | 'OUT';

export interface ChannelSessionMessageResponse {
  pubId: string;
  direction: ChannelMessageDirection;
  message: string;
  createdAt: string;
}
