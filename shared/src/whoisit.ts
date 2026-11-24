/**
 * Kiểu dữ liệu, 7 bộ nét vẽ đa nguồn, bộ sinh nhân vật theo seed,
 * 35 câu hỏi đặc điểm trực quan & hàm chia lưới co giãn cho game Đoán Ai Đây? (Who Is It? HopKids).
 * Pure TypeScript — không import từ app/ hay bất kỳ package npm nào.
 */

export type WhoIsItTeam = 'red' | 'blue';
export type WhoIsItPhase = 'pick_secret' | 'turn_beat' | 'ask' | 'answer_free' | 'reveal' | 'review';
export type WhoIsItDifficulty = 'auto' | 'large';
export type WhoIsItTraitGroup = 'toc_mu' | 'mat_kinh' | 'rau_ct' | 'ao_khac';
export type WhoIsItArtPackId =
  | 'avataaars'
  | 'personas'
  | 'micah'
  | 'openPeeps'
  | 'toonHead'
  | 'bigSmile'
  | 'niceAvatar';
export type WhoIsItExpression = 'happy' | 'sad' | 'angry' | 'surprised' | 'cheeky';

export interface WhoIsItCharacter {
  id: string;
  name: string;
  seed: string;
  bg: string;
  gender: 'male' | 'female';
  hairStyle: 'short' | 'long' | 'curly' | 'bald' | 'covered';
  hairColor: 'black' | 'brown' | 'blonde' | 'red' | 'silver' | 'pink' | 'none';
  hat: 'none' | 'cap' | 'beanie' | 'turban';
  glasses: 'none' | 'clear' | 'sunglasses' | 'eyepatch';
  facialHair: 'none' | 'mustache' | 'beard';
  skin: 'light' | 'tan' | 'dark';
  expression: WhoIsItExpression;
  clothing: 'hoodie' | 'blazer' | 'overall' | 'tshirt';
  clothesColor: 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'dark' | 'white';
  earrings: boolean;
  blush: boolean;
  freckles: boolean;
  scar: boolean;
  bow: boolean;
}

export interface WhoIsItArtCaps {
  hairStyle: WhoIsItCharacter['hairStyle'][];
  maleHairStyles?: WhoIsItCharacter['hairStyle'][];
  femaleHairStyles?: WhoIsItCharacter['hairStyle'][];
  hairColor: boolean;
  hat: WhoIsItCharacter['hat'][];
  glasses: WhoIsItCharacter['glasses'][];
  facialHair: WhoIsItCharacter['facialHair'][];
  expression: WhoIsItExpression[];
  clothing: WhoIsItCharacter['clothing'][];
  clothesColor: boolean;
  skin: boolean;
  earrings: boolean;
  blush: boolean;
  freckles: boolean;
  scar: boolean;
  bow: boolean;
}

export interface WhoIsItArtPack {
  id: WhoIsItArtPackId;
  label: string;
  author: string;
  license: string;
  sourceUrl: string;
  repoUrl: string;
  caps: WhoIsItArtCaps;
}

export const WHO_IS_IT_ART_PACKS: Record<WhoIsItArtPackId, WhoIsItArtPack> = {
  avataaars: {
    id: 'avataaars',
    label: 'Hoạt hình Avataaars',
    author: 'Pablo Stanley',
    license: 'Free for personal and commercial use',
    sourceUrl: 'https://avataaars.com/',
    repoUrl: 'https://github.com/dicebear/dicebear',
    caps: {
      hairStyle: ['short', 'long', 'curly', 'bald', 'covered'],
      hairColor: true,
      hat: ['none', 'cap', 'beanie', 'turban'],
      glasses: ['none', 'clear', 'sunglasses', 'eyepatch'],
      facialHair: ['none', 'mustache', 'beard'],
      expression: ['happy', 'sad', 'angry', 'surprised', 'cheeky'],
      clothing: ['hoodie', 'blazer', 'overall', 'tshirt'],
      clothesColor: true,
      skin: true,
      earrings: true,
      blush: true,
      freckles: true,
      scar: true,
      bow: true,
    },
  },
  personas: {
    id: 'personas',
    label: 'Nhân vật Personas',
    author: 'Draftbit',
    license: 'CC BY 4.0',
    sourceUrl: 'https://personas.draftbit.com/',
    repoUrl: 'https://github.com/dicebear/dicebear',
    caps: {
      hairStyle: ['short', 'long', 'curly', 'bald', 'covered'],
      hairColor: true,
      hat: ['none', 'cap', 'beanie'],
      glasses: ['none', 'clear', 'sunglasses'],
      facialHair: ['none', 'mustache', 'beard'],
      expression: ['happy', 'sad', 'surprised', 'cheeky'],
      clothing: [],
      clothesColor: true,
      skin: true,
      earrings: false,
      blush: false,
      freckles: false,
      scar: false,
      bow: false,
    },
  },
  micah: {
    id: 'micah',
    label: 'Nét vẽ Micah',
    author: 'Micah Lanier',
    license: 'CC BY 4.0',
    sourceUrl: 'https://www.figma.com/community/file/829741575478342595',
    repoUrl: 'https://github.com/dicebear/dicebear',
    caps: {
      hairStyle: ['short', 'long', 'bald', 'covered'],
      maleHairStyles: ['short', 'bald', 'covered'],
      femaleHairStyles: ['short', 'long', 'covered'],
      hairColor: true,
      hat: ['none', 'turban'],
      glasses: ['none', 'clear'],
      facialHair: ['none', 'beard'],
      expression: ['happy', 'sad', 'surprised', 'cheeky'],
      clothing: [],
      clothesColor: true,
      skin: true,
      earrings: true,
      blush: false,
      freckles: false,
      scar: false,
      bow: false,
    },
  },
  openPeeps: {
    id: 'openPeeps',
    label: 'Phác họa Open Peeps',
    author: 'Pablo Stanley',
    license: 'CC0 1.0',
    sourceUrl: 'https://www.openpeeps.com/',
    repoUrl: 'https://github.com/dicebear/dicebear',
    caps: {
      hairStyle: ['short', 'long', 'curly', 'bald', 'covered'],
      hairColor: false,
      hat: ['none', 'beanie', 'turban'],
      glasses: ['none', 'clear', 'sunglasses', 'eyepatch'],
      facialHair: ['none', 'mustache', 'beard'],
      expression: ['happy', 'sad', 'angry', 'surprised', 'cheeky'],
      clothing: [],
      clothesColor: true,
      skin: true,
      earrings: false,
      blush: false,
      freckles: false,
      scar: false,
      bow: false,
    },
  },
  toonHead: {
    id: 'toonHead',
    label: 'Hoạt hình ToonHead',
    author: 'Johan Melin',
    license: 'CC BY 4.0',
    sourceUrl: 'https://www.figma.com/community/file/1589627891082866389',
    repoUrl: 'https://github.com/dicebear/dicebear',
    caps: {
      hairStyle: ['short', 'long', 'bald'],
      maleHairStyles: ['short', 'bald'],
      femaleHairStyles: ['short', 'long'],
      hairColor: true,
      hat: ['none'],
      glasses: ['none'],
      facialHair: ['none', 'mustache', 'beard'],
      expression: ['happy', 'sad', 'angry', 'surprised', 'cheeky'],
      clothing: [],
      clothesColor: true,
      skin: true,
      earrings: false,
      blush: false,
      freckles: false,
      scar: false,
      bow: false,
    },
  },
  bigSmile: {
    id: 'bigSmile',
    label: 'Biểu cảm Big Smile',
    author: 'Ashley Seo',
    license: 'CC BY 4.0',
    sourceUrl: 'https://www.figma.com/community/file/881358461963645496',
    repoUrl: 'https://github.com/dicebear/dicebear',
    caps: {
      hairStyle: ['short', 'long', 'curly'],
      hairColor: true,
      hat: ['none'],
      glasses: ['none', 'clear', 'sunglasses'],
      facialHair: ['none'],
      expression: ['happy', 'sad', 'angry', 'cheeky'],
      clothing: [],
      clothesColor: false,
      skin: true,
      earrings: false,
      blush: false,
      freckles: false,
      scar: false,
      bow: false,
    },
  },
  niceAvatar: {
    id: 'niceAvatar',
    label: 'Tối giản Nice Avatar',
    author: 'Chill Lab',
    license: 'MIT',
    sourceUrl: 'https://github.com/dapi-labs/react-nice-avatar',
    repoUrl: 'https://github.com/dapi-labs/react-nice-avatar',
    caps: {
      hairStyle: ['short', 'long', 'bald', 'covered'],
      maleHairStyles: ['short', 'bald', 'covered'],
      femaleHairStyles: ['short', 'long', 'covered'],
      hairColor: true,
      hat: ['none', 'beanie', 'turban'],
      glasses: ['none', 'clear', 'sunglasses'],
      facialHair: ['none'],
      expression: ['happy'],
      clothing: ['hoodie', 'tshirt'],
      clothesColor: true,
      skin: true,
      earrings: false,
      blush: false,
      freckles: false,
      scar: false,
      bow: false,
    },
  },
};

export const WHO_IS_IT_ART_PACK_IDS: WhoIsItArtPackId[] = [
  'avataaars',
  'personas',
  'micah',
  'openPeeps',
  'toonHead',
  'bigSmile',
  'niceAvatar',
];

export interface WhoIsItTraitDef {
  key: string;
  group: WhoIsItTraitGroup;
  label: string;
  shortLabel: string;
  match: (c: WhoIsItCharacter) => boolean;
}

export interface WhoIsItQA {
  id: number;
  team: WhoIsItTeam;
  askedById: string;
  askedByName: string;
  question: string;
  traitKey?: string;
  characterId?: string;
  answer: boolean | null;
  kind: 'trait' | 'free' | 'guess';
  at: number;
}

export interface WhoIsItTeamMsg {
  id: number;
  fromId: string;
  fromName: string;
  text: string;
  at: number;
}

export interface WhoIsItView {
  type: 'who_is_it';
  phase: WhoIsItPhase;
  phaseEndsAt: number | null;
  phaseSeconds: number;
  artPack: WhoIsItArtPackId;
  traitKeys: string[];
  boardSize: number;
  characters: WhoIsItCharacter[];
  teams: Record<WhoIsItTeam, string[]>;
  myTeam: WhoIsItTeam | null;
  /** Chỉ trả đúng nhân vật bí mật của ĐỘI MÌNH (chống gian lận tuyệt đối) */
  mySecretId: string | null;
  /** Thẻ đang úp trên bảng của ĐỘI MÌNH */
  myFlipped: string[];
  /** Thẻ đối thủ đã úp trên bảng CỦA HỌ (để soi tiến độ đối phương, không bao giờ lộ thẻ bí mật của họ) */
  oppFlipped: string[];
  /** Các thẻ vừa được úp ở lượt gần nhất để làm nổi bật nhẹ */
  lastFlippedIds: string[];
  /** Đội vừa úp các thẻ trong `lastFlippedIds` */
  lastFlippedTeam: WhoIsItTeam | null;
  /** Ghi chú chuyển lượt (ví dụ đội trước hết giờ) */
  turnNote: 'timeout' | null;
  secretReady: Record<WhoIsItTeam, boolean>;
  remainingCounts: Record<WhoIsItTeam, number>;
  lives: Record<WhoIsItTeam, number>;
  turnTeam: WhoIsItTeam;
  activePlayerId: string | null;
  lastQA: WhoIsItQA | null;
  history: WhoIsItQA[];
  pendingQuestion: { id: number; askedByTeam: WhoIsItTeam; text: string } | null;
  teamChat: WhoIsItTeamMsg[];
  roundCount: number;
  names: Record<string, string>;
}

export type WhoIsItAction =
  | { type: 'wi_pick_secret'; characterId: string }
  | { type: 'wi_ask_trait'; traitKey: string }
  | { type: 'wi_ask_free'; question: string }
  | { type: 'wi_answer_free'; yes: boolean }
  | { type: 'wi_toggle_flip'; characterId: string }
  | { type: 'wi_end_review' }
  | { type: 'wi_guess'; characterId: string }
  | { type: 'wi_team_chat'; text: string };

export const WHO_IS_IT_MAX_LIVES = 2;

export function whoIsItBoardSize(playerCount: number, mode: WhoIsItDifficulty = 'auto'): 30 | 36 | 42 | 48 | 54 {
  const base: 30 | 36 | 42 | 48 | 54 =
    playerCount <= 3 ? 30
      : playerCount <= 5 ? 36
        : playerCount <= 7 ? 42
          : playerCount <= 9 ? 48
            : 54;
  if (mode !== 'large') return base;
  if (base === 30) return 36;
  if (base === 36) return 42;
  if (base === 42) return 48;
  return 54;
}

export function whoIsItGridDims(boardSize: number, compactPortrait: boolean): { cols: number; rows: number } {
  switch (boardSize) {
    case 20: return compactPortrait ? { cols: 4, rows: 5 } : { cols: 5, rows: 4 };
    case 24: return compactPortrait ? { cols: 4, rows: 6 } : { cols: 6, rows: 4 };
    case 30: return compactPortrait ? { cols: 5, rows: 6 } : { cols: 6, rows: 5 };
    case 36: return { cols: 6, rows: 6 };
    case 42: return compactPortrait ? { cols: 6, rows: 7 } : { cols: 7, rows: 6 };
    case 48: return compactPortrait ? { cols: 6, rows: 8 } : { cols: 8, rows: 6 };
    default: return compactPortrait ? { cols: 6, rows: 9 } : { cols: 9, rows: 6 };
  }
}

export const HAIR_HEX = {
  black: '2c1b18',
  brown: '724133',
  blonde: 'e6c15a',
  red: 'c93305',
  silver: 'd6d3d1',
  pink: 'f472b6',
  none: '2c1b18',
} as const;

export const SKIN_HEX = {
  light: 'ffdbb4',
  tan: 'd08b5b',
  dark: '614335',
} as const;

export const CLOTHES_HEX = {
  red: 'e03131',
  blue: '2563eb',
  green: '16a34a',
  yellow: 'eab308',
  purple: '9333ea',
  dark: '262e33',
  white: 'f1f5f9',
} as const;

export const BG_CYCLE = [
  'dbeafe', 'fef3c7', 'fce7f3', 'dcfce7', 'ede9fe', 'ffedd5', 'e0f2fe', 'fae8ff', 'ecfccb', 'ffe4e6',
] as const;

const MALE_NAMES = [
  'An', 'Bách', 'Bảo', 'Bắc', 'Bình', 'Cao', 'Cảnh', 'Chánh', 'Chiến', 'Chính',
  'Chương', 'Công', 'Cường', 'Danh', 'Diễn', 'Doanh', 'Dũng', 'Duy', 'Dương', 'Đạt',
  'Đăng', 'Đạo', 'Đỉnh', 'Đông', 'Đức', 'Gia', 'Giáp', 'Hải', 'Hào', 'Hậu',
  'Hiển', 'Hiệp', 'Hiếu', 'Hoàng', 'Hợp', 'Hùng', 'Huy', 'Khải', 'Khang', 'Khánh',
  'Khiêm', 'Khoa', 'Khôi', 'Khương', 'Kiên', 'Kiệt', 'Kỳ', 'Lâm', 'Lộc', 'Lợi',
  'Long', 'Luân', 'Lực', 'Mạnh', 'Minh', 'Nam', 'Nghĩa', 'Nguyên', 'Nhân', 'Nhật',
  'Ninh', 'Phát', 'Phi', 'Phong', 'Phú', 'Phúc', 'Phước', 'Quân', 'Quang', 'Quốc',
  'Quý', 'Sang', 'Sáng', 'Siêu', 'Sinh', 'Sơn', 'Tài', 'Tân', 'Tấn', 'Thạch',
  'Thái', 'Thắng', 'Thành', 'Thiên', 'Thiện', 'Thịnh', 'Thuận', 'Tiến', 'Tín', 'Toàn',
  'Trí', 'Triết', 'Trọng', 'Trung', 'Trường', 'Tuấn', 'Tùng', 'Tuyên', 'Văn', 'Vĩ',
  'Việt', 'Vinh', 'Vũ', 'Vương',
] as const;

const FEMALE_NAMES = [
  'Ái', 'Ánh', 'Ân', 'Băng', 'Bích', 'Cẩm', 'Châu', 'Chi', 'Cúc', 'Diễm',
  'Diệu', 'Dung', 'Duyên', 'Đào', 'Đoan', 'Giang', 'Hà', 'Hạ', 'Hân', 'Hằng',
  'Hạnh', 'Hiền', 'Hòa', 'Hoài', 'Hồng', 'Huệ', 'Hương', 'Huyền', 'Khuê', 'Khuyên',
  'Kiều', 'Kim', 'Lam', 'Lan', 'Lệ', 'Liễu', 'Linh', 'Loan', 'Lụa', 'Ly',
  'Mai', 'Mây', 'Mến', 'Mơ', 'My', 'Mỹ', 'Na', 'Nga', 'Ngân', 'Ngọc',
  'Nguyệt', 'Nhã', 'Nhàn', 'Nhi', 'Nhiên', 'Nhung', 'Nương', 'Oanh', 'Phương', 'Phượng',
  'Phụng', 'Quế', 'Quyên', 'Quỳnh', 'Sa', 'Sen', 'Sương', 'Tâm', 'Thắm', 'Thanh',
  'Thảo', 'Thi', 'Thoa', 'Thư', 'Thương', 'Thúy', 'Thùy', 'Thủy', 'Tiên', 'Tố',
  'Trà', 'Trâm', 'Trân', 'Trang', 'Trinh', 'Trúc', 'Tú', 'Tươi', 'Tuyền', 'Tuyết',
  'Uyên', 'Vân', 'Vy', 'Xuân', 'Ý', 'Yến',
] as const;

export const WHO_IS_IT_TRAITS: WhoIsItTraitDef[] = [
  // Tóc & Mũ (10)
  { key: 'gender_male', group: 'toc_mu', label: 'Là Nam?', shortLabel: 'Nam', match: (c) => c.gender === 'male' },
  { key: 'gender_female', group: 'toc_mu', label: 'Là Nữ?', shortLabel: 'Nữ', match: (c) => c.gender === 'female' },
  { key: 'hat_any', group: 'toc_mu', label: 'Đang đội mũ / khăn?', shortLabel: 'Đội mũ/khăn', match: (c) => c.hat !== 'none' },
  { key: 'hat_beanie', group: 'toc_mu', label: 'Đội mũ len?', shortLabel: 'Mũ len', match: (c) => c.hat === 'beanie' },
  { key: 'hat_cap', group: 'toc_mu', label: 'Đội mũ có vành?', shortLabel: 'Mũ có vành', match: (c) => c.hat === 'cap' },
  { key: 'hair_bald', group: 'toc_mu', label: 'Đầu trọc?', shortLabel: 'Trọc đầu', match: (c) => c.hairStyle === 'bald' },
  { key: 'hair_long', group: 'toc_mu', label: 'Tóc dài / búi?', shortLabel: 'Tóc dài', match: (c) => c.hairStyle === 'long' },
  { key: 'hair_short', group: 'toc_mu', label: 'Tóc ngắn?', shortLabel: 'Tóc ngắn', match: (c) => c.hairStyle === 'short' },
  { key: 'hair_curly', group: 'toc_mu', label: 'Tóc xoăn / xù?', shortLabel: 'Tóc xoăn/xù', match: (c) => c.hairStyle === 'curly' },
  { key: 'hair_dark', group: 'toc_mu', label: 'Tóc đen hoặc nâu?', shortLabel: 'Tóc đen/nâu', match: (c) => c.hairColor === 'black' || c.hairColor === 'brown' },

  // Mắt & Kính (9)
  { key: 'glasses_any', group: 'mat_kinh', label: 'Đeo kính (cận/râm)?', shortLabel: 'Đeo kính', match: (c) => c.glasses === 'clear' || c.glasses === 'sunglasses' },
  { key: 'glasses_sun', group: 'mat_kinh', label: 'Đeo kính râm?', shortLabel: 'Kính râm', match: (c) => c.glasses === 'sunglasses' },
  { key: 'glasses_clear', group: 'mat_kinh', label: 'Đeo kính gọng trong?', shortLabel: 'Kính cận', match: (c) => c.glasses === 'clear' },
  { key: 'eyepatch', group: 'mat_kinh', label: 'Đeo bịt mắt?', shortLabel: 'Bịt mắt', match: (c) => c.glasses === 'eyepatch' },
  { key: 'exp_happy', group: 'mat_kinh', label: 'Đang cười tươi?', shortLabel: 'Cười tươi', match: (c) => c.expression === 'happy' },
  { key: 'exp_sad', group: 'mat_kinh', label: 'Mặt buồn?', shortLabel: 'Mặt buồn', match: (c) => c.expression === 'sad' },
  { key: 'exp_angry', group: 'mat_kinh', label: 'Mặt cau có?', shortLabel: 'Cau mày', match: (c) => c.expression === 'angry' },
  { key: 'exp_surprised', group: 'mat_kinh', label: 'Mặt bất ngờ?', shortLabel: 'Bất ngờ', match: (c) => c.expression === 'surprised' },
  { key: 'exp_cheeky', group: 'mat_kinh', label: 'Nháy mắt / lè lưỡi?', shortLabel: 'Nháy/lè lưỡi', match: (c) => c.expression === 'cheeky' },

  // Râu & Chi tiết (9)
  { key: 'facial_any', group: 'rau_ct', label: 'Có râu / ria?', shortLabel: 'Có râu/ria', match: (c) => c.facialHair !== 'none' },
  { key: 'facial_beard', group: 'rau_ct', label: 'Râu quai nón?', shortLabel: 'Râu cằm', match: (c) => c.facialHair === 'beard' },
  { key: 'facial_mustache', group: 'rau_ct', label: 'Ria mép?', shortLabel: 'Ria mép', match: (c) => c.facialHair === 'mustache' },
  { key: 'earrings', group: 'rau_ct', label: 'Đeo bông tai?', shortLabel: 'Bông tai', match: (c) => c.earrings },
  { key: 'blush', group: 'rau_ct', label: 'Má hồng?', shortLabel: 'Má hồng', match: (c) => c.blush },
  { key: 'freckles', group: 'rau_ct', label: 'Có tàn nhang?', shortLabel: 'Tàn nhang', match: (c) => c.freckles },
  { key: 'scar', group: 'rau_ct', label: 'Có vết sẹo trên má?', shortLabel: 'Vết sẹo', match: (c) => c.scar },
  { key: 'bow', group: 'rau_ct', label: 'Có nơ cài đầu?', shortLabel: 'Nơ cài', match: (c) => c.bow },
  { key: 'hair_bright', group: 'rau_ct', label: 'Tóc nhuộm sáng?', shortLabel: 'Tóc sáng', match: (c) => ['blonde', 'red', 'pink', 'silver'].includes(c.hairColor) },

  // Áo & Màu da (7)
  { key: 'skin_light', group: 'ao_khac', label: 'Da sáng?', shortLabel: 'Da sáng', match: (c) => c.skin === 'light' },
  { key: 'skin_dark', group: 'ao_khac', label: 'Da nâu đậm?', shortLabel: 'Da nâu đậm', match: (c) => c.skin === 'dark' },
  { key: 'cloth_hoodie', group: 'ao_khac', label: 'Áo hoodie?', shortLabel: 'Áo hoodie', match: (c) => c.clothing === 'hoodie' },
  { key: 'cloth_blazer', group: 'ao_khac', label: 'Áo vest / blazer?', shortLabel: 'Áo vest', match: (c) => c.clothing === 'blazer' },
  { key: 'cloth_warm', group: 'ao_khac', label: 'Áo Đỏ hoặc Vàng?', shortLabel: 'Áo Đỏ/Vàng', match: (c) => c.clothesColor === 'red' || c.clothesColor === 'yellow' },
  { key: 'cloth_cool', group: 'ao_khac', label: 'Áo Xanh hoặc Tím?', shortLabel: 'Áo Xanh/Tím', match: (c) => c.clothesColor === 'blue' || c.clothesColor === 'green' || c.clothesColor === 'purple' },
  { key: 'cloth_mono', group: 'ao_khac', label: 'Áo Trắng hoặc Đen?', shortLabel: 'Áo Trắng/Đen', match: (c) => c.clothesColor === 'white' || c.clothesColor === 'dark' },
];

export const WHO_IS_IT_TRAIT_MAP = new Map<string, WhoIsItTraitDef>(
  WHO_IS_IT_TRAITS.map((t) => [t.key, t]),
);

export function matchWhoIsItTrait(c: WhoIsItCharacter, traitKey: string): boolean {
  return WHO_IS_IT_TRAIT_MAP.get(traitKey)?.match(c) ?? false;
}

function isTraitAvailableForCaps(key: string, caps: WhoIsItArtCaps): boolean {
  const hasVisibleHair = caps.hairStyle.some((h) => h !== 'bald' && h !== 'covered');
  switch (key) {
    case 'gender_male':
    case 'gender_female':
      return true;
    case 'hat_any':
      return caps.hat.includes('none') && caps.hat.some((h) => h !== 'none');
    case 'hat_beanie':
      return caps.hat.includes('beanie');
    case 'hat_cap':
      return caps.hat.includes('cap');
    case 'hair_bald':
      return caps.hairStyle.includes('bald') && caps.hairStyle.length >= 2;
    case 'hair_long':
      return caps.hairStyle.includes('long') && caps.hairStyle.length >= 2;
    case 'hair_short':
      return caps.hairStyle.includes('short') && caps.hairStyle.length >= 2;
    case 'hair_curly':
      return caps.hairStyle.includes('curly') && caps.hairStyle.length >= 2;
    case 'hair_dark':
    case 'hair_bright':
      return caps.hairColor && hasVisibleHair;
    case 'glasses_any':
      return caps.glasses.includes('none') && (caps.glasses.includes('clear') || caps.glasses.includes('sunglasses'));
    case 'glasses_sun':
      return caps.glasses.includes('sunglasses');
    case 'glasses_clear':
      return caps.glasses.includes('clear');
    case 'eyepatch':
      return caps.glasses.includes('eyepatch');
    case 'exp_happy':
      return caps.expression.length >= 2 && caps.expression.includes('happy');
    case 'exp_sad':
      return caps.expression.length >= 2 && caps.expression.includes('sad');
    case 'exp_angry':
      return caps.expression.length >= 2 && caps.expression.includes('angry');
    case 'exp_surprised':
      return caps.expression.length >= 2 && caps.expression.includes('surprised');
    case 'exp_cheeky':
      return caps.expression.length >= 2 && caps.expression.includes('cheeky');
    case 'facial_any':
      return caps.facialHair.includes('none') && caps.facialHair.some((f) => f !== 'none');
    case 'facial_beard':
      return caps.facialHair.includes('beard');
    case 'facial_mustache':
      return caps.facialHair.includes('mustache');
    case 'earrings':
      return caps.earrings;
    case 'blush':
      return caps.blush;
    case 'freckles':
      return caps.freckles;
    case 'scar':
      return caps.scar;
    case 'bow':
      return caps.bow;
    case 'skin_light':
    case 'skin_dark':
      return caps.skin;
    case 'cloth_hoodie':
      return caps.clothing.length >= 2 && caps.clothing.includes('hoodie');
    case 'cloth_blazer':
      return caps.clothing.length >= 2 && caps.clothing.includes('blazer');
    case 'cloth_warm':
    case 'cloth_cool':
    case 'cloth_mono':
      return caps.clothesColor;
    default:
      return false;
  }
}

export function whoIsItTraitsForPack(pack: WhoIsItArtPackId): WhoIsItTraitDef[] {
  const caps = WHO_IS_IT_ART_PACKS[pack].caps;
  return WHO_IS_IT_TRAITS.filter((t) => isTraitAvailableForCaps(t.key, caps));
}

export function pickWhoIsItArtPack(rng: () => number = Math.random): WhoIsItArtPackId {
  const idx = Math.floor(rng() * WHO_IS_IT_ART_PACK_IDS.length) % WHO_IS_IT_ART_PACK_IDS.length;
  return WHO_IS_IT_ART_PACK_IDS[Math.max(0, idx)];
}

/**
 * Tạo bộ PRNG nội bộ (mulberry32) từ rng đầu vào để đảm bảo phân phối tốt
 * ngay cả khi test truyền hàm rng hằng số (vd `() => 0.1`).
 */
function createBoardRng(rng: () => number): () => number {
  const s1 = Math.floor(rng() * 0x1_0000_0000) >>> 0;
  const s2 = Math.floor(rng() * 0x1_0000_0000) >>> 0;
  let state = (s1 ^ Math.imul(s2 ^ 0x9e3779b9, 0x85ebca6b) ^ 0x6d2b79f5) >>> 0;
  if (state === 0) state = 0x12345678;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleInPlace<T>(arr: T[], r: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickWeighted<T>(items: readonly { value: T; weight: number }[], r: () => number): T {
  let total = 0;
  for (const it of items) total += it.weight;
  let pick = r() * total;
  for (const it of items) {
    pick -= it.weight;
    if (pick <= 0) return it.value;
  }
  return items[items.length - 1].value;
}

const DARK_HAIR_COLORS: readonly { value: WhoIsItCharacter['hairColor']; weight: number }[] = [
  { value: 'black', weight: 55 },
  { value: 'brown', weight: 45 },
];

const BRIGHT_HAIR_COLORS: readonly { value: WhoIsItCharacter['hairColor']; weight: number }[] = [
  { value: 'blonde', weight: 32 },
  { value: 'red', weight: 26 },
  { value: 'silver', weight: 22 },
  { value: 'pink', weight: 20 },
];

function sampleCharacter(
  name: string,
  gender: 'male' | 'female',
  pack: WhoIsItArtPackId,
  caps: WhoIsItArtCaps,
  bg: string,
  r: () => number,
): Omit<WhoIsItCharacter, 'id'> {
  const genderHairStyles =
    gender === 'male'
      ? (caps.maleHairStyles ?? caps.hairStyle)
      : (caps.femaleHairStyles ?? caps.hairStyle);
  const nonNoneHats = caps.hat.filter((h) => h !== 'none');
  const canHaveHat = nonNoneHats.length > 0 && genderHairStyles.includes('covered');
  let hat: WhoIsItCharacter['hat'] = 'none';
  if (canHaveHat) {
    const hatChance = nonNoneHats.length >= 3 ? 0.27 : nonNoneHats.length === 2 ? 0.24 : 0.20;
    if (r() < hatChance) {
      if (nonNoneHats.length >= 3) {
        hat = pickWeighted(
          nonNoneHats.map((h) => ({ value: h, weight: h === 'turban' ? 24 : 38 })),
          r,
        );
      } else {
        hat = nonNoneHats[Math.floor(r() * nonNoneHats.length)];
      }
    }
  }

  let hairStyle: WhoIsItCharacter['hairStyle'];
  let hairColor: WhoIsItCharacter['hairColor'];
  if (hat !== 'none') {
    hairStyle = 'covered';
    hairColor = 'none';
  } else {
    const uncovered = genderHairStyles.filter((h) => h !== 'covered' && !(gender === 'female' && h === 'bald'));
    const hairWeights: { value: WhoIsItCharacter['hairStyle']; weight: number }[] = uncovered.map((h) => {
      switch (h) {
        case 'bald':
          return { value: h, weight: gender === 'male' ? 32 : 0 };
        case 'long':
          return { value: h, weight: gender === 'female' ? 54 : 14 };
        case 'curly':
          return { value: h, weight: 26 };
        case 'short':
        default:
          return { value: h, weight: gender === 'male' ? 46 : 32 };
      }
    });
    hairStyle = hairWeights.length > 0 ? pickWeighted(hairWeights, r) : 'short';
    if (hairStyle === 'bald' || !caps.hairColor) {
      hairColor = 'none';
    } else {
      hairColor = r() < 0.56 ? pickWeighted(DARK_HAIR_COLORS, r) : pickWeighted(BRIGHT_HAIR_COLORS, r);
    }
  }

  const nonNoneGlasses = caps.glasses.filter((g) => g !== 'none');
  let glasses: WhoIsItCharacter['glasses'] = 'none';
  if (nonNoneGlasses.length > 0) {
    const glassesChance = nonNoneGlasses.length >= 3 ? 0.48 : nonNoneGlasses.length === 2 ? 0.45 : 0.40;
    if (r() < glassesChance) {
      const gWeights = nonNoneGlasses.map((g) => ({
        value: g,
        weight: g === 'clear' ? 40 : g === 'sunglasses' ? 33 : 27,
      }));
      glasses = pickWeighted(gWeights, r);
    }
  }

  const nonNoneFacial = caps.facialHair.filter((f) => f !== 'none');
  let facialHair: WhoIsItCharacter['facialHair'] = 'none';
  if (gender === 'male' && nonNoneFacial.length > 0) {
    const fhChance = nonNoneFacial.length >= 2 ? 0.56 : 0.48;
    if (r() < fhChance) {
      const fWeights = nonNoneFacial.map((f) => ({
        value: f,
        weight: f === 'beard' ? 52 : 48,
      }));
      facialHair = pickWeighted(fWeights, r);
    }
  }

  const skin: WhoIsItCharacter['skin'] = caps.skin
    ? pickWeighted(
        [
          { value: 'light', weight: 40 },
          { value: 'tan', weight: 30 },
          { value: 'dark', weight: 30 },
        ],
        r,
      )
    : 'light';

  const expression: WhoIsItExpression =
    caps.expression.length > 0
      ? caps.expression[Math.floor(r() * caps.expression.length)]
      : 'happy';

  let clothing: WhoIsItCharacter['clothing'] = 'tshirt';
  if (caps.clothing.length === 1) {
    clothing = caps.clothing[0];
  } else if (caps.clothing.length >= 2) {
    const cWeights = caps.clothing.map((cl) => ({
      value: cl,
      weight: cl === 'hoodie' ? 26 : cl === 'blazer' ? 26 : cl === 'overall' ? 18 : 30,
    }));
    clothing = pickWeighted(cWeights, r);
  }

  let clothesColor: WhoIsItCharacter['clothesColor'] = 'blue';
  if (caps.clothesColor) {
    const bucket = r();
    if (bucket < 0.32) {
      clothesColor = r() < 0.5 ? 'red' : 'yellow';
    } else if (bucket < 0.74) {
      const cool: WhoIsItCharacter['clothesColor'][] = ['blue', 'green', 'purple'];
      clothesColor = cool[Math.floor(r() * cool.length)];
    } else {
      clothesColor = r() < 0.5 ? 'dark' : 'white';
    }
  }

  const earrings = caps.earrings ? r() < (gender === 'female' ? 0.50 : 0.22) : false;
  const blush = caps.blush ? r() < (gender === 'female' ? 0.48 : 0.16) : false;
  const freckles = caps.freckles ? r() < 0.28 : false;
  const scar = caps.scar ? r() < 0.24 : false;
  const bow = caps.bow && gender === 'female' && hat === 'none' ? r() < 0.40 : false;

  const seedNum = Math.floor(r() * 0x1_0000_0000).toString(36);
  const seedNum2 = Math.floor(r() * 0x1_0000_0000).toString(36);

  return {
    name,
    seed: `${pack}_${seedNum}_${seedNum2}`,
    bg,
    gender,
    hairStyle,
    hairColor,
    hat,
    glasses,
    facialHair,
    skin,
    expression,
    clothing,
    clothesColor,
    earrings,
    blush,
    freckles,
    scar,
    bow,
  };
}

function answerVector(c: Omit<WhoIsItCharacter, 'id'>, traits: WhoIsItTraitDef[]): string {
  const full = c as WhoIsItCharacter;
  let out = '';
  for (const t of traits) out += t.match(full) ? '1' : '0';
  return out;
}

export function generateWhoIsItBoard(
  size: number,
  pack: WhoIsItArtPackId,
  rng: () => number = Math.random,
): WhoIsItCharacter[] {
  const n = Math.max(6, Math.min(size, MALE_NAMES.length + FEMALE_NAMES.length));
  const caps = WHO_IS_IT_ART_PACKS[pack].caps;
  const availTraits = whoIsItTraitsForPack(pack);
  const r = createBoardRng(rng);
  const maxAttempts = 60;

  let bestChars: Omit<WhoIsItCharacter, 'id'>[] | null = null;
  let bestPenalty = Infinity;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const maleCount = Math.floor(n / 2);
    const femaleCount = n - maleCount;
    const genders: ('male' | 'female')[] = [
      ...Array<'male'>(maleCount).fill('male'),
      ...Array<'female'>(femaleCount).fill('female'),
    ];
    shuffleInPlace(genders, r);

    const malePool = shuffleInPlace([...MALE_NAMES], r);
    const femalePool = shuffleInPlace([...FEMALE_NAMES], r);
    let mIdx = 0;
    let fIdx = 0;
    const bgOffset = Math.floor(r() * BG_CYCLE.length);

    const chars: Omit<WhoIsItCharacter, 'id'>[] = [];
    const seenVectors = new Set<string>();
    let duplicateVectors = 0;

    for (let i = 0; i < n; i++) {
      const gender = genders[i];
      const name = gender === 'male' ? malePool[mIdx++] : femalePool[fIdx++];
      const bg = BG_CYCLE[(i + bgOffset) % BG_CYCLE.length];

      let chosen: Omit<WhoIsItCharacter, 'id'> | null = null;
      let chosenVec = '';
      for (let retry = 0; retry < 50; retry++) {
        const cand = sampleCharacter(name, gender, pack, caps, bg, r);
        const vec = answerVector(cand, availTraits);
        if (!seenVectors.has(vec)) {
          chosen = cand;
          chosenVec = vec;
          break;
        }
        chosen = cand;
        chosenVec = vec;
      }
      if (seenVectors.has(chosenVec)) duplicateVectors++;
      seenVectors.add(chosenVec);
      chars.push(chosen!);
    }

    let traitViolations = 0;
    let deficit = 0;
    for (const tr of availTraits) {
      let hits = 0;
      for (const ch of chars) {
        if (tr.match(ch as WhoIsItCharacter)) hits++;
      }
      if (hits < 2) {
        traitViolations++;
        deficit += 2 - hits;
      } else if (hits > n - 2) {
        traitViolations++;
        deficit += hits - (n - 2);
      }
    }

    const penalty = duplicateVectors * 1000 + traitViolations * 10 + deficit;
    if (penalty < bestPenalty) {
      bestPenalty = penalty;
      bestChars = chars;
    }
    if (penalty === 0) break;
  }

  const sorted = (bestChars ?? []).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  return sorted.map((c, idx) => ({
    id: `wi_${String(idx + 1).padStart(2, '0')}`,
    ...c,
  }));
}
