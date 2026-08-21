// AgiMate brand mark — a diamond over two chevrons over two diamonds, all on one
// 45-degree grid. Geometry mirrors public/logo-mark.svg; keep them in sync.
//
// Two inks alternate down the stack (diamond, chevron, chevron, diamonds) but the
// component still takes only one: callers set it with a text-* class, and the
// second band is that same colour at 0.62 alpha. Hence `currentColor` survives —
// the landing header animates it on hover, and the sidebar hands it white.
//
// Which band is dimmed is not free. It has to be the upper chevron and the bottom
// diamonds, so that the top diamond stays the bright one and this matches both
// public/logo-mark.svg and public/logo-tile.svg — the sidebar renders this
// component inside the very tile that file draws, and the two must not come out
// mirrored. The consequence is that on the dark theme the alternation runs toward
// the background instead of always lighter: with one input colour there is no way
// round it, since the sidebar's currentColor is white and nothing is lighter.
//
// 0.62 rather than 0.5 is a trade: it costs separation on dark (luminance ratio
// 1.85 against the file's 2.24) and buys the dimmed band visibility against the
// ground (2.34 rather than 1.95, which read as holes). On light it lands at 2.09,
// near the file's 2.11.
export default function Logo({ className = 'h-6 w-auto' }: { className?: string }) {
  return (
    <svg viewBox="-4.57 -1.71 89.15 80.82" className={className} fill="currentColor" aria-hidden="true">
      {/* top diamond + lower chevron — the bright band */}
      <path
        d="M38.23 -0.98 A2.5 2.5 0 0 1 41.77 -0.98 L52.73 9.98 A2.5 2.5 0 0 1 52.73 13.52 L41.77 24.48 A2.5 2.5 0 0 1 38.23 24.48 L27.27 13.52 A2.5 2.5 0 0 1 27.27 9.98 Z
           M10.27 43.52 A2.5 2.5 0 0 1 10.27 39.98 L13.98 36.27 A2.5 2.5 0 0 1 17.52 36.27 L38.23 56.98 A2.5 2.5 0 0 0 41.77 56.98 L62.48 36.27 A2.5 2.5 0 0 1 66.02 36.27 L69.73 39.98 A2.5 2.5 0 0 1 69.73 43.52 L41.77 71.48 A2.5 2.5 0 0 1 38.23 71.48 Z"
      />
      {/* upper chevron + the two bottom diamonds */}
      <path
        fillOpacity={0.62}
        d="M10.27 20.02 A2.5 2.5 0 0 1 10.27 16.48 L13.98 12.77 A2.5 2.5 0 0 1 17.52 12.77 L38.23 33.48 A2.5 2.5 0 0 0 41.77 33.48 L62.48 12.77 A2.5 2.5 0 0 1 66.02 12.77 L69.73 16.48 A2.5 2.5 0 0 1 69.73 20.02 L41.77 47.98 A2.5 2.5 0 0 1 38.23 47.98 Z
           M7.12 52.91 A2.5 2.5 0 0 1 10.66 52.91 L21.62 63.87 A2.5 2.5 0 0 1 21.62 67.41 L10.66 78.37 A2.5 2.5 0 0 1 7.12 78.37 L-3.84 67.41 A2.5 2.5 0 0 1 -3.84 63.87 Z
           M69.34 52.91 A2.5 2.5 0 0 1 72.88 52.91 L83.84 63.87 A2.5 2.5 0 0 1 83.84 67.41 L72.88 78.37 A2.5 2.5 0 0 1 69.34 78.37 L58.38 67.41 A2.5 2.5 0 0 1 58.38 63.87 Z"
      />
    </svg>
  );
}
