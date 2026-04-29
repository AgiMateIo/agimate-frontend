import { Centrifuge } from 'centrifuge';
import apiService from '@/services/api';
import type { CentrifugoTokenResponse } from '@/types';

const TOKEN_REFRESH_MARGIN_MS = 60_000;

let centrifuge: Centrifuge | null = null;
let cachedToken: CentrifugoTokenResponse | null = null;
let cachedAt = 0;
let inFlight: Promise<CentrifugoTokenResponse> | null = null;

async function fetchToken(forceRefresh = false): Promise<CentrifugoTokenResponse> {
  const now = Date.now();
  if (!forceRefresh && cachedToken && now - cachedAt < 55 * 60 * 1000 - TOKEN_REFRESH_MARGIN_MS) {
    return cachedToken;
  }
  if (inFlight) return inFlight;
  inFlight = apiService.getCentrifugoToken()
    .then((token) => {
      cachedToken = token;
      cachedAt = Date.now();
      return token;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

export async function getChannelToken(): Promise<CentrifugoTokenResponse> {
  return cachedToken ?? fetchToken();
}

export async function initCentrifuge(): Promise<Centrifuge> {
  if (centrifuge) return centrifuge;

  const token = await fetchToken();

  centrifuge = new Centrifuge(token.wsUrl, {
    token: token.connectionToken,
    getToken: async () => {
      const fresh = await fetchToken(true);
      return fresh.connectionToken;
    },
  });

  centrifuge.on('error', (ctx) => {
    console.error('[centrifugo] error', {
      type: ctx?.type,
      code: ctx?.error?.code,
      message: ctx?.error?.message,
      transport: ctx?.transport,
    });
  });

  centrifuge.connect();
  return centrifuge;
}

export function getCentrifuge(): Centrifuge | null {
  return centrifuge;
}

export function disconnectCentrifuge(): void {
  if (centrifuge) {
    centrifuge.disconnect();
    centrifuge = null;
  }
  cachedToken = null;
  cachedAt = 0;
  inFlight = null;
}
