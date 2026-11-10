import {
  PLAYER_COLORS,
  type CharacterAge,
  type CharacterConfig,
  type CharacterGender,
  type CharacterHair,
} from '../../shared/src/types';

/** 16 avatar thú, mỗi con một màu nền. Server gán chỉ số không trùng trong phòng. */
export const AVATARS = [
  { emoji: '🐶', bg: '#FFD8A8' },
  { emoji: '🐱', bg: '#FFE066' },
  { emoji: '🐸', bg: '#B2F2BB' },
  { emoji: '🐼', bg: '#E9ECEF' },
  { emoji: '🦊', bg: '#FFC078' },
  { emoji: '🐷', bg: '#FCC2D7' },
  { emoji: '🐵', bg: '#D8C3A5' },
  { emoji: '🐯', bg: '#FFD43B' },
  { emoji: '🐰', bg: '#EEBEFA' },
  { emoji: '🐻', bg: '#E6C7A8' },
  { emoji: '🐨', bg: '#C5D3E8' },
  { emoji: '🐮', bg: '#D3F9D8' },
  { emoji: '🐔', bg: '#FFF3BF' },
  { emoji: '🐧', bg: '#A5D8FF' },
  { emoji: '🦄', bg: '#F3D9FA' },
  { emoji: '🐲', bg: '#C3FAE8' },
];

export function avatarOf(i: number) {
  return AVATARS[((i % AVATARS.length) + AVATARS.length) % AVATARS.length];
}

export const GENDER_OPTIONS: { id: CharacterGender; label: string; icon: string }[] = [
  { id: 'nam', label: 'Nam', icon: '♂️' },
  { id: 'nu', label: 'Nữ', icon: '♀️' },
  { id: 'khac', label: 'Cá tính', icon: '✨' },
];

export const AGE_OPTIONS: { id: CharacterAge; label: string }[] = [
  { id: 'nhi', label: 'Nhí' },
  { id: 'tre', label: 'Thanh niên' },
  { id: 'trung', label: 'Doanh nhân' },
  { id: 'lao', label: 'Đại gia' },
];

export const HAIR_OPTIONS: { id: CharacterHair; label: string }[] = [
  { id: 'ngan', label: 'Tóc ngắn' },
  { id: 'han', label: 'Hàn Quốc' },
  { id: 'xoan', label: 'Tóc xoăn' },
  { id: 'dai', label: 'Tóc dài' },
  { id: 'bui', label: 'Tóc búi' },
  { id: 'undercut', label: 'Undercut' },
];

export function playerColorOf(c?: CharacterConfig | number) {
  const idx = typeof c === 'number' ? c : c?.color ?? 0;
  return PLAYER_COLORS[((idx % PLAYER_COLORS.length) + PLAYER_COLORS.length) % PLAYER_COLORS.length];
}

/** Vẽ chân dung SVG sắc nét theo cấu hình nhân vật (giới tính, độ tuổi, kiểu tóc, màu đại diện). */
export function characterSvgUri(cfg?: CharacterConfig): string {
  const c: CharacterConfig = cfg ?? { gender: 'nam', age: 'tre', hair: 'han', color: 0 };
  const col = playerColorOf(c.color);
  const hairFill = c.age === 'lao' ? '#CED4DA' : c.gender === 'nu' ? '#3B231A' : '#241814';
  const hairStroke = '#15110F';
  const skin = c.gender === 'nu' ? '#FFE4C9' : '#FAD6B3';
  const skinShadow = '#EAC098';

  // Tóc sau lưng (cho tóc dài / xoăn / búi)
  const backHair =
    c.hair === 'dai'
      ? `<path d="M22 44 C16 62, 18 85, 25 94 L75 94 C82 85, 84 62, 78 44 Z" fill="${hairFill}" stroke="${hairStroke}" stroke-width="2.5"/>`
      : c.hair === 'bui'
        ? `<circle cx="50" cy="14" r="13" fill="${hairFill}" stroke="${hairStroke}" stroke-width="2.5"/>
           <path d="M38 19 Q50 14 62 19" stroke="${col.hex}" stroke-width="4" fill="none" stroke-linecap="round"/>`
        : c.hair === 'xoan'
          ? `<circle cx="26" cy="40" r="10" fill="${hairFill}"/><circle cx="74" cy="40" r="10" fill="${hairFill}"/>`
          : '';

  // Trang phục theo độ tuổi & màu sắc
  const outfit =
    c.age === 'trung'
      ? `<path d="M16 98 C18 76, 32 70, 50 70 C68 70, 82 76, 84 98 Z" fill="${col.hex}" stroke="${hairStroke}" stroke-width="2.5"/>
         <polygon points="50,70 40,70 46,96 54,96 60,70" fill="#FFFFFF"/>
         <polygon points="48,74 52,74 54,95 50,98 46,95" fill="#15110F"/>`
      : c.age === 'lao'
        ? `<path d="M16 98 C18 75, 32 69, 50 69 C68 69, 82 75, 84 98 Z" fill="${col.hex}" stroke="${hairStroke}" stroke-width="2.5"/>
           <path d="M35 71 L50 88 L65 71" fill="none" stroke="#FFD43B" stroke-width="4" stroke-linecap="round"/>
           <circle cx="50" cy="88" r="5.5" fill="#FFD43B" stroke="${hairStroke}" stroke-width="1.8"/>`
        : `<path d="M18 98 C20 77, 33 71, 50 71 C67 71, 80 77, 82 98 Z" fill="${col.hex}" stroke="${hairStroke}" stroke-width="2.5"/>
           <path d="M38 71 Q50 83 62 71" fill="#FFFFFF" stroke="${hairStroke}" stroke-width="2"/>`;

  // Mắt & lông mày theo giới tính
  const eyes =
    c.gender === 'nu'
      ? `<path d="M33 43 Q39 39 44 42" stroke="${hairStroke}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
         <path d="M56 42 Q61 39 67 43" stroke="${hairStroke}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
         <ellipse cx="39" cy="48" rx="4.2" ry="4.6" fill="${hairStroke}"/>
         <ellipse cx="61" cy="48" rx="4.2" ry="4.6" fill="${hairStroke}"/>
         <circle cx="40.5" cy="46.5" r="1.5" fill="#FFF"/>
         <circle cx="62.5" cy="46.5" r="1.5" fill="#FFF"/>
         <path d="M34 45 L32 43 M66 45 L68 43" stroke="${hairStroke}" stroke-width="2" stroke-linecap="round"/>`
      : c.gender === 'khac'
        ? `<path d="M33 41 L44 43" stroke="${hairStroke}" stroke-width="2.6" stroke-linecap="round"/>
           <path d="M56 43 L67 41" stroke="${hairStroke}" stroke-width="2.6" stroke-linecap="round"/>
           <circle cx="39" cy="48" r="4.2" fill="${hairStroke}"/>
           <path d="M56 48 Q61 44 66 48" stroke="${hairStroke}" stroke-width="2.8" fill="none" stroke-linecap="round"/>
           <circle cx="40.5" cy="46.5" r="1.5" fill="#FFF"/>
           <polygon points="70,53 72,56 75,56 72.5,58 73.5,61 70,59 66.5,61 67.5,58 65,56 68,56" fill="${col.hex}"/>`
        : `<path d="M33 42 L44 43" stroke="${hairStroke}" stroke-width="2.8" stroke-linecap="round"/>
           <path d="M56 43 L67 42" stroke="${hairStroke}" stroke-width="2.8" stroke-linecap="round"/>
           <circle cx="39" cy="48" r="4" fill="${hairStroke}"/>
           <circle cx="61" cy="48" r="4" fill="${hairStroke}"/>
           <circle cx="40.3" cy="46.7" r="1.4" fill="#FFF"/>
           <circle cx="62.3" cy="46.7" r="1.4" fill="#FFF"/>`;

  // Phụ kiện độ tuổi (má hồng cho Nhí, kính cho Doanh nhân, râu/kính lão cho Đại gia)
  const ageExtra =
    c.age === 'nhi'
      ? `<ellipse cx="32" cy="54" rx="5" ry="2.8" fill="#FF8787" opacity="0.65"/>
         <ellipse cx="68" cy="54" rx="5" ry="2.8" fill="#FF8787" opacity="0.65"/>`
      : c.age === 'trung'
        ? `<rect x="31" y="43" width="15" height="10" rx="3" fill="none" stroke="#D97706" stroke-width="2.2"/>
           <rect x="54" y="43" width="15" height="10" rx="3" fill="none" stroke="#D97706" stroke-width="2.2"/>
           <line x1="46" y1="47" x2="54" y2="47" stroke="#D97706" stroke-width="2.2"/>`
        : c.age === 'lao'
          ? `<path d="M31 54 Q33 58 35 60 M69 54 Q67 58 65 60" stroke="#C89D7C" stroke-width="1.6" fill="none" stroke-linecap="round"/>` +
            (c.gender === 'nam'
              ? `<path d="M41 59 Q50 55 59 59 Q54 63 50 61 Q46 63 41 59 Z" fill="#CED4DA" stroke="${hairStroke}" stroke-width="1.5"/>`
              : `<circle cx="24" cy="54" r="3" fill="#FFD43B" stroke="${hairStroke}" stroke-width="1.2"/><circle cx="76" cy="54" r="3" fill="#FFD43B" stroke="${hairStroke}" stroke-width="1.2"/>`)
          : '';

  const mouth =
    c.gender === 'nu'
      ? `<path d="M44 59 Q50 64 56 59" stroke="#D6336C" stroke-width="2.8" fill="none" stroke-linecap="round"/>`
      : `<path d="M43 58 Q50 64 57 58" stroke="${hairStroke}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;

  // Tóc mái phía trước
  const frontHair =
    c.hair === 'han'
      ? `<path d="M24 42 C22 22, 38 16, 50 18 C62 16, 78 22, 76 42 C70 30, 58 26, 50 35 C42 26, 30 30, 24 42 Z" fill="${hairFill}" stroke="${hairStroke}" stroke-width="2.4"/>`
      : c.hair === 'xoan'
        ? `<path d="M23 41 C20 23, 35 15, 50 16 C65 15, 80 23, 77 41 C72 35, 65 38, 60 32 C55 38, 45 38, 40 32 C35 38, 28 35, 23 41 Z" fill="${hairFill}" stroke="${hairStroke}" stroke-width="2.4"/>
           <circle cx="34" cy="24" r="7" fill="${hairFill}"/><circle cx="50" cy="21" r="8" fill="${hairFill}"/><circle cx="66" cy="24" r="7" fill="${hairFill}"/>`
        : c.hair === 'dai'
          ? `<path d="M23 44 C22 21, 36 16, 50 16 C64 16, 78 21, 77 44 C71 31, 61 28, 50 30 C39 28, 29 31, 23 44 Z" fill="${hairFill}" stroke="${hairStroke}" stroke-width="2.4"/>`
          : c.hair === 'bui'
            ? `<path d="M24 42 C24 22, 36 18, 50 18 C64 18, 76 22, 76 42 C68 30, 58 27, 50 29 C42 27, 32 30, 24 42 Z" fill="${hairFill}" stroke="${hairStroke}" stroke-width="2.4"/>`
            : c.hair === 'undercut'
              ? `<path d="M28 36 C28 18, 45 12, 68 16 C75 18, 76 28, 72 34 C62 28, 42 28, 28 36 Z" fill="${hairFill}" stroke="${hairStroke}" stroke-width="2.4"/>`
              : `<path d="M24 40 C24 21, 36 17, 50 17 C64 17, 76 21, 76 40 C66 31, 34 31, 24 40 Z" fill="${hairFill}" stroke="${hairStroke}" stroke-width="2.4"/>`;

  const headRadiusY = c.age === 'nhi' ? 23 : 25;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <rect width="100" height="100" rx="50" fill="${col.light}"/>
    <circle cx="50" cy="50" r="46" fill="none" stroke="${col.hex}" stroke-width="4" opacity="0.35"/>
    ${backHair}
    <rect x="43" y="61" width="14" height="14" rx="5" fill="${skinShadow}" stroke="${hairStroke}" stroke-width="2"/>
    ${outfit}
    <circle cx="24" cy="49" r="5.5" fill="${skin}" stroke="${hairStroke}" stroke-width="2.2"/>
    <circle cx="76" cy="49" r="5.5" fill="${skin}" stroke="${hairStroke}" stroke-width="2.2"/>
    <ellipse cx="50" cy="46" rx="24" ry="${headRadiusY}" fill="${skin}" stroke="${hairStroke}" stroke-width="2.5"/>
    ${eyes}
    <path d="M49 50 Q50 53 52 52" stroke="#C89D7C" stroke-width="2" fill="none" stroke-linecap="round"/>
    ${mouth}
    ${ageExtra}
    ${frontHair}
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * 16 chân dung mẫu cho chỉ số avatar của tài khoản (0..15, hợp đồng với server giữ nguyên).
 * Người chơi chưa tự chọn nhân vật/ảnh thì mọi nơi đều vẽ đúng chân dung này.
 */
export const AVATAR_PRESETS: CharacterConfig[] = [
  { gender: 'nam', age: 'tre', hair: 'han', color: 1 },
  { gender: 'nu', age: 'tre', hair: 'dai', color: 7 },
  { gender: 'nam', age: 'nhi', hair: 'ngan', color: 3 },
  { gender: 'nu', age: 'nhi', hair: 'bui', color: 5 },
  { gender: 'nam', age: 'trung', hair: 'undercut', color: 2 },
  { gender: 'nu', age: 'trung', hair: 'ngan', color: 4 },
  { gender: 'nam', age: 'lao', hair: 'ngan', color: 0 },
  { gender: 'nu', age: 'lao', hair: 'bui', color: 6 },
  { gender: 'khac', age: 'tre', hair: 'xoan', color: 4 },
  { gender: 'nu', age: 'tre', hair: 'xoan', color: 3 },
  { gender: 'nam', age: 'tre', hair: 'undercut', color: 5 },
  { gender: 'nu', age: 'tre', hair: 'han', color: 2 },
  { gender: 'nam', age: 'trung', hair: 'han', color: 0 },
  { gender: 'khac', age: 'nhi', hair: 'dai', color: 7 },
  { gender: 'nam', age: 'nhi', hair: 'xoan', color: 6 },
  { gender: 'khac', age: 'trung', hair: 'bui', color: 1 },
];

export function presetOf(i: number): CharacterConfig {
  return AVATAR_PRESETS[((i % 16) + 16) % 16];
}

const presetCache = new Map<number, string>();
/** Chân dung SVG (data URI) của mẫu số i, có nhớ lại để khỏi vẽ lại. */
export function presetUri(i: number): string {
  const k = ((i % 16) + 16) % 16;
  let u = presetCache.get(k);
  if (!u) {
    u = characterSvgUri(presetOf(k));
    presetCache.set(k, u);
  }
  return u;
}

export interface PortraitSource {
  avatar: number;
  avatarUrl?: string;
  character?: CharacterConfig;
}

/** Một cách vẽ duy nhất cho mọi nơi: ảnh tự tải lên > nhân vật tự tạo > chân dung mẫu theo chỉ số. */
export function portraitOf(p: PortraitSource): { uri: string; light: string; hex: string } {
  const cfg = p.character ?? presetOf(p.avatar);
  const col = playerColorOf(cfg);
  return { uri: p.avatarUrl ?? (p.character ? characterSvgUri(p.character) : presetUri(p.avatar)), light: col.light, hex: col.hex };
}

/** Tên gọi gọn: giữ nguyên nếu ngắn, nếu dài thì lấy từ cuối (tên riêng trong tiếng Việt). */
export function shortName(name: string, max = 9): string {
  const n = name.trim();
  if (n.length <= max) return n;
  const last = n.split(/\s+/).at(-1) ?? n;
  return last.length <= max ? last : last.slice(0, max - 1) + '…';
}
