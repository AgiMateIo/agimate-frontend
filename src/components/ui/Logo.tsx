// AgiMate brand mark — a diamond over one chevron over two diamonds, all on one
// 45-degree grid. Geometry mirrors public/logo-mark.svg; keep them in sync.
//
// The file facets each shape with a teal ramp; this component does the same with
// one colour, because it only ever gets one: callers set it with a text-* class,
// and the ramp runs from that colour to the same colour at 0.62. So
// `currentColor` survives — the landing header still animates it on hover, and
// the sidebar still hands it white.
//
// currentColor inside a <stop> works here ONLY because the gradient sits in this
// component's own <defs>: a stop resolves the keyword against its own ancestors,
// not against the shape referencing the gradient, so the same trick from a shared
// sprite sheet would silently paint the mark in the sprite's colour instead.
//
// The id is fixed rather than from useId: this is a server component (no hooks),
// and two instances on one page would only duplicate an identical definition —
// url(#…) takes the first, which is the same gradient either way.
//
// 0.62 rather than the file's 0.52 floor is a size trade: the sidebar renders
// this at h-4, where a deeper fade costs contrast and buys nothing, since the
// ramp itself is invisible below about 40 px.
export default function Logo({ className = 'h-6 w-auto' }: { className?: string }) {
  return (
    <svg viewBox="3.67 -0.06 72.66 66.09" className={className} fill="currentColor" aria-hidden="true">
      <defs>
        <linearGradient id="agimate-logo-facet" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity={1} />
          <stop offset="1" stopColor="currentColor" stopOpacity={0.62} />
        </linearGradient>
      </defs>
      {/* chevron */}
      <path
        fill="url(#agimate-logo-facet)"
        d="M5.57 20.82 A6.5 6.5 0 0 1 5.57 11.63 L6.38 10.82 A6.5 6.5 0 0 1 15.57 10.82 L35.4 30.65 A6.5 6.5 0 0 0 44.6 30.65 L64.43 10.82 A6.5 6.5 0 0 1 73.62 10.82 L74.43 11.63 A6.5 6.5 0 0 1 74.43 20.82 L44.6 50.65 A6.5 6.5 0 0 1 35.4 50.65 Z"
      />
      {/* the three diamonds — each gets the ramp across its own box */}
      <path
        fill="url(#agimate-logo-facet)"
        d="M35.4 1.85 A6.5 6.5 0 0 1 44.6 1.85 L49.9 7.15 A6.5 6.5 0 0 1 49.9 16.35 L44.6 21.65 A6.5 6.5 0 0 1 35.4 21.65 L30.1 16.35 A6.5 6.5 0 0 1 30.1 7.15 Z"
      />
      <path
        fill="url(#agimate-logo-facet)"
        d="M10.88 44.32 A6.5 6.5 0 0 1 20.07 44.32 L25.38 49.63 A6.5 6.5 0 0 1 25.38 58.82 L20.07 64.13 A6.5 6.5 0 0 1 10.88 64.13 L5.57 58.82 A6.5 6.5 0 0 1 5.57 49.63 Z"
      />
      <path
        fill="url(#agimate-logo-facet)"
        d="M59.93 44.32 A6.5 6.5 0 0 1 69.12 44.32 L74.43 49.63 A6.5 6.5 0 0 1 74.43 58.82 L69.12 64.13 A6.5 6.5 0 0 1 59.93 64.13 L54.62 58.82 A6.5 6.5 0 0 1 54.62 49.63 Z"
      />
    </svg>
  );
}
