// Builds every consumer of the design tokens from design/tokens/*.json.
//
// Why a build step at all: CSS custom properties are readable only by a browser,
// and the mobile app is a separate native repository. The source of truth has to
// live in a format neither platform owns, and each platform gets a generated file.
//
// Run: pnpm tokens        (regenerate)
//      pnpm tokens:check  (fail if the generated files are stale — CI runs this)
import StyleDictionary from 'style-dictionary';

const HEADER = (what) =>
  `${what.open}\n${what.line} GENERATED FILE — do not edit.\n` +
  `${what.line} Source: design/tokens (DTCG JSON) — regenerate with \`pnpm tokens\`.\n${what.close}\n`;

const val = (t) => (t.$value !== undefined ? t.$value : t.value);
const isColour = (t) => (t.$type ?? t.type) === 'color';

/** theme.dark.surface-secondary -> surface-secondary */
const roleName = (t) => t.path.slice(2).join('-');
/** radius.control -> radius-control */
const scaleName = (t) => t.path.join('-');

const themeTokens = (d, mode) =>
  d.allTokens.filter((t) => t.path[0] === 'theme' && t.path[1] === mode);
const scaleTokens = (d) =>
  d.allTokens.filter((t) => t.path[0] === 'radius' || t.path[0] === 'motion');

const cssValue = (t) => {
  const v = val(t);
  return Array.isArray(v) ? `cubic-bezier(${v.join(', ')})` : v;
};

StyleDictionary.registerFormat({
  name: 'agimate/css',
  format: ({ dictionary: d }) => {
    const decl = (t, name) => {
      const c = t.$description ?? t.description;
      return `${c ? `  /* ${c} */\n` : ''}  --${name}: ${cssValue(t)};`;
    };
    const dark = themeTokens(d, 'dark').map((t) => decl(t, roleName(t))).join('\n');
    const light = themeTokens(d, 'light').map((t) => `  ${decl(t, roleName(t)).trim()}`).join('\n');
    const scale = scaleTokens(d).map((t) => decl(t, scaleName(t))).join('\n');
    // Only colours reach Tailwind's theme; radius and motion stay plain vars,
    // because the utilities for them are already Tailwind's own.
    const theme = themeTokens(d, 'dark')
      .filter(isColour)
      .map((t) => `  --color-${roleName(t)}: var(--${roleName(t)});`)
      .join('\n');
    // Three states, not two. An explicit choice stamps data-theme on <html>; with
    // nothing stamped the page follows the OS, which is what it did before the
    // switcher existed. Hence the :not() guard — an explicit dark must survive a
    // light OS. The two overrides carry equal specificity (0,2,0), so the
    // data-theme block has to come last for it to win.
    return (
      HEADER({ open: '/*', line: ' *', close: ' */' }) +
      `\n/* Dark is the default: it applies when nothing else does. */\n:root {\n${dark}\n\n${scale}\n}\n` +
      `\n/* Light OS, unless the reader explicitly asked for dark. */\n` +
      `@media (prefers-color-scheme: light) {\n  :root:not([data-theme="dark"]) {\n${light.replace(/^/gm, '  ')}\n  }\n}\n` +
      `\n/* Explicit light: must also beat a dark OS, so it is stated separately. */\n` +
      `:root[data-theme="light"] {\n${light}\n}\n` +
      `\n@theme inline {\n${theme}\n  --shadow-card: var(--card-shadow);\n` +
      `  /* Not tokens: next/font sets these at runtime. */\n` +
      `  --font-sans: var(--font-brand-sans);\n  --font-mono: var(--font-brand-mono);\n}\n`
    );
  },
});

StyleDictionary.registerFormat({
  name: 'agimate/ts',
  format: ({ dictionary: d }) => {
    const obj = (mode) =>
      themeTokens(d, mode)
        .map((t) => `    ${JSON.stringify(roleName(t))}: ${JSON.stringify(cssValue(t))},`)
        .join('\n');
    const scale = scaleTokens(d)
      .map((t) => `  ${JSON.stringify(scaleName(t))}: ${JSON.stringify(cssValue(t))},`)
      .join('\n');
    return (
      HEADER({ open: '/*', line: ' *', close: ' */' }) +
      `\n// For the places that cannot read CSS custom properties — chiefly the OG card,\n` +
      `// which satori renders on the server with no stylesheet in scope.\n` +
      `export const theme = {\n  dark: {\n${obj('dark')}\n  },\n  light: {\n${obj('light')}\n  },\n} as const;\n\n` +
      `export const scale = {\n${scale}\n} as const;\n`
    );
  },
});

/** #rrggbb or #rrggbbaa -> 0xAARRGGBB */
const argb = (hex) => {
  const h = hex.replace('#', '');
  const rgb = h.slice(0, 6).toUpperCase();
  const a = (h.length === 8 ? h.slice(6, 8) : 'FF').toUpperCase();
  return `0x${a}${rgb}`;
};

StyleDictionary.registerFormat({
  name: 'agimate/compose',
  format: ({ dictionary: d }) => {
    const set = (mode) =>
      themeTokens(d, mode)
        .filter(isColour)
        .map((t) => {
          const n = roleName(t).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
          return `        val ${n} = Color(${argb(val(t))})`;
        })
        .join('\n');
    const durations = d.allTokens
      .filter((t) => t.path[0] === 'motion' && t.path[1] === 'duration')
      .map((t) => `    const val ${t.path[2]} = ${parseInt(val(t), 10)}  // ms`)
      .join('\n');
    const radii = d.allTokens
      .filter((t) => t.path[0] === 'radius' && val(t) !== '9999px')
      .map((t) => `    val ${t.path[1]} = ${parseInt(val(t), 10)}.dp`)
      .join('\n');
    return (
      HEADER({ open: '/*', line: ' *', close: ' */' }) +
      `package com.agimate.design\n\nimport androidx.compose.ui.graphics.Color\nimport androidx.compose.ui.unit.dp\n\n` +
      `object AgimateTokens {\n    object Colors {\n        // Dark is the product's default theme.\n` +
      `        object Dark {\n${set('dark').replace(/^/gm, '    ')}\n        }\n\n` +
      `        object Light {\n${set('light').replace(/^/gm, '    ')}\n        }\n    }\n\n` +
      `    object Radius {\n${radii}\n        // pill: fully rounded, use RoundedCornerShape(50)\n    }\n\n` +
      `    object Duration {\n${durations}\n    }\n}\n`
    );
  },
});

StyleDictionary.registerFormat({
  name: 'agimate/swift',
  format: ({ dictionary: d }) => {
    // Spelled out rather than via a Color(hex:) helper: a generated file must
    // compile on its own and must not collide with an extension the app already has.
    const hexInit = (t) => {
      const h = val(t).replace('#', '');
      const ch = (i) => (parseInt(h.slice(i, i + 2), 16) / 255).toFixed(4);
      const a = h.length === 8 ? (parseInt(h.slice(6, 8), 16) / 255).toFixed(4) : '1.0';
      return `Color(.sRGB, red: ${ch(0)}, green: ${ch(2)}, blue: ${ch(4)}, opacity: ${a})`;
    };
    const set = (mode) =>
      themeTokens(d, mode)
        .filter(isColour)
        .map((t) => {
          const n = roleName(t).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
          return `        public static let ${n} = ${hexInit(t)}`;
        })
        .join('\n');
    const durations = d.allTokens
      .filter((t) => t.path[0] === 'motion' && t.path[1] === 'duration')
      .map((t) => `        public static let ${t.path[2]}: TimeInterval = ${parseInt(val(t), 10) / 1000}`)
      .join('\n');
    const radii = d.allTokens
      .filter((t) => t.path[0] === 'radius' && val(t) !== '9999px')
      .map((t) => `        public static let ${t.path[1]}: CGFloat = ${parseInt(val(t), 10)}`)
      .join('\n');
    return (
      HEADER({ open: '/*', line: ' *', close: ' */' }) +
      `import SwiftUI\n\npublic enum AgimateTokens {\n    public enum Colors {\n` +
      `        // Dark is the product's default theme.\n        public enum Dark {\n${set('dark').replace(/^/gm, '    ')}\n        }\n` +
      `        public enum Light {\n${set('light').replace(/^/gm, '    ')}\n        }\n    }\n\n` +
      `    public enum Radius {\n${radii}\n        // pill: fully rounded, use Capsule()\n    }\n\n` +
      `    public enum Duration {\n${durations}\n    }\n}\n`
    );
  },
});

const sd = new StyleDictionary({
  source: ['design/tokens/*.json'],
  usesDtcg: true,
  log: { verbosity: 'silent' },
  platforms: {
    web:     { transforms: [], buildPath: 'src/app/',        files: [{ destination: 'tokens.css', format: 'agimate/css' }] },
    ts:      { transforms: [], buildPath: 'src/generated/',  files: [{ destination: 'tokens.ts',  format: 'agimate/ts' }] },
    android: { transforms: [], buildPath: 'design/dist/',    files: [{ destination: 'AgimateTokens.kt',    format: 'agimate/compose' }] },
    ios:     { transforms: [], buildPath: 'design/dist/',    files: [{ destination: 'AgimateTokens.swift', format: 'agimate/swift' }] },
  },
});

await sd.buildAllPlatforms();
console.log('tokens: built web, ts, android, ios');
