'use client';

import { useTranslations } from 'next-intl';

// Unread count; renders nothing at zero. `srOnly` — text for screen readers only,
// `inverse` — for a row already painted in the accent.
export function UnreadBadge({
  count,
  dot = false,
  srOnly = false,
  ring = false,
  inverse = false,
  className = '',
}: {
  count: number;
  dot?: boolean;
  srOnly?: boolean;
  ring?: boolean;
  inverse?: boolean;
  className?: string;
}) {
  const t = useTranslations('Chat');
  if (count <= 0) return null;
  // Leading comma: it follows other text in the same accessible name.
  const label = <span className="sr-only">, {t('unreadCount', { count })}</span>;
  if (srOnly) return label;

  const ringClass = ring ? 'ring-2 ring-background' : '';
  const toneClass = inverse ? 'bg-accent-foreground text-accent' : 'bg-accent text-accent-foreground';

  if (dot) {
    return (
      <span className={`block h-2.5 w-2.5 shrink-0 rounded-full ${toneClass} ${ringClass} ${className}`}>
        {label}
      </span>
    );
  }
  return (
    <span
      className={`min-w-[1.25rem] shrink-0 rounded-full px-1.5 py-0.5 text-center text-[10px] font-semibold leading-none tabular-nums ${toneClass} ${ringClass} ${className}`}
    >
      <span aria-hidden>{count > 99 ? '99+' : count}</span>
      {label}
    </span>
  );
}
