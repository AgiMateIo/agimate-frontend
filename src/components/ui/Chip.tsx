import type { ComponentType, ReactNode, SVGProps } from 'react';

// Compact pill for a card's secondary row (host, model, timestamp, count) and for
// the status labels that sit beside a title. `default` is an outlined neutral pill;
// the tinted tones carry light semantic weight.
export type ChipTone = 'default' | 'accent' | 'warning' | 'success' | 'error' | 'muted';

const TONES: Record<ChipTone, string> = {
  default: 'border border-border text-muted',
  accent: 'bg-accent/10 text-accent',
  warning: 'bg-warning/10 text-warning',
  success: 'bg-success/10 text-success',
  error: 'bg-error/10 text-error',
  muted: 'bg-muted/10 text-muted',
};

interface ChipProps {
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  tone?: ChipTone;
  // A status or label pill rather than a piece of metadata: same geometry, medium
  // text. The distinction is what separates "enabled" next to a heading from the
  // model name under it.
  strong?: boolean;
  // Native tooltip. Worth having on the component itself because the text is
  // truncated past 14rem, and the explanation of a one-word status usually has
  // nowhere else to go.
  title?: string;
  children: ReactNode;
}

export function Chip({ icon: Icon, tone = 'default', strong = false, title, children }: ChipProps) {
  return (
    <span
      title={title}
      // `font-sans` because a chip is a label in its own right: several of these sit
      // inside monospace table cells and must not inherit the cell's font.
      className={`inline-flex items-center gap-1 font-sans text-xs px-2 py-0.5 rounded-full ${strong ? 'font-medium ' : ''}${TONES[tone]}`}
    >
      {Icon && <Icon className="h-3 w-3 shrink-0" />}
      <span className="truncate max-w-[14rem]">{children}</span>
    </span>
  );
}
