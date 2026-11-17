/**
 * Cửa hàng Ruby Đại Mở Rộng V2: danh mục vật phẩm "Ố Dề / Lầy Lội / Đại Gia", giá, cấp bậc VIP Phú Hào,
 * kỹ năng trêu ngươi toàn màn hình, hiệu ứng Hologram 7 màu, lượt chọc miễn phí, điểm danh.
 * Dùng chung app + server. Ruby chỉ trang trí & tấu hài, không bao giờ ảnh hưởng thắng thua công bằng.
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

/** kỹ năng chọc trả phí (28 kỹ năng từ lầy lội tới Thần Thoại Ố Dề!) */
export const SKILL_IDS = [
  'lightning', 'freeze', 'cake', 'water', 'dog', 'rocket', 'kiss', 'duck', 'ufo', 'disco', 'money',
  'paparazzi', 'cupid_arrow', 'ghost_scare', 'shark', 'royal_seal', 'meteor', 'blackhole', 'dragon_roar',
  // 9 kỹ năng mới cực lầy & lố lăng V2
  'clown_honk', 'bsod_crash', 'gold_slipper_storm', 'police_siren', 'coffin_meme',
  'ban_hammer', 'rainbow_overload', 'jackpot_rain', 'supreme_judgement',
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
  // 5 siêu quà lầy lội & đại gia V2
  'gift_gold_slipper', 'gift_durian_crate', 'gift_gold_bullion', 'gift_space_fleet', 'gift_omega_throne',
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
  { tier: 1, minPoints: 200, name: 'Đồng Lầy', badge: '🥉', color: '#D97706', glow: 'rgba(217,119,6,0.55)' },
  { tier: 2, minPoints: 600, name: 'Bạc Sành Điệu', badge: '🥈', color: '#38BDF8', glow: 'rgba(56,189,248,0.65)' },
  { tier: 3, minPoints: 1500, name: 'Vàng Quý Tộc', badge: '👑', color: '#FACC15', glow: 'rgba(250,204,21,0.78)' },
  { tier: 4, minPoints: 3500, name: 'Kim Cương Đại Gia', badge: '💎', color: '#22D3EE', glow: 'rgba(34,211,238,0.88)' },
  { tier: 5, minPoints: 7500, name: 'Huyền Thoại Thần Long', badge: '🐉', color: '#FB923C', glow: 'rgba(251,146,60,0.92)' },
  { tier: 6, minPoints: 15000, name: 'Chí Tôn Vũ Trụ', badge: '🌌', color: '#E879F9', glow: 'rgba(232,121,249,0.98)' },
];

export const SHOP_ITEMS: readonly ShopItem[] = [
  // ================= KỸ NĂNG CHỌC TRẢ RUBY (28 MẪU) =================
  { id: 'kiss', kind: 'skill', name: 'Hôn gió', emoji: '😘', price: 5, desc: 'Mưa tim hồng chói lóa, avatar đỏ mặt ngượng ngùng' },
  { id: 'water', kind: 'skill', name: 'Tạt nước', emoji: '💦', price: 8, desc: 'Xối xô nước lạnh ướt nhẹp dọc màn hình đối thủ' },
  { id: 'duck', kind: 'skill', name: 'Đàn vịt đòi nợ', emoji: '🦆', price: 8, desc: 'Đàn vịt vàng kêu cạp cạp chạy loạn đòi nợ' },
  { id: 'money', kind: 'skill', name: 'Đại gia tiền giấy', emoji: '💸', price: 8, desc: 'Rải cọc tiền tung bay ngập màn hình ra vẻ giàu sang' },
  { id: 'lightning', kind: 'skill', name: 'Sét đánh', emoji: '⚡', price: 10, desc: 'Thiên lôi giáng chớp trắng lòa, avatar cháy khét lẹt' },
  { id: 'freeze', kind: 'skill', name: 'Đóng băng', emoji: '🧊', price: 10, desc: 'Băng giá Bắc Cực đóng cứng cả 4 góc màn hình' },
  { id: 'disco', kind: 'skill', name: 'Sàn nhảy bất ổn', emoji: '🪩', price: 10, desc: 'Đèn sàn nhảy 7 màu xoay điên loạn + ép lắc lư' },
  { id: 'dog', kind: 'skill', name: 'Thả chó', emoji: '🐕', price: 12, desc: 'Chó dữ xổ xích lao ngang cắn rách quần đối thủ' },
  { id: 'paparazzi', kind: 'skill', name: 'Chụp lén Paparazzi', emoji: '📸', price: 12, desc: 'Nháy flash mù mắt + cho mặt bạn lên trang nhất báo lá cải!' },
  { id: 'cake', kind: 'skill', name: 'Úp bánh kem', emoji: '🎂', price: 15, desc: 'Úp nguyên ổ bánh kem sặc sỡ bết dính giữa mặt' },
  { id: 'ufo', kind: 'skill', name: 'UFO bắt cóc', emoji: '🛸', price: 15, desc: 'Đĩa bay ngoài hành tinh chiếu tia xanh hút bổng đối thủ' },
  { id: 'cupid_arrow', kind: 'skill', name: 'Mũi tên Ái Tình', emoji: '💘', price: 15, desc: 'Bắn tên hồng xuyên tim + nổ pháo hoa hồng lãng xẹt' },
  { id: 'ghost_scare', kind: 'skill', name: 'Hù ma nửa đêm', emoji: '👻', price: 15, desc: 'Bóng ma nhe răng phóng to đột ngột giữa màn hình!' },
  { id: 'clown_honk', kind: 'skill', name: 'Đội Tóc Giả Chúa Hề', emoji: '🤡', price: 16, desc: 'Phong tước Chúa Hề rạp xiếc kèm bóng bay & kèn bóp inh ỏi!' },
  { id: 'shark', kind: 'skill', name: 'Cá mập cắn mông', emoji: '🦈', price: 18, desc: 'Hàm cá mập trắng rẽ sóng táp sập khung hình' },
  { id: 'rocket', kind: 'skill', name: 'Tên lửa', emoji: '🚀', price: 20, desc: 'Khóa mục tiêu phóng tên lửa hạt nhân nổ tung tóe' },
  { id: 'bsod_crash', kind: 'skill', name: 'Màn Hình Xanh BSOD', emoji: '💻', price: 22, desc: 'Giả lập sập nguồn Windows 0x0000DEAD trêu ngươi cực mạnh!' },
  { id: 'gold_slipper_storm', kind: 'skill', name: 'Bão Dép Tổ Ong 24K', emoji: '🩴', price: 24, desc: 'Liên hoàn 16 chiếc dép tổ ong dát vàng vả tới tấp!' },
  { id: 'police_siren', kind: 'skill', name: 'Còi Cảnh Sát Vây Bắt', emoji: '🚨', price: 25, desc: 'Đèn xanh đỏ chớp toàn màn hình + dán lệnh truy nã tội Lầy!' },
  { id: 'coffin_meme', kind: 'skill', name: 'Điệu Nhảy Khiêng Hòm', emoji: '⚰️', price: 28, desc: 'Rung lắc tưng bừng tiễn đối thủ vào lòng đất cực hài!' },
  { id: 'royal_seal', kind: 'skill', name: 'Ấn Ký Hoàng Gia', emoji: '🏮', price: 30, desc: 'Đóng mộc ngọc tỷ vàng khổng lồ "TRẪM PHÁN: QUÁ GÀ!"' },
  { id: 'meteor', kind: 'skill', name: 'Thiên thạch giáng thế', emoji: '☄️', price: 35, desc: 'Mưa thiên thạch rực lửa dội nát bàn chơi đối phương' },
  { id: 'ban_hammer', kind: 'skill', name: 'Búa Tạ 9999 Tấn', emoji: '🔨', price: 35, desc: 'Giáng búa thần sấm dập bẹp dí màn hình kèm sóng xung kích!' },
  { id: 'blackhole', kind: 'skill', name: 'Hố đen vũ trụ', emoji: '🕳️', price: 40, desc: 'Xoáy hố đen bóp méo không-thời-gian hút sạch ánh sáng' },
  { id: 'rainbow_overload', kind: 'skill', name: 'Cầu Vồng Ố Dề Quá Tải', emoji: '🦄', price: 45, desc: 'Bùng nổ hào quang 7 màu lóa mắt + kỳ lân bay tung tăng!' },
  { id: 'dragon_roar', kind: 'skill', name: 'Rồng Thần Gầm Thét', emoji: '🐉', price: 50, desc: 'Kim Long uốn lượn khắp bầu trời + sấm sét tử kim' },
  { id: 'jackpot_rain', kind: 'skill', name: 'Nổ Hũ Vàng 9999', emoji: '🎰', price: 60, desc: 'Máy xèng 777 quay trúng độc đắc, vàng thoi & kim cương ngập mặt!' },
  { id: 'supreme_judgement', kind: 'skill', name: 'Phán Quyết Thiên Đế', emoji: '🔱', price: 88, desc: 'Pháp trận vạn kiếm hoàng kim giáng thế rung chuyển cả phòng!' },

  // ================= KHUNG AVATAR (26 MẪU TỪ BÌNH DÂN TỚI Ố DỀ ĐẠI ĐẾ) =================
  { id: 'frame_gold', kind: 'frame', name: 'Viền vàng', emoji: '💛', price: 100, desc: 'Viền kim loại vàng ánh gương cổ điển' },
  { id: 'frame_fire', kind: 'frame', name: 'Viền lửa', emoji: '🔥', price: 200, desc: 'Vòng lửa cam đỏ cháy rực quanh chân dung' },
  { id: 'frame_sakura', kind: 'frame', name: 'Viền Hoa Anh Đào', emoji: '🌸', price: 250, desc: 'Viền hồng ngọc trai xoay cùng hoa anh đào' },
  { id: 'frame_rainbow', kind: 'frame', name: 'Viền cầu vồng', emoji: '🌈', price: 300, desc: 'Dải 7 sắc cầu vồng xoay liên hoàn rực rỡ' },
  { id: 'frame_clown_circus', kind: 'frame', name: 'Vòng Xoay Rạp Xiếc', emoji: '🤡', price: 350, desc: 'Sọc đỏ-vàng-xanh nhấp nháy lố lăng chuẩn hiệu Chúa Hề!' },
  { id: 'frame_neon', kind: 'frame', name: 'Viền neon nhấp nháy', emoji: '✨', price: 400, desc: 'Ống đèn neon hồng-lam phát sáng rực trong đêm' },
  { id: 'frame_thunder', kind: 'frame', name: 'Viền Lôi Đình', emoji: '⚡', price: 450, desc: 'Hồ quang điện cao thế giật sáng quanh avatar' },
  { id: 'frame_toxic_slime', kind: 'frame', name: 'Vòng Độc Dược Cốm', emoji: '🧪', price: 480, desc: 'Hào quang axit xanh nõn chuối phát sáng nhức nách!' },
  { id: 'frame_dragon', kind: 'frame', name: 'Viền rồng', emoji: '🐉', price: 500, desc: 'Long lân đỏ vàng uy dũng bao bọc chủ nhân' },
  { id: 'frame_ice_crown', kind: 'frame', name: 'Vương Miện Băng Giá', emoji: '❄️', price: 550, desc: 'Khung băng tinh khiết phản chiếu cực quang xanh' },
  { id: 'frame_disco_strobe', kind: 'frame', name: 'Đèn Sàn Quẩy Đêm', emoji: '🪩', price: 650, desc: 'Chớp 8 màu liên thanh kèm cầu disco treo góc!' },
  { id: 'frame_cyber', kind: 'frame', name: 'Mạch Điện Cyberpunk', emoji: '🤖', price: 700, desc: 'Vòng radar công nghệ 2 lớp cyan-magenta xoay ngược' },
  { id: 'frame_matrix_glitch', kind: 'frame', name: 'Khung Hacker Ma Trận', emoji: '👾', price: 850, desc: 'Viền lục bảo nhấp nháy nhiễu sóng kỹ thuật số' },
  { id: 'frame_phoenix', kind: 'frame', name: 'Phượng Hoàng Lửa', emoji: '🦅', price: 950, desc: 'Đôi cánh lửa mặt trời bùng cháy chói lòa' },
  { id: 'frame_holo_prism', kind: 'frame', name: 'Lăng Kính Hologram SSR', emoji: '💿', price: 1200, desc: 'Phản quang cầu vồng kim cương chuẩn thẻ bài hiếm SSR!' },
  { id: 'frame_gold_bars', kind: 'frame', name: 'Khung Vàng Thoi 9999', emoji: '🪙', price: 1350, desc: 'Đúc nguyên khối từ vàng 9999 lấp lánh giàu sang!' },
  { id: 'frame_galaxy', kind: 'frame', name: 'Vòng Tinh Tú Ngân Hà', emoji: '🌌', price: 1500, desc: 'Xoáy thiên hà tím hồng sâu thẳm đính ngàn vì sao' },
  { id: 'frame_lava_hellfire', kind: 'frame', name: 'Dung Nham Địa Ngục', emoji: '🌋', price: 1800, desc: 'Vòng xoáy magma nóng chảy phát tia lửa dữ dội' },
  { id: 'frame_diamond_grillz', kind: 'frame', name: 'Nạm Full Hột Xoàn', emoji: '💎', price: 2200, desc: 'Đính kín kim cương 10 carat chiếu tia sáng chói mắt!' },
  { id: 'frame_jade_emperor', kind: 'frame', name: 'Ngọc Bội Hoàng Đế', emoji: '👑', price: 2500, desc: 'Ngọc phỉ thúy cung đình viền rồng vàng quyền quý' },
  { id: 'frame_angel_demon', kind: 'frame', name: 'Bán Thần Bán Ma', emoji: '🎭', price: 3200, desc: 'Nửa thánh quang hoàng kim, nửa hắc hỏa ma giới giao tranh!' },
  { id: 'frame_celestial_sword', kind: 'frame', name: 'Vạn Kiếm Quy Tông', emoji: '⚔️', price: 3800, desc: '4 thanh tiên kiếm xoay hộ thể bất khả xâm phạm' },
  { id: 'frame_lotus_buddha', kind: 'frame', name: 'Đài Sen Chín Phẩm', emoji: '🪷', price: 4500, desc: 'Pháp luân sen vàng 9 cánh tỏa hào quang từ bi lộng lẫy' },
  { id: 'frame_super_saiyan', kind: 'frame', name: 'Siêu Chiến Binh Thần Tộc', emoji: '🔥', price: 5200, desc: 'Luồng khí công xanh-vàng bùng nổ rung chuyển khung hình!' },
  { id: 'frame_supreme_god', kind: 'frame', name: 'Hào Quang Chí Tôn', emoji: '⚜️', price: 6000, desc: 'Hai vòng cổ ngữ xoay ngược chiều + vương miện Chí Tôn' },
  { id: 'frame_emperor_omega', kind: 'frame', name: 'Thần Khung Vô Cực Ố Dề', emoji: '🔱', price: 8888, desc: 'Đỉnh cao phú hào: 3 tầng Hologram cầu vồng + 4 vương miện kim cương xoay chói lòa!' },

  // ================= HIỆU ỨNG TÊN (20 MẪU CHỮ ĐỘNG RỰC RỠ) =================
  { id: 'name_rainbow', kind: 'nameFx', name: 'Tên cầu vồng', emoji: '🌈', price: 150, desc: 'Dải cầu vồng 7 sắc chạy mượt ngang tên' },
  { id: 'name_gold_liquid', kind: 'nameFx', name: 'Vàng Ròng Óng Ánh', emoji: '🥇', price: 200, desc: 'Chữ dát vàng lỏng phản chiếu tia sáng kim loại' },
  { id: 'name_sparkle', kind: 'nameFx', name: 'Tên lấp lánh', emoji: '✨', price: 250, desc: 'Hai ngôi sao kim tuyến nhấp nháy 2 đầu tên' },
  { id: 'name_fire_blaze', kind: 'nameFx', name: 'Tên Hỏa Diệm', emoji: '🔥', price: 300, desc: 'Chữ đỏ cam rực cháy tỏa nhiệt hừng hực' },
  { id: 'name_clown_circus', kind: 'nameFx', name: 'Chữ Nhảy Rạp Xiếc', emoji: '🤡', price: 320, desc: 'Chữ sặc sỡ kẹo ngọt lắc lư trêu ngươi cả phòng!' },
  { id: 'name_neon_pulse', kind: 'nameFx', name: 'Tên Neon Cyber', emoji: '💠', price: 350, desc: 'Đèn ống cyan phát quang nhịp thở công nghệ' },
  { id: 'name_ice_crystal', kind: 'nameFx', name: 'Tên Băng Pha Lê', emoji: '🧊', price: 350, desc: 'Sắc lam băng tuyết phản quang trong vắt' },
  { id: 'name_toxic_neon', kind: 'nameFx', name: 'Chữ Phóng Xạ Lục', emoji: '☣️', price: 420, desc: 'Xanh axit phát quang chói lọi trên mọi nền tối!' },
  { id: 'name_blood_moon', kind: 'nameFx', name: 'Tên Huyết Nguyệt', emoji: '🩸', price: 450, desc: 'Đỏ hồng ngọc rực sáng ma mị dưới đêm trăng' },
  { id: 'name_pink_diva', kind: 'nameFx', name: 'Hồng Cánh Sen Ố Dề', emoji: '💅', price: 520, desc: 'Hồng neon pha kim tuyến diêm dúa hết phần thiên hạ!' },
  { id: 'name_matrix_hacker', kind: 'nameFx', name: 'Chữ Ma Trận Nhị Phân', emoji: '💻', price: 600, desc: 'Chữ xanh lục điện tử nhấp nháy kiểu siêu hacker' },
  { id: 'name_galaxy_shimmer', kind: 'nameFx', name: 'Tên Tinh Vân', emoji: '🌌', price: 700, desc: 'Dải màu cực quang ngân hà cuộn chảy liên tục' },
  { id: 'name_disco_fever', kind: 'nameFx', name: 'Chữ Đèn Quẩy 7 Màu', emoji: '🪩', price: 850, desc: 'Đổi màu chớp nhoáng liên hồi như đèn sân khấu!' },
  { id: 'name_lava_core', kind: 'nameFx', name: 'Chữ Nham Thạch Nổ', emoji: '🌋', price: 980, desc: 'Lõi vàng trắng viền lửa magma rực sáng dữ dội' },
  { id: 'name_royal_3d', kind: 'nameFx', name: 'Chữ Nổi Hoàng Kim', emoji: '👑', price: 1200, desc: 'Chữ đúc nổi khối 3D đổ bóng đế vương sang trọng' },
  { id: 'name_holo_prism', kind: 'nameFx', name: 'Chữ Lăng Kính Hologram', emoji: '💿', price: 1600, desc: 'Ánh xà cừ kim cương 7 màu lướt sáng siêu mượt' },
  { id: 'name_diamond_glitter', kind: 'nameFx', name: 'Chữ Nạm Kim Cương', emoji: '💎', price: 2000, desc: 'Trắng bạch kim viền lam ngọc lóe sáng lấp lánh' },
  { id: 'name_divine_glitch', kind: 'nameFx', name: 'Tên Thần Thoại Glitch', emoji: '⚡', price: 2500, desc: 'Nhiễu sóng không gian 3 chiều cyan-magenta VIP 6' },
  { id: 'name_thunder_king', kind: 'nameFx', name: 'Lôi Đế Vạn Kiếp', emoji: '🌩️', price: 3600, desc: 'Chữ điện quang tím-vàng giật chớp uy chấn thiên hạ' },
  { id: 'name_omega_emperor', kind: 'nameFx', name: 'Chân Ngôn Vô Cực Đế', emoji: '🔱', price: 5000, desc: 'Chữ cầu vồng hoàng kim phóng hào quang + rung uy áp tối thượng!' },

  // ================= HÀO QUANG QUANH AVATAR (16 MẪU) =================
  { id: 'aura_glow', kind: 'aura', name: 'Hào quang nhấp nháy', emoji: '💫', price: 300, desc: 'Quầng sáng vàng ấm tỏa ra quanh avatar' },
  { id: 'aura_sakura', kind: 'aura', name: 'Bão Hoa Anh Đào', emoji: '🌸', price: 350, desc: 'Cánh hoa hồng phấn bay vòng tròn dịu dàng' },
  { id: 'aura_fire', kind: 'aura', name: 'Lửa quanh avatar', emoji: '🔥', price: 400, desc: 'Vòng hỏa diệm bốc cao rừng rực khi tới lượt' },
  { id: 'aura_clown_honk', kind: 'aura', name: 'Bóng Bay Chọc Tức', emoji: '🎈', price: 450, desc: 'Bóng bay 7 màu & mặt hề xoay trêu ngươi đối thủ!' },
  { id: 'aura_lightning', kind: 'aura', name: 'Lôi Trường Tím', emoji: '⚡', price: 500, desc: 'Điện từ trường xanh tím nổ lách tách liên hồi' },
  { id: 'aura_butterfly', kind: 'aura', name: 'Bướm Tiên Bay Lượn', emoji: '🦋', price: 600, desc: 'Đàn hồ điệp phát sáng dập dờn quanh vai' },
  { id: 'aura_disco_ball', kind: 'aura', name: 'Hào Quang Sàn Quẩy', emoji: '🪩', price: 700, desc: 'Tia laser vũ trường xoay 360 độ chói lọi' },
  { id: 'aura_gold_coins', kind: 'aura', name: 'Mưa Tiền Tài Lộc', emoji: '🪙', price: 800, desc: 'Đồng kim nguyên bảo bay vòng quanh phát lộc' },
  { id: 'aura_dark_wolf', kind: 'aura', name: 'Khí Chất Sói Đêm', emoji: '🐺', price: 900, desc: 'Sương đêm huyền bí & trăng khuyết ma mị' },
  { id: 'aura_matrix_ring', kind: 'aura', name: 'Vòng Lặp Ma Trận', emoji: '👾', price: 1100, desc: 'Vòng mã lệnh xanh lục quay tít kiểu siêu AI' },
  { id: 'aura_rainbow_halo', kind: 'aura', name: 'Thánh Quang 7 Sắc', emoji: '🌈', price: 1350, desc: 'Đĩa cầu vồng lăng kính phát sáng rực rỡ gấp bội!' },
  { id: 'aura_holy_wings', kind: 'aura', name: 'Đôi Cánh Thiên Thần', emoji: '🪽', price: 1600, desc: 'Đôi cánh quang minh vỗ nhịp hai bên chân dung' },
  { id: 'aura_lava_eruption', kind: 'aura', name: 'Núi Lửa Phun Trào', emoji: '🌋', price: 2100, desc: 'Quầng lửa đỏ rực kèm sao hỏa tinh văng tung tóe' },
  { id: 'aura_diamond_storm', kind: 'aura', name: 'Bão Bụi Kim Cương', emoji: '💎', price: 2600, desc: 'Viên kim cương lớn quay quanh tỏa sương lấp lánh' },
  { id: 'aura_cosmic_orbit', kind: 'aura', name: 'Quỹ Đạo Hành Tinh', emoji: '🪐', price: 3200, desc: 'Hệ ngân hà thu nhỏ quay quanh bạn như trung tâm vũ trụ' },
  { id: 'aura_omega_divine', kind: 'aura', name: 'Thần Vực Cửu Thiên', emoji: '🔱', price: 5800, desc: 'Pháp luân đa tầng khổng lồ phát hào quang 7 màu lấn át cả bàn chơi!' },

  // ================= HIỆU ỨNG VÀO PHÒNG (12 MẪU XUẤT HIỆN CHẤN ĐỘNG) =================
  { id: 'enter_star', kind: 'entrance', name: 'Sao rơi khi vào phòng', emoji: '🌟', price: 200, desc: 'Mưa sao vàng lấp lánh báo hiệu bạn xuất hiện' },
  { id: 'enter_red_carpet', kind: 'entrance', name: 'Trải Thảm Đỏ VIP', emoji: '🟥', price: 350, desc: 'Thảm đỏ ngôi sao Hollywood đón chào minh tinh' },
  { id: 'enter_clown_parade', kind: 'entrance', name: ' Đoàn Xiếc Đổ Bộ', emoji: '🎪', price: 480, desc: 'Kèn trống inh ỏi rước Vua Hề tiến vào phòng chơi!' },
  { id: 'enter_supercar', kind: 'entrance', name: 'Lái Siêu Xe Tới Cổng', emoji: '🏎️', price: 600, desc: 'Siêu xe nẹt pô khét lẹt lướt ngang màn hình' },
  { id: 'enter_thunder_god', kind: 'entrance', name: 'Lôi Thần Giáng Lâm', emoji: '🌩️', price: 900, desc: 'Sấm rền chớp giật mở đường cho bậc cao thủ' },
  { id: 'enter_helicopter_vip', kind: 'entrance', name: 'Đáp Trực Thăng Riêng', emoji: '🚁', price: 1050, desc: 'Chủ tịch đáp trực thăng vàng rải tiền từ nóc phòng!' },
  { id: 'enter_fireworks', kind: 'entrance', name: 'Pháo Hoa Rực Rỡ', emoji: '🎆', price: 1200, desc: 'Đại tiệc pháo hoa đa sắc nổ vang chào mừng' },
  { id: 'enter_rainbow_unicorn', kind: 'entrance', name: 'Cưỡi Kỳ Lân Cầu Vồng', emoji: '🦄', price: 1800, desc: 'Kỳ lân 7 màu phóng vệt cầu vồng lố lăng ngang bầu trời!' },
  { id: 'enter_dragon_descent', kind: 'entrance', name: 'Thần Long Xuất Thế', emoji: '🐉', price: 2500, desc: 'Chân long vạn trượng gầm vang hộ tống chủ nhân' },
  { id: 'enter_gold_throne', kind: 'entrance', name: 'Kiệu Vàng Tám Người Khiêng', emoji: '👑', price: 3500, desc: 'Ngai vàng chói lọi rải kim cương khắp lối vào!' },
  { id: 'enter_galaxy_portal', kind: 'entrance', name: 'Cổng Không Gian Vũ Trụ', emoji: '🌀', price: 4500, desc: 'Xé toạc chiều không gian ngân hà bước ra giữa sảnh' },
  { id: 'enter_emperor_decree', kind: 'entrance', name: 'Thánh Chỉ Thiên Đế Lâm Triều', emoji: '🔱', price: 6800, desc: 'Màn hình rực vàng + chiêng trống cung đình bắt cả phòng ngước nhìn!' },

  // ================= THÚ CƯNG BAY CẠNH AVATAR (14 MẪU) =================
  { id: 'pet_shiba', kind: 'pet', name: 'Chó Shiba Ngáo', emoji: '🐕', price: 300, desc: 'Cún Shiba cười đểu nhún nhảy bên vai' },
  { id: 'pet_cat_boba', kind: 'pet', name: 'Mèo Trà Sữa', emoji: '🐱', price: 350, desc: 'Hoàng thượng mèo tròn ủm bám vai trung thành' },
  { id: 'pet_frog_king', kind: 'pet', name: 'Hoàng Tử Ếch Phồng Má', emoji: '🐸', price: 400, desc: 'Chú ếch xanh đội vương miện chuẩn bài Đầm Lầy!' },
  { id: 'pet_capybara', kind: 'pet', name: 'Bộ Trưởng Capybara', emoji: '🦫', price: 450, desc: 'Capybara đội quýt điềm tĩnh mặc kệ đời xô đẩy' },
  { id: 'pet_ghost_cute', kind: 'pet', name: 'Bé Ma Đáng Yêu', emoji: '👻', price: 500, desc: 'Linh hồn nhỏ lơ lửng trêu đùa đối phương' },
  { id: 'pet_duck_menace', kind: 'pet', name: 'Vịt Vàng Hổ Báo', emoji: '🦆', price: 580, desc: 'Vịt mặt ngầu lăm le đòi nợ xu cả phòng!' },
  { id: 'pet_clown_dog', kind: 'pet', name: 'Khỉ Con Rạp Xiếc', emoji: '🐵', price: 650, desc: 'Khỉ lém lỉnh nhào lộn chọc tức người ngồi cạnh' },
  { id: 'pet_golden_pig', kind: 'pet', name: 'Heo Đất Kim Tài', emoji: '🐷', price: 900, desc: 'Heo vàng phát lộc vẫy tai gọi tiền đầy túi' },
  { id: 'pet_baby_dragon', kind: 'pet', name: 'Tiểu Long Đỏ', emoji: '🐲', price: 1200, desc: 'Rồng con phun lửa hồng bảo vệ chủ nhân' },
  { id: 'pet_unicorn_bling', kind: 'pet', name: 'Kỳ Lân Hồng Lấp Lánh', emoji: '🦄', price: 1600, desc: 'Kỳ lân bờm cầu vồng tỏa bụi sao diêm dúa!' },
  { id: 'pet_phoenix_chick', kind: 'pet', name: 'Phượng Hoàng Con', emoji: '🦅', price: 2000, desc: 'Thần điểu ánh kim vỗ cánh rực sáng' },
  { id: 'pet_cyber_skull', kind: 'pet', name: 'Đầu Lâu Neon Hacker', emoji: '💀', price: 2400, desc: 'Hộp sọ hologram xoay lơ lửng cực chiến' },
  { id: 'pet_ufo_drone', kind: 'pet', name: 'Đĩa Bay Mini', emoji: '🛸', price: 2800, desc: 'Phi thuyền mini phát tia laser bảo vệ VIP' },
  { id: 'pet_celestial_qilin', kind: 'pet', name: 'Thần Thú Kỳ Lân Vàng', emoji: '🦁', price: 4800, desc: 'Thụy thú hoàng kim đạp mây ngũ sắc hộ giá Đại Đế!' },

  // ================= DANH HIỆU DƯỚI TÊN (16 MẪU CỰC LẦY & SANG CHẢNH) =================
  { id: 'title_trum_xom', kind: 'title', name: 'Trùm Xóm', emoji: '🔥', price: 150, desc: 'Huy hiệu "Trùm Xóm" đỏ rực dưới tên' },
  { id: 'title_chua_he', kind: 'title', name: 'Chúa Hề Vũ Trụ', emoji: '🤡', price: 220, desc: 'Danh hiệu tự hào cho cây hài số 1 của phòng!' },
  { id: 'title_than_bai', kind: 'title', name: 'Thần Bài', emoji: '🃏', price: 250, desc: 'Huy hiệu "Thần Bài" bách chiến bách thắng' },
  { id: 'title_vua_noi_tu', kind: 'title', name: 'Vua Nối Từ', emoji: '📚', price: 300, desc: 'Cuốn từ điển sống không ngán bất kỳ âm khó nào' },
  { id: 'title_tham_tu', kind: 'title', name: 'Thám Tử Tài Ba', emoji: '🕵️', price: 350, desc: 'Đôi mắt cú vọ nhìn thấu mọi Gián Điệp' },
  { id: 'title_senior_bug', kind: 'title', name: 'Chuyên Gia Đẻ Bug', emoji: '🐛', price: 400, desc: 'Danh hiệu chuẩn dân IT: code 1 dòng sinh 10 bug!' },
  { id: 'title_soi_alpha', kind: 'title', name: 'Sói Đầu Đàn', emoji: '🐺', price: 450, desc: 'Thủ lĩnh bóng đêm thao túng cả ngôi làng' },
  { id: 'title_vua_bip', kind: 'title', name: 'Ông Hoàng Đòn Gió', emoji: '🎭', price: 550, desc: 'Đạn giả dọa như đạn thật làm cả bàn khiếp vía!' },
  { id: 'title_o_de', kind: 'title', name: 'Nữ Hoàng Ố Dề', emoji: '💅', price: 680, desc: 'Hồng chói lóa viền kim tuyến lố lăng bậc nhất!' },
  { id: 'title_thanh_lat_keo', kind: 'title', name: 'Thánh Lật Kèo', emoji: '⚡', price: 800, desc: 'Còn thở là còn gỡ, phút 90 lật bàn ngoạn mục!' },
  { id: 'title_bo_doi', kind: 'title', name: 'Bố Đời Xóm Lầy', emoji: '😎', price: 1100, desc: 'Bảng vàng kim ngạo nghễ bước vào ai cũng nể!' },
  { id: 'title_phu_hao', kind: 'title', name: 'Phú Hào Đệ Nhất', emoji: '💰', price: 1500, desc: 'Danh hiệu nhà tài phiệt tiêu Ruby không cần nhìn giá' },
  { id: 'title_trum_mafia', kind: 'title', name: 'Bố Già Giang Hồ', emoji: '🎩', price: 2200, desc: 'Quyền lực tối cao trên bàn Chia Chác & Tỷ Phú' },
  { id: 'title_dai_gia_ngam', kind: 'title', name: 'Chủ Tịch Giả Nghèo', emoji: '💎', price: 3200, desc: 'Khung bạch kim phát sáng ngầm khẳng định túi tiền sâu không đáy!' },
  { id: 'title_chi_ton', kind: 'title', name: 'Chí Tôn Xóm Lầy', emoji: '🌌', price: 5000, desc: 'Danh hiệu tím ngân hà cao quý lấp lánh ánh sao' },
  { id: 'title_thien_de', kind: 'title', name: 'Thiên Đế Độc Tôn', emoji: '🔱', price: 8888, desc: 'Danh hiệu Hologram 7 màu viền rồng vàng tối thượng nhất máy chủ!' },

  // ================= BONG BÓNG CHAT RIÊNG (12 MẪU NỔI BẬT TRONG KHUNG CHAT) =================
  { id: 'bubble_sakura', kind: 'chatBubble', name: 'Khung Chat Anh Đào', emoji: '🌸', price: 200, desc: 'Bong bóng hồng phấn dịu ngọt viền cánh đào' },
  { id: 'bubble_neon', kind: 'chatBubble', name: 'Khung Chat Neon Tím', emoji: '💜', price: 300, desc: 'Nền đêm phát quang viền tím điện tử nổi bật' },
  { id: 'bubble_clown_circus', kind: 'chatBubble', name: 'Khung Chat Rạp Xiếc', emoji: '🤡', price: 380, desc: 'Viền sọc kẹo ngọt sặc sỡ nhìn là thấy mùi tấu hài!' },
  { id: 'bubble_cyber', kind: 'chatBubble', name: 'Khung Chat Cyberpunk', emoji: '💠', price: 450, desc: 'Giao diện HUD xanh băng viền tia điện sáng rực' },
  { id: 'bubble_comic_boom', kind: 'chatBubble', name: 'Khung Chat Nổ Bùm!', emoji: '💥', price: 550, desc: 'Nền vàng cam Pop-Art viền gai truyện tranh cực gắt!' },
  { id: 'bubble_matrix_code', kind: 'chatBubble', name: 'Terminal Siêu Hacker', emoji: '💻', price: 680, desc: 'Khung dòng lệnh đen-lục chất lừ cho dân lập trình' },
  { id: 'bubble_gold_vip', kind: 'chatBubble', name: 'Khung Chat Hoàng Kim', emoji: '👑', price: 800, desc: 'Nền đen nhung viền vàng 24K sang trọng quý tộc' },
  { id: 'bubble_holo_prism', kind: 'chatBubble', name: 'Khung Chat Hologram 7 Màu', emoji: '💿', price: 1200, desc: ' Nền xà cừ cầu vồng chuyển sắc lấp lánh mỗi tin nhắn!' },
  { id: 'bubble_dragon_scroll', kind: 'chatBubble', name: 'Chiếu Chỉ Thần Long', emoji: '📜', price: 1500, desc: 'Cuộn thánh chỉ đỏ thẫm nạm rồng vàng uy nghiêm' },
  { id: 'bubble_diamond_royal', kind: 'chatBubble', name: 'Khung Chat Full Kim Cương', emoji: '💎', price: 2100, desc: 'Băng lam pha lê phản chiếu ánh hột xoàn lóa mắt' },
  { id: 'bubble_galaxy', kind: 'chatBubble', name: 'Khung Chat Ngân Hà', emoji: '🌌', price: 2800, desc: 'Nền tinh vân cực quang tím hồng phát sáng huyền ảo' },
  { id: 'bubble_emperor_jade', kind: 'chatBubble', name: 'Ngọc Tỷ Vô Cực Đế', emoji: '🔱', price: 4800, desc: 'Khung chat Chí Tôn đa sắc vàng-tím-lam khiến mọi câu nói đều thành chân lý!' },

  // ================= MAP PHÒNG RUBY (10 MẪU LẤY TỪ shared/src/themes.ts) =================
  ...PAID_THEMES.map((t): ShopItem => ({
    id: t.id, kind: 'roomTheme', name: t.name, emoji: t.emoji, price: t.price, desc: t.desc,
  })),

  // ================= BỘ STICKER =================
  { id: STICKER_PACK_ID, kind: 'sticker', name: 'Bộ sticker Chữ Lầy', emoji: '🔤', price: 100, desc: '12 sticker chữ to viền đậm cà khịa cực mạnh' },

  // ================= QUÀ TẶNG ĐẠI GIA (15 MẪU TỚI 10.000 💎) =================
  { id: 'gift_rose', kind: 'gift', name: 'Hoa hồng', emoji: '🌹', price: 10, desc: 'Tặng nhành hồng đỏ thắm làm quen' },
  { id: 'gift_cake', kind: 'gift', name: 'Bánh sinh nhật', emoji: '🎂', price: 30, desc: 'Bánh kem ngọt ngào mừng chiến thắng' },
  { id: 'gift_gold_slipper', kind: 'gift', name: 'Đôi Dép Tổ Ong Mạ Vàng', emoji: '🩴', price: 68, desc: 'Món quà huyền thoại vừa sang vừa lầy tặng tri kỷ!' },
  { id: 'gift_diamond_ring', kind: 'gift', name: 'Nhẫn Kim Cương', emoji: '💍', price: 150, desc: 'Nhẫn hột xoàn lấp lánh cầu hôn ngay tại bàn' },
  { id: 'gift_car', kind: 'gift', name: 'Siêu xe', emoji: '🏎️', price: 200, desc: 'Siêu xe thể thao gầm rú chạy ngang sân khấu' },
  { id: 'gift_durian_crate', kind: 'gift', name: 'Xe Tải Sầu Riêng Ri6', emoji: '🍈', price: 350, desc: 'Chở nguyên xe sầu riêng thơm nức mũi tặng bạn hiền!' },
  { id: 'gift_yacht', kind: 'gift', name: 'Du thuyền', emoji: '🛥️', price: 500, desc: 'Du thuyền 5 sao rẽ sóng biển xanh' },
  { id: 'gift_private_jet', kind: 'gift', name: 'Chuyên Cơ Riêng', emoji: '🛩️', price: 800, desc: 'Chuyên cơ phản lực kéo băng rôn tên người nhận' },
  { id: 'gift_castle', kind: 'gift', name: 'Lâu đài', emoji: '🏰', price: 1000, desc: 'Tòa lâu đài cổ tích nguy nga tráng lệ' },
  { id: 'gift_gold_bullion', kind: 'gift', name: 'Kho Vàng 9999 SJC', emoji: '🪙', price: 1500, desc: 'Đổ nguyên núi vàng thoi 9999 ngập tràn màn hình!' },
  { id: 'gift_golden_dragon', kind: 'gift', name: 'Rồng Vàng Phú Quý', emoji: '🐉', price: 2000, desc: 'Thần Long nhả ngọc chúc phúc cả phòng' },
  { id: 'gift_island', kind: 'gift', name: 'Đảo Thiên Đường', emoji: '🏝️', price: 3500, desc: 'Mua đứt hòn đảo nhiệt đới sang tên cho bạn' },
  { id: 'gift_galaxy_palace', kind: 'gift', name: 'Cung Điện Ngân Hà', emoji: '🌌', price: 5000, desc: 'Cung điện giữa dải ngân hà kèm mưa pháo hoa vũ trụ' },
  { id: 'gift_space_fleet', kind: 'gift', name: 'Hạm Đội Chiến Hạm Sao', emoji: '🚀', price: 7500, desc: 'Hạm đội phi thuyền xuyên không bắn pháo sáng rợp trời!' },
  { id: 'gift_omega_throne', kind: 'gift', name: 'Ngai Vàng Vô Cực Đế Chế', emoji: '👑', price: 10000, desc: 'Siêu quà tối thượng 10.000💎: Hiệu ứng Hoàng Đế Đăng Cơ phủ kín 100% màn hình!' },
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
  streak: number;
  nextDay: number;
  nextReward: number;
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
