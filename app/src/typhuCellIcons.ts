import { TYPHU_BOARD, type TyPhuCell } from '../../shared/src/typhu';
import { TWEMOJI } from './typhuIcons';
import { AIRPORT_ICON, RISK_ICON } from './typhuPictos';

/** Mã Twemoji cho từng địa danh / loại ô (xem thư mục app/assets/typhu-icons). */
const LAND_ICON: Record<string, string> = {
  'Cà Mau': '1f980', // 🦀 cua Cà Mau
  'Bạc Liêu': '1f3bb', // 🎻 đờn ca tài tử
  'Châu Đốc': '1f41f', // 🐟 mắm, cá basa
  'Cần Thơ': '1f6f6', // 🛶 chợ nổi
  'Vĩnh Long': '1f34a', // 🍊 cam sành, trái cây
  'Quy Nhơn': '1f30a', // 🌊 biển
  'Nha Trang': '1f41a', // 🐚
  'Phan Thiết': '1f3d6', // 🏖️
  'Huế': '1f3ef', // 🏯
  'Hội An': '1f3ee', // 🏮
  'Đà Nẵng': '1f309', // 🌉 cầu Rồng
  'Hạ Long': '26f5', // ⛵
  'Hải Phòng': '2693', // ⚓ cảng
  'Sa Pa': '1f3d4', // 🏔️
  'Đà Lạt': '1f338', // 🌸
  'Buôn Ma Thuột': '1f418', // 🐘
  'Pleiku': '2615', // ☕
  'Biên Hòa': '1f3e2', // 🏢
  'Bình Dương': '1f3ed', // 🏭
  'Vũng Tàu': '26f1', // ⛱️
  'Hà Nội': '1f3db', // 🏛️
  'Sài Gòn': '1f3d9', // 🏙️
};

const KIND_ICON: Record<string, string> = {
  start: '1f3c1', jail: '1f694', gotojail: '1f46e',
  chance: '2753', community: '1f381', station: '1f682', tax: '1f4b8',
};

export function iconCodeOf(c: TyPhuCell): string {
  if (c.kind === 'land') return LAND_ICON[c.name] ?? '1f3e0';
  if (c.kind === 'utility') return c.name.includes('điện') ? '26a1' : '1f4a7';
  if (c.kind === 'tax' && c.name.includes('xa xỉ')) return '1f48e';
  return KIND_ICON[c.kind] ?? '2753';
}

export const iconUri = (code: string): string => TWEMOJI[code];
// Sân bay và Rủi ro không có trong bộ Twemoji đóng gói: dùng hình tự vẽ
export const ICON_BY_CELL: string[] = TYPHU_BOARD.map((c) => (c.kind === 'airport' ? AIRPORT_ICON : c.kind === 'community' ? RISK_ICON : iconUri(iconCodeOf(c))));
export const FX_ICON = {
  coin: iconUri('1fa99'), bag: iconUri('1f4b0'), bill: iconUri('1f4b5'), siren: iconUri('1f6a8'),
  house: iconUri('1f3e0'), hotel: iconUri('1f3e8'), skull: iconUri('1f480'), dice: iconUri('1f3b2'),
  star: iconUri('2b50'), sparkle: iconUri('2728'), chain: iconUri('26d3'), party: iconUri('1f389'),
  police: iconUri('1f694'), flag: iconUri('1f3c1'),
};
