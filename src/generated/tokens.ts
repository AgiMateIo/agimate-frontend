/*
 * GENERATED FILE — do not edit.
 * Source: design/tokens/*.json — regenerate with `pnpm tokens`.
 */

// For the places that cannot read CSS custom properties — chiefly the OG card,
// which satori renders on the server with no stylesheet in scope.
export const theme = {
  dark: {
    "background": "#0f0e0d",
    "surface": "#1a1715",
    "surface-secondary": "#231f1c",
    "border": "#2e2a27",
    "foreground": "#f8fafc",
    "muted": "#94a3b8",
    "accent": "#6366f1",
    "accent-foreground": "#ffffff",
    "success": "#22c55e",
    "warning": "#f59e0b",
    "error": "#ef4444",
    "mark-ink": "#6366f1",
    "mark-ink-light": "#a5b4fc",
    "accent-glow": "#6366f14d",
    "aurora-tint": "#a4776433",
    "card-shadow": "none",
  },
  light: {
    "background": "#f8f7f5",
    "surface": "#ffffff",
    "surface-secondary": "#f0eee9",
    "border": "#d8d3cc",
    "foreground": "#1e293b",
    "muted": "#64748b",
    "accent": "#4f46e5",
    "accent-foreground": "#ffffff",
    "success": "#22c55e",
    "warning": "#f59e0b",
    "error": "#ef4444",
    "mark-ink": "#4f46e5",
    "mark-ink-light": "#818cf8",
    "accent-glow": "#4f46e54d",
    "aurora-tint": "#a4776461",
    "card-shadow": "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
  },
} as const;

export const scale = {
  "radius-control": "8px",
  "radius-card": "12px",
  "radius-panel": "16px",
  "radius-pill": "9999px",
  "motion-duration-crossfade": "120ms",
  "motion-duration-nav": "200ms",
  "motion-duration-flight": "520ms",
  "motion-duration-arrive": "900ms",
  "motion-easing-standard": "cubic-bezier(0.2, 0.8, 0.2, 1)",
  "motion-easing-arrive": "cubic-bezier(0.2, 0, 0, 1)",
} as const;
