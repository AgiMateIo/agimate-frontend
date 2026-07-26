'use client';

import { getConnectorLogo } from './connectorLogo';

// Per-connector avatar tile. Known connectors get their hardcoded mark (see
// connectorLogo.tsx); anything else falls back to a two-letter initials mark on
// a color-tinted background, the color derived deterministically from the
// connector code (stable across renders/sessions).
const PALETTE = [
  'bg-emerald-500/15 text-emerald-500',
  'bg-orange-500/15 text-orange-500',
  'bg-blue-500/15 text-blue-500',
  'bg-violet-500/15 text-violet-500',
  'bg-sky-500/15 text-sky-500',
  'bg-amber-500/15 text-amber-500',
  'bg-rose-500/15 text-rose-500',
  'bg-cyan-500/15 text-cyan-500',
];

function hashCode(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function initials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/[\s_-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return trimmed.slice(0, 2).toUpperCase();
}

type AvatarSize = 'sm' | 'md' | 'lg';

const SIZES: Record<AvatarSize, { tile: string; glyph: string }> = {
  sm: { tile: 'h-8 w-8 rounded-lg text-[11px]', glyph: 'h-4 w-4' },
  md: { tile: 'h-11 w-11 rounded-xl text-sm', glyph: 'h-5 w-5' },
  lg: { tile: 'h-12 w-12 rounded-xl text-base', glyph: 'h-6 w-6' },
};

interface ConnectionAvatarProps {
  connectorCode: string;
  connectorName: string;
  size?: AvatarSize;
}

export function ConnectionAvatar({ connectorCode, connectorName, size = 'md' }: ConnectionAvatarProps) {
  const { tile, glyph } = SIZES[size];
  const logo = getConnectorLogo(connectorCode);
  const tone = logo?.tone ?? PALETTE[hashCode(connectorCode) % PALETTE.length];

  return (
    <div className={`${tile} flex items-center justify-center font-bold shrink-0 ${tone}`}>
      {logo ? <logo.Icon className={glyph} /> : initials(connectorName)}
    </div>
  );
}
