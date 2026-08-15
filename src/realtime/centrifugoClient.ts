import { Centrifuge } from 'centrifuge';
import apiService from '@/services/api';
import { resetPersonalChannel } from './personalChannel';
import type { CentrifugoTokenResponse } from '@/types';

const TOKEN_REFRESH_MARGIN_MS = 60_000;

let centrifuge: Centrifuge | null = null;
let initInFlight: Promise<Centrifuge> | null = null;
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
  return fetchToken();
}

async function createAndConnect(): Promise<Centrifuge> {
  const token = await fetchToken();

  const client = new Centrifuge(token.wsUrl, {
    token: token.connectionToken,
    getToken: async () => {
      const fresh = await fetchToken(true);
      return fresh.connectionToken;
    },
  });

  client.on('error', (ctx) => {
    console.error('[centrifugo] error', {
      type: ctx?.type,
      code: ctx?.error?.code,
      message: ctx?.error?.message,
      transport: ctx?.transport,
    });
  });

  client.connect();
  centrifuge = client;
  return client;
}

export async function initCentrifuge(): Promise<Centrifuge> {
  if (centrifuge) return centrifuge;
  // Deduplicate concurrent init (e.g. two subscribers mounting at once) —
  // without this, each caller would open its own WebSocket connection.
  if (!initInFlight) {
    initInFlight = createAndConnect().finally(() => {
      initInFlight = null;
    });
  }
  return initInFlight;
}

export function disconnectCentrifuge(): void {
  if (centrifuge) {
    centrifuge.disconnect();
    centrifuge = null;
  }
  // The shared personal-channel subscription lived on that client and belongs
  // to the user who just signed out.
  resetPersonalChannel();
  cachedToken = null;
  cachedAt = 0;
  inFlight = null;
}
