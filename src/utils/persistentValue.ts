/**
 * A single value kept in localStorage and readable through
 * `useSyncExternalStore`: a UI preference, or an id that belongs to the sign-in
 * rather than to the tab. Reading it this way is what keeps a stored preference
 * out of a setState-in-effect, safe to render on the server, and in step across
 * tabs.
 *
 * Every access is wrapped: touching `localStorage` throws outright when site
 * data is blocked (a Chrome cookie setting, a partitioned iframe, Firefox with
 * storage disabled), and `getSnapshot` runs *during render* — an unguarded read
 * would take the page down over a preference. `utils/referral.ts` had already
 * learned this; the stores had not.
 */
export interface PersistentValueStore<T> {
  subscribe(callback: () => void): () => void;
  getSnapshot(): T;
  getServerSnapshot(): T;
  set(value: T): void;
}

interface PersistentValueOptions<T> {
  /** localStorage key. */
  key: string;
  /** Same-tab notification; the `storage` event only reaches the other tabs. */
  event: string;
  /** Used when nothing is stored, when the stored text is not one of ours, or when storage is unreadable. */
  fallback: T;
  /** `null` means "not a value we recognise" — the fallback is used instead. */
  parse: (raw: string | null) => T | null;
  /** `null` means "remove the key". */
  serialize: (value: T) => string | null;
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function createPersistentValue<T>({
  key,
  event,
  fallback,
  parse,
  serialize,
}: PersistentValueOptions<T>): PersistentValueStore<T> {
  // getSnapshot is called on every render and must return the same value until
  // the stored text actually changes — otherwise React re-renders forever. The
  // cache is on the raw string, so a `parse` that builds an object is safe too.
  let lastRaw: string | null = null;
  let lastValue: T = fallback;
  let primed = false;

  return {
    subscribe(callback) {
      const onStorage = (e: StorageEvent) => {
        // `null` is a whole-storage clear; anything else is another key's business.
        if (e.key === null || e.key === key) callback();
      };
      window.addEventListener(event, callback);
      window.addEventListener('storage', onStorage);
      return () => {
        window.removeEventListener(event, callback);
        window.removeEventListener('storage', onStorage);
      };
    },

    getSnapshot() {
      const raw = read(key);
      if (primed && raw === lastRaw) return lastValue;
      lastRaw = raw;
      lastValue = parse(raw) ?? fallback;
      primed = true;
      return lastValue;
    },

    getServerSnapshot() {
      return fallback;
    },

    set(value) {
      if (typeof window === 'undefined') return;
      const raw = serialize(value);
      try {
        if (raw === null) localStorage.removeItem(key);
        else localStorage.setItem(key, raw);
      } catch {
        // Storage blocked, or full. The preference does not survive the reload;
        // nothing else about the page changes, and the event below still tells
        // this tab to re-read, so the UI stays consistent with what was stored.
      }
      window.dispatchEvent(new Event(event));
    },
  };
}
