/**
 * Kiểu dữ liệu, hằng số & hàm hỗ trợ dùng chung cho game "Sàn Diễn Xóm Lầy" (`thoitrang`, 2–12 người).
 * Thiết kế v5 (6 dáng người, 14 biểu cảm, hàng ngàn trang phục thế giới & Xóm Lầy, 32 hoạ tiết, 11 dáng sàn diễn).
 * Thuần TypeScript (không phụ thuộc Three.js hay Node).
 */

export const THOI_TRANG_DECK = 'thoitrang_themes';

export const THOI_TRANG_PRIMARY_TAGS = [
  'da_hoi', 'duong_pho', 'cong_so', 'the_thao', 'co_trang',
  'ky_ao', 'kinh_di', 'mua_he', 'mua_dong', 'de_thuong',
  'lay_loi', 'hoang_gia', 'cuoi_hoi', 'hai_tac', 'scifi',
] as const;

export const THOI_TRANG_EXTRA_TAGS = [
  'van_hoa_vn', 'hoc_duong', 'am_nhac', 'bi_an', 'ngot_ngao',
  'ca_tinh', 'sang_chanh', 'bien_dao', 'dong_vat', 'tinh_yeu',
  'hanh_dong', 'retro', 'toi_gian',
] as const;

export const THOI_TRANG_ALL_TAGS = [
  ...THOI_TRANG_PRIMARY_TAGS,
  ...THOI_TRANG_EXTRA_TAGS,
] as const;

export type ThoiTrangPrimaryTag = (typeof THOI_TRANG_PRIMARY_TAGS)[number];
export type ThoiTrangTag = (typeof THOI_TRANG_ALL_TAGS)[number];

export const THOI_TRANG_THEME_GROUP_IDS = [
  'viet_nam', 'lay_loi', 'da_tiec', 'duong_pho',
  'cong_so', 'co_trang', 'ky_ao', 'kinh_di',
  'scifi', 'mua_he', 'mua_dong', 'am_nhac',
  'hoc_duong', 'cuoi_hoi', 'phieu_luu', 'thu_thach',
] as const;

export type ThoiTrangThemeGroupId = (typeof THOI_TRANG_THEME_GROUP_IDS)[number];
export type ThoiTrangThemeGroupSetting = 'random' | ThoiTrangThemeGroupId;

export interface ThoiTrangThemeGroupMeta {
  id: ThoiTrangThemeGroupId;
  name: string;
  emoji: string;
}

// ================= Đồng hồ & Cấu hình =================

export const THOI_TRANG_DRESS_OPTIONS = [120, 180, 240, 300, 420] as const;
export type ThoiTrangDressSec = (typeof THOI_TRANG_DRESS_OPTIONS)[number];
export const THOI_TRANG_DEFAULT_DRESS_SEC: ThoiTrangDressSec = 240;

export const THOI_TRANG_THEME_REVEAL_SEC = 6;
export const THOI_TRANG_READY_SHORTEN_SEC = 5;
export const THOI_TRANG_RUNWAY_SMALL_SEC = 18;
export const THOI_TRANG_RUNWAY_LARGE_SEC = 14;
export const THOI_TRANG_RUNWAY_MIN_ELAPSED_SEC = 7;
export const THOI_TRANG_RUNWAY_EARLY_SEC = 2;
export const THOI_TRANG_REVEAL_SEC = 15;

export const THOI_TRANG_POSE_COOLDOWN_MS = 700;
export const THOI_TRANG_CHEER_COOLDOWN_MS = 1200;
export const THOI_TRANG_OUTFIT_COALESCE_MS = 500;

export const THOI_TRANG_MIN_HALF_STARS = 2; // 1.0★
export const THOI_TRANG_MAX_HALF_STARS = 10; // 5.0★

// ================= Biểu cảm & Khuôn mặt =================

export type ThoiTrangBodyType =
  | 'nu_manh' | 'nu_day' | 'nam_thu_sinh' | 'nam_vam_vo' | 'chibi' | 'cao_mau';

export type ThoiTrangEyeShape =
  | 'round' | 'almond' | 'cat' | 'smiling' | 'sleepy'
  | 'sparkle' | 'cool' | 'doe' | 'upturned' | 'gentle';

export type ThoiTrangBrowShape =
  | 'arched' | 'straight' | 'thick' | 'thin' | 'sharp' | 'soft' | 'short' | 'slit';

export type ThoiTrangMouthShape =
  | 'smile' | 'big_smile' | 'cat_mouth' | 'pout' | 'plump'
  | 'smirk' | 'neutral' | 'open_happy' | 'tiny_o' | 'heart_lip';

export type ThoiTrangNoseShape = 'button' | 'slim' | 'cute_dot' | 'sharp' | 'none';
export type ThoiTrangBlushStyle = 'soft' | 'none' | 'drunk' | 'peach' | 'anime' | 'heart';
export type ThoiTrangEyelinerStyle = 'none' | 'classic' | 'wing' | 'bold';
export type ThoiTrangEyeshadowStyle = 'none' | 'soft' | 'smoky' | 'glitter';
export type ThoiTrangBeautyMarkStyle = 'none' | 'under_eye' | 'cheek' | 'lip';
export type ThoiTrangBeardStyle =
  | 'none' | 'stubble' | 'moustache' | 'goatee' | 'full_beard' | 'handlebar';

export type ThoiTrangExpressionId =
  | 'neutral' | 'happy' | 'grin' | 'wink' | 'surprised' | 'angry' | 'sad'
  | 'cry' | 'blep' | 'kiss' | 'cool' | 'shy' | 'dizzy' | 'confident';

// ================= Tạo dáng & Cổ vũ =================

export const THOI_TRANG_POSES = [
  'idle', 'catwalk', 'finale', 'blow_kiss', 'flex', 'selfie',
  'trip', 'dance', 'wave', 'superhero', 'shy_pose', 'dramatic',
] as const;
export type ThoiTrangPoseId = (typeof THOI_TRANG_POSES)[number];

/** 11 nút tạo dáng trên sàn diễn (không có `idle` đứng im và không có `spin`). */
export const THOI_TRANG_RUNWAY_POSES: readonly ThoiTrangPoseId[] = [
  'catwalk', 'finale', 'blow_kiss', 'flex', 'selfie',
  'trip', 'dance', 'wave', 'superhero', 'shy_pose', 'dramatic',
];

export const THOI_TRANG_POSE_LABELS: Record<ThoiTrangPoseId, string> = {
  idle: 'Đứng dáng',
  catwalk: 'Catwalk',
  finale: 'Chốt dáng',
  blow_kiss: 'Hôn gió',
  flex: 'Gồng cơ',
  selfie: 'Selfie lầy',
  trip: 'Vấp té',
  dance: 'Nhảy',
  wave: 'Vẫy tay',
  superhero: 'Siêu anh hùng',
  shy_pose: 'Ngại ngùng',
  dramatic: 'Kịch tính',
};

export const THOI_TRANG_POSE_EMOJIS: Record<ThoiTrangPoseId, string> = {
  idle: '🧍',
  catwalk: '👠',
  finale: '✨',
  blow_kiss: '💋',
  flex: '💪',
  selfie: '🤳',
  trip: '🌀',
  dance: '💃',
  wave: '👋',
  superhero: '🦸',
  shy_pose: '🙈',
  dramatic: '😱',
};

export const THOI_TRANG_POSE_EXPRESSIONS: Record<ThoiTrangPoseId, ThoiTrangExpressionId | null> = {
  idle: null,
  catwalk: 'confident',
  finale: 'wink',
  blow_kiss: 'kiss',
  flex: 'confident',
  selfie: 'blep',
  trip: 'dizzy',
  dance: 'grin',
  wave: 'happy',
  superhero: 'cool',
  shy_pose: 'shy',
  dramatic: 'surprised',
};

export const THOI_TRANG_CHEERS = ['🔥', '👏', '😍', '💅', '😂', '👑'] as const;
export type ThoiTrangCheerId = (typeof THOI_TRANG_CHEERS)[number];

// ================= Trang phục & Danh mục =================

export type ThoiTrangHairTwoTone = 'none' | 'tips' | 'streaks';

export type ThoiTrangPatternId =
  | 'plain' | 'stripe' | 'pinstripe' | 'dots' | 'check' | 'tartan' | 'houndstooth'
  | 'heart' | 'flower' | 'stars' | 'leopard' | 'zebra' | 'camo' | 'ombre' | 'sequin'
  | 'argyle' | 'chevron' | 'paisley' | 'tie_dye' | 'denim' | 'lace' | 'brocade'
  | 'tho_cam' | 'dragon_scale' | 'cow' | 'tiger' | 'rainbow' | 'galaxy' | 'flame'
  | 'lightning' | 'cyber_grid' | 'chan_con_cong';

export type ThoiTrangPrimarySlotId =
  | 'top' | 'outer' | 'bottom' | 'dress' | 'shoes' | 'hat' | 'glasses';

export type ThoiTrangCategoryId = 'hair' | ThoiTrangPrimarySlotId | 'acc';

export type ThoiTrangWardrobeTab = 'body' | 'face' | ThoiTrangCategoryId;

export type ThoiTrangAccSubSlot =
  | 'handR' | 'hipBag' | 'back' | 'neck' | 'ears' | 'head' | 'tail' | 'handL' | 'chestProp' | 'waist' | 'wrists';

/** Đặc tả 3D tham số hóa cho phép sinh hàng ngàn biến thể hình khối, viền, cổ, họa tiết & in chữ meme trên 3D thật. */
export interface ThoiTrangVisualSpec {
  base: string;
  fit?: 'tight' | 'regular' | 'oversize' | 'crop' | 'long' | 'giant';
  sleeve?: 'none' | 'short' | 'mid' | 'long' | 'puff' | 'bell';
  collar?: 'none' | 'turtle' | 'sailor' | 'ruffle' | 'fur' | 'hood' | 'capelet';
  trim?: 'none' | 'gold' | 'neon' | 'lace' | 'spikes' | 'bow' | 'buttons' | 'ripped' | 'patches' | 'reflective' | 'chain' | 'flowers';
  print?: string;
  scale?: number;
  glow?: boolean;
  alpha?: number;
  forcePat?: ThoiTrangPatternId;
}

/** Định danh ô bắt buộc (mustHave) trong kho 640 chủ đề, gồm cả nhóm phụ kiện. */
export type ThoiTrangMustHaveSlot =
  | ThoiTrangPrimarySlotId | 'acc'
  | 'bag' | 'back' | 'held' | 'necklace' | 'earrings' | 'tail' | 'belt';

export type ThoiTrangPaletteKey = 'fashion' | 'hair' | 'skin' | 'eye' | 'lip' | 'shadow';

export interface ThoiTrangCatalogItem {
  id: string;
  name: string;
  tags: readonly ThoiTrangTag[];
  c: string;
  c2: string;
  p: ThoiTrangPatternId;
  cPal: ThoiTrangPaletteKey;
  c2Pal: ThoiTrangPaletteKey | null;
  c2Label: string;
  pat: boolean;
  subSlot?: ThoiTrangAccSubSlot;
  /** Nhóm phân loại trung tính theo loại trang phục/phụ kiện (KHÔNG liên quan chủ đề) */
  group?: string;
  /** Key tile 3D trong atlas (mặc định `${cat}:${id}`, hoặc `${cat}:${v3d.base}`) */
  iconKey?: string;
  /** Tham số 3D bổ sung cho biến thể tham số hóa / in chữ lầy lội */
  v3d?: ThoiTrangVisualSpec;
  excluded?: boolean;
}

export interface ThoiTrangSlotDef {
  id: ThoiTrangPrimarySlotId;
  name: string;
  emoji: string;
  optional: true;
}

export interface ThoiTrangFace {
  eyes: ThoiTrangEyeShape;
  eyeColor: string;
  brows: ThoiTrangBrowShape;
  mouth: ThoiTrangMouthShape;
  lipColor: string;
  nose: ThoiTrangNoseShape;
  blush: ThoiTrangBlushStyle;
  eyeliner: ThoiTrangEyelinerStyle;
  eyeshadow: ThoiTrangEyeshadowStyle;
  eyeshadowColor: string;
  beautyMark: ThoiTrangBeautyMarkStyle;
  beard: ThoiTrangBeardStyle;
  freckles: boolean;
  expression: ThoiTrangExpressionId;
}

export interface ThoiTrangHairEquipped {
  id: string;
  c: string;
  c2: string;
  twoTone: ThoiTrangHairTwoTone;
}

export interface ThoiTrangEquippedItem {
  id: string;
  c: string;
  c2: string;
  p: ThoiTrangPatternId;
}

export interface ThoiTrangOutfit {
  body: ThoiTrangBodyType;
  skin: string;
  height: number;
  face: ThoiTrangFace;
  hair: ThoiTrangHairEquipped;
  slots: Partial<Record<ThoiTrangPrimarySlotId, ThoiTrangEquippedItem>>;
  acc: ThoiTrangEquippedItem[];
}

// ================= Chủ đề & Giám khảo Máy =================

export interface ThoiTrangTheme {
  id: string;
  group: ThoiTrangThemeGroupId;
  title: string;
  desc: string;
  tags: readonly ThoiTrangTag[];
  palette: readonly string[];
  mustHave?: ThoiTrangMustHaveSlot;
}

export interface ThoiTrangJudgeParts {
  themeMatch: number;
  tagCoverage: number;
  palette: number;
  completeness: number;
  styling: number;
}

export interface ThoiTrangJudgeResult {
  total: number;
  halfStars: number;
  parts: ThoiTrangJudgeParts;
  reason: string;
}

// ================= Trạng thái ván chơi & Socket =================

export type ThoiTrangPhase = 'theme_reveal' | 'dressing' | 'runway' | 'reveal';

export interface ThoiTrangScoreRow {
  playerId: string;
  name: string;
  rank: number;
  /** Tổng số nửa-sao (gồm cả phiếu Giám khảo Máy) */
  totalHalfStars: number;
  /** Tổng số phiếu bầu (số khán giả đã chấm + 1 phiếu Giám khảo Máy) */
  voterCount: number;
  /** Điểm trung bình cuối (1.0..5.0), đã gồm 1 phiếu Giám khảo Máy */
  finalAvg: number;
  /** Điểm trung bình riêng khán giả người/bot (null nếu chưa ai chấm) */
  humanAvg: number | null;
  humanVoterCount: number;
  machineHalfStars: number;
  machineReason: string;
  fiveStarCount: number;
  medianHalfStars: number;
  oneStarCount: number;
}

export interface ThoiTrangView {
  type: 'thoitrang';
  phase: ThoiTrangPhase;
  phaseEndsAt: number | null;
  phaseSeconds: number;
  theme: ThoiTrangTheme;
  order: string[];
  names: Record<string, string>;
  outfits: Record<string, ThoiTrangOutfit>;
  ready: string[];
  runwayIndex: number;
  walkerId: string | null;
  lastPose: ThoiTrangPoseId;
  /** Danh sách ID đã chấm lượt hiện tại (ẩn hoàn toàn số sao khi đang runway) */
  ratedBy: string[];
  /** Phiếu của chính viewerId cho walker hiện tại (2..10, null nếu chưa chấm hoặc là walker) */
  myRating: number | null;
  /** Chỉ gửi ở pha `reveal` */
  scores: ThoiTrangScoreRow[] | null;
}

export type ThoiTrangAction =
  | { type: 'tt_outfit'; outfit: ThoiTrangOutfit }
  | { type: 'tt_ready'; ready: boolean }
  | { type: 'tt_rate'; halfStars: number }
  | { type: 'tt_skip_reveal' }
  | { type: 'tt_pose'; pose: ThoiTrangPoseId }
  | { type: 'tt_cheer'; cheer: ThoiTrangCheerId };

export type ThoiTrangPosePayload =
  | { kind: 'pose'; playerId: string; pose: ThoiTrangPoseId; at: number }
  | { kind: 'cheer'; playerId: string; name: string; cheer: ThoiTrangCheerId; at: number };

// ================= Hàm hỗ trợ =================

export function runwaySecondsForPlayers(playerCount: number): number {
  return playerCount <= 6 ? THOI_TRANG_RUNWAY_SMALL_SEC : THOI_TRANG_RUNWAY_LARGE_SEC;
}

export function halfStarsToStars(halfStars: number): number {
  return Math.max(THOI_TRANG_MIN_HALF_STARS, Math.min(THOI_TRANG_MAX_HALF_STARS, Math.round(halfStars))) / 2;
}

export function formatHalfStars(halfStars: number): string {
  return halfStarsToStars(halfStars).toFixed(1).replace('.', ',');
}

export function formatAvgStars(avg: number): string {
  return avg.toFixed(1).replace('.', ',');
}
