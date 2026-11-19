/**
 * Kiểu dữ liệu, kho 100 nhân vật (tương thích DiceBear Avataaars + lớp phủ chi tiết),
 * 34 câu hỏi đặc điểm trực quan & hàm chia lưới co giãn cho game Đoán Ai Đây? (Who Is It? HopKids).
 */

export type WhoIsItTeam = 'red' | 'blue';
export type WhoIsItPhase = 'pick_secret' | 'ask' | 'answer_free' | 'review' | 'turn_beat';
export type WhoIsItDifficulty = 'auto' | 'large';
export type WhoIsItTraitGroup = 'toc_mu' | 'mat_kinh' | 'rau_ct' | 'ao_khac';

export interface WhoIsItCharacter {
  id: string;
  name: string;
  gender: 'male' | 'female';
  hairStyle: 'short' | 'long' | 'curly' | 'bald' | 'covered';
  hairColor: 'black' | 'brown' | 'blonde' | 'red' | 'silver' | 'pink' | 'none';
  hat: 'none' | 'cap' | 'beanie' | 'turban';
  glasses: 'none' | 'clear' | 'sunglasses' | 'eyepatch';
  facialHair: 'none' | 'mustache' | 'beard';
  skin: 'light' | 'tan' | 'dark';
  expression: 'happy' | 'surprised' | 'angry' | 'cheeky';
  clothing: 'hoodie' | 'blazer' | 'overall' | 'tshirt';
  clothesColor: 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'dark' | 'white';
  earrings: boolean;
  blush: boolean;
  freckles: boolean;
  scar: boolean;
  bow: boolean;
  /** Tham số render DiceBear Avataaars chuẩn xác 1:1 với các đặc điểm trên */
  visual: {
    top: string;
    bald?: boolean;
    hairColor: string;
    hatColor?: string;
    skinColor: string;
    accessories?: string;
    facialHair?: string;
    facialHairColor?: string;
    eyes: string;
    eyebrows: string;
    mouth: string;
    clothing: string;
    clothesColor: string;
    bgColor: string;
  };
}

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
  | { type: 'wi_auto_flip' }
  | { type: 'wi_end_review' }
  | { type: 'wi_guess'; characterId: string }
  | { type: 'wi_team_chat'; text: string };

export const WHO_IS_IT_MAX_LIVES = 2;

export function whoIsItBoardSize(playerCount: number, mode: WhoIsItDifficulty = 'auto'): 24 | 30 | 36 | 42 | 48 | 54 {
  const base: 24 | 30 | 36 | 42 | 48 =
    playerCount <= 3 ? 24
      : playerCount <= 5 ? 30
        : playerCount <= 7 ? 36
          : playerCount <= 9 ? 42
            : 48;
  if (mode !== 'large') return base;
  if (base === 24) return 30;
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

const HAIR_HEX = {
  black: '2c1b18',
  brown: '724133',
  blonde: 'e6c15a',
  red: 'c93305',
  silver: 'd6d3d1',
  pink: 'f472b6',
  none: '2c1b18',
} as const;

const SKIN_HEX = {
  light: 'ffdbb4',
  tan: 'd08b5b',
  dark: '614335',
} as const;

const CLOTHES_HEX = {
  red: 'e03131',
  blue: '2563eb',
  green: '16a34a',
  yellow: 'eab308',
  purple: '9333ea',
  dark: '262e33',
  white: 'f1f5f9',
} as const;

const BG_CYCLE = [
  'dbeafe', 'fef3c7', 'fce7f3', 'dcfce7', 'ede9fe', 'ffedd5', 'e0f2fe', 'fae8ff', 'ecfccb', 'ffe4e6',
] as const;

interface RawCharSeed {
  name: string;
  gender: WhoIsItCharacter['gender'];
  hairStyle: WhoIsItCharacter['hairStyle'];
  top: string;
  bald?: boolean;
  hairColor: WhoIsItCharacter['hairColor'];
  hat: WhoIsItCharacter['hat'];
  hatColor?: string;
  glasses: WhoIsItCharacter['glasses'];
  acc?: string;
  facialHair: WhoIsItCharacter['facialHair'];
  fh?: string;
  skin: WhoIsItCharacter['skin'];
  expression: WhoIsItCharacter['expression'];
  clothing: WhoIsItCharacter['clothing'];
  clothesTop: string;
  clothesColor: WhoIsItCharacter['clothesColor'];
  earrings: boolean;
  blush: boolean;
  freckles: boolean;
  scar?: boolean;
  bow?: boolean;
}

function exprVisual(exp: WhoIsItCharacter['expression'], idx: number): { eyes: string; eyebrows: string; mouth: string } {
  switch (exp) {
    case 'happy':
      return {
        eyes: idx % 2 === 0 ? 'happy' : 'default',
        eyebrows: idx % 3 === 0 ? 'raisedExcitedNatural' : 'defaultNatural',
        mouth: idx % 2 === 0 ? 'smile' : 'twinkle',
      };
    case 'surprised':
      return {
        eyes: 'surprised',
        eyebrows: 'raisedExcitedNatural',
        mouth: idx % 2 === 0 ? 'screamOpen' : 'disbelief',
      };
    case 'angry':
      return {
        eyes: 'squint',
        eyebrows: idx % 2 === 0 ? 'angryNatural' : 'frownNatural',
        mouth: idx % 2 === 0 ? 'serious' : 'grimace',
      };
    case 'cheeky':
      return {
        eyes: idx % 2 === 0 ? 'wink' : 'winkWacky',
        eyebrows: 'upDownNatural',
        mouth: 'tongue',
      };
  }
}

const RAW_CHARACTERS: RawCharSeed[] = [
  // 01-12
  { name: 'An', gender: 'male', hairStyle: 'short', top: 'shortFlat', hairColor: 'black', hat: 'none', glasses: 'clear', acc: 'prescription01', facialHair: 'none', skin: 'light', expression: 'happy', clothing: 'hoodie', clothesTop: 'hoodie', clothesColor: 'red', earrings: false, blush: false, freckles: false },
  { name: 'Bảo', gender: 'male', hairStyle: 'covered', top: 'hat', hairColor: 'none', hat: 'cap', hatColor: 'e03131', glasses: 'sunglasses', acc: 'sunglasses', facialHair: 'mustache', fh: 'moustacheFancy', skin: 'tan', expression: 'cheeky', clothing: 'tshirt', clothesTop: 'shirtCrewNeck', clothesColor: 'blue', earrings: true, blush: false, freckles: false },
  { name: 'Dũng', gender: 'male', hairStyle: 'bald', top: 'shortFlat', bald: true, hairColor: 'none', hat: 'none', glasses: 'none', facialHair: 'beard', fh: 'beardMajestic', skin: 'dark', expression: 'angry', clothing: 'blazer', clothesTop: 'blazerAndSweater', clothesColor: 'dark', earrings: false, blush: false, freckles: false, scar: true },
  { name: 'Hào', gender: 'male', hairStyle: 'curly', top: 'shortCurly', hairColor: 'brown', hat: 'none', glasses: 'eyepatch', acc: 'eyepatch', facialHair: 'beard', fh: 'beardMedium', skin: 'tan', expression: 'happy', clothing: 'overall', clothesTop: 'overall', clothesColor: 'yellow', earrings: true, blush: false, freckles: true, scar: true },
  { name: 'Khang', gender: 'male', hairStyle: 'short', top: 'theCaesar', hairColor: 'blonde', hat: 'none', glasses: 'none', facialHair: 'none', skin: 'light', expression: 'surprised', clothing: 'tshirt', clothesTop: 'graphicShirt', clothesColor: 'green', earrings: false, blush: true, freckles: true },
  { name: 'Long', gender: 'male', hairStyle: 'covered', top: 'winterHat03', hairColor: 'none', hat: 'beanie', hatColor: '2563eb', glasses: 'clear', acc: 'round', facialHair: 'beard', fh: 'beardLight', skin: 'light', expression: 'happy', clothing: 'hoodie', clothesTop: 'hoodie', clothesColor: 'white', earrings: false, blush: false, freckles: false },
  { name: 'Minh', gender: 'male', hairStyle: 'short', top: 'shortWaved', hairColor: 'silver', hat: 'none', glasses: 'clear', acc: 'prescription02', facialHair: 'mustache', fh: 'moustacheMagnum', skin: 'light', expression: 'angry', clothing: 'blazer', clothesTop: 'blazerAndShirt', clothesColor: 'blue', earrings: false, blush: false, freckles: false },
  { name: 'Nam', gender: 'male', hairStyle: 'curly', top: 'fro', hairColor: 'black', hat: 'none', glasses: 'sunglasses', acc: 'wayfarers', facialHair: 'none', skin: 'dark', expression: 'happy', clothing: 'tshirt', clothesTop: 'shirtVNeck', clothesColor: 'purple', earrings: true, blush: false, freckles: false },
  { name: 'Nhân', gender: 'male', hairStyle: 'bald', top: 'shortRound', bald: true, hairColor: 'none', hat: 'none', glasses: 'clear', acc: 'round', facialHair: 'none', skin: 'tan', expression: 'surprised', clothing: 'hoodie', clothesTop: 'hoodie', clothesColor: 'yellow', earrings: false, blush: true, freckles: false },
  { name: 'Phát', gender: 'male', hairStyle: 'short', top: 'shavedSides', hairColor: 'red', hat: 'none', glasses: 'sunglasses', acc: 'sunglasses', facialHair: 'beard', fh: 'beardMedium', skin: 'light', expression: 'cheeky', clothing: 'tshirt', clothesTop: 'shirtCrewNeck', clothesColor: 'dark', earrings: true, blush: false, freckles: false, scar: true },
  { name: 'Phong', gender: 'male', hairStyle: 'long', top: 'dreads01', hairColor: 'brown', hat: 'none', glasses: 'none', facialHair: 'mustache', fh: 'moustacheFancy', skin: 'dark', expression: 'happy', clothing: 'overall', clothesTop: 'overall', clothesColor: 'green', earrings: false, blush: false, freckles: false },
  { name: 'Phúc', gender: 'male', hairStyle: 'covered', top: 'turban', hairColor: 'none', hat: 'turban', hatColor: '16a34a', glasses: 'none', facialHair: 'beard', fh: 'beardMajestic', skin: 'tan', expression: 'happy', clothing: 'blazer', clothesTop: 'blazerAndSweater', clothesColor: 'white', earrings: false, blush: false, freckles: false },

  // 13-24
  { name: 'Cúc', gender: 'female', hairStyle: 'long', top: 'longButNotTooLong', hairColor: 'black', hat: 'none', glasses: 'clear', acc: 'prescription01', facialHair: 'none', skin: 'light', expression: 'happy', clothing: 'tshirt', clothesTop: 'collarAndSweater', clothesColor: 'red', earrings: true, blush: true, freckles: false, bow: true },
  { name: 'Giang', gender: 'female', hairStyle: 'short', top: 'bob', hairColor: 'blonde', hat: 'none', glasses: 'sunglasses', acc: 'wayfarers', facialHair: 'none', skin: 'light', expression: 'cheeky', clothing: 'blazer', clothesTop: 'blazerAndShirt', clothesColor: 'purple', earrings: true, blush: false, freckles: false },
  { name: 'Hương', gender: 'female', hairStyle: 'curly', top: 'curly', hairColor: 'brown', hat: 'none', glasses: 'none', facialHair: 'none', skin: 'tan', expression: 'happy', clothing: 'overall', clothesTop: 'overall', clothesColor: 'blue', earrings: false, blush: true, freckles: true, bow: true },
  { name: 'Lan', gender: 'female', hairStyle: 'long', top: 'straight01', hairColor: 'pink', hat: 'none', glasses: 'none', facialHair: 'none', skin: 'light', expression: 'surprised', clothing: 'hoodie', clothesTop: 'hoodie', clothesColor: 'white', earrings: true, blush: true, freckles: false, bow: true },
  { name: 'Linh', gender: 'female', hairStyle: 'covered', top: 'winterHat02', hairColor: 'none', hat: 'beanie', hatColor: 'e03131', glasses: 'none', facialHair: 'none', skin: 'light', expression: 'cheeky', clothing: 'hoodie', clothesTop: 'hoodie', clothesColor: 'green', earrings: false, blush: true, freckles: true },
  { name: 'Mai', gender: 'female', hairStyle: 'short', top: 'miaWallace', hairColor: 'red', hat: 'none', glasses: 'clear', acc: 'round', facialHair: 'none', skin: 'light', expression: 'angry', clothing: 'tshirt', clothesTop: 'shirtScoopNeck', clothesColor: 'yellow', earrings: true, blush: false, freckles: false },
  { name: 'My', gender: 'female', hairStyle: 'curly', top: 'bigHair', hairColor: 'black', hat: 'none', glasses: 'sunglasses', acc: 'sunglasses', facialHair: 'none', skin: 'dark', expression: 'happy', clothing: 'blazer', clothesTop: 'blazerAndSweater', clothesColor: 'red', earrings: true, blush: false, freckles: false },
  { name: 'Nga', gender: 'female', hairStyle: 'covered', top: 'hijab', hairColor: 'none', hat: 'turban', hatColor: '9333ea', glasses: 'clear', acc: 'prescription02', facialHair: 'none', skin: 'tan', expression: 'happy', clothing: 'tshirt', clothesTop: 'collarAndSweater', clothesColor: 'white', earrings: false, blush: true, freckles: false },
  { name: 'Ngọc', gender: 'female', hairStyle: 'long', top: 'bun', hairColor: 'silver', hat: 'none', glasses: 'none', facialHair: 'none', skin: 'light', expression: 'angry', clothing: 'blazer', clothesTop: 'blazerAndShirt', clothesColor: 'dark', earrings: true, blush: false, freckles: false },
  { name: 'Nhi', gender: 'female', hairStyle: 'covered', top: 'hat', hairColor: 'none', hat: 'cap', hatColor: 'eab308', glasses: 'eyepatch', acc: 'eyepatch', facialHair: 'none', skin: 'tan', expression: 'cheeky', clothing: 'overall', clothesTop: 'overall', clothesColor: 'red', earrings: false, blush: false, freckles: true, scar: true },
  { name: 'Nhung', gender: 'female', hairStyle: 'long', top: 'curvy', hairColor: 'brown', hat: 'none', glasses: 'none', facialHair: 'none', skin: 'dark', expression: 'surprised', clothing: 'tshirt', clothesTop: 'shirtCrewNeck', clothesColor: 'yellow', earrings: true, blush: true, freckles: false },
  { name: 'Phương', gender: 'female', hairStyle: 'curly', top: 'froBand', hairColor: 'pink', hat: 'none', glasses: 'clear', acc: 'round', facialHair: 'none', skin: 'tan', expression: 'happy', clothing: 'hoodie', clothesTop: 'hoodie', clothesColor: 'blue', earrings: false, blush: true, freckles: false, bow: true },

  // 25-42
  { name: 'Quân', gender: 'male', hairStyle: 'short', top: 'shortRound', hairColor: 'brown', hat: 'none', glasses: 'eyepatch', acc: 'eyepatch', facialHair: 'none', skin: 'light', expression: 'angry', clothing: 'tshirt', clothesTop: 'shirtCrewNeck', clothesColor: 'red', earrings: true, blush: false, freckles: false, scar: true },
  { name: 'Quang', gender: 'male', hairStyle: 'curly', top: 'frizzle', hairColor: 'blonde', hat: 'none', glasses: 'clear', acc: 'prescription02', facialHair: 'mustache', fh: 'moustacheMagnum', skin: 'light', expression: 'surprised', clothing: 'blazer', clothesTop: 'blazerAndSweater', clothesColor: 'green', earrings: false, blush: false, freckles: true },
  { name: 'Quyên', gender: 'female', hairStyle: 'short', top: 'bob', hairColor: 'black', hat: 'none', glasses: 'none', facialHair: 'none', skin: 'dark', expression: 'angry', clothing: 'hoodie', clothesTop: 'hoodie', clothesColor: 'purple', earrings: true, blush: false, freckles: false },
  { name: 'Quỳnh', gender: 'female', hairStyle: 'long', top: 'straight02', hairColor: 'red', hat: 'none', glasses: 'sunglasses', acc: 'wayfarers', facialHair: 'none', skin: 'light', expression: 'happy', clothing: 'tshirt', clothesTop: 'shirtVNeck', clothesColor: 'dark', earrings: true, blush: false, freckles: true },
  { name: 'Sơn', gender: 'male', hairStyle: 'bald', top: 'shortFlat', bald: true, hairColor: 'none', hat: 'none', glasses: 'sunglasses', acc: 'sunglasses', facialHair: 'mustache', fh: 'moustacheFancy', skin: 'light', expression: 'cheeky', clothing: 'blazer', clothesTop: 'blazerAndShirt', clothesColor: 'yellow', earrings: false, blush: false, freckles: false },
  { name: 'Tâm', gender: 'female', hairStyle: 'covered', top: 'winterHat04', hairColor: 'none', hat: 'beanie', hatColor: '16a34a', glasses: 'clear', acc: 'prescription01', facialHair: 'none', skin: 'tan', expression: 'happy', clothing: 'overall', clothesTop: 'overall', clothesColor: 'purple', earrings: true, blush: true, freckles: false },
  { name: 'Tân', gender: 'male', hairStyle: 'short', top: 'theCaesarAndSidePart', hairColor: 'black', hat: 'none', glasses: 'none', facialHair: 'beard', fh: 'beardLight', skin: 'tan', expression: 'surprised', clothing: 'hoodie', clothesTop: 'hoodie', clothesColor: 'blue', earrings: false, blush: false, freckles: false },
  { name: 'Thảo', gender: 'female', hairStyle: 'long', top: 'longButNotTooLong', hairColor: 'blonde', hat: 'none', glasses: 'none', facialHair: 'none', skin: 'tan', expression: 'happy', clothing: 'tshirt', clothesTop: 'graphicShirt', clothesColor: 'green', earrings: false, blush: true, freckles: true, bow: true },
  { name: 'Thắng', gender: 'male', hairStyle: 'curly', top: 'shortCurly', hairColor: 'silver', hat: 'none', glasses: 'clear', acc: 'round', facialHair: 'none', skin: 'dark', expression: 'happy', clothing: 'overall', clothesTop: 'overall', clothesColor: 'red', earrings: false, blush: false, freckles: false },
  { name: 'Thành', gender: 'male', hairStyle: 'covered', top: 'hat', hairColor: 'none', hat: 'cap', hatColor: '2563eb', glasses: 'none', facialHair: 'beard', fh: 'beardMedium', skin: 'light', expression: 'angry', clothing: 'hoodie', clothesTop: 'hoodie', clothesColor: 'dark', earrings: false, blush: false, freckles: false, scar: true },
  { name: 'Thư', gender: 'female', hairStyle: 'curly', top: 'curly', hairColor: 'red', hat: 'none', glasses: 'clear', acc: 'prescription01', facialHair: 'none', skin: 'light', expression: 'surprised', clothing: 'blazer', clothesTop: 'blazerAndSweater', clothesColor: 'white', earrings: true, blush: true, freckles: true },
  { name: 'Tiến', gender: 'male', hairStyle: 'long', top: 'dreads', hairColor: 'black', hat: 'none', glasses: 'sunglasses', acc: 'wayfarers', facialHair: 'none', skin: 'tan', expression: 'angry', clothing: 'tshirt', clothesTop: 'shirtCrewNeck', clothesColor: 'yellow', earrings: true, blush: false, freckles: false },
  { name: 'Toàn', gender: 'male', hairStyle: 'short', top: 'shortWaved', hairColor: 'pink', hat: 'none', glasses: 'none', facialHair: 'none', skin: 'light', expression: 'cheeky', clothing: 'hoodie', clothesTop: 'hoodie', clothesColor: 'purple', earrings: true, blush: true, freckles: false },
  { name: 'Trang', gender: 'female', hairStyle: 'short', top: 'miaWallace', hairColor: 'silver', hat: 'none', glasses: 'sunglasses', acc: 'sunglasses', facialHair: 'none', skin: 'light', expression: 'angry', clothing: 'blazer', clothesTop: 'blazerAndShirt', clothesColor: 'red', earrings: true, blush: false, freckles: false },
  { name: 'Trí', gender: 'male', hairStyle: 'covered', top: 'winterHat02', hairColor: 'none', hat: 'beanie', hatColor: '9333ea', glasses: 'eyepatch', acc: 'eyepatch', facialHair: 'none', skin: 'dark', expression: 'happy', clothing: 'tshirt', clothesTop: 'collarAndSweater', clothesColor: 'blue', earrings: false, blush: false, freckles: false },
  { name: 'Trọng', gender: 'male', hairStyle: 'bald', top: 'shortFlat', bald: true, hairColor: 'none', hat: 'none', glasses: 'none', facialHair: 'mustache', fh: 'moustacheMagnum', skin: 'light', expression: 'happy', clothing: 'tshirt', clothesTop: 'shirtVNeck', clothesColor: 'green', earrings: false, blush: true, freckles: false },
  { name: 'Trúc', gender: 'female', hairStyle: 'covered', top: 'hijab', hairColor: 'none', hat: 'turban', hatColor: 'e03131', glasses: 'sunglasses', acc: 'wayfarers', facialHair: 'none', skin: 'light', expression: 'cheeky', clothing: 'hoodie', clothesTop: 'hoodie', clothesColor: 'yellow', earrings: false, blush: true, freckles: false },
  { name: 'Tú', gender: 'female', hairStyle: 'long', top: 'bun', hairColor: 'pink', hat: 'none', glasses: 'eyepatch', acc: 'eyepatch', facialHair: 'none', skin: 'tan', expression: 'angry', clothing: 'tshirt', clothesTop: 'graphicShirt', clothesColor: 'dark', earrings: true, blush: false, freckles: false, scar: true },

  // 43-60
  { name: 'Tuấn', gender: 'male', hairStyle: 'short', top: 'shortFlat', hairColor: 'red', hat: 'none', glasses: 'clear', acc: 'prescription02', facialHair: 'beard', fh: 'beardLight', skin: 'tan', expression: 'happy', clothing: 'blazer', clothesTop: 'blazerAndShirt', clothesColor: 'purple', earrings: false, blush: false, freckles: true },
  { name: 'Tùng', gender: 'male', hairStyle: 'curly', top: 'fro', hairColor: 'brown', hat: 'none', glasses: 'none', facialHair: 'beard', fh: 'beardMajestic', skin: 'dark', expression: 'surprised', clothing: 'tshirt', clothesTop: 'shirtCrewNeck', clothesColor: 'white', earrings: true, blush: false, freckles: false },
  { name: 'Tuyền', gender: 'female', hairStyle: 'short', top: 'bob', hairColor: 'brown', hat: 'none', glasses: 'clear', acc: 'round', facialHair: 'none', skin: 'tan', expression: 'surprised', clothing: 'overall', clothesTop: 'overall', clothesColor: 'green', earrings: false, blush: true, freckles: false, bow: true },
  { name: 'Uyên', gender: 'female', hairStyle: 'long', top: 'curvy', hairColor: 'black', hat: 'none', glasses: 'sunglasses', acc: 'sunglasses', facialHair: 'none', skin: 'light', expression: 'happy', clothing: 'tshirt', clothesTop: 'shirtScoopNeck', clothesColor: 'blue', earrings: true, blush: false, freckles: true },
  { name: 'Vân', gender: 'female', hairStyle: 'curly', top: 'bigHair', hairColor: 'blonde', hat: 'none', glasses: 'none', facialHair: 'none', skin: 'dark', expression: 'cheeky', clothing: 'blazer', clothesTop: 'blazerAndSweater', clothesColor: 'yellow', earrings: true, blush: false, freckles: false },
  { name: 'Việt', gender: 'male', hairStyle: 'covered', top: 'turban', hairColor: 'none', hat: 'turban', hatColor: '2563eb', glasses: 'clear', acc: 'prescription01', facialHair: 'none', skin: 'light', expression: 'angry', clothing: 'overall', clothesTop: 'overall', clothesColor: 'dark', earrings: false, blush: false, freckles: false },
  { name: 'Vinh', gender: 'male', hairStyle: 'short', top: 'shavedSides', hairColor: 'blonde', hat: 'none', glasses: 'sunglasses', acc: 'wayfarers', facialHair: 'none', skin: 'tan', expression: 'happy', clothing: 'hoodie', clothesTop: 'hoodie', clothesColor: 'green', earrings: true, blush: false, freckles: false },
  { name: 'Vũ', gender: 'male', hairStyle: 'bald', top: 'shortFlat', bald: true, hairColor: 'none', hat: 'none', glasses: 'eyepatch', acc: 'eyepatch', facialHair: 'beard', fh: 'beardMedium', skin: 'tan', expression: 'angry', clothing: 'tshirt', clothesTop: 'graphicShirt', clothesColor: 'red', earrings: true, blush: false, freckles: false, scar: true },
  { name: 'Vy', gender: 'female', hairStyle: 'long', top: 'straight01', hairColor: 'silver', hat: 'none', glasses: 'clear', acc: 'prescription02', facialHair: 'none', skin: 'light', expression: 'happy', clothing: 'hoodie', clothesTop: 'hoodie', clothesColor: 'red', earrings: false, blush: true, freckles: true },
  { name: 'Xuân', gender: 'female', hairStyle: 'covered', top: 'hat', hairColor: 'none', hat: 'cap', hatColor: '16a34a', glasses: 'none', facialHair: 'none', skin: 'light', expression: 'happy', clothing: 'tshirt', clothesTop: 'collarAndSweater', clothesColor: 'blue', earrings: true, blush: true, freckles: false },
  { name: 'Yến', gender: 'female', hairStyle: 'short', top: 'miaWallace', hairColor: 'pink', hat: 'none', glasses: 'none', facialHair: 'none', skin: 'dark', expression: 'cheeky', clothing: 'overall', clothesTop: 'overall', clothesColor: 'white', earrings: true, blush: false, freckles: false, bow: true },
  { name: 'Ánh', gender: 'female', hairStyle: 'long', top: 'straight02', hairColor: 'brown', hat: 'none', glasses: 'eyepatch', acc: 'eyepatch', facialHair: 'none', skin: 'light', expression: 'surprised', clothing: 'blazer', clothesTop: 'blazerAndShirt', clothesColor: 'green', earrings: false, blush: true, freckles: false },
  { name: 'Đạt', gender: 'male', hairStyle: 'covered', top: 'winterHat03', hairColor: 'none', hat: 'beanie', hatColor: 'eab308', glasses: 'sunglasses', acc: 'sunglasses', facialHair: 'mustache', fh: 'moustacheFancy', skin: 'dark', expression: 'happy', clothing: 'tshirt', clothesTop: 'shirtCrewNeck', clothesColor: 'purple', earrings: false, blush: false, freckles: false },
  { name: 'Thịnh', gender: 'male', hairStyle: 'curly', top: 'frizzle', hairColor: 'black', hat: 'none', glasses: 'none', facialHair: 'beard', fh: 'beardLight', skin: 'light', expression: 'cheeky', clothing: 'blazer', clothesTop: 'blazerAndSweater', clothesColor: 'red', earrings: false, blush: true, freckles: false },
  { name: 'Thiên', gender: 'male', hairStyle: 'long', top: 'dreads02', hairColor: 'silver', hat: 'none', glasses: 'clear', acc: 'round', facialHair: 'none', skin: 'dark', expression: 'surprised', clothing: 'hoodie', clothesTop: 'hoodie', clothesColor: 'white', earrings: true, blush: false, freckles: false },
  { name: 'Thương', gender: 'female', hairStyle: 'covered', top: 'winterHat04', hairColor: 'none', hat: 'beanie', hatColor: '9333ea', glasses: 'sunglasses', acc: 'sunglasses', facialHair: 'none', skin: 'tan', expression: 'angry', clothing: 'tshirt', clothesTop: 'shirtVNeck', clothesColor: 'dark', earrings: true, blush: false, freckles: true },
  { name: 'Kiệt', gender: 'male', hairStyle: 'short', top: 'theCaesar', hairColor: 'brown', hat: 'none', glasses: 'none', facialHair: 'mustache', fh: 'moustacheMagnum', skin: 'tan', expression: 'angry', clothing: 'overall', clothesTop: 'overall', clothesColor: 'blue', earrings: false, blush: false, freckles: true, scar: true },
  { name: 'Châu', gender: 'female', hairStyle: 'curly', top: 'froBand', hairColor: 'red', hat: 'none', glasses: 'none', facialHair: 'none', skin: 'dark', expression: 'happy', clothing: 'hoodie', clothesTop: 'hoodie', clothesColor: 'yellow', earrings: false, blush: false, freckles: false },

  // 61-100: +40 nhân vật mới siêu đa dạng (sẹo, nơ, mũ, kính, râu, màu da, tóc màu độc đáo)
  { name: 'Bình', gender: 'male', hairStyle: 'short', top: 'shortFlat', hairColor: 'black', hat: 'none', glasses: 'sunglasses', acc: 'sunglasses', facialHair: 'beard', fh: 'beardMedium', skin: 'dark', expression: 'angry', clothing: 'hoodie', clothesTop: 'hoodie', clothesColor: 'green', earrings: false, blush: false, freckles: false, scar: true },
  { name: 'Cảnh', gender: 'male', hairStyle: 'bald', top: 'shortRound', bald: true, hairColor: 'none', hat: 'none', glasses: 'clear', acc: 'prescription02', facialHair: 'beard', fh: 'beardMajestic', skin: 'tan', expression: 'happy', clothing: 'blazer', clothesTop: 'blazerAndShirt', clothesColor: 'blue', earrings: true, blush: false, freckles: false },
  { name: 'Chi', gender: 'female', hairStyle: 'long', top: 'straight02', hairColor: 'black', hat: 'none', glasses: 'none', facialHair: 'none', skin: 'light', expression: 'cheeky', clothing: 'tshirt', clothesTop: 'shirtCrewNeck', clothesColor: 'red', earrings: false, blush: true, freckles: true, bow: true },
  { name: 'Công', gender: 'male', hairStyle: 'covered', top: 'hat', hairColor: 'none', hat: 'cap', hatColor: '9333ea', glasses: 'clear', acc: 'round', facialHair: 'none', skin: 'light', expression: 'surprised', clothing: 'overall', clothesTop: 'overall', clothesColor: 'white', earrings: true, blush: false, freckles: false },
  { name: 'Cường', gender: 'male', hairStyle: 'curly', top: 'shortCurly', hairColor: 'red', hat: 'none', glasses: 'none', facialHair: 'mustache', fh: 'moustacheFancy', skin: 'tan', expression: 'angry', clothing: 'tshirt', clothesTop: 'shirtVNeck', clothesColor: 'dark', earrings: false, blush: false, freckles: true, scar: true },
  { name: 'Duy', gender: 'male', hairStyle: 'short', top: 'theCaesarAndSidePart', hairColor: 'blonde', hat: 'none', glasses: 'clear', acc: 'prescription01', facialHair: 'none', skin: 'dark', expression: 'happy', clothing: 'hoodie', clothesTop: 'hoodie', clothesColor: 'yellow', earrings: false, blush: false, freckles: false },
  { name: 'Duyên', gender: 'female', hairStyle: 'curly', top: 'curly', hairColor: 'silver', hat: 'none', glasses: 'sunglasses', acc: 'wayfarers', facialHair: 'none', skin: 'light', expression: 'happy', clothing: 'tshirt', clothesTop: 'collarAndSweater', clothesColor: 'purple', earrings: true, blush: true, freckles: false },
  { name: 'Đào', gender: 'female', hairStyle: 'short', top: 'bob', hairColor: 'pink', hat: 'none', glasses: 'clear', acc: 'round', facialHair: 'none', skin: 'light', expression: 'happy', clothing: 'blazer', clothesTop: 'blazerAndSweater', clothesColor: 'red', earrings: false, blush: true, freckles: true, bow: true },
  { name: 'Đức', gender: 'male', hairStyle: 'long', top: 'dreads01', hairColor: 'brown', hat: 'none', glasses: 'eyepatch', acc: 'eyepatch', facialHair: 'none', skin: 'light', expression: 'angry', clothing: 'hoodie', clothesTop: 'hoodie', clothesColor: 'dark', earrings: true, blush: false, freckles: false, scar: true },
  { name: 'Giáp', gender: 'male', hairStyle: 'covered', top: 'winterHat02', hairColor: 'none', hat: 'beanie', hatColor: 'e03131', glasses: 'none', facialHair: 'mustache', fh: 'moustacheMagnum', skin: 'tan', expression: 'surprised', clothing: 'tshirt', clothesTop: 'graphicShirt', clothesColor: 'green', earrings: false, blush: true, freckles: false },
  { name: 'Hà', gender: 'female', hairStyle: 'covered', top: 'hijab', hairColor: 'none', hat: 'turban', hatColor: '2563eb', glasses: 'none', facialHair: 'none', skin: 'dark', expression: 'happy', clothing: 'tshirt', clothesTop: 'shirtScoopNeck', clothesColor: 'yellow', earrings: true, blush: false, freckles: false },
  { name: 'Hải', gender: 'male', hairStyle: 'short', top: 'shavedSides', hairColor: 'silver', hat: 'none', glasses: 'none', facialHair: 'beard', fh: 'beardLight', skin: 'light', expression: 'cheeky', clothing: 'overall', clothesTop: 'overall', clothesColor: 'red', earrings: true, blush: false, freckles: false },
  { name: 'Hân', gender: 'female', hairStyle: 'long', top: 'bun', hairColor: 'black', hat: 'none', glasses: 'clear', acc: 'prescription02', facialHair: 'none', skin: 'tan', expression: 'surprised', clothing: 'hoodie', clothesTop: 'hoodie', clothesColor: 'purple', earrings: true, blush: false, freckles: true },
  { name: 'Hằng', gender: 'female', hairStyle: 'curly', top: 'bigHair', hairColor: 'brown', hat: 'none', glasses: 'eyepatch', acc: 'eyepatch', facialHair: 'none', skin: 'light', expression: 'angry', clothing: 'blazer', clothesTop: 'blazerAndShirt', clothesColor: 'white', earrings: true, blush: false, freckles: false, scar: true },
  { name: 'Hiếu', gender: 'male', hairStyle: 'bald', top: 'shortFlat', bald: true, hairColor: 'none', hat: 'none', glasses: 'sunglasses', acc: 'wayfarers', facialHair: 'none', skin: 'dark', expression: 'cheeky', clothing: 'tshirt', clothesTop: 'shirtCrewNeck', clothesColor: 'blue', earrings: true, blush: false, freckles: false },
  { name: 'Hòa', gender: 'female', hairStyle: 'covered', top: 'winterHat03', hairColor: 'none', hat: 'beanie', hatColor: 'eab308', glasses: 'clear', acc: 'round', facialHair: 'none', skin: 'light', expression: 'cheeky', clothing: 'overall', clothesTop: 'overall', clothesColor: 'green', earrings: false, blush: true, freckles: false },
  { name: 'Hoàng', gender: 'male', hairStyle: 'curly', top: 'fro', hairColor: 'blonde', hat: 'none', glasses: 'sunglasses', acc: 'sunglasses', facialHair: 'beard', fh: 'beardMedium', skin: 'light', expression: 'happy', clothing: 'blazer', clothesTop: 'blazerAndSweater', clothesColor: 'red', earrings: false, blush: false, freckles: false },
  { name: 'Hùng', gender: 'male', hairStyle: 'short', top: 'shortRound', hairColor: 'red', hat: 'none', glasses: 'none', facialHair: 'none', skin: 'dark', expression: 'surprised', clothing: 'tshirt', clothesTop: 'collarAndSweater', clothesColor: 'white', earrings: false, blush: true, freckles: true },
  { name: 'Huy', gender: 'male', hairStyle: 'covered', top: 'turban', hairColor: 'none', hat: 'turban', hatColor: 'eab308', glasses: 'eyepatch', acc: 'eyepatch', facialHair: 'mustache', fh: 'moustacheFancy', skin: 'light', expression: 'angry', clothing: 'hoodie', clothesTop: 'hoodie', clothesColor: 'blue', earrings: true, blush: false, freckles: false, scar: true },
  { name: 'Huyền', gender: 'female', hairStyle: 'short', top: 'miaWallace', hairColor: 'black', hat: 'none', glasses: 'sunglasses', acc: 'sunglasses', facialHair: 'none', skin: 'tan', expression: 'happy', clothing: 'tshirt', clothesTop: 'shirtVNeck', clothesColor: 'green', earrings: true, blush: false, freckles: false },
  { name: 'Khánh', gender: 'male', hairStyle: 'long', top: 'dreads', hairColor: 'blonde', hat: 'none', glasses: 'clear', acc: 'prescription01', facialHair: 'beard', fh: 'beardMajestic', skin: 'tan', expression: 'happy', clothing: 'tshirt', clothesTop: 'graphicShirt', clothesColor: 'purple', earrings: true, blush: false, freckles: false },
  { name: 'Khoa', gender: 'male', hairStyle: 'short', top: 'shortWaved', hairColor: 'brown', hat: 'none', glasses: 'none', facialHair: 'beard', fh: 'beardLight', skin: 'light', expression: 'cheeky', clothing: 'hoodie', clothesTop: 'hoodie', clothesColor: 'red', earrings: false, blush: false, freckles: true },
  { name: 'Kiên', gender: 'male', hairStyle: 'bald', top: 'shortFlat', bald: true, hairColor: 'none', hat: 'none', glasses: 'none', facialHair: 'none', skin: 'tan', expression: 'angry', clothing: 'overall', clothesTop: 'overall', clothesColor: 'dark', earrings: false, blush: false, freckles: true, scar: true },
  { name: 'Lâm', gender: 'male', hairStyle: 'covered', top: 'hat', hairColor: 'none', hat: 'cap', hatColor: '16a34a', glasses: 'none', facialHair: 'none', skin: 'dark', expression: 'happy', clothing: 'blazer', clothesTop: 'blazerAndShirt', clothesColor: 'yellow', earrings: false, blush: true, freckles: false },
  { name: 'Lộc', gender: 'male', hairStyle: 'curly', top: 'frizzle', hairColor: 'red', hat: 'none', glasses: 'clear', acc: 'round', facialHair: 'none', skin: 'tan', expression: 'cheeky', clothing: 'tshirt', clothesTop: 'shirtCrewNeck', clothesColor: 'white', earrings: true, blush: true, freckles: false },
  { name: 'Lợi', gender: 'male', hairStyle: 'short', top: 'theCaesar', hairColor: 'silver', hat: 'none', glasses: 'sunglasses', acc: 'wayfarers', facialHair: 'none', skin: 'tan', expression: 'angry', clothing: 'hoodie', clothesTop: 'hoodie', clothesColor: 'blue', earrings: true, blush: false, freckles: false },
  { name: 'Luân', gender: 'male', hairStyle: 'long', top: 'dreads02', hairColor: 'pink', hat: 'none', glasses: 'none', facialHair: 'mustache', fh: 'moustacheMagnum', skin: 'light', expression: 'surprised', clothing: 'tshirt', clothesTop: 'shirtScoopNeck', clothesColor: 'dark', earrings: true, blush: false, freckles: false },
  { name: 'Ly', gender: 'female', hairStyle: 'long', top: 'curvy', hairColor: 'blonde', hat: 'none', glasses: 'clear', acc: 'prescription01', facialHair: 'none', skin: 'dark', expression: 'cheeky', clothing: 'hoodie', clothesTop: 'hoodie', clothesColor: 'yellow', earrings: false, blush: true, freckles: false, bow: true },
  { name: 'Mạnh', gender: 'male', hairStyle: 'covered', top: 'winterHat04', hairColor: 'none', hat: 'beanie', hatColor: '2563eb', glasses: 'sunglasses', acc: 'sunglasses', facialHair: 'beard', fh: 'beardMedium', skin: 'light', expression: 'angry', clothing: 'blazer', clothesTop: 'blazerAndSweater', clothesColor: 'green', earrings: false, blush: false, freckles: false, scar: true },
  { name: 'Nghĩa', gender: 'male', hairStyle: 'curly', top: 'shortCurly', hairColor: 'black', hat: 'none', glasses: 'eyepatch', acc: 'eyepatch', facialHair: 'mustache', fh: 'moustacheFancy', skin: 'light', expression: 'happy', clothing: 'tshirt', clothesTop: 'collarAndSweater', clothesColor: 'red', earrings: false, blush: false, freckles: false, scar: true },
  { name: 'Ngân', gender: 'female', hairStyle: 'short', top: 'bob', hairColor: 'silver', hat: 'none', glasses: 'none', facialHair: 'none', skin: 'tan', expression: 'happy', clothing: 'tshirt', clothesTop: 'shirtCrewNeck', clothesColor: 'white', earrings: true, blush: true, freckles: true, bow: true },
  { name: 'Nguyên', gender: 'male', hairStyle: 'short', top: 'shortFlat', hairColor: 'pink', hat: 'none', glasses: 'clear', acc: 'prescription02', facialHair: 'none', skin: 'dark', expression: 'happy', clothing: 'blazer', clothesTop: 'blazerAndShirt', clothesColor: 'purple', earrings: true, blush: false, freckles: false },
  { name: 'Oanh', gender: 'female', hairStyle: 'covered', top: 'hat', hairColor: 'none', hat: 'cap', hatColor: 'e03131', glasses: 'sunglasses', acc: 'wayfarers', facialHair: 'none', skin: 'light', expression: 'surprised', clothing: 'hoodie', clothesTop: 'hoodie', clothesColor: 'dark', earrings: true, blush: false, freckles: true },
  { name: 'Phi', gender: 'male', hairStyle: 'curly', top: 'froBand', hairColor: 'brown', hat: 'none', glasses: 'none', facialHair: 'none', skin: 'light', expression: 'surprised', clothing: 'overall', clothesTop: 'overall', clothesColor: 'green', earrings: false, blush: true, freckles: false },
  { name: 'Sáng', gender: 'male', hairStyle: 'covered', top: 'turban', hairColor: 'none', hat: 'turban', hatColor: '9333ea', glasses: 'sunglasses', acc: 'sunglasses', facialHair: 'beard', fh: 'beardLight', skin: 'tan', expression: 'happy', clothing: 'tshirt', clothesTop: 'shirtVNeck', clothesColor: 'yellow', earrings: false, blush: false, freckles: false },
  { name: 'Siêu', gender: 'male', hairStyle: 'bald', top: 'shortFlat', bald: true, hairColor: 'none', hat: 'none', glasses: 'clear', acc: 'round', facialHair: 'mustache', fh: 'moustacheMagnum', skin: 'dark', expression: 'happy', clothing: 'hoodie', clothesTop: 'hoodie', clothesColor: 'purple', earrings: true, blush: false, freckles: false },
  { name: 'Thái', gender: 'male', hairStyle: 'long', top: 'dreads01', hairColor: 'red', hat: 'none', glasses: 'none', facialHair: 'none', skin: 'light', expression: 'happy', clothing: 'tshirt', clothesTop: 'graphicShirt', clothesColor: 'blue', earrings: false, blush: true, freckles: true },
  { name: 'Thiện', gender: 'male', hairStyle: 'short', top: 'theCaesarAndSidePart', hairColor: 'brown', hat: 'none', glasses: 'sunglasses', acc: 'wayfarers', facialHair: 'none', skin: 'light', expression: 'cheeky', clothing: 'blazer', clothesTop: 'blazerAndSweater', clothesColor: 'white', earrings: true, blush: false, freckles: false },
  { name: 'Thủy', gender: 'female', hairStyle: 'curly', top: 'curly', hairColor: 'black', hat: 'none', glasses: 'clear', acc: 'prescription01', facialHair: 'none', skin: 'dark', expression: 'surprised', clothing: 'overall', clothesTop: 'overall', clothesColor: 'red', earrings: true, blush: true, freckles: false, bow: true },
  { name: 'Tín', gender: 'male', hairStyle: 'covered', top: 'winterHat02', hairColor: 'none', hat: 'beanie', hatColor: '16a34a', glasses: 'none', facialHair: 'none', skin: 'tan', expression: 'angry', clothing: 'hoodie', clothesTop: 'hoodie', clothesColor: 'white', earrings: false, blush: false, freckles: true, scar: true },
];

export const WHO_IS_IT_CHARACTERS: WhoIsItCharacter[] = RAW_CHARACTERS.map((s, idx) => {
  const exp = exprVisual(s.expression, idx);
  return {
    id: `wi_${String(idx + 1).padStart(3, '0')}`,
    name: s.name,
    gender: s.gender,
    hairStyle: s.hairStyle,
    hairColor: s.hairColor,
    hat: s.hat,
    glasses: s.glasses,
    facialHair: s.facialHair,
    skin: s.skin,
    expression: s.expression,
    clothing: s.clothing,
    clothesColor: s.clothesColor,
    earrings: s.earrings,
    blush: s.blush,
    freckles: s.freckles,
    scar: s.scar ?? false,
    bow: s.bow ?? false,
    visual: {
      top: s.top,
      ...(s.bald ? { bald: true } : {}),
      hairColor: HAIR_HEX[s.hairColor],
      ...(s.hatColor ? { hatColor: s.hatColor } : {}),
      skinColor: SKIN_HEX[s.skin],
      ...(s.acc ? { accessories: s.acc } : {}),
      ...(s.fh ? { facialHair: s.fh, facialHairColor: s.hairColor !== 'none' ? HAIR_HEX[s.hairColor] : '2c1b18' } : {}),
      eyes: exp.eyes,
      eyebrows: exp.eyebrows,
      mouth: exp.mouth,
      clothing: s.clothesTop,
      clothesColor: CLOTHES_HEX[s.clothesColor],
      bgColor: BG_CYCLE[idx % BG_CYCLE.length],
    },
  };
});

export const WHO_IS_IT_CHARACTER_MAP = new Map<string, WhoIsItCharacter>(
  WHO_IS_IT_CHARACTERS.map((c) => [c.id, c]),
);

export const WHO_IS_IT_TRAITS: WhoIsItTraitDef[] = [
  // Tóc & Mũ (10)
  { key: 'gender_male', group: 'toc_mu', label: 'Là Nam?', shortLabel: 'Nam', match: (c) => c.gender === 'male' },
  { key: 'gender_female', group: 'toc_mu', label: 'Là Nữ?', shortLabel: 'Nữ', match: (c) => c.gender === 'female' },
  { key: 'hat_any', group: 'toc_mu', label: 'Đang đội mũ / khăn?', shortLabel: 'Đội mũ/khăn', match: (c) => c.hat !== 'none' },
  { key: 'hat_beanie', group: 'toc_mu', label: 'Đội mũ len?', shortLabel: 'Mũ len', match: (c) => c.hat === 'beanie' },
  { key: 'hat_cap', group: 'toc_mu', label: 'Đội mũ lưỡi trai?', shortLabel: 'Mũ lưỡi trai', match: (c) => c.hat === 'cap' },
  { key: 'hair_bald', group: 'toc_mu', label: 'Đầu trọc?', shortLabel: 'Trọc đầu', match: (c) => c.hairStyle === 'bald' },
  { key: 'hair_long', group: 'toc_mu', label: 'Tóc dài / búi?', shortLabel: 'Tóc dài', match: (c) => c.hairStyle === 'long' },
  { key: 'hair_short', group: 'toc_mu', label: 'Tóc ngắn?', shortLabel: 'Tóc ngắn', match: (c) => c.hairStyle === 'short' },
  { key: 'hair_curly', group: 'toc_mu', label: 'Tóc xoăn / xù?', shortLabel: 'Tóc xoăn/xù', match: (c) => c.hairStyle === 'curly' },
  { key: 'hair_dark', group: 'toc_mu', label: 'Tóc đen hoặc nâu?', shortLabel: 'Tóc đen/nâu', match: (c) => c.hairColor === 'black' || c.hairColor === 'brown' },

  // Mắt & Kính (8)
  { key: 'glasses_any', group: 'mat_kinh', label: 'Đeo kính (cận/râm)?', shortLabel: 'Đeo kính', match: (c) => c.glasses === 'clear' || c.glasses === 'sunglasses' },
  { key: 'glasses_sun', group: 'mat_kinh', label: 'Đeo kính râm?', shortLabel: 'Kính râm', match: (c) => c.glasses === 'sunglasses' },
  { key: 'glasses_clear', group: 'mat_kinh', label: 'Đeo kính gọng trong?', shortLabel: 'Kính cận', match: (c) => c.glasses === 'clear' },
  { key: 'eyepatch', group: 'mat_kinh', label: 'Đeo bịt mắt?', shortLabel: 'Bịt mắt', match: (c) => c.glasses === 'eyepatch' },
  { key: 'exp_happy', group: 'mat_kinh', label: 'Đang cười tươi?', shortLabel: 'Cười tươi', match: (c) => c.expression === 'happy' },
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

export function selectWhoIsItBoard(boardSize: number, rng: () => number = Math.random): WhoIsItCharacter[] {
  const n = Math.min(WHO_IS_IT_CHARACTERS.length, Math.max(12, boardSize));
  const pool = [...WHO_IS_IT_CHARACTERS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
}
