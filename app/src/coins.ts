/**
 * Đồng xu / chip 3D vẽ bằng SVG (data URI), tạo một lần rồi nhớ lại.
 * - 'gold': xu vàng kim loại cho tiền của mình. Màu khác (#hex): chip sòng bạc theo màu từng người chơi khác.
 * - shade 0..2: lớp trên cùng sáng, lớp dưới tối dần (để chồng xu có chiều sâu).
 * - tilted: nhìn nghiêng (mặt elip + thành xu có khía) dùng xếp chồng; front: nhìn thẳng dùng cho đồng xu bay.
 */
type Rgb = [number, number, number];
const toRgb = (hex: string): Rgb => {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};
const mix = (a: Rgb, b: Rgb, t: number): string =>
  '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('');
const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];

type Palette = { hi: string; light: string; mid: string; dark: string; edge: string; edgeDark: string; ink: string; chip: boolean };

function palette(kind: string, shade: number): Palette {
  const dim = shade * 0.17;
  if (kind === 'gold') {
    const g = (hex: string) => mix(toRgb(hex), BLACK, dim);
    return { hi: g('#FFF6C2'), light: g('#FFD84A'), mid: g('#E7A412'), dark: g('#9A6000'), edge: g('#C98A0A'), edgeDark: g('#6B4000'), ink: g('#8A5500'), chip: false };
  }
  const c = toRgb(kind);
  const m = (t: number, base: Rgb = WHITE) => mix(toRgb(mix(c, base, t)), BLACK, dim);
  return { hi: m(0.62), light: m(0.22), mid: m(0), dark: m(0.45, BLACK), edge: m(0.2, BLACK), edgeDark: m(0.62, BLACK), ink: '#FFFFFF', chip: true };
}

const star = (cx: number, cy: number, r: number, fill: string, sy = 1) => {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.42 : r;
    return `${(cx + Math.cos(a) * rr).toFixed(2)},${(cy + Math.sin(a) * rr * sy).toFixed(2)}`;
  });
  return `<polygon points="${pts.join(' ')}" fill="${fill}"/>`;
};

const uri = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
const defs = (p: Palette, id: string) => `<defs>
  <radialGradient id="f${id}" cx="35%" cy="28%" r="85%"><stop offset="0" stop-color="${p.hi}"/><stop offset="0.35" stop-color="${p.light}"/><stop offset="0.75" stop-color="${p.mid}"/><stop offset="1" stop-color="${p.dark}"/></radialGradient>
  <linearGradient id="e${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${p.edgeDark}"/><stop offset="0.3" stop-color="${p.edge}"/><stop offset="0.55" stop-color="${p.light}"/><stop offset="0.8" stop-color="${p.edge}"/><stop offset="1" stop-color="${p.edgeDark}"/></linearGradient>
  <linearGradient id="s${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.85"/><stop offset="0.5" stop-color="#fff" stop-opacity="0"/></linearGradient>
</defs>`;

const tiltedCache = new Map<string, string>();
/** Đồng xu nhìn nghiêng 64×40: mặt elip có viền nổi, thành xu có khía, bóng phản chiếu */
export function coinTiltedUri(kind: string, shade = 0): string {
  const key = `t|${kind}|${shade}`;
  let u = tiltedCache.get(key);
  if (u) return u;
  const p = palette(kind, shade);
  const id = `${shade}`;
  const ribs = Array.from({ length: 22 }, (_, i) => {
    const x = 4 + i * 2.55;
    return `<line x1="${x.toFixed(1)}" y1="19" x2="${x.toFixed(1)}" y2="30" stroke="${p.chip && i % 2 === 0 ? '#FFFFFF' : p.edgeDark}" stroke-width="${p.chip ? 1.5 : 0.9}" opacity="${p.chip ? 0.9 : 0.55}"/>`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 40">${defs(p, id)}
  <path d="M2 17 L2 25 A30 14 0 0 0 62 25 L62 17 Z" fill="url(#e${id})" stroke="${p.edgeDark}" stroke-width="1.2"/>
  <clipPath id="c${id}"><path d="M2 17 L2 25 A30 14 0 0 0 62 25 L62 17 Z"/></clipPath>
  <g clip-path="url(#c${id})">${ribs}<ellipse cx="32" cy="17" rx="30" ry="14" fill="none"/></g>
  <ellipse cx="32" cy="17" rx="30" ry="14" fill="url(#f${id})" stroke="${p.edgeDark}" stroke-width="1.4"/>
  <ellipse cx="32" cy="17.4" rx="26" ry="11.6" fill="none" stroke="${p.dark}" stroke-width="1.6" opacity="0.8"/>
  <ellipse cx="32" cy="16.6" rx="26" ry="11.6" fill="none" stroke="${p.hi}" stroke-width="1" opacity="0.9" stroke-dasharray="${p.chip ? '5 4' : '0'}"/>
  <ellipse cx="32" cy="17" rx="19" ry="8" fill="${p.mid}" opacity="0.55"/>
  <g transform="translate(0.8 0.9)" opacity="0.55">${star(32, 17, 8, p.dark, 0.46)}</g>
  ${star(32, 16.2, 8, p.chip ? '#FFFFFF' : p.hi, 0.46)}
  <ellipse cx="21" cy="9.6" rx="11" ry="3.2" fill="url(#s${id})" transform="rotate(-12 21 9.6)"/>
  <path d="M6 22 A28 12 0 0 0 58 22" fill="none" stroke="#fff" stroke-width="0.8" opacity="0.25" transform="translate(0 4)"/>
</svg>`;
  u = uri(svg);
  tiltedCache.set(key, u);
  return u;
}

const frontCache = new Map<string, string>();
/** Đồng xu nhìn thẳng 40×40 (kèm bề dày bên phải/dưới) để quay lật khi bay */
export function coinFrontUri(kind: string): string {
  const key = `f|${kind}`;
  let u = frontCache.get(key);
  if (u) return u;
  const p = palette(kind, 0);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">${defs(p, 'x')}
  <circle cx="21.5" cy="22.5" r="17" fill="${p.edgeDark}"/>
  <circle cx="20" cy="20" r="17" fill="url(#ex)" stroke="${p.edgeDark}" stroke-width="1.2"/>
  <circle cx="20" cy="20" r="17" fill="none" stroke="${p.edgeDark}" stroke-width="1.2"/>
  <circle cx="20" cy="20" r="15" fill="url(#fx)" stroke="${p.edgeDark}" stroke-width="1"/>
  <circle cx="20" cy="20" r="11.6" fill="none" stroke="${p.dark}" stroke-width="1.5" opacity="0.8" transform="translate(0.6 0.7)"/>
  <circle cx="20" cy="20" r="11.6" fill="none" stroke="${p.hi}" stroke-width="1" ${p.chip ? 'stroke-dasharray="4 3.2"' : ''}/>
  <g transform="translate(0.7 0.8)" opacity="0.55">${star(20, 20, 8.2, p.dark)}</g>
  ${star(20, 19.4, 8.2, p.chip ? '#FFFFFF' : p.hi)}
  <ellipse cx="14" cy="11" rx="8.5" ry="3.6" fill="url(#sx)" transform="rotate(-35 14 11)"/>
</svg>`;
  u = uri(svg);
  frontCache.set(key, u);
  return u;
}
