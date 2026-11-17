/**
 * Hệ thống Map & Chủ Đề Màu Sắc phòng chơi Xóm Lầy (5 Map miễn phí + 10 Map động Ruby "Ố Dề / Đẳng Cấp").
 * Dùng chung giữa app và server.
 */

export type MapParticleKind =
  | 'none'
  | 'lantern_gold'
  | 'fireflies'
  | 'neon'
  | 'bamboo'
  | 'waves'
  | 'tet'
  | 'sakura'
  | 'lantern'
  | 'casino'
  | 'ocean'
  | 'galaxy'
  | 'disco_party'
  | 'swamp_glow'
  | 'matrix_cyber'
  | 'imperial_gold';

export interface RoomTheme {
  id: string;
  name: string;
  emoji: string;
  price: number; // 0 = miễn phí
  desc: string;
  bg: string;
  bgAlt: string;
  /** dải màu thứ 3 cho nền mesh/aurora rực rỡ */
  bgGlow?: string;
  cardBg: string;
  cardBorder: string;
  onBg: string;
  accent: string;
  accentText: string;
  /** hiệu ứng hạt nền chạy GPU CSS */
  particleFx?: MapParticleKind;
}

export const ROOM_THEMES: readonly RoomTheme[] = [
  // ================= 5 Map miễn phí (đã hiệu chỉnh màu rực rỡ & có chiều sâu hơn) =================
  {
    id: 'son_mac_dinh',
    name: 'Đỏ Sơn Xóm Lầy',
    emoji: '🏮',
    price: 0,
    desc: 'Đỏ son rực lửa pha ánh kim hội làng truyền thống Xóm Lầy',
    bg: '#B91C1C',
    bgAlt: '#7F1D1D',
    bgGlow: '#F59E0B',
    cardBg: '#FFFDF9',
    cardBorder: '#450A0A',
    onBg: '#FEF3C7',
    accent: '#FACC15',
    accentText: '#2A0A10',
    particleFx: 'lantern_gold',
  },
  {
    id: 'dem_trang_soi',
    name: 'Đêm Trăng Ma Sói',
    emoji: '🌕',
    price: 0,
    desc: 'Nền tím chàm huyền ảo dưới trăng máu & đom đóm lập lòe',
    bg: '#13112E',
    bgAlt: '#271B52',
    bgGlow: '#818CF8',
    cardBg: '#F6F5FF',
    cardBorder: '#312E81',
    onBg: '#E0E7FF',
    accent: '#C084FC',
    accentText: '#0F0B29',
    particleFx: 'fireflies',
  },
  {
    id: 'pho_dem_neon',
    name: 'Phố Đêm Cyberpunk',
    emoji: '🌃',
    price: 0,
    desc: 'Đèn neon cyan-magenta tương phản cực mạnh phong cách tương lai',
    bg: '#090D1E',
    bgAlt: '#1E113A',
    bgGlow: '#06B6D4',
    cardBg: '#F8FAFC',
    cardBorder: '#22D3EE',
    onBg: '#A5F3FC',
    accent: '#22D3EE',
    accentText: '#08101E',
    particleFx: 'neon',
  },
  {
    id: 'rung_ngoc_bich',
    name: 'Rừng Trúc Ngọc Bích',
    emoji: '🎋',
    price: 0,
    desc: 'Xanh lục bảo phát sáng kết hợp nắng vàng lấp lánh dịu mắt',
    bg: '#064E3B',
    bgAlt: '#022C22',
    bgGlow: '#34D399',
    cardBg: '#F8FFF9',
    cardBorder: '#065F46',
    onBg: '#D1FAE5',
    accent: '#FBBF24',
    accentText: '#052E16',
    particleFx: 'bamboo',
  },
  {
    id: 'bien_xanh_he',
    name: 'Biển Xanh Nắng Vàng',
    emoji: '🏖️',
    price: 0,
    desc: 'Vịnh ngọc lam nhiệt đới rực nắng cam san hô tươi mát',
    bg: '#0369A1',
    bgAlt: '#082F49',
    bgGlow: '#38BDF8',
    cardBg: '#FFFFFF',
    cardBorder: '#0284C7',
    onBg: '#E0F2FE',
    accent: '#FB923C',
    accentText: '#FFFFFF',
    particleFx: 'waves',
  },

  // ================= 10 Map động Ruby VIP (hiệu ứng rực rỡ, lố lăng & đẳng cấp) =================
  {
    id: 'map_tet_viet',
    name: 'Phố Ông Đồ Ngày Tết',
    emoji: '🧧',
    price: 350,
    desc: 'Mưa bao lì xì đỏ, hoa mai vàng & pháo giấy rộn ràng ngày Xuân',
    bg: '#991B1B',
    bgAlt: '#5C0612',
    bgGlow: '#FBBF24',
    cardBg: '#FFFDF5',
    cardBorder: '#D97706',
    onBg: '#FDE68A',
    accent: '#FACC15',
    accentText: '#2A0A10',
    particleFx: 'tet',
  },
  {
    id: 'map_sakura_kyoto',
    name: 'Vườn Anh Đào Đêm',
    emoji: '🌸',
    price: 450,
    desc: 'Bầu trời tím hồng mộng mơ với cơn mưa cánh hoa anh đào phát sáng',
    bg: '#4A1259',
    bgAlt: '#260833',
    bgGlow: '#F472B6',
    cardBg: '#FFF8FC',
    cardBorder: '#EC4899',
    onBg: '#FCE7F3',
    accent: '#F472B6',
    accentText: '#2A0A2E',
    particleFx: 'sakura',
  },
  {
    id: 'map_am_thuc_cho_dem',
    name: 'Chợ Đêm Sài Gòn',
    emoji: '🍜',
    price: 500,
    desc: 'Đèn lồng cam hồng rực cháy, sôi động tiệc tùng xuyên màn đêm',
    bg: '#3B0736',
    bgAlt: '#5E0B2B',
    bgGlow: '#FB923C',
    cardBg: '#FFFBF7',
    cardBorder: '#F97316',
    onBg: '#FFEDD5',
    accent: '#FB923C',
    accentText: '#FFFFFF',
    particleFx: 'lantern',
  },
  {
    id: 'map_san_nhay_disco',
    name: 'Sàn Disco Bất Ổn',
    emoji: '🪩',
    price: 650,
    desc: 'Quả cầu gương 7 màu chớp nháy lố lăng & nốt nhạc quẩy banh nóc!',
    bg: '#2E094E',
    bgAlt: '#59084A',
    bgGlow: '#F43F5E',
    cardBg: '#FFF9FF',
    cardBorder: '#E879F9',
    onBg: '#FAE8FF',
    accent: '#22D3EE',
    accentText: '#1A052E',
    particleFx: 'disco_party',
  },
  {
    id: 'map_dam_lay_ech',
    name: 'Đầm Lầy Quái Chiêu',
    emoji: '🐸',
    price: 750,
    desc: 'Rừng đầm lầy phát quang sinh học xanh cốm & nấm thần lấp lánh',
    bg: '#093824',
    bgAlt: '#132642',
    bgGlow: '#84CC16',
    cardBg: '#F7FEE7',
    cardBorder: '#65A30D',
    onBg: '#ECFCCB',
    accent: '#A3E635',
    accentText: '#142907',
    particleFx: 'swamp_glow',
  },
  {
    id: 'map_casino_royale',
    name: 'Sòng Bài Hoàng Gia',
    emoji: '🎰',
    price: 800,
    desc: 'Thảm nhung lục bảo dát viền vàng 24K & phỉnh kim cương xoay lượn',
    bg: '#063E2E',
    bgAlt: '#031F17',
    bgGlow: '#F59E0B',
    cardBg: '#FFFDF7',
    cardBorder: '#EAB308',
    onBg: '#FEF08A',
    accent: '#F59E0B',
    accentText: '#1F1300',
    particleFx: 'casino',
  },
  {
    id: 'map_long_cung',
    name: 'Thủy Cung Thần Long',
    emoji: '🐉',
    price: 1500,
    desc: 'Luồng sáng ngọc trai đại dương & rồng nước lượn quanh bọt biển',
    bg: '#062C4F',
    bgAlt: '#03152B',
    bgGlow: '#38BDF8',
    cardBg: '#F4FAFF',
    cardBorder: '#38BDF8',
    onBg: '#BAE6FD',
    accent: '#38BDF8',
    accentText: '#041A2D',
    particleFx: 'ocean',
  },
  {
    id: 'map_vuc_tham_cyber',
    name: 'Ma Trận Hacker Ố Dề',
    emoji: '👾',
    price: 1800,
    desc: 'Không gian Ảo Giác lục-tím neon cực gắt dành cho dân hệ Chiến & IT',
    bg: '#051914',
    bgAlt: '#160B2E',
    bgGlow: '#10B981',
    cardBg: '#F5FFFB',
    cardBorder: '#10B981',
    onBg: '#A7F3D0',
    accent: '#34D399',
    accentText: '#031B13',
    particleFx: 'matrix_cyber',
  },
  {
    id: 'map_cung_ngan_ha',
    name: 'Cung Điện Ngân Hà',
    emoji: '🌌',
    price: 3000,
    desc: 'Cực quang vũ trụ đa sắc xoay chuyển, tinh vân & mưa sao băng rực rỡ',
    bg: '#0B0722',
    bgAlt: '#24125C',
    bgGlow: '#D946EF',
    cardBg: '#FAF8FF',
    cardBorder: '#C084FC',
    onBg: '#F3E8FF',
    accent: '#E879F9',
    accentText: '#1E0836',
    particleFx: 'galaxy',
  },
  {
    id: 'map_hoang_kim_dien',
    name: 'Điện Hoàng Kim Tỷ Phú',
    emoji: '👑',
    price: 5500,
    desc: 'Cung điện dát vàng ròng chói lóa, mưa thỏi vàng SJC & vương miện bay ngập phòng!',
    bg: '#422006',
    bgAlt: '#1C0D02',
    bgGlow: '#FACC15',
    cardBg: '#FFFBEB',
    cardBorder: '#F59E0B',
    onBg: '#FEF08A',
    accent: '#FACC15',
    accentText: '#261000',
    particleFx: 'imperial_gold',
  },
];

const THEME_BY_ID = new Map(ROOM_THEMES.map((t) => [t.id, t]));
export const DEFAULT_THEME_ID = 'son_mac_dinh';
export const FREE_THEMES = ROOM_THEMES.filter((t) => t.price === 0);
export const PAID_THEMES = ROOM_THEMES.filter((t) => t.price > 0);
export const isFreeTheme = (id: unknown): boolean => typeof id === 'string' && THEME_BY_ID.get(id)?.price === 0;
export const themeById = (id: unknown): RoomTheme => (typeof id === 'string' && THEME_BY_ID.get(id)) || ROOM_THEMES[0];
