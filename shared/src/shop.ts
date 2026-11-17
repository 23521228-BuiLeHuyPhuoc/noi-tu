/**
 * Cửa hàng Ruby: danh mục vật phẩm, giá, cấp bậc VIP Đại Gia, lượt chọc miễn phí, điểm danh.
 * Dùng chung app + server. Giá và danh sách sửa ở đây là đổi cho cả hai phía.
 * Ruby không bao giờ ảnh hưởng thắng thua.
 */
import { PAID_THEMES } from './themes';

export type ShopKind =
  | 'skill'
  | 'frame'
  | 'nameFx'
  | 'aura'
  | 'entrance'
  | 'pet'
  | 'title'
  | 'chatBubble'
  | 'roomTheme'
  | 'sticker'
  | 'gift';

export interface ShopItem {
  id: string;
  kind: ShopKind;
  name: string;
  emoji: string;
  price: number;
  /** mô tả ngắn hiệu ứng */
  desc?: string;
}

/** mỗi người có chừng này lượt chọc miễn phí mỗi ngày (giờ Việt Nam); hết thì 1 Ruby / lần */
export const FREE_POKES_PER_DAY = 30;
export const POKE_OVERFLOW_RUBY = 1;
/** giá mỗi lần admin bấm "chọc loạn xạ" cả phòng */
export const CHAOS_POKE_RUBY = 20;

/** kỹ năng chọc trả phí (kind của FunSend) */
export const SKILL_IDS = [
  'lightning', 'freeze', 'cake', 'water', 'dog', 'rocket', 'kiss', 'duck', 'ufo', 'disco', 'money',
  'paparazzi', 'cupid_arrow', 'ghost_scare', 'shark', 'royal_seal', 'meteor', 'blackhole', 'dragon_roar',
] as const;
export type SkillId = (typeof SKILL_IDS)[number];

/** các ô trang trí; mỗi ô trang bị một món */
export const COSMETIC_SLOTS = ['frame', 'nameFx', 'aura', 'entrance', 'pet', 'title', 'chatBubble', 'roomTheme'] as const;
export type CosmeticSlot = (typeof COSMETIC_SLOTS)[number];
export type Equipped = Partial<Record<CosmeticSlot, string>>;
/** phần trang trí hiện cho người khác trong phòng */
export type PlayerCosmetics = {
  frame?: string;
  nameFx?: string;
  aura?: string;
  pet?: string;
  title?: string;
  chatBubble?: string;
};

export const GIFT_IDS = [
  'gift_rose', 'gift_cake', 'gift_diamond_ring', 'gift_car', 'gift_yacht',
  'gift_private_jet', 'gift_castle', 'gift_golden_dragon', 'gift_island', 'gift_galaxy_palace',
] as const;
export type GiftId = (typeof GIFT_IDS)[number];

export const STICKER_PACK_ID = 'pack_chu_lay';

// ---------------- Cấp bậc Đại Gia (VIP Prestige) ----------------

export interface VipTierInfo {
  tier: number;
  minPoints: number;
  name: string;
  badge: string;
  color: string;
  glow: string;
}

export const VIP_TIERS: readonly VipTierInfo[] = [
  { tier: 0, minPoints: 0, name: 'Dân Chơi Xóm', badge: '', color: '#7A5A5E', glow: '' },
  { tier: 1, minPoints: 200, name: 'Đồng Lầy', badge: '🥉', color: '#CD7F32', glow: 'rgba(205,127,50,0.45)' },
  { tier: 2, minPoints: 600, name: 'Bạc Sành Điệu', badge: '🥈', color: '#94A3B8', glow: 'rgba(148,163,184,0.55)' },
  { tier: 3, minPoints: 1500, name: 'Vàng Quý Tộc', badge: '👑', color: '#F59F00', glow: 'rgba(245,159,0,0.65)' },
  { tier: 4, minPoints: 3500, name: 'Kim Cương Đại Gia', badge: '💎', color: '#00D2FF', glow: 'rgba(0,210,255,0.72)' },
  { tier: 5, minPoints: 7500, name: 'Huyền Thoại Thần Long', badge: '🐉', color: '#FF5722', glow: 'rgba(255,87,34,0.82)' },
  { tier: 6, minPoints: 15000, name: 'Chí Tôn Vũ Trụ', badge: '🌌', color: '#D946EF', glow: 'rgba(217,70,239,0.9)' },
];

export const SHOP_ITEMS: readonly ShopItem[] = [
  // kỹ năng chọc
  { id: 'lightning', kind: 'skill', name: 'Sét đánh', emoji: '⚡', price: 10, desc: 'Chớp trắng màn hình, avatar cháy đen 5 giây' },
  { id: 'freeze', kind: 'skill', name: 'Đóng băng', emoji: '🧊', price: 10, desc: 'Viền băng phủ mép màn hình 4 giây' },
  { id: 'cake', kind: 'skill', name: 'Úp bánh kem', emoji: '🎂', price: 15, desc: 'Bánh kem dính một góc, chạm để lau' },
  { id: 'water', kind: 'skill', name: 'Tạt nước', emoji: '💦', price: 8, desc: 'Giọt nước chảy dọc màn hình' },
  { id: 'dog', kind: 'skill', name: 'Thả chó', emoji: '🐕', price: 12, desc: 'Chú chó chạy ngang màn hình kèm tiếng sủa' },
  { id: 'rocket', kind: 'skill', name: 'Tên lửa', emoji: '🚀', price: 20, desc: 'Tên lửa bay tới avatar rồi nổ' },
  { id: 'kiss', kind: 'skill', name: 'Hôn gió', emoji: '😘', price: 5, desc: 'Tim bay, avatar đỏ mặt' },
  { id: 'duck', kind: 'skill', name: 'Đàn vịt đòi nợ', emoji: '🦆', price: 8, desc: 'Đàn vịt chạy tới đòi nợ, chạm để đuổi' },
  { id: 'ufo', kind: 'skill', name: 'UFO bắt cóc', emoji: '🛸', price: 15, desc: 'Đĩa bay rọi tia bắt cóc, chạm để thoát' },
  { id: 'disco', kind: 'skill', name: 'Sàn nhảy bất ổn', emoji: '🪩', price: 10, desc: 'Bóng disco và vũ điệu bất ổn, chạm để tắt' },
  { id: 'money', kind: 'skill', name: 'Đại gia tiền giấy', emoji: '💸', price: 8, desc: 'Mưa tiền giấy cho vui, không cộng Ruby hay điểm quà' },
  { id: 'paparazzi', kind: 'skill', name: 'Chụp lén Paparazzi', emoji: '📸', price: 12, desc: 'Nháy flash chói mắt + lên trang nhất báo lá cải' },
  { id: 'cupid_arrow', kind: 'skill', name: 'Mũi tên Ái Tình', emoji: '💘', price: 15, desc: 'Bắn tên tình yêu tới avatar + mưa hoa hồng' },
  { id: 'ghost_scare', kind: 'skill', name: 'Hù ma nửa đêm', emoji: '👻', price: 15, desc: 'Bóng ma lướt qua màn hình gây hú hồn' },
  { id: 'shark', kind: 'skill', name: 'Cá mập cắn mông', emoji: '🦈', price: 18, desc: 'Cá mập rẽ sóng lao tới táp thẳng avatar' },
  { id: 'royal_seal', kind: 'skill', name: 'Ấn Ký Hoàng Gia', emoji: '🏮', price: 30, desc: 'Đóng dấu triện vàng "TRẪM CHỈ ĐỊNH!" rung uy nghi' },
  { id: 'meteor', kind: 'skill', name: 'Thiên thạch giáng thế', emoji: '☄️', price: 35, desc: 'Quả cầu lửa lao từ bầu trời nổ tung avatar' },
  { id: 'blackhole', kind: 'skill', name: 'Hố đen vũ trụ', emoji: '🕳️', price: 40, desc: 'Xoáy hố đen hút méo màn hình trong 4 giây' },
  { id: 'dragon_roar', kind: 'skill', name: 'Rồng Thần Gầm Thét', emoji: '🐉', price: 50, desc: 'Rồng vàng lượn khắp bàn + sấm sét tối thượng' },

  // khung avatar (14 mẫu từ cơ bản tới Chí Tôn)
  { id: 'frame_gold', kind: 'frame', name: 'Viền vàng', emoji: '💛', price: 100 },
  { id: 'frame_fire', kind: 'frame', name: 'Viền lửa', emoji: '🔥', price: 200 },
  { id: 'frame_sakura', kind: 'frame', name: 'Viền Hoa Anh Đào', emoji: '🌸', price: 250, desc: 'Viền hồng phấn cánh hoa bay nhẹ nhàng' },
  { id: 'frame_rainbow', kind: 'frame', name: 'Viền cầu vồng', emoji: '🌈', price: 300 },
  { id: 'frame_neon', kind: 'frame', name: 'Viền neon nhấp nháy', emoji: '✨', price: 400 },
  { id: 'frame_thunder', kind: 'frame', name: 'Viền Lôi Đình', emoji: '⚡', price: 450, desc: 'Tia chớp xanh điện chạy quanh avatar' },
  { id: 'frame_dragon', kind: 'frame', name: 'Viền rồng', emoji: '🐉', price: 500 },
  { id: 'frame_ice_crown', kind: 'frame', name: 'Vương Miện Băng Giá', emoji: '❄️', price: 550, desc: 'Khung pha lê băng tuyết phát sáng lạnh lùng' },
  { id: 'frame_cyber', kind: 'frame', name: 'Mạch Điện Cyberpunk', emoji: '🤖', price: 700, desc: 'Vòng xoay công nghệ neon 2 màu cyan-hồng' },
  { id: 'frame_phoenix', kind: 'frame', name: 'Phượng Hoàng Lửa', emoji: '🦅', price: 950, desc: 'Vòng lửa mặt trời xoay rực cháy quanh avatar' },
  { id: 'frame_galaxy', kind: 'frame', name: 'Vòng Tinh Tú Ngân Hà', emoji: '🌌', price: 1500, desc: 'Xoáy thiên hà tím lấp lánh ánh sao' },
  { id: 'frame_jade_emperor', kind: 'frame', name: 'Ngọc Bội Hoàng Đế', emoji: '👑', price: 2500, desc: 'Vòng ngọc bích viền vàng hoàng kim đẳng cấp' },
  { id: 'frame_celestial_sword', kind: 'frame', name: 'Vạn Kiếm Quy Tông', emoji: '⚔️', price: 3800, desc: '4 thanh thần kiếm xoay quanh avatar liên tục' },
  { id: 'frame_supreme_god', kind: 'frame', name: 'Hào Quang Chí Tôn', emoji: '⚜️', price: 6000, desc: 'Hai vòng rune thần xoay ngược chiều + vương miện' },

  // hiệu ứng tên (10 mẫu)
  { id: 'name_rainbow', kind: 'nameFx', name: 'Tên cầu vồng', emoji: '🌈', price: 150 },
  { id: 'name_gold_liquid', kind: 'nameFx', name: 'Vàng Ròng Óng Ánh', emoji: '🥇', price: 200, desc: 'Chữ ánh vàng kim loại lướt sáng liên tục' },
  { id: 'name_sparkle', kind: 'nameFx', name: 'Tên lấp lánh', emoji: '✨', price: 250 },
  { id: 'name_fire_blaze', kind: 'nameFx', name: 'Tên Hỏa Diệm', emoji: '🔥', price: 300, desc: 'Chữ rực đỏ cam bốc lửa' },
  { id: 'name_neon_pulse', kind: 'nameFx', name: 'Tên Neon Cyber', emoji: '💠', price: 350, desc: 'Phát sáng cyan đậm chất game thủ' },
  { id: 'name_ice_crystal', kind: 'nameFx', name: 'Tên Băng Pha Lê', emoji: '🧊', price: 350, desc: 'Xanh băng tuyết long lanh mát lạnh' },
  { id: 'name_blood_moon', kind: 'nameFx', name: 'Tên Huyết Nguyệt', emoji: '🩸', price: 450, desc: 'Đỏ thẫm ánh trăng máu ma mị' },
  { id: 'name_galaxy_shimmer', kind: 'nameFx', name: 'Tên Tinh Vân', emoji: '🌌', price: 700, desc: 'Dải màu ngân hà trôi chảy liên tục' },
  { id: 'name_royal_3d', kind: 'nameFx', name: 'Chữ Nổi Hoàng Kim', emoji: '👑', price: 1200, desc: 'Chữ nổi 3D viền đậm hoàng gia' },
  { id: 'name_divine_glitch', kind: 'nameFx', name: 'Tên Thần Thoại Glitch', emoji: '⚡', price: 2500, desc: 'Hiệu ứng nhiễu không gian đa sắc VIP 6' },

  // hào quang tới lượt (9 mẫu)
  { id: 'aura_glow', kind: 'aura', name: 'Hào quang nhấp nháy', emoji: '💫', price: 300, desc: 'Sáng lên khi tới lượt' },
  { id: 'aura_sakura', kind: 'aura', name: 'Bão Hoa Anh Đào', emoji: '🌸', price: 350, desc: 'Cánh hoa hồng bao quanh khi tới lượt' },
  { id: 'aura_fire', kind: 'aura', name: 'Lửa quanh avatar', emoji: '🔥', price: 400, desc: 'Bốc lửa khi tới lượt' },
  { id: 'aura_lightning', kind: 'aura', name: 'Lôi Trường Tím', emoji: '⚡', price: 500, desc: 'Sấm sét xanh tím bao bọc avatar' },
  { id: 'aura_butterfly', kind: 'aura', name: 'Bướm Tiên Bay Lượn', emoji: '🦋', price: 600, desc: 'Đàn bướm ảo lấp lánh quanh mặt' },
  { id: 'aura_gold_coins', kind: 'aura', name: 'Mưa Tiền Tài Lộc', emoji: '🪙', price: 800, desc: 'Đồng xu vàng quay quanh khi ra chiêu' },
  { id: 'aura_dark_wolf', kind: 'aura', name: 'Khí Chất Sói Đêm', emoji: '🐺', price: 900, desc: 'Vòng ánh trăng & sương đêm ma mị' },
  { id: 'aura_holy_wings', kind: 'aura', name: 'Đôi Cánh Thiên Thần', emoji: '🪽', price: 1600, desc: 'Đôi cánh ánh sáng giang rộng 2 bên avatar' },
  { id: 'aura_cosmic_orbit', kind: 'aura', name: 'Quỹ Đạo Hành Tinh', emoji: '🪐', price: 3200, desc: 'Các tinh cầu xoay quanh avatar đẳng cấp vũ trụ' },

  // hiệu ứng vào phòng (7 mẫu)
  { id: 'enter_star', kind: 'entrance', name: 'Sao rơi khi vào phòng', emoji: '🌟', price: 200, desc: 'Vào phòng có sao rơi và câu "X đã xuất hiện"' },
  { id: 'enter_red_carpet', kind: 'entrance', name: 'Trải Thảm Đỏ VIP', emoji: '🟥', price: 350, desc: 'Thảm đỏ hoa hồng đón đại gia vào sảnh' },
  { id: 'enter_supercar', kind: 'entrance', name: 'Lái Siêu Xe Tới Cổng', emoji: '🏎️', price: 600, desc: 'Siêu xe phóng ngang phòng báo hiệu xuất hiện' },
  { id: 'enter_thunder_god', kind: 'entrance', name: 'Lôi Thần Giáng Lâm', emoji: '🌩️', price: 900, desc: 'Chớp sáng cả phòng kèm sấm nổ rền vang' },
  { id: 'enter_fireworks', kind: 'entrance', name: 'Pháo Hoa Rực Rỡ', emoji: '🎆', price: 1200, desc: 'Bắn pháo hoa tung trời mừng chủ nhân tới' },
  { id: 'enter_dragon_descent', kind: 'entrance', name: 'Thần Long Xuất Thế', emoji: '🐉', price: 2500, desc: 'Rồng vàng lượn quanh thông báo uy nghi' },
  { id: 'enter_galaxy_portal', kind: 'entrance', name: 'Cổng Không Gian Vũ Trụ', emoji: '🌀', price: 4500, desc: 'Mở cổng ngân hà tối thượng giữa phòng' },

  // thú cưng bay cạnh avatar (7 mẫu)
  { id: 'pet_shiba', kind: 'pet', name: 'Chó Shiba Ngáo', emoji: '🐕', price: 300, desc: 'Cún Shiba nhún nhảy bên vai' },
  { id: 'pet_cat_boba', kind: 'pet', name: 'Mèo Trà Sữa', emoji: '🐱', price: 350, desc: 'Mèo mướp dễ thương theo sau mọi ván' },
  { id: 'pet_capybara', kind: 'pet', name: 'Bộ Trưởng Capybara', emoji: '🦫', price: 450, desc: 'Chú chuột lang nước thư giãn bất chấp thế sự' },
  { id: 'pet_ghost_cute', kind: 'pet', name: 'Bé Ma Đáng Yêu', emoji: '👻', price: 500, desc: 'Hợp rơ tuyệt đối khi chơi Ma Sói' },
  { id: 'pet_baby_dragon', kind: 'pet', name: 'Tiểu Long Đỏ', emoji: '🐲', price: 1200, desc: 'Rồng con phun lửa hộ mệnh bên vai' },
  { id: 'pet_phoenix_chick', kind: 'pet', name: 'Phượng Hoàng Con', emoji: '🦅', price: 2000, desc: 'Linh điểu lấp lánh ánh vàng' },
  { id: 'pet_ufo_drone', kind: 'pet', name: 'Đĩa Bay Mini', emoji: '🛸', price: 2800, desc: 'UFO tí hon bay tuần tra quanh avatar' },

  // danh hiệu dưới tên (7 mẫu)
  { id: 'title_trum_xom', kind: 'title', name: 'Trùm Xóm', emoji: '🔥', price: 150, desc: 'Huy hiệu "Trùm Xóm" dưới tên' },
  { id: 'title_than_bai', kind: 'title', name: 'Thần Bài', emoji: '🃏', price: 250, desc: 'Huy hiệu "Thần Bài" cho dân Bầu cua/Tỷ phú' },
  { id: 'title_vua_noi_tu', kind: 'title', name: 'Vua Nối Từ', emoji: '📚', price: 300, desc: 'Danh hiệu "Vua Nối Từ"' },
  { id: 'title_tham_tu', kind: 'title', name: 'Thám Tử Tài Ba', emoji: '🕵️', price: 350, desc: 'Danh hiệu "Thám Tử" chuẩn bài Gián điệp' },
  { id: 'title_soi_alpha', kind: 'title', name: 'Sói Đầu Đàn', emoji: '🐺', price: 450, desc: 'Danh hiệu "Sói Alpha" cực ngầu' },
  { id: 'title_phu_hao', kind: 'title', name: 'Phú Hào Đệ Nhất', emoji: '💰', price: 1500, desc: 'Danh hiệu vàng kim đại gia' },
  { id: 'title_chi_ton', kind: 'title', name: 'Chí Tôn Xóm Lầy', emoji: '🌌', price: 5000, desc: 'Danh hiệu tím ngân hà cao quý nhất' },

  // bong bóng chat riêng (6 mẫu)
  { id: 'bubble_sakura', kind: 'chatBubble', name: 'Khung Chat Anh Đào', emoji: '🌸', price: 200, desc: 'Bong bóng chat hồng phấn viền hoa' },
  { id: 'bubble_neon', kind: 'chatBubble', name: 'Khung Chat Neon Tím', emoji: '💜', price: 300, desc: 'Nền tối phát sáng chữ tím rực' },
  { id: 'bubble_cyber', kind: 'chatBubble', name: 'Khung Chat Cyberpunk', emoji: '💠', price: 450, desc: 'Nền công nghệ viền xanh cyan phát sáng' },
  { id: 'bubble_gold_vip', kind: 'chatBubble', name: 'Khung Chat Hoàng Kim', emoji: '👑', price: 800, desc: 'Khung vàng đen sang chảnh quý tộc' },
  { id: 'bubble_dragon_scroll', kind: 'chatBubble', name: 'Chiếu Chỉ Thần Long', emoji: '📜', price: 1500, desc: 'Cuộn thư đỏ vàng uy nghiêm' },
  { id: 'bubble_galaxy', kind: 'chatBubble', name: 'Khung Chat Ngân Hà', emoji: '🌌', price: 2800, desc: 'Nền vũ trụ cực quang chữ phát sáng' },

  // Map phòng Ruby (6 mẫu lấy từ shared/src/themes.ts)
  ...PAID_THEMES.map((t): ShopItem => ({
    id: t.id, kind: 'roomTheme', name: t.name, emoji: t.emoji, price: t.price, desc: t.desc,
  })),

  // sticker
  { id: STICKER_PACK_ID, kind: 'sticker', name: 'Bộ sticker Chữ Lầy', emoji: '🔤', price: 100, desc: '12 sticker chữ to viền đậm' },

  // quà tặng (10 mẫu từ bình dân tới Cung Điện Ngân Hà 5000💎)
  { id: 'gift_rose', kind: 'gift', name: 'Hoa hồng', emoji: '🌹', price: 10 },
  { id: 'gift_cake', kind: 'gift', name: 'Bánh sinh nhật', emoji: '🎂', price: 30 },
  { id: 'gift_diamond_ring', kind: 'gift', name: 'Nhẫn Kim Cương', emoji: '💍', price: 150 },
  { id: 'gift_car', kind: 'gift', name: 'Siêu xe', emoji: '🏎️', price: 200 },
  { id: 'gift_yacht', kind: 'gift', name: 'Du thuyền', emoji: '🛥️', price: 500 },
  { id: 'gift_private_jet', kind: 'gift', name: 'Chuyên Cơ Riêng', emoji: '🛩️', price: 800 },
  { id: 'gift_castle', kind: 'gift', name: 'Lâu đài', emoji: '🏰', price: 1000 },
  { id: 'gift_golden_dragon', kind: 'gift', name: 'Rồng Vàng Phú Quý', emoji: '🐉', price: 2000 },
  { id: 'gift_island', kind: 'gift', name: 'Đảo Thiên Đường', emoji: '🏝️', price: 3500 },
  { id: 'gift_galaxy_palace', kind: 'gift', name: 'Cung Điện Ngân Hà', emoji: '🌌', price: 5000 },
];

const BY_ID = new Map(SHOP_ITEMS.map((i) => [i.id, i]));
export const shopItem = (id: unknown): ShopItem | undefined => (typeof id === 'string' ? BY_ID.get(id) : undefined);
export const itemsOfKind = (kind: ShopKind) => SHOP_ITEMS.filter((i) => i.kind === kind);
/** món mua một lần để sở hữu (trang trí 8 ô + bộ sticker) */
export const isOwnable = (k: ShopKind) =>
  k === 'frame' ||
  k === 'nameFx' ||
  k === 'aura' ||
  k === 'entrance' ||
  k === 'pet' ||
  k === 'title' ||
  k === 'chatBubble' ||
  k === 'roomTheme' ||
  k === 'sticker';
export const skillPrice = (kind: string): number | undefined =>
  (SKILL_IDS as readonly string[]).includes(kind) ? shopItem(kind)?.price : undefined;

/** sticker thuộc bộ Chữ Lầy (cần mua bộ mới gửi được) */
export const isPaidSticker = (id: string) => id.startsWith('chu-');

/** tổng điểm uy tín Đại Gia từ số Ruby đã tiêu và giá trị món đang sở hữu */
export function prestigePoints(rubySpent: number | undefined, owned: readonly string[] | undefined): number {
  const spent = Math.max(0, rubySpent ?? 0);
  let ownedVal = 0;
  if (owned) {
    for (const id of owned) ownedVal += BY_ID.get(id)?.price ?? 0;
  }
  return Math.max(spent, ownedVal);
}

/** thông tin cấp bậc VIP hiện tại theo điểm uy tín */
export function vipOf(points: number): VipTierInfo {
  let best = VIP_TIERS[0];
  for (const t of VIP_TIERS) {
    if (points >= t.minPoints) best = t;
  }
  return best;
}

export function vipByTier(tier: number | undefined): VipTierInfo {
  if (!tier || tier < 0) return VIP_TIERS[0];
  return VIP_TIERS[Math.min(tier, VIP_TIERS.length - 1)] ?? VIP_TIERS[0];
}

// ---------------- điểm danh ----------------

/** thưởng Ruby ngày 1–7 của chuỗi điểm danh */
export const CHECKIN_REWARDS: readonly number[] = [5, 5, 10, 10, 15, 15, 50];

const VN_MS = 7 * 3600_000;
/** ngày theo giờ Việt Nam dạng YYYY-MM-DD */
export function vnDay(ms: number): string {
  return new Date(ms + VN_MS).toISOString().slice(0, 10);
}
/** ngày liền trước (giờ VN) của một ngày YYYY-MM-DD */
export function prevDay(day: string): string {
  return new Date(Date.parse(day + 'T00:00:00Z') - 86_400_000).toISOString().slice(0, 10);
}

export interface CheckinState { lastDay: string; streak: number }
export interface CheckinPlan {
  canClaim: boolean;
  /** số ngày liên tiếp đã nhận tính tới hôm nay (0 nếu chuỗi đã đứt) */
  streak: number;
  /** ngày thứ mấy (1–7) của chuỗi sẽ nhận nếu nhận bây giờ (hoặc ngày mai nếu hôm nay đã nhận) */
  nextDay: number;
  nextReward: number;
  /** chuỗi mới sau khi nhận hôm nay */
  newStreak: number;
}

export function checkinPlan(state: CheckinState | undefined, today: string): CheckinPlan {
  const alive = !!state && (state.lastDay === today || state.lastDay === prevDay(today));
  const streak = alive ? state!.streak : 0;
  const claimed = state?.lastDay === today;
  const newStreak = claimed ? streak : streak + 1;
  const upcoming = claimed ? streak + 1 : newStreak;
  const nextDay = ((upcoming - 1) % 7) + 1;
  return { canClaim: !claimed, streak, nextDay, nextReward: CHECKIN_REWARDS[nextDay - 1], newStreak };
}

// ---------------- lỗi / kết quả ----------------

export type ShopError = 'need_account' | 'bad_request' | 'not_found' | 'insufficient' | 'already_owned' | 'not_owned' | 'already_claimed' | 'rate_limited';
export type ShopAck<T = {}> = (r: ({ ok: true } & T) | { ok: false; error: ShopError }) => void;

export interface ShopInfo { ruby: number; owned: string[]; equipped: Equipped; giftPoints: number; rubySpent?: number; vipTier?: number }
export interface CheckinStatus { canClaim: boolean; streak: number; nextDay: number; nextReward: number; rewards: readonly number[] }
