/**
 * Tranh 6 con vật Bầu cua vẽ theo lối tranh dân gian: nét mực đậm, màu phẳng (đỏ son, vàng nghệ,
 * xanh lá, nâu đất). Tự vẽ bằng SVG, hiển thị qua data URI nên không cần file ảnh.
 */
import type { BauCuaSymbol } from '../../shared/src/types';

const INK = '#2A0A10';

const wrap = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><g stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">${body}</g></svg>`;

/** chân/càng: vẽ nét mực dày rồi tô màu lên trên cho có viền */
const limb = (d: string, color: string, w = 6) =>
  `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w + 3}"/><path d="${d}" fill="none" stroke="${color}" stroke-width="${w}"/>`;

const NAI = wrap(`
  <path d="M33 33 L27 17 M27 17 L20 10 M27 17 L30 7 M29 23 L20 21 M41 32 L46 16 M46 16 L42 7 M46 16 L54 11 M44 23 L53 22" fill="none" stroke="#6B3410" stroke-width="4"/>
  ${limb('M52 76 L48 104', '#B8641F')}
  ${limb('M61 78 L61 105', '#9C5218')}
  ${limb('M86 76 L89 105', '#9C5218')}
  ${limb('M95 73 L101 103', '#B8641F')}
  <path d="M100 60 L109 55 L105 66 Z" fill="#FFF3D6"/>
  <path d="M45 63 C45 51 61 46 79 48 C95 49 105 57 103 69 C101 81 87 83 71 82 C55 81 45 75 45 63 Z" fill="#C8742B"/>
  <path d="M55 77 C66 81 84 82 96 76" fill="none" stroke="#FFF3D6" stroke-width="4"/>
  <path d="M54 59 C49 48 43 42 39 36 C35 31 27 33 22 37 L14 41 C11 43 13 48 18 48 L28 48 C33 52 37 60 41 66 Z" fill="#C8742B"/>
  <path d="M37 34 L46 27 L44 37 Z" fill="#E09A55"/>
  <g stroke="none" fill="#FFF3D6"><circle cx="64" cy="56" r="3"/><circle cx="76" cy="54" r="3"/><circle cx="88" cy="57" r="3"/><circle cx="70" cy="65" r="3"/><circle cx="83" cy="66" r="3"/><circle cx="95" cy="66" r="2.5"/></g>
  <circle cx="29" cy="39" r="2.4" fill="${INK}" stroke="none"/>
  <circle cx="15" cy="44" r="2.2" fill="${INK}" stroke="none"/>
`);

const BAU = wrap(`
  <path d="M62 23 L64 12 C65 8 71 7 74 10" fill="none" stroke="#6D4C2F" stroke-width="4.5"/>
  <path d="M66 15 C76 3 95 7 98 16 C88 23 75 23 66 15 Z" fill="#3F7D23"/>
  <path d="M70 15 C78 12 88 12 95 15" fill="none" stroke="#9CCC65" stroke-width="2"/>
  <path d="M60 22 C51 22 49 31 51 39 C53 47 45 51 41 61 C33 80 41 106 60 106 C79 106 87 80 79 61 C75 51 67 47 69 39 C71 31 69 22 60 22 Z" fill="#7CB342"/>
  <path d="M49 67 C45 78 47 92 54 98" fill="none" stroke="#C5E1A5" stroke-width="5" stroke-opacity="0.9"/>
  <path d="M54 29 C53 34 54 38 55 41" fill="none" stroke="#C5E1A5" stroke-width="4"/>
  <path d="M50 45 C56 48 64 48 70 45" fill="none" stroke="${INK}" stroke-width="8"/>
  <path d="M50 45 C56 48 64 48 70 45" fill="none" stroke="#D32F2F" stroke-width="5"/>
  <path d="M60 47 L50 60 L56 60 L60 50 Z" fill="#D32F2F"/>
  <path d="M60 47 L71 59 L65 60 L60 50 Z" fill="#D32F2F"/>
  <circle cx="60" cy="47" r="4" fill="#F9C80E"/>
`);

const GA = wrap(`
  <path d="M45 53 C37 31 27 22 18 24 C26 32 32 45 40 61 Z" fill="#E8A317"/>
  <path d="M44 58 C30 40 18 34 9 40 C20 44 28 54 40 67 Z" fill="#1E6B52"/>
  <path d="M42 63 C26 53 12 57 7 67 C19 65 30 67 42 71 Z" fill="#203A5C"/>
  <path d="M44 68 C32 66 20 74 18 84 C28 78 36 77 46 76 Z" fill="#1E6B52"/>
  ${limb('M58 86 L56 104 M56 104 L49 107 M56 104 L62 108', '#F2B705', 4)}
  ${limb('M69 86 L71 104 M71 104 L64 107 M71 104 L78 107', '#F2B705', 4)}
  <path d="M40 61 C40 47 56 41 70 45 C80 48 86 57 84 69 C82 83 66 89 54 87 C44 85 40 75 40 61 Z" fill="#E8742A"/>
  <path d="M70 47 C70 37 72 27 80 23 C88 19 96 25 94 33 C92 39 86 41 84 47 Z" fill="#F4A62A"/>
  <path d="M74 44 C76 52 80 56 84 58" fill="none" stroke="#C0561B" stroke-width="2.5"/>
  <path d="M79 21 C79 15 83 12 86 16 C87 10 93 10 93 16 C95 12 100 15 97 21 Z" fill="#D32F2F"/>
  <path d="M94 28 L103 31 L94 35 Z" fill="#F9C80E"/>
  <path d="M91 37 C92 44 87 46 86 40 Z" fill="#D32F2F"/>
  <circle cx="88" cy="28" r="2.4" fill="${INK}" stroke="none"/>
  <path d="M50 63 C56 54 71 56 73 67 C66 74 56 73 50 63 Z" fill="#B23A1E"/>
  <path d="M55 64 C60 62 66 63 69 66" fill="none" stroke="#F4A62A" stroke-width="2"/>
`);

const CA = wrap(`
  <path d="M87 60 L109 39 C104 52 104 68 109 81 Z" fill="#D32F2F"/>
  <path d="M95 52 L103 47 M95 60 L104 60 M95 68 L103 73" fill="none" stroke="#FFB199" stroke-width="2"/>
  <path d="M40 41 C47 26 64 26 73 41 Z" fill="#D32F2F"/>
  <path d="M50 79 L58 95 L67 78 Z" fill="#D32F2F"/>
  <path d="M13 60 C23 40 50 34 70 40 C80 44 88 52 91 60 C88 68 80 76 70 80 C50 86 23 80 13 60 Z" fill="#F57C00"/>
  <path d="M20 65 C34 77 56 81 77 72 C65 81 40 85 20 65 Z" fill="#FFD54F" stroke="none"/>
  <g fill="none" stroke="#B23A1E" stroke-width="2">
    <path d="M44 48 a5 5 0 0 1 0 9 M54 46 a5 5 0 0 1 0 9 M64 47 a5 5 0 0 1 0 9 M74 50 a5 5 0 0 1 0 9"/>
    <path d="M48 58 a5 5 0 0 1 0 9 M58 57 a5 5 0 0 1 0 9 M68 58 a5 5 0 0 1 0 9 M78 60 a4 4 0 0 1 0 7"/>
  </g>
  <path d="M36 47 C31 55 31 65 36 73" fill="none"/>
  <circle cx="26" cy="55" r="5" fill="#FFFFFF"/>
  <circle cx="25" cy="55" r="2.6" fill="${INK}" stroke="none"/>
  <path d="M14 62 C9 66 7 72 9 77" fill="none" stroke-width="2"/>
  <path d="M15 64 L20 64" fill="none" stroke-width="2"/>
`);

const CUA = wrap(`
  ${limb('M36 70 L20 72 L12 84', '#E53935', 4)}
  ${limb('M38 77 L24 84 L18 96', '#E53935', 4)}
  ${limb('M44 83 L34 94 L32 106', '#E53935', 4)}
  ${limb('M84 70 L100 72 L108 84', '#E53935', 4)}
  ${limb('M82 77 L96 84 L102 96', '#E53935', 4)}
  ${limb('M76 83 L86 94 L88 106', '#E53935', 4)}
  ${limb('M38 60 L26 46', '#E53935', 6)}
  ${limb('M82 60 L94 46', '#E53935', 6)}
  <path d="M15 40 C12 27 23 20 31 26 L25 33 L33 35 C31 44 19 48 15 40 Z" fill="#E53935"/>
  <path d="M105 40 C108 27 97 20 89 26 L95 33 L87 35 C89 44 101 48 105 40 Z" fill="#E53935"/>
  ${limb('M52 50 L49 38', '#E53935', 3)}
  ${limb('M68 50 L71 38', '#E53935', 3)}
  <circle cx="49" cy="36" r="4" fill="${INK}"/>
  <circle cx="71" cy="36" r="4" fill="${INK}"/>
  <path d="M30 66 C30 52 44 46 60 46 C76 46 90 52 90 66 C90 80 76 88 60 88 C44 88 30 80 30 66 Z" fill="#E53935"/>
  <path d="M42 60 C50 54 70 54 78 60" fill="none" stroke="#9E1F1A" stroke-width="2.5"/>
  <path d="M46 70 C52 74 68 74 74 70" fill="none" stroke="#9E1F1A" stroke-width="2.5"/>
  <g stroke="none" fill="#FF8A80"><circle cx="50" cy="64" r="2.5"/><circle cx="60" cy="62" r="2.5"/><circle cx="70" cy="64" r="2.5"/></g>
`);

const TOM = wrap(`
  <path d="M22 45 C30 20 70 9 106 17" fill="none" stroke-width="2"/>
  <path d="M24 47 C40 30 78 26 108 34" fill="none" stroke-width="2"/>
  <path d="M65 95 L50 108 L61 104 L63 113 L70 104 L81 108 Z" fill="#E64A19"/>
  <path d="M30 40 C50 26 84 32 92 56 C98 76 86 94 66 96 L62 85 C76 83 83 73 80 60 C76 47 56 43 38 53 Z" fill="#FF8A50"/>
  <g fill="none" stroke="#C1440E" stroke-width="2.5">
    <path d="M50 35 L54 48 M62 34 L63 47 M74 38 L71 50 M84 46 L78 55 M90 58 L81 62 M90 72 L81 70 M84 85 L77 79"/>
  </g>
  ${limb('M50 49 L47 60', '#FF7043', 2.5)}
  ${limb('M61 46 L59 58', '#FF7043', 2.5)}
  ${limb('M72 50 L66 60', '#FF7043', 2.5)}
  ${limb('M79 61 L70 65', '#FF7043', 2.5)}
  ${limb('M78 73 L69 73', '#FF7043', 2.5)}
  <path d="M38 53 L12 47 L30 40 Z" fill="#FF7043"/>
  <circle cx="31" cy="45" r="3" fill="${INK}" stroke="none"/>
  <path d="M40 38 C52 33 70 33 80 40" fill="none" stroke="#FFCCBC" stroke-width="2.5"/>
`);

const SVG: Record<BauCuaSymbol, string> = { nai: NAI, bau: BAU, ga: GA, ca: CA, cua: CUA, tom: TOM };

export const ART: Record<BauCuaSymbol, string> = Object.fromEntries(
  Object.entries(SVG).map(([k, v]) => [k, `data:image/svg+xml;charset=utf-8,${encodeURIComponent(v.replace(/\s+/g, ' '))}`]),
) as Record<BauCuaSymbol, string>;

/** mã SVG gốc (dùng để xem thử / kiểm tra) */
export const ART_SVG = SVG;
