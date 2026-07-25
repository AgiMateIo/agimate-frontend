/*!
 * Synthetic Mates — deterministic pseudo-3D avatar generator.
 * Same seed → same avatar, always.
 */

type Palette = {
  name: string;
  bg: string;
  bgEdge: string;
  light: string;
  base: string;
  dark: string;
  shadow: string;
  screen: string;
  eye: string;
};

export type SyntheticMatePaletteName = 'terracotta' | 'sage' | 'sand' | 'red' | 'blue';
export type SyntheticMateBodyShape = 'square' | 'circle' | 'triangle' | 'pentagon';
export type SyntheticMateHeadShape = 'circle' | 'squircle' | 'wide' | 'tall';
export type SyntheticMateEyeType = 'dot' | 'oval' | 'happy' | 'square' | 'visor';
export type SyntheticMateMouth = 'smile' | 'line' | 'oval' | 'grid' | 'none';
export type SyntheticMateGear = 'none' | 'antenna' | 'antenna2' | 'halo' | 'cat' | 'bear';
export type SyntheticMateEmblem = 'power' | 'heart' | 'bolt' | 'star';

export interface SyntheticMateOptions {
  size?: number | null;
  palette?: 'seed' | SyntheticMatePaletteName;
  animate?: boolean;
  headShape?: SyntheticMateHeadShape;
  bodyShape?: SyntheticMateBodyShape;
  eyeType?: SyntheticMateEyeType;
  mouth?: SyntheticMateMouth;
  gear?: SyntheticMateGear;
  emblem?: SyntheticMateEmblem;
}

const PALETTES: Palette[] = [
  { name: 'terracotta', bg: '#ffe1d0', bgEdge: '#f6a06b', light: '#ffc6a5', base: '#dd8149', dark: '#8c491a', shadow: '#5a2f10', screen: '#3a1f0e', eye: '#d8e4b0' },
  { name: 'sage',       bg: '#e1eecc', bgEdge: '#aebf92', light: '#ccdbb2', base: '#8fa073', dark: '#56633f', shadow: '#39432a', screen: '#222b18', eye: '#ffcfa8' },
  { name: 'sand',       bg: '#f9f4ed', bgEdge: '#dcd3c4', light: '#eee7db', base: '#c0b6a5', dark: '#645c50', shadow: '#474238', screen: '#2e2b25', eye: '#f6a06b' },
  { name: 'red',        bg: '#ffd9d3', bgEdge: '#e8837a', light: '#ef9089', base: '#c34a3f', dark: '#7d271f', shadow: '#4d130f', screen: '#2a0b09', eye: '#ccdbb2' },
  { name: 'blue',       bg: '#d6e6f2', bgEdge: '#8fb4d4', light: '#94b9d8', base: '#4a7ba6', dark: '#2a4d6e', shadow: '#172f45', screen: '#0d1c29', eye: '#ffd9bf' },
];
const LOCK: Record<string, number> = { terracotta: 0, sage: 1, sand: 2, red: 3, blue: 4 };

export const PARTS = {
  palette: ['terracotta', 'sage', 'sand', 'red', 'blue'] as SyntheticMatePaletteName[],
  bodyShape: ['square', 'circle', 'triangle', 'pentagon'] as SyntheticMateBodyShape[],
  headShape: ['circle', 'squircle', 'wide', 'tall'] as SyntheticMateHeadShape[],
  eyeType: ['dot', 'oval', 'happy', 'square', 'visor'] as SyntheticMateEyeType[],
  mouth: ['smile', 'line', 'oval', 'grid', 'none'] as SyntheticMateMouth[],
  gear: ['none', 'antenna', 'antenna2', 'halo', 'cat', 'bear'] as SyntheticMateGear[],
  emblem: ['power', 'heart', 'bolt', 'star'] as SyntheticMateEmblem[],
};

export { PALETTES };

function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a: number): () => number {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ANIM_CSS = `
.om-bob{animation:omBob 3.2s ease-in-out infinite}
.om-blink{transform-box:fill-box;transform-origin:center;animation:omBlink 4.6s ease-in-out infinite}
.om-ant{transform-box:fill-box;transform-origin:bottom center;animation:omAnt 3.8s ease-in-out infinite}
@keyframes omBob{0%,100%{transform:translateY(1.5px)}50%{transform:translateY(-4px)}}
@keyframes omBlink{0%,90%,100%{transform:scaleY(1)}94%,96%{transform:scaleY(0.08)}}
@keyframes omAnt{0%,100%{transform:rotate(-2.5deg)}50%{transform:rotate(2.5deg)}}
@media (prefers-reduced-motion:reduce){.om-bob,.om-blink,.om-ant{animation:none}}`;

export function createAvatar(seed: string | number | null | undefined, opts: SyntheticMateOptions = {}): string {
  const o = opts;
  const anim = o.animate !== false;
  const bobCls = anim ? ' class="om-bob"' : '';
  const blinkCls = anim ? ' class="om-blink"' : '';
  const antCls = anim ? ' class="om-ant"' : '';
  const h = hashStr(String(seed == null ? 'seed' : seed));
  const rng = mulberry32(h);
  const u = 'a' + h.toString(36);
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];
  const chance = (p: number) => rng() < p;

  const lock = o.palette && o.palette !== 'seed' && LOCK[o.palette] != null ? LOCK[o.palette] : null;
  const P = PALETTES[lock != null ? lock : Math.floor(rng() * PALETTES.length)];

  const headShape: SyntheticMateHeadShape = o.headShape || pick(['circle', 'squircle', 'wide', 'tall']);
  const eyeType: SyntheticMateEyeType = o.eyeType || pick(['dot', 'dot', 'oval', 'happy', 'square', 'visor']);
  const mouth: SyntheticMateMouth = o.mouth || pick(['smile', 'smile', 'line', 'oval', 'grid', 'none']);
  const gear: SyntheticMateGear = o.gear || pick(['none', 'none', 'antenna', 'antenna2', 'cat', 'bear', 'halo']);
  const bodyP: Palette = lock != null ? P : chance(0.42) ? PALETTES[Math.floor(rng() * PALETTES.length)] : P;
  const bodyShape: SyntheticMateBodyShape = o.bodyShape || pick(['square', 'circle', 'triangle', 'pentagon']);
  const emblem: SyntheticMateEmblem = o.emblem || pick(['power', 'heart', 'bolt', 'star']);

  const B = { y: 106, w: 104, h: 70 };
  const top = B.y, bot = B.y + B.h, half = B.w / 2, left = 100 - half, right = 100 + half, midY = top + B.h / 2;
  let bodyEl: string;
  if (bodyShape === 'square') bodyEl = `<rect x="${left}" y="${top}" width="${B.w}" height="${B.h}" rx="16" fill="url(#bd${u})"/>`;
  else if (bodyShape === 'circle') bodyEl = `<ellipse cx="100" cy="${midY}" rx="${half}" ry="${B.h / 2}" fill="url(#bd${u})"/>`;
  else if (bodyShape === 'triangle') bodyEl = `<path d="M 100 ${top} L ${right} ${bot} L ${left} ${bot} Z" fill="url(#bd${u})" stroke="url(#bd${u})" stroke-width="20" stroke-linejoin="round"/>`;
  else {
    let p = '';
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
      const x = (100 + half * Math.cos(a)).toFixed(1);
      const y = (midY + (B.h / 2) * Math.sin(a)).toFixed(1);
      p += (i ? ' L ' : 'M ') + x + ' ' + y;
    }
    bodyEl = `<path d="${p} Z" fill="url(#bd${u})" stroke="url(#bd${u})" stroke-width="20" stroke-linejoin="round"/>`;
  }

  const lsy = top + B.h * 0.3, lhy = lsy + 24;
  const lsx = 100 - half * 0.55, lhx = left - 4;
  const rsx = 100 + half * 0.55, rhx = right + 4;
  const chY = midY - 9, dotY = midY;
  const legTop = bot - 8, legY = 191;

  const eg = `url(#ey${u})`;
  let emblemEl: string;
  if (emblem === 'power') emblemEl = `<g transform="translate(100,${dotY})"><path d="M 0 -5.6 A 5.4 5.4 0 1 1 -2.7 -4.7" fill="none" stroke="${eg}" stroke-width="2.6" stroke-linecap="round"/><line x1="0" y1="-7.4" x2="0" y2="-1.4" stroke="${eg}" stroke-width="2.6" stroke-linecap="round"/></g>`;
  else if (emblem === 'heart') emblemEl = `<path d="M 100 ${dotY + 5.4} C 92 ${dotY - 0.6} 93.4 ${dotY - 6.6} 100 ${dotY - 2.8} C 106.6 ${dotY - 6.6} 108 ${dotY - 0.6} 100 ${dotY + 5.4} Z" fill="${eg}"/>`;
  else if (emblem === 'bolt') emblemEl = `<path d="M 102 ${dotY - 6.4} L 95.5 ${dotY + 0.6} L 100 ${dotY + 0.6} L 98 ${dotY + 6.4} L 104.5 ${dotY - 0.8} L 100 ${dotY - 0.8} Z" fill="${eg}"/>`;
  else {
    let p = '';
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * 4 * Math.PI) / 5;
      const x = (100 + 6.2 * Math.cos(a)).toFixed(1);
      const y = (dotY + 6.2 * Math.sin(a)).toFixed(1);
      p += (i ? ' L ' : 'M ') + x + ' ' + y;
    }
    emblemEl = `<path d="${p} Z" fill="${eg}"/>`;
  }

  let headEl: string;
  if (headShape === 'circle') headEl = `<circle cx="100" cy="86" r="50" fill="url(#hd${u})"/>`;
  else if (headShape === 'squircle') headEl = `<rect x="50" y="36" width="100" height="100" rx="32" fill="url(#hd${u})"/>`;
  else if (headShape === 'wide') headEl = `<ellipse cx="100" cy="86" rx="53" ry="47" fill="url(#hd${u})"/>`;
  else headEl = `<ellipse cx="100" cy="86" rx="45" ry="52" fill="url(#hd${u})"/>`;

  const ex1 = 84, ex2 = 116, ey = 84;
  const oneEye = (cx: number) => {
    if (eyeType === 'dot') return `<circle cx="${cx}" cy="${ey}" r="8.5" fill="url(#ey${u})"/><circle cx="${cx - 2.6}" cy="${ey - 2.8}" r="2.6" fill="#fff"/>`;
    if (eyeType === 'oval') return `<ellipse cx="${cx}" cy="${ey}" rx="6.5" ry="9.5" fill="url(#ey${u})"/><circle cx="${cx - 2}" cy="${ey - 3.5}" r="2.2" fill="#fff"/>`;
    if (eyeType === 'square') return `<rect x="${cx - 7}" y="${ey - 8}" width="14" height="16" rx="4.5" fill="url(#ey${u})"/><rect x="${cx - 4.5}" y="${ey - 5.5}" width="4" height="4" rx="2" fill="#fff" opacity="0.9"/>`;
    if (eyeType === 'happy') return `<path d="M ${cx - 8} ${ey + 3} Q ${cx} ${ey - 8} ${cx + 8} ${ey + 3}" stroke="${P.eye}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
    return '';
  };
  let eyesEl =
    eyeType === 'visor'
      ? `<rect x="72" y="${ey - 9}" width="56" height="18" rx="9" fill="url(#ey${u})"/><rect x="77" y="${ey - 4}" width="20" height="4" rx="2" fill="#fff" opacity="0.55"/>`
      : oneEye(ex1) + oneEye(ex2);
  eyesEl = `<g${blinkCls}>${eyesEl}</g>`;

  const my = 105;
  let mouthEl = '';
  if (mouth === 'smile') mouthEl = `<path d="M 88 ${my} Q 100 ${my + 9} 112 ${my}" stroke="${P.eye}" stroke-width="3.4" fill="none" stroke-linecap="round" opacity="0.9"/>`;
  else if (mouth === 'line') mouthEl = `<rect x="91" y="${my - 1.7}" width="18" height="3.4" rx="1.7" fill="${P.eye}" opacity="0.85"/>`;
  else if (mouth === 'oval') mouthEl = `<ellipse cx="100" cy="${my}" rx="5.5" ry="6.5" fill="${P.eye}" opacity="0.85"/>`;
  else if (mouth === 'grid') mouthEl = `<g fill="${P.eye}" opacity="0.85"><rect x="90" y="${my - 3}" width="3.2" height="8" rx="1.4"/><rect x="96" y="${my - 4}" width="3.2" height="10" rx="1.4"/><rect x="102" y="${my - 4}" width="3.2" height="10" rx="1.4"/><rect x="108" y="${my - 3}" width="3.2" height="8" rx="1.4"/></g>`;

  let behindGear = '', frontGear = '';
  if (gear === 'halo') {
    behindGear = `<ellipse cx="100" cy="32" rx="42" ry="12" fill="none" stroke="url(#ey${u})" stroke-width="6" opacity="0.85"/>`;
  } else if (gear === 'antenna') {
    frontGear = `<g${antCls}><line x1="100" y1="38" x2="100" y2="16" stroke="${P.dark}" stroke-width="4.5" stroke-linecap="round"/><circle cx="100" cy="12" r="6.5" fill="url(#ey${u})"/></g>`;
  } else if (gear === 'antenna2') {
    frontGear = `<line x1="86" y1="40" x2="76" y2="18" stroke="${P.dark}" stroke-width="4" stroke-linecap="round"/><circle cx="75" cy="14" r="5.5" fill="url(#ey${u})"/><line x1="114" y1="40" x2="124" y2="18" stroke="${P.dark}" stroke-width="4" stroke-linecap="round"/><circle cx="125" cy="14" r="5.5" fill="url(#ey${u})"/>`;
  } else if (gear === 'cat') {
    const ear = (cx: number, dir: number) => `<path d="M ${cx} 44 Q ${cx - dir * 4} 12 ${cx + dir * 22} 34 Z" fill="url(#hd${u})"/><path d="M ${cx + dir * 3} 40 Q ${cx + dir * 1} 22 ${cx + dir * 15} 34 Z" fill="${P.shadow}" opacity="0.45"/>`;
    frontGear = ear(74, 1) + ear(126, -1);
  } else if (gear === 'bear') {
    frontGear = `<circle cx="66" cy="44" r="15" fill="url(#hd${u})"/><circle cx="66" cy="44" r="7.5" fill="${P.shadow}" opacity="0.5"/><circle cx="134" cy="44" r="15" fill="url(#hd${u})"/><circle cx="134" cy="44" r="7.5" fill="${P.shadow}" opacity="0.5"/>`;
  }

  const dim = o.size ? `width="${o.size}" height="${o.size}"` : 'width="100%" height="100%"';

  return `<svg viewBox="0 0 200 200" ${dim} xmlns="http://www.w3.org/2000/svg" style="display:block">
${anim ? `<style>${ANIM_CSS}</style>` : ''}
<defs>
  <radialGradient id="hd${u}" cx="0.34" cy="0.24" r="0.92"><stop offset="0" stop-color="${P.light}"/><stop offset="0.22" stop-color="${P.light}"/><stop offset="0.6" stop-color="${P.base}"/><stop offset="0.86" stop-color="${P.dark}"/><stop offset="1" stop-color="${P.shadow}"/></radialGradient>
  <linearGradient id="bd${u}" x1="0.28" y1="0" x2="0.62" y2="1"><stop offset="0" stop-color="${bodyP.light}"/><stop offset="0.34" stop-color="${bodyP.base}"/><stop offset="0.8" stop-color="${bodyP.dark}"/><stop offset="1" stop-color="${bodyP.shadow}"/></linearGradient>
  <radialGradient id="hl${u}" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff" stop-opacity="0.92"/><stop offset="0.55" stop-color="#fff" stop-opacity="0.32"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <radialGradient id="ey${u}" cx="0.4" cy="0.35" r="0.75"><stop offset="0" stop-color="#fff"/><stop offset="0.55" stop-color="${P.eye}"/><stop offset="1" stop-color="${P.eye}"/></radialGradient>
  <linearGradient id="gl${u}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.22"/><stop offset="0.4" stop-color="#fff" stop-opacity="0.04"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <filter id="sh${u}" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3.4"/></filter>
</defs>
<ellipse cx="102" cy="185" rx="40" ry="7" fill="${bodyP.shadow}" opacity="0.22" filter="url(#sh${u})"/>
<g transform="translate(0,-10)"><g${bobCls} style="animation-delay:${(-((h % 320) / 100)).toFixed(2)}s">
<rect x="81" y="${legTop}" width="15" height="${legY - legTop}" rx="7.5" fill="url(#bd${u})"/>
<rect x="104" y="${legTop}" width="15" height="${legY - legTop}" rx="7.5" fill="url(#bd${u})"/>
<ellipse cx="88" cy="${legY + 1}" rx="12" ry="6.5" fill="${bodyP.dark}"/>
<ellipse cx="112" cy="${legY + 1}" rx="12" ry="6.5" fill="${bodyP.dark}"/>
<line x1="${lsx}" y1="${lsy}" x2="${lhx}" y2="${lhy}" stroke="url(#bd${u})" stroke-width="17" stroke-linecap="round"/>
<line x1="${rsx}" y1="${lsy}" x2="${rhx}" y2="${lhy}" stroke="url(#bd${u})" stroke-width="17" stroke-linecap="round"/>
<circle cx="${lhx}" cy="${lhy + 2}" r="10" fill="${bodyP.base}"/>
<circle cx="${rhx}" cy="${lhy + 2}" r="10" fill="${bodyP.base}"/>
${bodyEl}
<ellipse cx="${left + B.w * 0.32}" cy="${top + B.h * 0.22}" rx="${B.w * 0.26}" ry="${B.h * 0.16}" fill="url(#hl${u})" opacity="0.55"/>
<rect x="84" y="${chY}" width="32" height="18" rx="9" fill="${bodyP.screen}"/>
<rect x="84" y="${chY}" width="32" height="18" rx="9" fill="url(#gl${u})"/>
${emblemEl}
<g transform="translate(0,-16) translate(100,86) scale(0.9) translate(-100,-86)">
${behindGear}
${headEl}
<ellipse cx="76" cy="60" rx="17" ry="12" fill="url(#hl${u})"/>
<ellipse cx="100" cy="122" rx="40" ry="16" fill="${P.shadow}" opacity="0.22"/>
<rect x="67" y="62" width="66" height="52" rx="22" fill="${P.screen}"/>
<rect x="67" y="62" width="66" height="52" rx="22" fill="url(#gl${u})"/>
<rect x="67" y="62" width="66" height="52" rx="22" fill="none" stroke="#fff" stroke-opacity="0.12" stroke-width="1.5"/>
${eyesEl}
${mouthEl}
${frontGear}
</g>
</g></g>
</svg>`;
}

/** Data-URI form — drop straight into an <img src>. */
export function createAvatarDataUri(seed: string | number | null | undefined, opts?: SyntheticMateOptions): string {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(createAvatar(seed, opts));
}
