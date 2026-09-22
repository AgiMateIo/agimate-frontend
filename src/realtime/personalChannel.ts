import type { Subscription } from 'centrifuge';
import { initCentrifuge, getChannelToken } from './centrifugoClient';

// Everything addressed to the user rather than to one entity arrives on a
// single personal channel (`user:{userId}`): board events for their boards,
// `session.*` rows of their conversations, their team agents' requests.
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
  // What the publication was tagged with server-side. The one place a scope
  // lives that the payload itself doesn't carry (a team's requests are tagged
  // `teamId`), so it is passed through rather than dropped — the filtering
  // still happens here, not as a `tagsFilter` (see above).
  tags?: Record<string, string>;
}

type Listener = (event: PersonalEvent) => void;

const listeners = new Set<Listener>();

// Bumped whenever a reconnect could not recover what was missed (a long
// offline outlasts the channel's history). Events are best-effort on top of
// REST, and after a gap nothing says what the gap held — so every screen
// re-reads. React Query caches are refetched by `usePersonalChannel`; local
// state that is not a query (the open chat's thread) remounts on the epoch.
let resyncEpoch = 0;
const resyncListeners = new Set<() => void>();

export function subscribeResync(listener: () => void): () => void {
  resyncListeners.add(listener);
  return () => {
    resyncListeners.delete(listener);
  };
}

export function getResyncEpoch(): number {
  return resyncEpoch;
}
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

  // History and recovery are on for the channel, so the SDK re-delivers what
  // a short drop missed by itself; only a failed recovery is ours to handle.
  sub.on('subscribed', (ctx) => {
    if (!ctx.wasRecovering || ctx.recovered) return;
    resyncEpoch += 1;
    resyncListeners.forEach((listener) => listener());
  });

  sub.on('publication', (ctx: { data: unknown; tags?: Record<string, string> }) => {
    const data = ctx.data as { type?: string; payload?: unknown } | undefined;
    if (!data || typeof data.type !== 'string') return;
    const event: PersonalEvent = { type: data.type, payload: data.payload, tags: ctx.tags };
    listeners.forEach((listener) => listener(event));
  });

  sub.subscribe();
  subscription = sub;
}

/**
 * Subscribes to the personal channel unless that is done or under way. Called
 * by the dashboard shell up front, so nothing published between sign-in and
 * the first screen that listens is lost.
 */
export function openPersonalChannel(): void {
  if (subscription || setupInFlight) return;
  setupInFlight = setup()
    .catch((err) => {
      console.error('[centrifugo] personal subscription failed:', err);
    })
    .finally(() => {
      setupInFlight = null;
    });
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
  openPersonalChannel();
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
