import { createAvatar } from '@dicebear/core';
import { bottts } from '@dicebear/collection';

// Avatars are generated locally (offline, deterministic by seed) instead of the
// old https://api.dicebear.com HTTP API: no network dependency, and agent names
// never leave the app. Rendering matches the previous remote `9.x/bottts` output.
//
// To add a custom set later, point AVATAR_STYLE at another DiceBear collection or a
// custom Style — every `getAgentAvatarUrl` call site keeps working unchanged. If the
// choice needs to be per-agent, widen the signature here; callers pass only the seed.
const AVATAR_STYLE = bottts;

// Same seed → same SVG, so memoise to avoid re-generating on every React render.
const cache = new Map<string, string>();

export function getAgentAvatarUrl(name: string): string {
  const cached = cache.get(name);
  if (cached) return cached;

  const uri = createAvatar(AVATAR_STYLE, { seed: name }).toDataUri();
  cache.set(name, uri);
  return uri;
}
