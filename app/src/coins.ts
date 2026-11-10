/**
 * Đồng xu kim loại 3D vẽ bằng SVG (data URI), tạo một lần rồi nhớ lại (cache).
 * - Mặt vàng ('gold' hoặc 'gold|#hex') cho xu của mình, mặt bạc ánh kim ('silver' hoặc '#hex') cho người chơi khác.
 * - Mỗi người chơi có vòng màu riêng trên mặt xu để phân biệt rõ từng chồng xu.
 * - Có viền nổi, cạnh khía kim loại (milled edge), ký hiệu khắc nổi/chìm ở tâm, điểm sáng phản chiếu và bóng đổ.
 */
type Rgb = [number, number, number];
const toRgb = (hex: string): Rgb => {
  const h = hex.replace('#', '');
  const clean = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [
    parseInt(clean.slice(0, 2), 16) || 0,
    parseInt(clean.slice(2, 4), 16) || 0,
    parseInt(clean.slice(4, 6), 16) || 0,
  ];
};
const mix = (a: Rgb, b: Rgb, t: number): string =>
  '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('');
const BLACK: Rgb = [18, 12, 8];

type Palette = {
  hi: string;
  light: string;
  mid: string;
  dark: string;
  edge: string;
  edgeDark: string;
  ring: string;
  isGold: boolean;
};

function palette(kind: string, shade: number): Palette {
  const dim = shade * 0.14;
  const g = (hex: string) => mix(toRgb(hex), BLACK, dim);
  const isGold = kind === 'gold' || kind.startsWith('gold|');
  const ringHex = kind.startsWith('gold|')
    ? kind.slice(5)
    : kind.startsWith('#')
      ? kind
      : isGold
        ? '#D9480F'
        : '#495057';
  if (isGold) {
    return {
      hi: g('#FFFBE6'),
      light: g('#FFE047'),
      mid: g('#E59E0B'),
      dark: g('#8A5000'),
      edge: g('#C68306'),
      edgeDark: g('#593200'),
      ring: g(ringHex),
      isGold: true,
    };
  }
  return {
    hi: g('#FFFFFF'),
    light: g('#EEF3F8'),
    mid: g('#B8C4D0'),
    dark: g('#5C6B7A'),
    edge: g('#94A3B3'),
    edgeDark: g('#37424E'),
    ring: g(ringHex),
    isGold: false,
  };
}

const star = (cx: number, cy: number, r: number, fill: string, sy = 1) => {
  const pts = Array.from({ length: 8 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 4;
    const rr = i % 2 ? r * 0.42 : r;
    return `${(cx + Math.cos(a) * rr).toFixed(2)},${(cy + Math.sin(a) * rr * sy).toFixed(2)}`;
  });
  return `<polygon points="${pts.join(' ')}" fill="${fill}"/>`;
};

const uri = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
const defs = (p: Palette, id: string) => `<defs>
  <radialGradient id="f${id}" cx="32%" cy="26%" r="82%">
    <stop offset="0" stop-color="${p.hi}"/>
    <stop offset="0.32" stop-color="${p.light}"/>
    <stop offset="0.72" stop-color="${p.mid}"/>
    <stop offset="1" stop-color="${p.dark}"/>
  </radialGradient>
  <linearGradient id="e${id}" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="${p.edgeDark}"/>
    <stop offset="0.22" stop-color="${p.edge}"/>
    <stop offset="0.45" stop-color="${p.hi}"/>
    <stop offset="0.62" stop-color="${p.light}"/>
    <stop offset="0.82" stop-color="${p.edge}"/>
    <stop offset="1" stop-color="${p.edgeDark}"/>
  </linearGradient>
  <linearGradient id="s${id}" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#fff" stop-opacity="0.92"/>
    <stop offset="0.45" stop-color="#fff" stop-opacity="0.25"/>
    <stop offset="0.75" stop-color="#fff" stop-opacity="0"/>
  </linearGradient>
</defs>`;

const tiltedCache = new Map<string, string>();
/** Đồng xu kim loại nhìn nghiêng 64×42: mặt elip viền nổi, cạnh có vân khía, vòng màu người chơi, ký hiệu khắc, bóng đổ */
export function coinTiltedUri(kind: string, shade = 0): string {
  const key = `t|${kind}|${shade}`;
  let u = tiltedCache.get(key);
  if (u) return u;
  const p = palette(kind, shade);
  const id = `${shade}`;
  const ribs = Array.from({ length: 25 }, (_, i) => {
    const x = 3.5 + i * 2.38;
    const bright = i % 2 === 0;
    return `<line x1="${x.toFixed(1)}" y1="16" x2="${x.toFixed(1)}" y2="29" stroke="${bright ? p.hi : p.edgeDark}" stroke-width="${bright ? 1.05 : 1.25}" opacity="${bright ? 0.72 : 0.78}"/>`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 42">${defs(p, id)}
  <ellipse cx="32" cy="27.8" rx="30.2" ry="12.8" fill="#000" opacity="0.28"/>
  <path d="M2 16 L2 25.5 A30 13.5 0 0 0 62 25.5 L62 16 Z" fill="url(#e${id})" stroke="${p.edgeDark}" stroke-width="1.3"/>
  <clipPath id="c${id}"><path d="M2 16 L2 25.5 A30 13.5 0 0 0 62 25.5 L62 16 Z"/></clipPath>
  <g clip-path="url(#c${id})">${ribs}</g>
  <path d="M2 25.5 A30 13.5 0 0 0 62 25.5" fill="none" stroke="${p.edgeDark}" stroke-width="1.4"/>
  <ellipse cx="32" cy="16" rx="30" ry="13.5" fill="url(#f${id})" stroke="${p.edgeDark}" stroke-width="1.4"/>
  <ellipse cx="32" cy="16.5" rx="27.2" ry="11.9" fill="none" stroke="${p.dark}" stroke-width="1.5" opacity="0.82"/>
  <ellipse cx="32" cy="15.5" rx="27.2" ry="11.9" fill="none" stroke="${p.hi}" stroke-width="1.1" opacity="0.92"/>
  <ellipse cx="32" cy="16" rx="22.8" ry="9.7" fill="none" stroke="${p.ring}" stroke-width="2.6" opacity="0.95"/>
  <ellipse cx="32" cy="16" rx="20.2" ry="8.4" fill="none" stroke="${p.dark}" stroke-width="1" opacity="0.75"/>
  <ellipse cx="32" cy="16" rx="16.5" ry="6.8" fill="${p.mid}" opacity="0.52" stroke="${p.hi}" stroke-width="0.8"/>
  <g transform="translate(0.8 0.9)" opacity="0.65">${star(32, 16, 8.8, p.dark, 0.45)}</g>
  ${star(32, 15.2, 8.8, p.hi, 0.45)}
  <rect x="29.4" y="13.9" width="5.2" height="2.8" rx="0.7" fill="${p.dark}" stroke="${p.hi}" stroke-width="0.8"/>
  <ellipse cx="20.5" cy="9.2" rx="11.5" ry="3.4" fill="url(#s${id})" transform="rotate(-11 20.5 9.2)"/>
  <circle cx="15" cy="8.8" r="1.5" fill="#FFF" opacity="0.92"/>
  <path d="M6 21.5 A28 12 0 0 0 58 21.5" fill="none" stroke="#fff" stroke-width="0.9" opacity="0.32" transform="translate(0 3.5)"/>
</svg>`;
  u = uri(svg);
  tiltedCache.set(key, u);
  return u;
}

const frontCache = new Map<string, string>();
/** Đồng xu kim loại nhìn thẳng 44×44 (kèm bề dày có khía bên dưới/phải) để quay lật 3D khi bay */
export function coinFrontUri(kind: string): string {
  const key = `f|${kind}`;
  let u = frontCache.get(key);
  if (u) return u;
  const p = palette(kind, 0);
  const edgeNotches = Array.from({ length: 14 }, (_, i) => {
    const a = (i * Math.PI) / 13;
    const x1 = 22 + Math.cos(a) * 18.5;
    const y1 = 21 + Math.sin(a) * 18.5;
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${(x1 + 1.4).toFixed(1)}" y2="${(y1 + 2.2).toFixed(1)}" stroke="${i % 2 ? p.hi : p.edgeDark}" stroke-width="1.2"/>`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 44">${defs(p, 'x')}
  <circle cx="23.2" cy="24.2" r="18.5" fill="#000" opacity="0.28"/>
  <circle cx="22.4" cy="23" r="18.5" fill="url(#ex)" stroke="${p.edgeDark}" stroke-width="1.3"/>
  ${edgeNotches}
  <circle cx="21" cy="20.5" r="18.5" fill="url(#fx)" stroke="${p.edgeDark}" stroke-width="1.4"/>
  <circle cx="21" cy="21.1" r="16.2" fill="none" stroke="${p.dark}" stroke-width="1.5" opacity="0.82"/>
  <circle cx="21" cy="19.9" r="16.2" fill="none" stroke="${p.hi}" stroke-width="1.1" opacity="0.92"/>
  <circle cx="21" cy="20.5" r="13.5" fill="none" stroke="${p.ring}" stroke-width="2.4" opacity="0.95"/>
  <circle cx="21" cy="20.5" r="10.4" fill="${p.mid}" opacity="0.48" stroke="${p.hi}" stroke-width="0.9"/>
  <g transform="translate(0.8 0.9)" opacity="0.65">${star(21, 20.5, 8.2, p.dark)}</g>
  ${star(21, 19.7, 8.2, p.hi)}
  <rect x="18.6" y="18.1" width="4.8" height="4.8" rx="0.9" fill="${p.dark}" stroke="${p.hi}" stroke-width="0.9"/>
  <ellipse cx="14.5" cy="11.2" rx="9" ry="3.8" fill="url(#sx)" transform="rotate(-32 14.5 11.2)"/>
  <circle cx="11.5" cy="10.5" r="1.4" fill="#FFF" opacity="0.92"/>
</svg>`;
  u = uri(svg);
  frontCache.set(key, u);
  return u;
}
