import type { ToolJsonSchema } from './apps';

// Channel: a handler-driven binding between a connector-sourced trigger and an agent.
// The handler name selects behaviour; `config` is a free-form map whose shape is described
// by the handler's JSON Schema (see ChannelHandlerResponse / GET /manage/channels/handlers/).
export interface ChannelResponse {
  id: string;
  agentId: string;
  name: string;
  channelHandler: string;
  connectorCode: string;
  // Connection instance id (connections.id UUID); null if the connection was deleted.
  connectionId: string | null;
  // Denormalised Connection.name; null if the underlying resource was deleted.
  connectionName: string | null;
  config: Record<string, unknown>;
  // Optional chat/input filter stored on the channel itself (filters delivery by trigger params).
  inputFilter: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChannelRequest {
  agentId: string;
  name: string;
  channelHandler: string;
  connectorCode: string;
  // connections.id of the connector instance the channel binds to.
  connectionId: string;
  config: Record<string, unknown>;
  inputFilter?: Record<string, unknown> | null;
}

export interface UpdateChannelRequest {
  name?: string;
  // Full replacement of the handler config.
  config?: Record<string, unknown>;
  inputFilter?: Record<string, unknown> | null;
  clearInputFilter?: boolean;
}

// One available channel handler + the JSON Schema describing its `config`.
// `configFields` is a ready-to-render JSON Schema (`type: 'object'`); property order
// is significant and should drive form field order.
export interface ChannelHandlerResponse {
  name: string;
  configFields: ToolJsonSchema;
}

export interface ChannelSessionResponse {
  id: string;
  title: string | null;
  lastMessageAt: string;
  closedAt: string | null;
  createdAt: string;
}

export type ChannelMessageDirection = 'IN' | 'OUT';

export interface ChannelSessionMessageResponse {
  id: string;
  direction: ChannelMessageDirection;
  message: string;
  createdAt: string;
}
