/**
 * Cửa hàng Ruby: danh mục vật phẩm, giá, lượt chọc miễn phí, điểm danh. Dùng chung app + server.
 * Giá và danh sách sửa ở đây là đổi cho cả hai phía. Ruby không bao giờ ảnh hưởng thắng thua.
 */

export type ShopKind = 'skill' | 'frame' | 'nameFx' | 'aura' | 'entrance' | 'sticker' | 'gift';

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

/** kỹ năng chọc trả phí (kind của FunSend) */
export const SKILL_IDS = ['lightning', 'freeze', 'cake', 'water', 'dog', 'rocket', 'kiss', 'duck', 'ufo', 'disco', 'money'] as const;
export type SkillId = (typeof SKILL_IDS)[number];

/** các ô trang trí; mỗi ô trang bị một món */
export const COSMETIC_SLOTS = ['frame', 'nameFx', 'aura', 'entrance'] as const;
export type CosmeticSlot = (typeof COSMETIC_SLOTS)[number];
export type Equipped = Partial<Record<CosmeticSlot, string>>;
/** phần trang trí hiện cho người khác trong phòng (hiệu ứng vào phòng chỉ phát một lần nên không nằm đây) */
export type PlayerCosmetics = { frame?: string; nameFx?: string; aura?: string };

export const GIFT_IDS = ['gift_rose', 'gift_cake', 'gift_car', 'gift_yacht', 'gift_castle'] as const;
export type GiftId = (typeof GIFT_IDS)[number];

export const STICKER_PACK_ID = 'pack_chu_lay';

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
  // khung avatar
  { id: 'frame_gold', kind: 'frame', name: 'Viền vàng', emoji: '💛', price: 100 },
  { id: 'frame_fire', kind: 'frame', name: 'Viền lửa', emoji: '🔥', price: 200 },
  { id: 'frame_rainbow', kind: 'frame', name: 'Viền cầu vồng', emoji: '🌈', price: 300 },
  { id: 'frame_neon', kind: 'frame', name: 'Viền neon nhấp nháy', emoji: '✨', price: 400 },
  { id: 'frame_dragon', kind: 'frame', name: 'Viền rồng', emoji: '🐉', price: 500 },
  // hiệu ứng tên
  { id: 'name_rainbow', kind: 'nameFx', name: 'Tên cầu vồng', emoji: '🌈', price: 150 },
  { id: 'name_sparkle', kind: 'nameFx', name: 'Tên lấp lánh', emoji: '✨', price: 250 },
  // hào quang
  { id: 'aura_glow', kind: 'aura', name: 'Hào quang nhấp nháy', emoji: '💫', price: 300, desc: 'Sáng lên khi tới lượt' },
  { id: 'aura_fire', kind: 'aura', name: 'Lửa quanh avatar', emoji: '🔥', price: 400, desc: 'Bốc lửa khi tới lượt' },
  // vào phòng
  { id: 'enter_star', kind: 'entrance', name: 'Sao rơi khi vào phòng', emoji: '🌟', price: 200, desc: 'Vào phòng có sao rơi và câu "X đã xuất hiện"' },
  // sticker
  { id: STICKER_PACK_ID, kind: 'sticker', name: 'Bộ sticker Chữ Lầy', emoji: '🔤', price: 100, desc: '12 sticker chữ to viền đậm' },
  // quà
  { id: 'gift_rose', kind: 'gift', name: 'Hoa hồng', emoji: '🌹', price: 10 },
  { id: 'gift_cake', kind: 'gift', name: 'Bánh sinh nhật', emoji: '🎂', price: 30 },
  { id: 'gift_car', kind: 'gift', name: 'Siêu xe', emoji: '🏎️', price: 200 },
  { id: 'gift_yacht', kind: 'gift', name: 'Du thuyền', emoji: '🛥️', price: 500 },
  { id: 'gift_castle', kind: 'gift', name: 'Lâu đài', emoji: '🏰', price: 1000 },
];

const BY_ID = new Map(SHOP_ITEMS.map((i) => [i.id, i]));
export const shopItem = (id: unknown): ShopItem | undefined => (typeof id === 'string' ? BY_ID.get(id) : undefined);
export const itemsOfKind = (kind: ShopKind) => SHOP_ITEMS.filter((i) => i.kind === kind);
/** món mua một lần để sở hữu (trang trí + bộ sticker) */
export const isOwnable = (k: ShopKind) => k === 'frame' || k === 'nameFx' || k === 'aura' || k === 'entrance' || k === 'sticker';
export const skillPrice = (kind: string): number | undefined =>
  (SKILL_IDS as readonly string[]).includes(kind) ? shopItem(kind)?.price : undefined;

/** sticker thuộc bộ Chữ Lầy (cần mua bộ mới gửi được) */
export const isPaidSticker = (id: string) => id.startsWith('chu-');

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

export interface ShopInfo { ruby: number; owned: string[]; equipped: Equipped; giftPoints: number }
export interface CheckinStatus { canClaim: boolean; streak: number; nextDay: number; nextReward: number; rewards: readonly number[] }
