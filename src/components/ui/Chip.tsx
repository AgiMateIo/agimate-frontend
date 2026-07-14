import type { ComponentType, ReactNode, SVGProps } from 'react';

// Compact metadata pill for a card's secondary row (host, model, timestamp, count).
// `default` is an outlined neutral pill; the tinted tones carry light semantic weight.
export type ChipTone = 'default' | 'accent' | 'warning' | 'success';

const TONES: Record<ChipTone, string> = {
  default: 'border border-border text-muted',
  accent: 'bg-accent/10 text-accent',
  warning: 'bg-warning/10 text-warning',
  success: 'bg-success/10 text-success',
};

interface ChipProps {
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  tone?: ChipTone;
  children: ReactNode;
}

export function Chip({ icon: Icon, tone = 'default', children }: ChipProps) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${TONES[tone]}`}>
      {Icon && <Icon className="h-3 w-3 shrink-0" />}
      <span className="truncate max-w-[14rem]">{children}</span>
    </span>
  );
}
