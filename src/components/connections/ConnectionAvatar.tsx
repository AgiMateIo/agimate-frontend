'use client';

// Per-connector avatar tile: a two-letter mark on a color-tinted background.
// There's no per-connector logo from the backend, so the color is derived
// deterministically from the connector code (stable across renders/sessions).
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

interface ConnectionAvatarProps {
  connectorCode: string;
  connectorName: string;
  size?: 'md' | 'lg';
}

export function ConnectionAvatar({ connectorCode, connectorName, size = 'md' }: ConnectionAvatarProps) {
  const dim = size === 'lg' ? 'h-12 w-12 text-base' : 'h-11 w-11 text-sm';
  const className = PALETTE[hashCode(connectorCode) % PALETTE.length];

  return (
    <div className={`${dim} rounded-xl flex items-center justify-center font-bold shrink-0 ${className}`}>
      {initials(connectorName)}
    </div>
  );
}
