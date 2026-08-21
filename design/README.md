# Design tokens

One source of truth for colour, radius and motion. `design/tokens/*.json` is the
source; everything else on this page is generated from it.

```
design/tokens/           ──pnpm tokens──┬──▶ src/app/tokens.css          web
  palette.json  primitives              ├──▶ src/generated/tokens.ts     TS (the OG card)
  theme.json    roles, per theme        ├──▶ design/dist/AgimateTokens.kt     Android
  scale.json    radius, motion          └──▶ design/dist/AgimateTokens.swift  iOS
```

## Why a build step

CSS custom properties are readable only by a browser, and the mobile app is a
separate native repository. Keeping the values in `globals.css` and copying them
by hand is how a product ends up with two slightly different brand colours. So the
source lives in a format neither platform owns — [W3C DTCG][dtcg], built by
[Style Dictionary][sd] — and every platform reads a generated file.

[dtcg]: https://tr.designtokens.org/format/
[sd]: https://styledictionary.com/

## Rules

- **Never edit a generated file.** Each carries a header saying so, and the next
  `pnpm tokens` silently overwrites it. `pnpm tokens:check` fails CI when a
  generated file has drifted from the source.
- **Two tiers, and the boundary matters.** `palette.*` is named paint —
  `teal-500`, `warm-950`. `theme.<mode>.*` is roles — `accent`, `surface` —
  and only these may be used by product code. A component that reaches for
  `teal-500` has lost the ability to be re-themed.
- **A new colour is a new primitive plus a new role**, not a hex in a component.

## Adding a token

1. Add the primitive to `palette.json` if the paint is new.
2. Add the role to **both** `theme.dark` and `theme.light` in `theme.json`.
   The build does not fall back — a role missing from one theme is simply absent
   there, and the CSS var resolves to nothing.
3. `pnpm tokens`, then commit the source *and* the generated files together.
4. To reach it as a Tailwind utility (`bg-…`, `text-…`), nothing extra: colour
   roles are mapped into `@theme inline` automatically.

## Handing tokens to the mobile repository

`design/dist/` is committed on purpose — the mobile repositories copy these two
files in rather than depending on this one. That is a deliberate trade: copying
is visible in a diff and cannot break a mobile build at an awkward moment, but it
does mean someone has to re-copy after a token change. Until a shared package
exists, a token change is a change in three repositories.

The Swift and Kotlin files are self-contained: no helper extension, no imports
beyond SwiftUI and Compose, so they compile as dropped in.

## Known gaps

- **Type scale is not tokenised.** The product runs on Tailwind's default scale
  and the mobile apps have their own conventions; making them agree is a design
  decision nobody has taken yet.
- **The logo SVGs carry their own copies of the mark inks.** `mark-ink` and
  `mark-ink-light` exist as tokens, but `public/logo-mark.svg` and friends are
  standalone files with baked values — they cannot read a CSS variable. Change
  the ink and they need editing by hand.
- **The landing's warm illustration colours are not tokens.** About a dozen
  shades live directly in the markup. They are either palette entries nobody has
  named or one-offs nobody has admitted to.
