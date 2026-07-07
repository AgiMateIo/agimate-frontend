export interface WebhookDeliveryLog {
  id: string;
  requestUrl: string;
  responseStatusCode: number;
  error: string | null;
  durationMs: number;
  success: boolean;
  deliveredAt: string;
}
