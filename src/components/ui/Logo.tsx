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
    <svg viewBox="-3.54 -0.68 87.08 78.75" className={className} fill="currentColor" aria-hidden="true">
      {/* top diamond + lower chevron — the bright band */}
      <path
        d="M36.46 0.79 A5.0 5.0 0 0 1 43.54 0.79 L50.96 8.21 A5.0 5.0 0 0 1 50.96 15.29 L43.54 22.71 A5.0 5.0 0 0 1 36.46 22.71 L29.04 15.29 A5.0 5.0 0 0 1 29.04 8.21 Z
           M10.27 43.52 A5.0 5.0 0 0 1 10.27 39.98 L13.98 36.27 A5.0 5.0 0 0 1 17.52 36.27 L38.23 56.98 A5.0 5.0 0 0 0 41.77 56.98 L62.48 36.27 A5.0 5.0 0 0 1 66.02 36.27 L69.73 39.98 A5.0 5.0 0 0 1 69.73 43.52 L41.77 71.48 A5.0 5.0 0 0 1 38.23 71.48 Z"
      />
      {/* upper chevron + the two bottom diamonds */}
      <path
        fillOpacity={0.62}
        d="M10.27 20.02 A5.0 5.0 0 0 1 10.27 16.48 L13.98 12.77 A5.0 5.0 0 0 1 17.52 12.77 L38.23 33.48 A5.0 5.0 0 0 0 41.77 33.48 L62.48 12.77 A5.0 5.0 0 0 1 66.02 12.77 L69.73 16.48 A5.0 5.0 0 0 1 69.73 20.02 L41.77 47.98 A5.0 5.0 0 0 1 38.23 47.98 Z
           M5.35 54.68 A5.0 5.0 0 0 1 12.43 54.68 L19.85 62.1 A5.0 5.0 0 0 1 19.85 69.18 L12.43 76.6 A5.0 5.0 0 0 1 5.35 76.6 L-2.07 69.18 A5.0 5.0 0 0 1 -2.07 62.1 Z
           M67.57 54.68 A5.0 5.0 0 0 1 74.65 54.68 L82.07 62.1 A5.0 5.0 0 0 1 82.07 69.18 L74.65 76.6 A5.0 5.0 0 0 1 67.57 76.6 L60.15 69.18 A5.0 5.0 0 0 1 60.15 62.1 Z"
      />
    </svg>
  );
}
