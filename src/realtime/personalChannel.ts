import type { Subscription } from 'centrifuge';
import { initCentrifuge, getChannelToken } from './centrifugoClient';

// Everything addressed to the user rather than to one entity arrives on a
// single personal channel (`user:{userId}`): board events for their boards and
// `webchat_activity` for their chats.
//
// Centrifugo allows one subscription per channel per connection, so the app
// gets exactly one and fans publications out to whoever is listening. This is
// not an optimisation: two components each calling `newSubscription` on the
// same channel — a board open while chat badges listen — would tear each
// other's subscription down on every mount. It also rules out server-side
// `tagsFilter`, since the filter would belong to one listener and silently
// starve the others; listeners narrow the stream themselves, and the volume of
// one user's own events makes that a fair trade.

export interface PersonalEvent {
  type: string;
  payload: unknown;
}

type Listener = (event: PersonalEvent) => void;

const listeners = new Set<Listener>();
let subscription: Subscription | null = null;
let setupInFlight: Promise<void> | null = null;

async function setup(): Promise<void> {
  const centrifuge = await initCentrifuge();
  const token = await getChannelToken();
  if (subscription) return;

  // A subscription left over from a previous connection (or a logout that
  // raced this setup) would refuse a second `newSubscription` on the channel.
  const existing = centrifuge.getSubscription(token.channel);
  if (existing) {
    existing.unsubscribe();
    centrifuge.removeSubscription(existing);
  }

  const sub = centrifuge.newSubscription(token.channel, {
    token: token.subscriptionToken,
    getToken: async () => {
      const fresh = await getChannelToken();
      return fresh.subscriptionToken;
    },
  });

  sub.on('error', (ctx) => {
    console.error('[centrifugo] personal subscription error', {
      type: ctx?.type,
      channel: ctx?.channel,
      code: ctx?.error?.code,
      message: ctx?.error?.message,
    });
  });

  sub.on('publication', (ctx: { data: unknown }) => {
    const data = ctx.data as { type?: string; payload?: unknown } | undefined;
    if (!data || typeof data.type !== 'string') return;
    const event: PersonalEvent = { type: data.type, payload: data.payload };
    listeners.forEach((listener) => listener(event));
  });

  sub.subscribe();
  subscription = sub;
}

/**
 * Adds a listener for personal-channel events, subscribing on the first one.
 *
 * The subscription outlives its listeners on purpose: it is one channel per
 * user, and dropping it whenever a page navigates away would re-negotiate a
 * token on the way back — for a stream that costs nothing to keep open. It
 * ends with the connection, in `disconnectCentrifuge`.
 */
export function subscribePersonalChannel(listener: Listener): () => void {
  listeners.add(listener);
  if (!subscription && !setupInFlight) {
    setupInFlight = setup()
      .catch((err) => {
        console.error('[centrifugo] personal subscription failed:', err);
      })
      .finally(() => {
        setupInFlight = null;
      });
  }
  return () => {
    listeners.delete(listener);
  };
}

// Called from disconnectCentrifuge: the channel belongs to the user who just
// left, and the client it lived on is gone.
export function resetPersonalChannel(): void {
  listeners.clear();
  subscription = null;
  setupInFlight = null;
}
