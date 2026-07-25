import { createAvatarDataUri } from '@/utils/syntheticMates';

// Avatars are generated locally (offline, deterministic by seed): no network
// dependency and agent names never leave the app.

// Same seed → same SVG, so memoise to avoid re-generating on every React render.
const cache = new Map<string, string>();

export function getAgentAvatarUrl(name: string): string {
  const cached = cache.get(name);
  if (cached) return cached;

  const uri = createAvatarDataUri(name);
  cache.set(name, uri);
  return uri;
}
