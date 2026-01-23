export interface Webhook {
  id: string;  // UUID
  name: string;
  description: string;
  eventTypes: string[];   // Changed from eventType to eventTypes array
  url: string;
  hasAuth: boolean;
  enabled: boolean;
  lastTriggeredAt: string | null;  // "yyyy-MM-dd HH:mm:ss"
  createdAt: string;                // "yyyy-MM-dd HH:mm:ss"
  updatedAt: string;                // "yyyy-MM-dd HH:mm:ss"
}

export interface CreateWebhookRequest {
  name: string;           // max 100
  description?: string;   // max 500
  eventTypes: string[];   // Changed from eventType to eventTypes array
  url: string;            // max 2000, pattern: ^https?://.+
  authHeader?: string;    // max 1000
  enabled?: boolean;      // default: true
}

export interface UpdateWebhookRequest {
  name?: string;          // max 100
  description?: string;   // max 500
  eventTypes?: string[];  // Changed from eventType to eventTypes array
  url?: string;           // max 2000, pattern: ^https?://.+
  authHeader?: string;    // max 1000
  enabled?: boolean;
}

export interface WebhookEventType {
  id: number;
  eventType: string;
  title: string;
  description: string;
}

export interface WebhookDelivery {
  id: string;
  eventType: string;
  requestUrl: string;
  responseStatusCode: number;
  durationMs: number;
  triggeredAt: string;  // "yyyy-MM-dd HH:mm:ss"
}

export interface WebhookDeliveriesResponse {
  content: WebhookDelivery[];
  page: number;
  size: number;
  totalElements: number;
}
