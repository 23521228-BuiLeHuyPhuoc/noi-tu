import type { ImageSourcePropType } from 'react-native';
import type { StickerId } from '../../shared/src/types';

// Bundled crops from the public Quỳnh Aka preview (Zalo pack 934a1d8821cdc89391dc).
export const STICKERS: readonly { id: StickerId; alt: string; source: ImageSourcePropType }[] = [
  { id: 'quynh-01', alt: 'Buồn ngủ', source: require('../assets/stickers/quynh-01.png') },
  { id: 'quynh-02', alt: 'Khóc nhè', source: require('../assets/stickers/quynh-02.png') },
  { id: 'quynh-03', alt: 'Choáng váng', source: require('../assets/stickers/quynh-03.png') },
  { id: 'quynh-04', alt: 'Ngơ ngác', source: require('../assets/stickers/quynh-04.png') },
  { id: 'quynh-05', alt: 'Hờn dỗi', source: require('../assets/stickers/quynh-05.png') },
  { id: 'quynh-06', alt: 'Liếc mắt', source: require('../assets/stickers/quynh-06.png') },
  { id: 'quynh-07', alt: 'Thơm má', source: require('../assets/stickers/quynh-07.png') },
  { id: 'quynh-08', alt: 'Bối rối', source: require('../assets/stickers/quynh-08.png') },
  { id: 'quynh-09', alt: 'Cười tươi', source: require('../assets/stickers/quynh-09.png') },
];

export const stickerOf = (id: StickerId) => (STICKERS.find((item) => item.id === id) ?? CHU_LAY_STICKERS.find((item) => item.id === id));

// ---------- Bộ "Chữ Lầy" (mua bằng Ruby): SVG vẽ bằng code, chữ to viền đậm + emoji, nền màu ----------

const CHU_LAY_DEFS: { id: StickerId; alt: string; lines: string[]; emoji: string; bg: string; fg?: string }[] = [
  { id: 'chu-01', alt: 'GG EZ', lines: ['GG EZ'], emoji: '😎', bg: '#2F7DE1' },
  { id: 'chu-02', alt: 'Cay chưa', lines: ['Cay', 'chưa?'], emoji: '🌶️', bg: '#E8453C' },
  { id: 'chu-03', alt: 'Đỉnh nóc kịch trần', lines: ['Đỉnh nóc', 'kịch trần'], emoji: '🔥', bg: '#F28C28' },
  { id: 'chu-04', alt: 'Ăn may thôi', lines: ['Ăn may', 'thôi!'], emoji: '🍀', bg: '#2E9E5B' },
  { id: 'chu-05', alt: 'Gà quá', lines: ['Gà quá'], emoji: '🐔', bg: '#E5B93C' },
  { id: 'chu-06', alt: 'Khóc tiếp đi', lines: ['Khóc', 'tiếp đi'], emoji: '😭', bg: '#4C6FD1' },
  { id: 'chu-07', alt: 'Từ từ thôi', lines: ['Từ từ', 'thôi'], emoji: '⏳', bg: '#8E5BC4' },
  { id: 'chu-08', alt: 'Xin vía', lines: ['Xin vía'], emoji: '🙏', bg: '#D6558F' },
  { id: 'chu-09', alt: 'Ảo thật đấy', lines: ['Ảo thật', 'đấy!'], emoji: '🤯', bg: '#1FA3A3' },
  { id: 'chu-10', alt: 'Thua tâm phục', lines: ['Thua tâm', 'phục'], emoji: '🏳️', bg: '#6C7A89' },
  { id: 'chu-11', alt: 'Ai cho mà chơi', lines: ['Ai cho', 'mà chơi'], emoji: '🙅', bg: '#C0392B' },
  { id: 'chu-12', alt: 'Hên xui', lines: ['Hên xui'], emoji: '🎲', bg: '#16A085' },
];

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function chuLaySvg(d: (typeof CHU_LAY_DEFS)[number]): string {
  const longest = Math.max(...d.lines.map((l) => l.length));
  const size = Math.min(40, Math.floor(150 / Math.max(3.4, longest * 0.62)));
  const lineH = size * 1.12;
  const textTop = 52 - ((d.lines.length - 1) * lineH) / 2;
  const text = d.lines
    .map((l, i) => `<text x="80" y="${(textTop + i * lineH).toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="${size}" fill="#fff" stroke="#1B1B1B" stroke-width="7" stroke-linejoin="round" paint-order="stroke">${esc(l)}</text>`)
    .join('');
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120" width="160" height="120">` +
    `<rect x="4" y="4" width="152" height="112" rx="22" fill="${d.bg}" stroke="#1B1B1B" stroke-width="5"/>` +
    `<rect x="12" y="10" width="136" height="26" rx="13" fill="#fff" opacity="0.18"/>` +
    text +
    `<text x="80" y="101" text-anchor="middle" dominant-baseline="middle" font-size="28">${d.emoji}</text>` +
    `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const CHU_LAY_STICKERS: readonly { id: StickerId; alt: string; source: ImageSourcePropType }[] = CHU_LAY_DEFS.map((d) => ({
  id: d.id, alt: d.alt, source: { uri: chuLaySvg(d) },
}));

