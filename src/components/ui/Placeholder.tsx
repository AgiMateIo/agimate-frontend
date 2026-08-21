import type { ReactNode } from 'react';

// The centred muted line that stands in for content: "loading…", "nothing here
// yet", "nothing matched the filter". One hand-written block served all three in
// ninety places and in six different paddings, so the size is a named choice now
// — and it follows what the placeholder sits inside rather than the mood of
// whoever wrote it.
const SIZES = {
  // A page or a section of one: the empty canvas is the point.
  md: 'py-12',
  // Inside a card, a panel or a modal, where the frame already carries the space
  // and the text reads as nested.
  sm: 'py-8 text-sm',
  // A tight nested panel, where py-8 would push everything below it out of view.
  xs: 'py-4 text-sm',
} as const;

export type PlaceholderSize = keyof typeof SIZES;

export function Placeholder({
  size = 'md',
  children,
}: {
  size?: PlaceholderSize;
  children: ReactNode;
}) {
  return <div className={`text-center text-muted ${SIZES[size]}`}>{children}</div>;
}
