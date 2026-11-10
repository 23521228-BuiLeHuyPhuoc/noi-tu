import {
  PLAYER_COLORS,
  type CharacterAccessory,
  type CharacterAge,
  type CharacterConfig,
  type CharacterGender,
  type CharacterHair,
  type DoodleKind,
  type Mood,
} from '../../shared/src/types';
import { AVATAR_PRESETS } from '../../shared/src/avatars';

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

export const ACCESSORY_OPTIONS: { id: CharacterAccessory; label: string; icon: string }[] = [
  { id: 'none', label: 'Trơn', icon: '🙂' },
  { id: 'kinhden', label: 'Kính đen', icon: '😎' },
  { id: 'raukem', label: 'Râu kẽm', icon: '🧔' },
  { id: 'ria', label: 'Ria mép', icon: '👨' },
  { id: 'nonla', label: 'Nón lá', icon: '👒' },
  { id: 'nonbh', label: 'Nón bảo hiểm', icon: '⛑️' },
  { id: 'bangdo', label: 'Băng đô', icon: '🎀' },
  { id: 'khautrang', label: 'Khẩu trang', icon: '😷' },
  { id: 'muihe', label: 'Mũi hề', icon: '🤡' },
  { id: 'taitho', label: 'Tai thỏ', icon: '🐰' },
  { id: 'bangcanhan', label: 'Băng cá nhân', icon: '🩹' },
  { id: 'troc', label: 'Đầu trọc bóng', icon: '🥚' },
  { id: 'mahong', label: 'Má hồng', icon: '😊' },
];

export const MOOD_EMOJI: Record<Mood, string> = { normal: '', smug: '😏', cry: '😭', angry: '😡', shock: '😱', dizzy: '😵‍💫' };

export function playerColorOf(c?: CharacterConfig | number) {
  const idx = typeof c === 'number' ? c : c?.color ?? 0;
  return PLAYER_COLORS[((idx % PLAYER_COLORS.length) + PLAYER_COLORS.length) % PLAYER_COLORS.length];
}

function spiral(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i <= 28; i++) {
    const a = i * 0.45;
    const rr = (r * i) / 28;
    pts.push(`${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`);
  }
  return `<polyline points="${pts.join(' ')}" fill="none" stroke="#15110F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
}

const star = (x: number, y: number, r: number) => {
  const p = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    return `${(x + Math.cos(a) * rr).toFixed(1)},${(y + Math.sin(a) * rr).toFixed(1)}`;
  });
  return `<polygon points="${p.join(' ')}" fill="#FFD43B" stroke="#15110F" stroke-width="1.3" stroke-linejoin="round"/>`;
};

/** Mắt, mày, miệng của từng tâm trạng (khác "bình thường") + lớp tô màu mặt + vật trang trí phía trên */
function moodFace(mood: Mood, ink: string, skin: string, female: boolean) {
  const lip = female ? '#D6336C' : ink;
  switch (mood) {
    case 'smug':
      return {
        tint: '',
        eyes: `<circle cx="39" cy="48" r="4" fill="${ink}"/><circle cx="61" cy="48" r="4" fill="${ink}"/>
          <rect x="33" y="42.5" width="12" height="5.6" fill="${skin}"/><rect x="55" y="42.5" width="12" height="5.6" fill="${skin}"/>
          <path d="M33 48 L45 48 M55 48 L67 48" stroke="${ink}" stroke-width="2.6" stroke-linecap="round"/>
          <path d="M33 41 L45 43.5" stroke="${ink}" stroke-width="2.8" stroke-linecap="round"/>
          <path d="M55 41 Q61 35.5 67 38" stroke="${ink}" stroke-width="2.8" fill="none" stroke-linecap="round"/>`,
        mouth: `<path d="M42 61 Q52 66 60 56" stroke="${lip}" stroke-width="2.8" fill="none" stroke-linecap="round"/>
          <path d="M60 56 L63 55" stroke="${lip}" stroke-width="2" stroke-linecap="round"/>`,
        over: `<path d="M74 28 l3 -6 M79 32 l6 -3 M76 35 l7 1" stroke="#FFD43B" stroke-width="2.4" stroke-linecap="round"/>`,
      };
    case 'cry':
      return {
        tint: '',
        eyes: `<path d="M33 40 L44 43.5 M56 43.5 L67 40" stroke="${ink}" stroke-width="2.6" stroke-linecap="round"/>
          <path d="M34 49 Q39 44 44 49 M56 49 Q61 44 66 49" stroke="${ink}" stroke-width="2.8" fill="none" stroke-linecap="round"/>`,
        mouth: `<path d="M42 66 Q50 55 58 66 Z" fill="#7A1B2B" stroke="${ink}" stroke-width="2.2" stroke-linejoin="round"/>
          <ellipse cx="50" cy="65" rx="4" ry="2" fill="#FF8FA3"/>`,
        over: `<path d="M35 51 Q31 58 34 68 Q37 62 38 52 Z" fill="#74C0FC" stroke="#1C7ED6" stroke-width="1.2"/>
          <path d="M65 51 Q69 58 66 68 Q63 62 62 52 Z" fill="#74C0FC" stroke="#1C7ED6" stroke-width="1.2"/>
          <ellipse cx="28" cy="70" rx="2.6" ry="3.6" fill="#74C0FC" stroke="#1C7ED6" stroke-width="1"/>
          <ellipse cx="73" cy="72" rx="2.6" ry="3.6" fill="#74C0FC" stroke="#1C7ED6" stroke-width="1"/>`,
      };
    case 'angry':
      return {
        tint: `<ellipse cx="50" cy="46" rx="24" ry="25" fill="#FF3B3B" opacity="0.42"/>`,
        eyes: `<path d="M31 38 L46 45 M54 45 L69 38" stroke="${ink}" stroke-width="3.4" stroke-linecap="round"/>
          <circle cx="40" cy="49" r="3.4" fill="${ink}"/><circle cx="60" cy="49" r="3.4" fill="${ink}"/>`,
        mouth: `<path d="M41 64 Q50 55 59 64" stroke="${ink}" stroke-width="3" fill="none" stroke-linecap="round"/>
          <path d="M45 60.5 L45 64 M50 59 L50 62.5 M55 60.5 L55 64" stroke="#FFF" stroke-width="2"/>`,
        over: `<path d="M22 20 q-6 -6 0 -11 q6 3 3 8 M30 12 q-4 -8 3 -10" stroke="#FFF" stroke-width="3.2" fill="none" stroke-linecap="round"/>
          <path d="M78 20 q6 -6 0 -11 q-6 3 -3 8 M70 12 q4 -8 -3 -10" stroke="#FFF" stroke-width="3.2" fill="none" stroke-linecap="round"/>
          <path d="M70 26 l5 -5 M75 26 l-5 -5 M72 30 q4 2 6 -1" stroke="#E5383B" stroke-width="3" stroke-linecap="round" fill="none"/>`,
      };
    case 'shock':
      return {
        tint: `<ellipse cx="50" cy="46" rx="24" ry="25" fill="#E7F5FF" opacity="0.5"/>`,
        eyes: `<path d="M32 33 Q39 28 45 33 M55 33 Q61 28 68 33" stroke="${ink}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
          <circle cx="39" cy="46" r="7" fill="#FFF" stroke="${ink}" stroke-width="2"/><circle cx="61" cy="46" r="7" fill="#FFF" stroke="${ink}" stroke-width="2"/>
          <circle cx="39" cy="46" r="2.2" fill="${ink}"/><circle cx="61" cy="46" r="2.2" fill="${ink}"/>`,
        mouth: `<ellipse cx="50" cy="63" rx="5" ry="7" fill="#7A1B2B" stroke="${ink}" stroke-width="2.2"/>`,
        over: `<path d="M77 30 Q81 22 81 22 Q85 30 81 35 Q77 35 77 30Z" fill="#74C0FC" stroke="#1C7ED6" stroke-width="1.4"/>
          <path d="M16 30 l-7 -2 M17 22 l-6 -6 M84 14 l5 -5" stroke="${ink}" stroke-width="2.2" stroke-linecap="round"/>`,
      };
    case 'dizzy':
      return {
        tint: '',
        eyes: `${spiral(39, 48, 6.5)}${spiral(61, 48, 6.5)}
          <path d="M33 38 Q39 35 45 38 M55 38 Q61 35 67 38" stroke="${ink}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`,
        mouth: `<path d="M41 62 Q44.5 58 48 62 T55 62 T59 62" stroke="${lip}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
          <path d="M55 63 q0 8 4 8 q3 -1 1 -8" fill="#FF8FA3" stroke="${ink}" stroke-width="1.4"/>`,
        over: `${star(30, 10, 7)}${star(50, 5, 8)}${star(70, 10, 7)}`,
      };
    default:
      return null;
  }
}

/** Phụ kiện "lầy": đội trên đầu (vẽ sau tóc) và đeo trên mặt (vẽ sau cùng) */
function accessoryParts(acc: CharacterAccessory | undefined, hairFill: string, ink: string, skin: string) {
  const parts = { behind: '', hat: '', face: '' };
  switch (acc) {
    case 'kinhden':
      parts.face = `<path d="M24 46 L30 45 M70 45 L76 46" stroke="${ink}" stroke-width="2.4" stroke-linecap="round"/>
        <rect x="29.5" y="42" width="18" height="12" rx="5" fill="#15110F" stroke="#000" stroke-width="1.5"/>
        <rect x="52.5" y="42" width="18" height="12" rx="5" fill="#15110F" stroke="#000" stroke-width="1.5"/>
        <path d="M47 46 Q50 44 53 46" stroke="#15110F" stroke-width="2.4" fill="none"/>
        <path d="M33 45 L38 45 M56 45 L61 45" stroke="#FFF" stroke-width="2" stroke-linecap="round" opacity="0.8"/>`;
      break;
    case 'raukem':
      parts.face = `<path d="M43 63.5 Q50 67 57 63.5 Q57 78 50 79 Q43 78 43 63.5 Z" fill="${hairFill}" stroke="${ink}" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M44 62 Q50 65 56 62" stroke="#FFF" stroke-width="1.6" fill="none" opacity="0.55"/>`;
      break;
    case 'ria':
      parts.face = `<path d="M50 54.5 Q44 51 36 55 Q31 58 33 62 Q38 58 46 58.5 Q49 58.5 50 57.5 Q51 58.5 54 58.5 Q62 58 67 62 Q69 58 64 55 Q56 51 50 54.5 Z" fill="${hairFill}" stroke="${ink}" stroke-width="1.6" stroke-linejoin="round"/>`;
      break;
    case 'nonla':
      parts.hat = `<path d="M50 -2 L95 38 Q50 47 5 38 Z" fill="#EBCB8B" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"/>
        <path d="M50 -2 L30 42 M50 -2 L70 42 M50 -2 L50 44 M50 -2 L14 40 M50 -2 L86 40" stroke="#C9A25A" stroke-width="1.4"/>
        <path d="M16 29 Q50 38 84 29" stroke="#C9A25A" stroke-width="1.4" fill="none"/>
        <path d="M27 41 Q30 64 40 71 M73 41 Q70 64 60 71" stroke="#E64980" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
      break;
    case 'nonbh':
      parts.hat = `<path d="M20 40 C16 6 84 6 80 40 Z" fill="#FFD43B" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"/>
        <path d="M50 11 L50 38" stroke="#FFF" stroke-width="5"/>
        <path d="M17 41 Q50 34 83 41 L83 36 Q50 29 17 36 Z" fill="#F59F00" stroke="${ink}" stroke-width="2"/>
        <path d="M24 41 Q24 62 34 69 M76 41 Q76 62 66 69" stroke="${ink}" stroke-width="2" fill="none"/>`;
      break;
    case 'bangdo':
      parts.hat = `<path d="M25 30 Q50 21 75 30 L75.5 37 Q50 28 24.5 37 Z" fill="#E03131" stroke="${ink}" stroke-width="2" stroke-linejoin="round"/>
        <path d="M74 31 L90 24 L86 33 L92 41 L75 36 Z" fill="#E03131" stroke="${ink}" stroke-width="2" stroke-linejoin="round"/>
        <circle cx="50" cy="27" r="3.6" fill="#FFF"/>`;
      break;
    case 'khautrang':
      parts.face = `<path d="M30 52 L24 49 M70 52 L76 49" stroke="#74C0FC" stroke-width="2" stroke-linecap="round"/>
        <path d="M29 53 Q50 50 71 53 L68 67 Q50 79 32 67 Z" fill="#E7F5FF" stroke="${ink}" stroke-width="2.2" stroke-linejoin="round"/>
        <path d="M33 59 Q50 63 67 59 M34 65 Q50 70 66 65" stroke="#74C0FC" stroke-width="1.5" fill="none"/>`;
      break;
    case 'muihe':
      parts.face = `<circle cx="50" cy="53" r="7.5" fill="#F03E3E" stroke="${ink}" stroke-width="2"/><circle cx="47.5" cy="50.5" r="2.2" fill="#FFF" opacity="0.85"/>`;
      break;
    case 'taitho':
      parts.behind = `<g transform="rotate(-14 36 14)"><ellipse cx="36" cy="12" rx="7.5" ry="17" fill="#FFF" stroke="${ink}" stroke-width="2.3"/><ellipse cx="36" cy="14" rx="3.6" ry="11" fill="#FFA8C5"/></g>
        <g transform="rotate(14 64 14)"><ellipse cx="64" cy="12" rx="7.5" ry="17" fill="#FFF" stroke="${ink}" stroke-width="2.3"/><ellipse cx="64" cy="14" rx="3.6" ry="11" fill="#FFA8C5"/></g>`;
      break;
    case 'bangcanhan':
      parts.face = `<g transform="rotate(-28 66 57)"><rect x="56" y="52.5" width="20" height="9" rx="4" fill="#F4C79A" stroke="${ink}" stroke-width="1.6"/>
        <rect x="62.5" y="52.5" width="7" height="9" fill="#E3A56F"/><circle cx="60" cy="57" r="0.9" fill="#B87942"/><circle cx="72.5" cy="57" r="0.9" fill="#B87942"/></g>
        <path d="M33 33 L38 39" stroke="#C25B5B" stroke-width="1.8" stroke-linecap="round"/>`;
      break;
    case 'troc':
      parts.face = `<path d="M33 31 Q38 22.5 50 21.5" stroke="#FFF" stroke-width="3.4" fill="none" stroke-linecap="round" opacity="0.95"/>
        <path d="M61 25 l2 -5 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 Z" fill="#FFF" stroke="${ink}" stroke-width="0.8"/>
        <path d="M50 21 q-1 -6 -5 -7 M50 21 q2 -6 6 -6" stroke="${ink}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
      break;
    case 'mahong':
      parts.face = `<circle cx="30" cy="55" r="6.5" fill="#FF6B8A" opacity="0.8"/><circle cx="70" cy="55" r="6.5" fill="#FF6B8A" opacity="0.8"/>
        <path d="M27 53 l2 4 M31 52 l2 4 M67 52 l2 4 M71 53 l2 4" stroke="#FFF" stroke-width="1.2" stroke-linecap="round" opacity="0.8"/>`;
      break;
    default:
  }
  void skin;
  return parts;
}

/** Vẽ chân dung SVG sắc nét theo cấu hình nhân vật (giới tính, độ tuổi, kiểu tóc, màu đại diện, phụ kiện) và tâm trạng. */
export function characterSvgUri(cfg?: CharacterConfig, mood: Mood = 'normal'): string {
  const c: CharacterConfig = cfg ?? { gender: 'nam', age: 'tre', hair: 'han', color: 0 };
  const col = playerColorOf(c.color);
  const hairFill = c.age === 'lao' ? '#CED4DA' : c.gender === 'nu' ? '#3B231A' : '#241814';
  const hairStroke = '#15110F';
  const skin = c.gender === 'nu' ? '#FFE4C9' : '#FAD6B3';
  const skinShadow = '#EAC098';
  const acc = accessoryParts(c.accessory, hairFill, hairStroke, skin);
  const bald = c.accessory === 'troc';
  const mf = moodFace(mood, hairStroke, skin, c.gender === 'nu');

  // Tóc sau lưng (cho tóc dài / xoăn / búi)
  const backHair = bald ? '' :
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
  const normalEyes =
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
      : c.age === 'trung' && c.accessory !== 'kinhden'
        ? `<rect x="31" y="43" width="15" height="10" rx="3" fill="none" stroke="#D97706" stroke-width="2.2"/>
           <rect x="54" y="43" width="15" height="10" rx="3" fill="none" stroke="#D97706" stroke-width="2.2"/>
           <line x1="46" y1="47" x2="54" y2="47" stroke="#D97706" stroke-width="2.2"/>`
        : c.age === 'lao'
          ? `<path d="M31 54 Q33 58 35 60 M69 54 Q67 58 65 60" stroke="#C89D7C" stroke-width="1.6" fill="none" stroke-linecap="round"/>` +
            (c.gender === 'nam'
              ? `<path d="M41 59 Q50 55 59 59 Q54 63 50 61 Q46 63 41 59 Z" fill="#CED4DA" stroke="${hairStroke}" stroke-width="1.5"/>`
              : `<circle cx="24" cy="54" r="3" fill="#FFD43B" stroke="${hairStroke}" stroke-width="1.2"/><circle cx="76" cy="54" r="3" fill="#FFD43B" stroke="${hairStroke}" stroke-width="1.2"/>`)
          : '';

  const normalMouth =
    c.gender === 'nu'
      ? `<path d="M44 59 Q50 64 56 59" stroke="#D6336C" stroke-width="2.8" fill="none" stroke-linecap="round"/>`
      : `<path d="M43 58 Q50 64 57 58" stroke="${hairStroke}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;

  // Tóc mái phía trước
  const frontHair = bald ? '' :
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

  const eyes = mf ? mf.eyes : normalEyes;
  const mouth = mf ? mf.mouth : normalMouth;
  const headRadiusY = c.age === 'nhi' ? 23 : 25;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <rect width="100" height="100" rx="50" fill="${col.light}"/>
    <circle cx="50" cy="50" r="46" fill="none" stroke="${col.hex}" stroke-width="4" opacity="0.35"/>
    ${backHair}
    ${acc.behind}
    <rect x="43" y="61" width="14" height="14" rx="5" fill="${skinShadow}" stroke="${hairStroke}" stroke-width="2"/>
    ${outfit}
    <circle cx="24" cy="49" r="5.5" fill="${skin}" stroke="${hairStroke}" stroke-width="2.2"/>
    <circle cx="76" cy="49" r="5.5" fill="${skin}" stroke="${hairStroke}" stroke-width="2.2"/>
    <ellipse cx="50" cy="46" rx="24" ry="${headRadiusY}" fill="${skin}" stroke="${hairStroke}" stroke-width="2.5"/>
    ${mf?.tint ?? ''}
    ${eyes}
    <path d="M49 50 Q50 53 52 52" stroke="#C89D7C" stroke-width="2" fill="none" stroke-linecap="round"/>
    ${mouth}
    ${ageExtra}
    ${frontHair}
    ${acc.face}
    ${acc.hat}
    ${mf?.over ?? ''}
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const svgCache = new Map<string, string>();
/**
 * Chân dung theo nhân vật + tâm trạng (có nhớ lại). Dùng cho mọi nơi muốn đổi mặt theo sự kiện,
 * vd Tỷ phú: `portraitUri(p.character, 'smug')` khi giàu lên, `'cry'` khi sạt nghiệp.
 */
export function portraitUri(character?: CharacterConfig, mood: Mood = 'normal'): string {
  const k = `${character ? `${character.gender}${character.age}${character.hair}${character.color}${character.accessory ?? ''}` : '-'}|${mood}`;
  let u = svgCache.get(k);
  if (!u) {
    if (svgCache.size > 300) svgCache.clear();
    u = characterSvgUri(character, mood);
    svgCache.set(k, u);
  }
  return u;
}

const DOODLE_SVG: Record<DoodleKind, string> = {
  ria: `<path d="M50 55 Q40 49 29 54 Q24 58 29 64 Q34 58 44 59 Q49 59 50 57.5 Q51 59 56 59 Q66 58 71 64 Q76 58 71 54 Q60 49 50 55 Z" fill="#111" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>`,
  sung: `<path d="M24 30 Q14 12 28 2 Q28 16 38 24 Z" fill="#E03131" stroke="#15110F" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M76 30 Q86 12 72 2 Q72 16 62 24 Z" fill="#E03131" stroke="#15110F" stroke-width="2.4" stroke-linejoin="round"/>`,
  muihe: `<circle cx="50" cy="53" r="9" fill="#F03E3E" stroke="#15110F" stroke-width="2.2"/><circle cx="46.5" cy="49.5" r="2.8" fill="#FFF" opacity="0.85"/>
    <path d="M30 31 Q50 20 70 31" stroke="#40C057" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.9"/>`,
  mattim: `<path d="M39 54 C28 47 31 39 36 40 C38 40.5 39 42 39 43 C39 42 40 40.5 42 40 C47 39 50 47 39 54 Z" fill="#F03E3E" stroke="#8A1C1C" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M61 54 C50 47 53 39 58 40 C60 40.5 61 42 61 43 C61 42 62 40.5 64 40 C69 39 72 47 61 54 Z" fill="#F03E3E" stroke="#8A1C1C" stroke-width="1.6" stroke-linejoin="round"/>`,
};

/** Hình "vẽ bậy" trong suốt, phủ lên mọi loại ảnh đại diện (kể cả ảnh tự tải lên) */
export function doodleUri(kind: DoodleKind): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${DOODLE_SVG[kind]}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const ROACH_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 80">
  <g stroke="#3B1F0B" stroke-width="2.6" stroke-linecap="round" fill="none">
    <path d="M22 28 L6 20 L2 24 M21 40 L3 40 M22 52 L6 62 L3 70 M38 28 L54 20 L58 24 M39 40 L57 40 M38 52 L54 62 L57 70"/>
    <path d="M26 14 Q20 5 12 4 M34 14 Q40 5 48 4"/>
  </g>
  <ellipse cx="30" cy="46" rx="14" ry="23" fill="#7B3F14" stroke="#3B1F0B" stroke-width="2.6"/>
  <path d="M30 24 L30 68" stroke="#3B1F0B" stroke-width="2"/>
  <ellipse cx="30" cy="22" rx="9" ry="8" fill="#5A2C0C" stroke="#3B1F0B" stroke-width="2.6"/>
  <ellipse cx="24" cy="38" rx="3.5" ry="9" fill="#A5611F" opacity="0.7"/>
  <circle cx="26.5" cy="20" r="2" fill="#FFF"/><circle cx="33.5" cy="20" r="2" fill="#FFF"/>
  <circle cx="27" cy="20.4" r="0.9" fill="#111"/><circle cx="34" cy="20.4" r="0.9" fill="#111"/>
</svg>`;
/** con gián vẽ sẵn (đầu hướng lên), không phụ thuộc font emoji */
export const ROACH_URI = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(ROACH_SVG)}`;

export { AVATAR_PRESETS };

export function presetOf(i: number): CharacterConfig {
  return AVATAR_PRESETS[((i % 16) + 16) % 16];
}

const presetCache = new Map<number, string>();
/** Chân dung SVG (data URI) của mẫu số i, có nhớ lại để khỏi vẽ lại. */
export function presetUri(i: number, mood: Mood = 'normal'): string {
  const k = ((i % 16) + 16) % 16;
  if (mood !== 'normal') return portraitUri(presetOf(k), mood);
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
export function portraitOf(p: PortraitSource, mood: Mood = 'normal'): { uri: string; light: string; hex: string } {
  const cfg = p.character ?? presetOf(p.avatar);
  const col = playerColorOf(cfg);
  return { uri: p.avatarUrl ?? (p.character ? portraitUri(p.character, mood) : presetUri(p.avatar, mood)), light: col.light, hex: col.hex };
}

/** Tên gọi gọn: giữ nguyên nếu ngắn, nếu dài thì lấy từ cuối (tên riêng trong tiếng Việt). */
export function shortName(name: string, max = 9): string {
  const n = name.trim();
  if (n.length <= max) return n;
  const last = n.split(/\s+/).at(-1) ?? n;
  return last.length <= max ? last : last.slice(0, max - 1) + '…';
}
