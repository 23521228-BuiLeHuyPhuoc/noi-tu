/**
 * Hệ thống Map & Chủ Đề Màu Sắc phòng chơi Xóm Lầy (5 Map miễn phí + 6 Map động Ruby).
 * Dùng chung giữa app và server.
 */

export interface RoomTheme {
  id: string;
  name: string;
  emoji: string;
  price: number; // 0 = miễn phí
  desc: string;
  bg: string;
  bgAlt: string;
  cardBg: string;
  cardBorder: string;
  onBg: string;
  accent: string;
  accentText: string;
  /** hiệu ứng hạt nền chạy GPU CSS */
  particleFx?: 'none' | 'fireflies' | 'neon' | 'bamboo' | 'waves' | 'tet' | 'sakura' | 'lantern' | 'casino' | 'ocean' | 'galaxy';
}

export const ROOM_THEMES: readonly RoomTheme[] = [
  // 5 Map miễn phí
  {
    id: 'son_mac_dinh',
    name: 'Đỏ Sơn Xóm Lầy',
    emoji: '🏮',
    price: 0,
    desc: 'Bảng màu đỏ son vàng kim cổ điển đặc trưng Xóm Lầy',
    bg: '#B5121B',
    bgAlt: '#8E0D14',
    cardBg: '#FFFFFF',
    cardBorder: '#2A0A10',
    onBg: '#FFE7C2',
    accent: '#FFC21A',
    accentText: '#2A0A10',
    particleFx: 'none',
  },
  {
    id: 'dem_trang_soi',
    name: 'Đêm Trăng Ma Sói',
    emoji: '🌕',
    price: 0,
    desc: 'Nền tím than huyền bí dưới ánh trăng bạc & đom đóm đêm',
    bg: '#13162B',
    bgAlt: '#1F2347',
    cardBg: '#F4F5FF',
    cardBorder: '#0B0D1D',
    onBg: '#E2E6FF',
    accent: '#A5B4FC',
    accentText: '#0B0D1D',
    particleFx: 'fireflies',
  },
  {
    id: 'pho_dem_neon',
    name: 'Phố Đêm Cyberpunk',
    emoji: '🌃',
    price: 0,
    desc: 'Công nghệ tương lai tối giản với ánh neon xanh tím rực rỡ',
    bg: '#0C1220',
    bgAlt: '#191D38',
    cardBg: '#F8FAFC',
    cardBorder: '#08F7FE',
    onBg: '#A5F3FC',
    accent: '#08F7FE',
    accentText: '#08101E',
    particleFx: 'neon',
  },
  {
    id: 'rung_ngoc_bich',
    name: 'Rừng Trúc Ngọc Bích',
    emoji: '🎋',
    price: 0,
    desc: 'Xanh ngọc dịu mắt, thư thái khi chơi nối từ lâu dài',
    bg: '#0E4D3A',
    bgAlt: '#093528',
    cardBg: '#FBFDF9',
    cardBorder: '#0A2E23',
    onBg: '#D8F8E3',
    accent: '#FFD43B',
    accentText: '#162B1E',
    particleFx: 'bamboo',
  },
  {
    id: 'bien_xanh_he',
    name: 'Biển Xanh Nắng Vàng',
    emoji: '🏖️',
    price: 0,
    desc: 'Không khí biển nhiệt đới xanh mát cùng nắng vàng rực rỡ',
    bg: '#0B5E7A',
    bgAlt: '#074258',
    cardBg: '#FFFFFF',
    cardBorder: '#073042',
    onBg: '#E0F7FF',
    accent: '#FF922B',
    accentText: '#FFFFFF',
    particleFx: 'waves',
  },

  // 6 Map động Ruby VIP
  {
    id: 'map_tet_viet',
    name: 'Phố Ông Đồ Ngày Tết',
    emoji: '🧧',
    price: 350,
    desc: 'Hoa mai vàng & hoa đào rơi nhẹ trên nền đỏ thẫm ngày Xuân',
    bg: '#9B0E16',
    bgAlt: '#6E080F',
    cardBg: '#FFFDF5',
    cardBorder: '#2A0A10',
    onBg: '#FFE8A3',
    accent: '#FFD43B',
    accentText: '#2A0A10',
    particleFx: 'tet',
  },
  {
    id: 'map_sakura_kyoto',
    name: 'Vườn Anh Đào Đêm',
    emoji: '🌸',
    price: 450,
    desc: 'Hoàng hôn tím hồng lãng mạn với cánh hoa anh đào bay trong gió',
    bg: '#3B1847',
    bgAlt: '#240C2E',
    cardBg: '#FFF9FC',
    cardBorder: '#2A0A2E',
    onBg: '#FFD6EB',
    accent: '#FF85B3',
    accentText: '#2A0A2E',
    particleFx: 'sakura',
  },
  {
    id: 'map_am_thuc_cho_dem',
    name: 'Chợ Đêm Sài Gòn',
    emoji: '🍜',
    price: 500,
    desc: 'Đèn lồng ấm áp nhấp nháy rộn ràng không khí tiệc tùng phố đêm',
    bg: '#2D142C',
    bgAlt: '#510A32',
    cardBg: '#FFFBF7',
    cardBorder: '#1D091D',
    onBg: '#FFE3B3',
    accent: '#FF7B00',
    accentText: '#FFFFFF',
    particleFx: 'lantern',
  },
  {
    id: 'map_casino_royale',
    name: 'Sòng Bài Hoàng Gia',
    emoji: '🎰',
    price: 800,
    desc: 'Thảm nhung lục bảo sang chảnh cùng ánh kim cương lấp lánh',
    bg: '#083D2D',
    bgAlt: '#042219',
    cardBg: '#FFFDF8',
    cardBorder: '#D4AF37',
    onBg: '#FDE68A',
    accent: '#F59E0B',
    accentText: '#1F1300',
    particleFx: 'casino',
  },
  {
    id: 'map_long_cung',
    name: 'Thủy Cung Thần Long',
    emoji: '🐉',
    price: 1500,
    desc: 'Sóng ánh sáng đại dương huyền ảo & bong bóng ngọc trai trôi nổi',
    bg: '#042A4A',
    bgAlt: '#021529',
    cardBg: '#F5FBFF',
    cardBorder: '#38BDF8',
    onBg: '#BAE6FD',
    accent: '#38BDF8',
    accentText: '#041A2D',
    particleFx: 'ocean',
  },
  {
    id: 'map_cung_ngan_ha',
    name: 'Cung Điện Ngân Hà',
    emoji: '🌌',
    price: 3000,
    desc: 'Cực quang vũ trụ xoay chuyển, ngàn sao lấp lánh & mưa sao băng',
    bg: '#09071A',
    bgAlt: '#1B1145',
    cardBg: '#FAF8FF',
    cardBorder: '#C084FC',
    onBg: '#F3E8FF',
    accent: '#E879F9',
    accentText: '#1E0836',
    particleFx: 'galaxy',
  },
];

const THEME_BY_ID = new Map(ROOM_THEMES.map((t) => [t.id, t]));
export const DEFAULT_THEME_ID = 'son_mac_dinh';
export const FREE_THEMES = ROOM_THEMES.filter((t) => t.price === 0);
export const PAID_THEMES = ROOM_THEMES.filter((t) => t.price > 0);
export const isFreeTheme = (id: unknown): boolean => typeof id === 'string' && THEME_BY_ID.get(id)?.price === 0;
export const themeById = (id: unknown): RoomTheme => (typeof id === 'string' && THEME_BY_ID.get(id)) || ROOM_THEMES[0];
