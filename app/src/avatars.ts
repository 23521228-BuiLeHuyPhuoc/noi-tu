import {
  CHARACTER_ACCESSORIES,
  CHARACTER_AGES,
  CHARACTER_BROWS,
  CHARACTER_BUILDS,
  CHARACTER_DETAILS,
  CHARACTER_EYES,
  CHARACTER_FACES,
  CHARACTER_GENDERS,
  CHARACTER_HAIRS,
  CHARACTER_OUTFITS,
  LOOK_OPTIONS,
  PLAYER_COLORS,
  SKIN_TONES,
  type CharacterAccessory,
  type CharacterAge,
  type CharacterBrows,
  type CharacterBuild,
  type CharacterConfig,
  type CharacterDetail,
  type CharacterEyes,
  type CharacterFace,
  type CharacterGender,
  type CharacterHair,
  type CharacterLook,
  type CharacterOutfit,
  type DoodleKind,
  type LookKey,
  type Mood,
} from '../../shared/src/types';
import { AVATAR_PRESETS, AVATAR_PRESET_NAMES } from '../../shared/src/avatars';

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
  { id: 'lgbt', label: 'LGBT+', icon: '🏳️‍🌈' },
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
  { id: 'dinh', label: 'Đầu đinh' },
  { id: 'mohican', label: 'Mohican' },
  { id: 'buicu', label: 'Búi củ hành' },
  { id: 'afro', label: 'Tóc xù / Afro' },
  { id: 'maibang', label: 'Mái bằng' },
  { id: 'highlight', label: 'Highlight' },
  { id: 'nam', label: 'Đầu nấm' },
  { id: 'dailung', label: 'Dài ngang lưng' },
  { id: 'buocthap', label: 'Buộc thấp tóc con' },
  { id: 'chaingoc', label: 'Chải ngược xoăn gáy' },
  { id: 'vuotlech', label: 'Vuốt lệch phồng' },
  { id: 'dungchom', label: 'Rất ngắn dựng chỏm' },
];

export const FACE_OPTIONS: { id: CharacterFace; label: string }[] = [
  { id: 'tron', label: 'Tròn' },
  { id: 'ovalngan', label: 'Oval ngắn đầy' },
  { id: 'oval', label: 'Oval' },
  { id: 'ovaldai', label: 'Oval dài má đầy' },
  { id: 'ovalvuong', label: 'Oval pha vuông' },
  { id: 'xoan', label: 'Trái xoan' },
  { id: 'bau', label: 'Mặt bầu' },
  { id: 'nhon', label: 'Cằm nhọn' },
  { id: 'dai', label: 'Mặt dài' },
  { id: 'vuong', label: 'Hàm vuông' },
];

export const BUILD_OPTIONS: { id: CharacterBuild; label: string }[] = [
  { id: 'gay', label: 'Gầy' },
  { id: 'vua', label: 'Vừa' },
  { id: 'mum', label: 'Mũm mĩm' },
  { id: 'khoe', label: 'Vai rộng cơ bắp' },
];

export const EYE_OPTIONS: { id: CharacterEyes; label: string }[] = [
  { id: 'macdinh', label: 'Mặc định' },
  { id: 'hip', label: 'Mắt híp' },
  { id: 'to', label: 'Mắt to tròn' },
  { id: 'motmi', label: 'Một mí' },
];

export const BROW_OPTIONS: { id: CharacterBrows; label: string }[] = [
  { id: 'macdinh', label: 'Mặc định' },
  { id: 'ray', label: 'Mày rậm' },
  { id: 'lieu', label: 'Lá liễu' },
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
  { id: 'prideghim', label: 'Ghim cầu vồng', icon: '🌈' },
  { id: 'prideco', label: 'Cờ cầu vồng', icon: '🏳️‍🌈' },
  { id: 'pridetoc', label: 'Tóc cầu vồng', icon: '🌈' },
  { id: 'pridebang', label: 'Băng đô cầu vồng', icon: '🌈' },
];

export const DETAIL_OPTIONS: { id: CharacterDetail; label: string; icon: string }[] = [
  { id: 'none', label: 'Trơn', icon: '🙂' },
  { id: 'notruoi', label: 'Nốt ruồi', icon: '⚫' },
  { id: 'tannhang', label: 'Tàn nhang', icon: '🟤' },
  { id: 'longmay', label: 'Mày rậm', icon: '🤨' },
  { id: 'ranghe', label: 'Răng thỏ', icon: '🐇' },
  { id: 'malum', label: 'Má lúm', icon: '☺️' },
];

export const OUTFIT_OPTIONS: { id: CharacterOutfit; label: string; icon: string }[] = [
  { id: 'none', label: 'Theo tuổi', icon: '👕' },
  { id: 'thun', label: 'Áo thun cổ tròn', icon: '👕' },
  { id: 'beo', label: 'Áo trắng cổ bèo', icon: '👚' },
  { id: 'somi', label: 'Sơ mi mở cúc', icon: '👔' },
  { id: 'balden', label: 'Ba lỗ đen chữ U', icon: '🎽' },
  { id: 'aohoa', label: 'Áo hoa đi biển', icon: '🌺' },
  { id: 'dobo', label: 'Đồ bộ', icon: '🛌' },
  { id: 'bala', label: 'Áo ba lỗ', icon: '🎽' },
  { id: 'vestbong', label: 'Vest bóng', icon: '🤵' },
  { id: 'aodai', label: 'Áo dài', icon: '👘' },
  { id: 'dongphuc', label: 'Đồng phục', icon: '🎒' },
  { id: 'aomua', label: 'Áo mưa', icon: '🌧️' },
  { id: 'dayvang', label: 'Dây chuyền vàng', icon: '💰' },
];

export const MOOD_EMOJI: Record<Mood, string> = { normal: '', smug: '😏', cry: '😭', angry: '😡', shock: '😱', dizzy: '😵‍💫' };

/** 11 tông da tự nhiên từ rất sáng tới nâu sẫm (không ám vàng/hồng quá) */
export const SKIN_PALETTE = [
  '#FCECE3', // 0: Rất sáng
  '#F8DEC8', // 1: Sáng
  '#F3CFB2', // 2: Sáng ấm
  '#ECC09E', // 3: Trung bình sáng
  '#E3AF8E', // 4: Trung bình ấm hơi hồng
  '#D9A17C', // 5: Be tự nhiên
  '#C98E67', // 6: Ngăm sáng
  '#B67952', // 7: Nâu vừa ấm
  '#9E633E', // 8: Rám nắng
  '#7E4B2D', // 9: Nâu đậm
  '#5B351F', // 10: Nâu sẫm
] as const;

export const SKIN_NAMES = [
  'Rất sáng',
  'Sáng',
  'Sáng ấm',
  'Trung bình sáng',
  'Trung bình ấm hồng',
  'Be tự nhiên',
  'Ngăm sáng',
  'Nâu vừa ấm',
  'Rám nắng',
  'Nâu đậm',
  'Nâu sẫm',
] as const;

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

function darken(hex: string, f: number): string {
  const h = hex.replace('#', '');
  return '#' + [0, 2, 4].map((i) => Math.max(0, Math.min(255, Math.round(parseInt(h.slice(i, i + 2), 16) * (1 - f)))).toString(16).padStart(2, '0')).join('');
}

function lighten(hex: string, f: number): string {
  const h = hex.replace('#', '');
  return '#' + [0, 2, 4].map((i) => {
    const v = parseInt(h.slice(i, i + 2), 16);
    return Math.max(0, Math.min(255, Math.round(v + (255 - v) * f))).toString(16).padStart(2, '0');
  }).join('');
}

const sparkle = (x: number, y: number, r: number, col = '#FFFFFF') =>
  `<path d="M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r} Z" fill="${col}"/>`;

/** Đôi tai người thật có vành tai (helix), hốc tai (concha), bình tai (tragus) và dái tai (lobe) */
function earsSvg(earL: number, earR: number, skin: string, skinShadow: string, skinDeep: string, ink: string): string {
  const left = `<g transform="rotate(-8 ${earL} 49)">
    <path d="M${earL + 2} 42 C${earL - 4.5} 40.5, ${earL - 5.5} 47, ${earL - 4.2} 52 C${earL - 3.2} 55.8, ${earL - 0.5} 57.2, ${earL + 2.2} 55.5 Z" fill="${skin}" stroke="${ink}" stroke-width="2"/>
    <path d="M${earL + 0.8} 44.2 C${earL - 2.6} 44, ${earL - 3} 48.5, ${earL - 1.8} 52.2" stroke="${skinDeep}" stroke-width="1.4" fill="none" stroke-linecap="round"/>
    <ellipse cx="${earL - 0.8}" cy="49.2" rx="1.4" ry="2.2" fill="${skinShadow}"/>
  </g>`;
  const right = `<g transform="rotate(8 ${earR} 49)">
    <path d="M${earR - 2} 42 C${earR + 4.5} 40.5, ${earR + 5.5} 47, ${earR + 4.2} 52 C${earR + 3.2} 55.8, ${earR + 0.5} 57.2, ${earR - 2.2} 55.5 Z" fill="${skin}" stroke="${ink}" stroke-width="2"/>
    <path d="M${earR - 0.8} 44.2 C${earR + 2.6} 44, ${earR + 3} 48.5, ${earR + 1.8} 52.2" stroke="${skinDeep}" stroke-width="1.4" fill="none" stroke-linecap="round"/>
    <ellipse cx="${earR + 0.8}" cy="49.2" rx="1.4" ry="2.2" fill="${skinShadow}"/>
  </g>`;
  return left + right;
}

/** Mắt, mày, miệng của từng tâm trạng sự kiện (khác "normal") */
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

const PRIDE = ['#E03131', '#F76707', '#FFD43B', '#2F9E44', '#1C7ED6', '#7048E8'];

const OUTFIT_COLORS: Record<string, string> = {
  xanhrung: '#1B4332',
  den: '#212529',
  trang: '#F8F9FA',
  xam: '#6C757D',
  do: '#C92A2A',
  vang: '#F59F00',
};

/** Trang phục vui & đời thường (có đổ bóng nếp vải, cổ áo rõ nét trong khung tròn) */
function outfitSvg(o: CharacterOutfit, col: string, ink: string, skin: string, look?: CharacterLook): string {
  const skinShadow = darken(skin, 0.14);
  const body = (fill: string) => `<path d="M15 98 C17 76, 31 70, 50 70 C69 70, 83 76, 85 98 Z" fill="${fill}" stroke="${ink}" stroke-width="2.4"/>`;
  const teeCol = look?.outfitcolor && OUTFIT_COLORS[look.outfitcolor] ? OUTFIT_COLORS[look.outfitcolor] : col;
  const teeDark = darken(teeCol, 0.22);
  const teeLight = lighten(teeCol, 0.16);
  switch (o) {
    case 'thun':
      return `${body(teeCol)}
        <path d="M22 76 Q30 84 28 98 M78 76 Q70 84 72 98" stroke="${teeDark}" stroke-width="2" fill="none"/>
        <path d="M36 70 Q50 82 64 70 L61 68.5 Q50 77.5 39 68.5 Z" fill="${teeDark}" stroke="${ink}" stroke-width="1.8"/>
        <path d="M39 69 Q50 75 61 69" fill="${skinShadow}" stroke="${ink}" stroke-width="1.4"/>
        <path d="M36 82 Q50 86 64 82" stroke="${teeLight}" stroke-width="1.4" fill="none" opacity="0.45"/>`;
    case 'beo':
      return `${body('#FFFDF9')}
        <path d="M38 69 Q50 78 62 69 L60 67 Q50 74 40 67 Z" fill="${skinShadow}" stroke="${ink}" stroke-width="1.4"/>
        <path d="M32 71 C34 66, 39 66, 41 71 C43 66, 47 66, 50 71 C53 66, 57 66, 59 71 C61 66, 66 66, 68 71 C66 78, 58 80, 50 80 C42 80, 34 78, 32 71 Z" fill="#FFFFFF" stroke="${ink}" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M34 74 q4 4 8 0 q4 4 8 0 q4 4 8 0 q4 4 8 0" fill="none" stroke="#D0C9B8" stroke-width="1.5"/>
        <path d="M16 80 q6 -5 12 0 q6 5 11 0 M84 80 q-6 -5 -12 0 q-6 5 -11 0" fill="#FFFFFF" stroke="${ink}" stroke-width="1.8"/>
        <path d="M44 79 L44 96 M56 79 L56 96" stroke="#E9E2D0" stroke-width="1.4"/>
        <circle cx="50" cy="79" r="2.2" fill="#FFD43B" stroke="${ink}" stroke-width="1.1"/><circle cx="50" cy="79" r="0.9" fill="#FFF"/>
        <circle cx="50" cy="86" r="1.9" fill="#FFF" stroke="${ink}" stroke-width="1.1"/>`;
    case 'somi':
      return `${body('#FBF9F5')}
        <path d="M40 69 L50 86 L60 69 Z" fill="${skin}" stroke="${ink}" stroke-width="1.6"/>
        <path d="M45 73 L50 83 L55 73" fill="none" stroke="${skinShadow}" stroke-width="1.4"/>
        <path d="M39 68 L30 78 L42 84 L50 86 Z M61 68 L70 78 L58 84 L50 86 Z" fill="#FFFFFF" stroke="${ink}" stroke-width="2" stroke-linejoin="round"/>
        <line x1="50" y1="86" x2="50" y2="98" stroke="${ink}" stroke-width="1.6"/>
        <circle cx="50" cy="90" r="1.5" fill="${ink}"/><circle cx="50" cy="95" r="1.5" fill="${ink}"/>
        <path d="M25 78 L29 98 M75 78 L71 98" stroke="#D8D2C5" stroke-width="1.6"/>`;
    case 'balden':
      return `<path d="M15 98 C17 76, 31 70, 50 70 C69 70, 83 76, 85 98 Z" fill="${skin}" stroke="${ink}" stroke-width="2.4"/>
        <path d="M37 72 Q50 77 63 72" stroke="${skinShadow}" stroke-width="1.8" fill="none"/>
        <path d="M27 98 C29 84, 33 76, 35 70 L41 70 C41 85, 59 85, 59 70 L65 70 C67 76, 71 84, 73 98 Z" fill="#18181B" stroke="${ink}" stroke-width="2.2" stroke-linejoin="round"/>
        <path d="M41 72 C42 83, 58 83, 59 72" fill="none" stroke="#3F3F46" stroke-width="1.2"/>`;
    case 'aohoa':
      return `${body('#0CA678')}
        <path d="M38 70 L50 89 L62 70 Z" fill="${skin}" stroke="${ink}" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M38 69 L30 79 L42 84 L50 89 Z M62 69 L70 79 L58 84 L50 89 Z" fill="#12B886" stroke="${ink}" stroke-width="1.8" stroke-linejoin="round"/>
        <circle cx="27" cy="83" r="4.5" fill="#FF6B8A"/><circle cx="27" cy="83" r="1.7" fill="#FFD43B"/>
        <circle cx="73" cy="82" r="4.8" fill="#FFA94D"/><circle cx="73" cy="82" r="1.8" fill="#FFF3BF"/>
        <circle cx="36" cy="91" r="3.8" fill="#FFD43B"/><circle cx="65" cy="91" r="3.8" fill="#FF6B8A"/>
        <path d="M21 77 q5 -3 9 1 q-5 3 -9 -1 Z M79 89 q-5 -3 -9 1 q5 3 9 -1 Z" fill="#2B8A3E"/>`;
    case 'dobo':
      return `${body('#E599F7')}
        <path d="M24 76 L29 98 M34 73 L37 98 M44 71 L45 98 M56 71 L55 98 M66 73 L63 98 M76 76 L71 98" stroke="#FFF" stroke-width="2" opacity="0.75"/>
        <circle cx="31" cy="82" r="2.2" fill="#FFF0F6"/><circle cx="69" cy="81" r="2.2" fill="#FFF0F6"/>
        <circle cx="39" cy="89" r="2" fill="#FFF0F6"/><circle cx="61" cy="89" r="2" fill="#FFF0F6"/>
        <path d="M38 70 Q50 80 62 70 L59 68.5 Q50 76 41 68.5 Z" fill="#FFFFFF" stroke="${ink}" stroke-width="1.8"/>
        <circle cx="50" cy="82" r="1.8" fill="#FFD43B" stroke="${ink}" stroke-width="1"/><circle cx="50" cy="89" r="1.8" fill="#FFD43B" stroke="${ink}" stroke-width="1"/>`;
    case 'bala':
      return `<path d="M15 98 C17 76, 31 70, 50 70 C69 70, 83 76, 85 98 Z" fill="${skin}" stroke="${ink}" stroke-width="2.4"/>
        <path d="M27 98 C30 85, 34 77, 36 71 L43 71 Q50 86 57 71 L64 71 C66 77, 70 85, 73 98 Z" fill="#FFFFFF" stroke="${ink}" stroke-width="2.2" stroke-linejoin="round"/>
        <path d="M38 88 Q50 93 62 88" stroke="#DEE2E6" stroke-width="1.5" fill="none"/>`;
    case 'vestbong':
      return `${body('#1B2A63')}
        <path d="M40 70 L50 95 L60 70 Z" fill="#FFFFFF"/>
        <path d="M34 71 L46 98 L37 98 L25 81 Z M66 71 L54 98 L63 98 L75 81 Z" fill="#3B5BDB" stroke="${ink}" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M43 73 L50 78 L43 82 Z M57 73 L50 78 L57 82 Z" fill="#E03131" stroke="${ink}" stroke-width="1.4"/><circle cx="50" cy="78" r="2" fill="#FFD43B" stroke="${ink}" stroke-width="0.9"/>
        ${sparkle(30, 80, 3.2)}${sparkle(70, 80, 3.2)}${sparkle(34, 89, 2.4, '#FFD43B')}${sparkle(66, 89, 2.4, '#FFD43B')}`;
    case 'aodai':
      return `${body(col)}
        <path d="M41 76 L73 91 L75 98" stroke="${ink}" stroke-width="2" fill="none"/>
        <path d="M39 69 Q50 76 61 69 L60 77 Q50 83 40 77 Z" fill="#FFF3BF" stroke="${ink}" stroke-width="2" stroke-linejoin="round"/>
        <circle cx="61" cy="84" r="1.8" fill="#FFD43B" stroke="${ink}" stroke-width="0.8"/><circle cx="67" cy="87" r="1.8" fill="#FFD43B" stroke="${ink}" stroke-width="0.8"/>
        <circle cx="31" cy="85" r="2.6" fill="#FFD43B"/><circle cx="38" cy="91" r="2.2" fill="#FFD43B"/>`;
    case 'dongphuc':
      return `${body('#FFFFFF')}
        <path d="M37 70 L50 79 L63 70 L59 67.5 L50 73.5 L41 67.5 Z" fill="#F1F3F5" stroke="${ink}" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M38 71 L62 71 L50 90 Z" fill="#E03131" stroke="${ink}" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M45.5 77 Q50 73 54.5 77 Q50 82.5 45.5 77 Z" fill="#C92A2A" stroke="${ink}" stroke-width="1.3"/>
        <path d="M24 82 L28 98 M76 82 L72 98" stroke="#DEE2E6" stroke-width="1.6"/>`;
    case 'aomua':
      return `<path d="M29 64 Q50 56 71 64 L77 82 Q50 72 23 82 Z" fill="#F59F00" stroke="${ink}" stroke-width="2.2" stroke-linejoin="round"/>
        ${body('#FFD43B')}
        <path d="M34 75 Q50 89 66 75" fill="none" stroke="${ink}" stroke-width="2"/>
        <path d="M50 83 L50 98" stroke="${ink}" stroke-width="1.6"/>
        <circle cx="50" cy="86" r="1.9" fill="#F59F00" stroke="${ink}" stroke-width="0.9"/>
        <path d="M26 83 l3 4 M72 81 l3 4 M36 90 l3 4 M64 91 l3 4" stroke="#FFF" stroke-width="1.6" stroke-linecap="round"/>`;
    case 'dayvang':
      return `${body(teeCol)}
        <path d="M38 70 Q50 81 62 70" fill="#18181B" stroke="${ink}" stroke-width="2"/>
        <path d="M34 70 Q50 91 66 70" fill="none" stroke="${ink}" stroke-width="6.4" stroke-linecap="round"/>
        <path d="M34 70 Q50 91 66 70" fill="none" stroke="url(#goldG)" stroke-width="4.4" stroke-linecap="round"/>
        <path d="M34 70 Q50 91 66 70" fill="none" stroke="#FFF3BF" stroke-width="1.4" stroke-dasharray="2.5 2.5" stroke-linecap="round"/>
        <circle cx="50" cy="83.5" r="6.2" fill="url(#goldG)" stroke="${ink}" stroke-width="1.9"/>
        <circle cx="50" cy="83.5" r="4.6" fill="none" stroke="#FFF9DB" stroke-width="0.9"/>
        <text x="50" y="86.8" font-size="9.5" font-weight="900" text-anchor="middle" fill="${ink}" font-family="sans-serif">$</text>
        ${sparkle(44, 79, 2.8)}${sparkle(56, 81, 2.4)}`;
    default:
      return '';
  }
}

/** Hình xăm vảy rồng / mây cuộn màu mực xanh đen rõ nét trên vai & bắp tay */
function tattooSvg(look?: CharacterLook): string {
  if (look?.tattoo !== 'co') return '';
  const left = look.tattooside !== 'phai';
  const big = look.tattoosize === 'vaibap';
  const x = left ? 25 : 75;
  const dir = left ? 1 : -1;
  return `<g stroke="#1D3540" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.88">
    <path d="M${x} 72 C${x + 6 * dir} 74, ${x + 7 * dir} 80, ${x + 2 * dir} 83 C${x - 4 * dir} 85, ${x - 2 * dir} 91, ${x + 4 * dir} 93"/>
    <path d="M${x - 4 * dir} 76 Q${x + 3 * dir} 73 ${x + 8 * dir} 78 Q${x + 4 * dir} 83 ${x - 2 * dir} 81" fill="#2A4B58" fill-opacity="0.35"/>
    <circle cx="${x + 2 * dir}" cy="78" r="1.6" fill="#1D3540"/>
    ${big ? `<path d="M${x - 3 * dir} 84 Q${x + 5 * dir} 86 ${x + 3 * dir} 92 M${x - 6 * dir} 87 L${x + 2 * dir} 90"/>` : ''}
  </g>`;
}

/** Chi tiết khuôn mặt (nốt ruồi cạnh môi/má/cằm, tàn nhang, răng thỏ, má lúm) */
function detailSvg(d: CharacterDetail | undefined, ink: string, mood: Mood, look?: CharacterLook): string {
  const pos = look?.molepos ?? 'moi';
  const [mx, my] = pos === 'ma' ? [65.5, 53.5] : pos === 'cam' ? [54.5, 67] : [60.2, 57.5];
  const mole = d === 'notruoi' || look?.molepos
    ? `<circle cx="${mx}" cy="${my}" r="1.85" fill="#2B1810"/><circle cx="${mx - 0.45}" cy="${my - 0.45}" r="0.5" fill="#FFF" opacity="0.65"/>`
    : '';
  switch (d) {
    case 'notruoi':
      return mole;
    case 'tannhang':
      return mole + [[31.5, 54.5], [35.5, 57.2], [39.5, 55], [33.5, 59.8], [60.5, 55], [64.5, 57.2], [68.5, 54.5], [66.5, 59.8], [46.5, 53], [53.5, 53], [50, 55.2]]
        .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.15" fill="#A86432" opacity="0.85"/>`).join('');
    case 'longmay':
      return mole + `<path d="M31 41.8 Q42 37.5 50 42 Q58 37.5 69 41.8" stroke="${ink}" stroke-width="4.8" fill="none" stroke-linecap="round"/>`;
    case 'ranghe':
      return mole + (mood === 'normal' || mood === 'smug'
        ? `<path d="M45.6 60.2 L45.6 65.8 Q45.6 67 47.5 67 L49.7 67 L49.7 60.2 Z M50.3 60.2 L50.3 67 L52.5 67 Q54.4 67 54.4 65.8 L54.4 60.2 Z" fill="#FFFFFF" stroke="${ink}" stroke-width="1.2" stroke-linejoin="round"/>`
        : '');
    case 'malum':
      return mole + `<path d="M36.8 56.2 Q34.2 59.8 37 63.2 M63.2 56.2 Q65.8 59.8 63 63.2" stroke="#9C6344" stroke-width="1.9" fill="none" stroke-linecap="round"/>`;
    default:
      return mole;
  }
}

const HEAD_FILL = (ink: string) => `fill="url(#skinG)" stroke="${ink}" stroke-width="2.4"`;

/** Dáng mặt (10 dáng giải phẫu có khối thái dương, gò má, xương hàm, cằm 3D) */
function faceShape(
  f: CharacterFace | undefined,
  nhi: boolean,
  skin: string,
  skinShadow: string,
  ink: string,
  look?: CharacterLook,
): { head: string; earL: number; earR: number; extras: string } {
  const a = HEAD_FILL(ink);
  const skinDeep = darken(skin, 0.24);
  const skinLight = lighten(skin, 0.22);
  let head = '';
  let earL = 24;
  let earR = 76;
  switch (f) {
    case 'tron':
      head = `<path d="M23 46 C22.5 29, 34 21, 50 21 C66 21, 77.5 29, 77 46 C77.5 59, 67 70.5, 50 70.5 C33 70.5, 22.5 59, 23 46 Z" ${a}/>`;
      earL = 22.5; earR = 77.5;
      break;
    case 'ovalngan':
      head = `<path d="M24 45 C23.5 28, 35 21, 50 21 C65 21, 76.5 28, 76 45 C76 58, 66.5 68, 56 70.2 C52 71, 48 71, 44 70.2 C33.5 68, 24 58, 24 45 Z" ${a}/>`;
      earL = 23.5; earR = 76.5;
      break;
    case 'oval':
      head = `<path d="M26 44 C25.5 27, 35.5 20, 50 20 C64.5 20, 74.5 27, 74 44 C74 57.5, 65.5 69.5, 55 72.2 C51.5 73, 48.5 73, 45 72.2 C34.5 69.5, 26 57.5, 26 44 Z" ${a}/>`;
      earL = 25.5; earR = 74.5;
      break;
    case 'ovaldai':
      head = `<path d="M26 43 C25.5 25.5, 36 19, 50 19 C64 19, 74.5 25.5, 74 43 C74.5 56, 66.5 68.5, 55.5 73 C52 74.4, 48 74.4, 44.5 73 C33.5 68.5, 25.5 56, 26 43 Z" ${a}/>`;
      earL = 25.5; earR = 74.5;
      break;
    case 'ovalvuong':
      head = `<path d="M25.5 41 C25 25, 36 20, 50 20 C64 20, 75 25, 74.5 41 L74 56.5 C73.8 64.5, 68 69.8, 58 71.5 C53 72.3, 47 72.3, 42 71.5 C32 69.8, 26.2 64.5, 26 56.5 Z" ${a}/>`;
      earL = 25; earR = 75;
      break;
    case 'dai':
      head = `<path d="M28 43 C27.5 25, 36.5 18.5, 50 18.5 C63.5 18.5, 72.5 25, 72 43 C72 58.5, 64.5 71.5, 55 75 C51.5 76.2, 48.5 76.2, 45 75 C35.5 71.5, 28 58.5, 28 43 Z" ${a}/>`;
      earL = 27.5; earR = 72.5;
      break;
    case 'vuong':
      head = `<path d="M25.5 34 C25.5 23, 35 20, 50 20 C65 20, 74.5 23, 74.5 34 L74.5 56.5 C74.5 65.5, 68.5 70.5, 59 71.8 L41 71.8 C31.5 70.5, 25.5 65.5, 25.5 56.5 Z" ${a} stroke-linejoin="round"/>`;
      earL = 25; earR = 75;
      break;
    case 'bau':
      head = `<path d="M24 43 C23.5 27, 35.5 20.5, 50 20.5 C64.5 20.5, 76.5 27, 76 43 C78.8 54, 76 64.5, 65 69.8 C58 72.5, 42 72.5, 35 69.8 C24 64.5, 21.2 54, 24 43 Z" ${a}/>`;
      earL = 22; earR = 78;
      break;
    case 'nhon':
      head = `<path d="M26 38 C25.5 24.5, 36.5 20, 50 20 C63.5 20, 74.5 24.5, 74 38 C74 50.5, 65 63.5, 54.5 73.2 C51.5 75.8, 48.5 75.8, 45.5 73.2 C35 63.5, 26 50.5, 26 38 Z" ${a}/>`;
      earL = 25.5; earR = 74.5;
      break;
    default:
      head = `<path d="M25.5 43 C25 26.5, 35.5 20, 50 20 C64.5 20, 75 26.5, 74.5 43 C74.5 56.5, 65.5 68, 55.5 71.5 C52 72.6, 48 72.6, 44.5 71.5 C34.5 68, 25.5 56.5, 25.5 43 Z" ${a}/>`;
      earL = 25; earR = 75;
  }

  // Khối sáng tối 3D trên trán, gò má và xương hàm để khuôn mặt có chiều sâu như người thật
  let extras = `<ellipse cx="50" cy="33" rx="14" ry="5.5" fill="${skinLight}" opacity="0.28"/>
    <ellipse cx="34" cy="52" rx="5.5" ry="3.2" fill="${skinLight}" opacity="0.24"/>
    <ellipse cx="66" cy="52" rx="5.5" ry="3.2" fill="${skinLight}" opacity="0.24"/>
    <path d="M30 61 Q40 69.5 50 70.5 Q60 69.5 70 61" fill="none" stroke="${skinShadow}" stroke-width="2" opacity="0.45" stroke-linecap="round"/>`;

  if (f === 'bau') {
    extras += `<ellipse cx="31" cy="56.5" rx="6.2" ry="4.4" fill="#FF8787" opacity="0.32"/><ellipse cx="69" cy="56.5" rx="6.2" ry="4.4" fill="#FF8787" opacity="0.32"/>`;
  }
  if (nhi) {
    extras += `<ellipse cx="32" cy="55" rx="5.2" ry="3.2" fill="#FF8787" opacity="0.35"/><ellipse cx="68" cy="55" rx="5.2" ry="3.2" fill="#FF8787" opacity="0.35"/>`;
  }
  if (look?.jaw === 'ro') {
    extras += `<path d="M27.5 53 L32.5 64.5 L41 69 M72.5 53 L67.5 64.5 L59 69" fill="none" stroke="${skinDeep}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" opacity="0.65"/>`;
  }
  if (look?.chin === 'rong') {
    extras += `<path d="M43 68.5 L57 68.5" stroke="${skinDeep}" stroke-width="2" stroke-linecap="round" opacity="0.65"/>`;
  } else if (look?.chin === 'bo') {
    extras += `<path d="M45 67.5 Q50 70.2 55 67.5 M50 67.8 L50 70.5" fill="none" stroke="${skinDeep}" stroke-width="1.7" stroke-linecap="round" opacity="0.7"/>`;
  } else if (look?.chin === 'nho') {
    extras += `<path d="M46.5 67.8 Q50 69.8 53.5 67.8" fill="none" stroke="${skinDeep}" stroke-width="1.5" stroke-linecap="round" opacity="0.65"/>`;
  }
  if (look?.cheek === 'thon') {
    extras += `<path d="M30.5 52 Q34 57.5 31.5 62.5 M69.5 52 Q66 57.5 68.5 62.5" fill="none" stroke="${skinDeep}" stroke-width="1.7" stroke-linecap="round" opacity="0.6"/>`;
  } else if (look?.cheek === 'phinh') {
    extras += `<path d="M25.5 53.5 Q22.5 59 28.5 63.5 M74.5 53.5 Q77.5 59 71.5 63.5" fill="none" stroke="${skinDeep}" stroke-width="1.8" stroke-linecap="round" opacity="0.65"/>`;
  } else if (look?.cheek === 'go') {
    extras += `<path d="M28 50.5 Q33.5 54.2 37.5 51 M72 50.5 Q66.5 54.2 62.5 51" fill="none" stroke="${skinDeep}" stroke-width="1.8" stroke-linecap="round" opacity="0.65"/>
      <ellipse cx="33" cy="49.5" rx="4.5" ry="2" fill="#FFFFFF" opacity="0.28"/><ellipse cx="67" cy="49.5" rx="4.5" ry="2" fill="#FFFFFF" opacity="0.28"/>`;
  } else if (look?.cheek === 'day') {
    extras += `<ellipse cx="32.5" cy="54.5" rx="5.5" ry="3.4" fill="#FFFFFF" opacity="0.22"/><ellipse cx="67.5" cy="54.5" rx="5.5" ry="3.4" fill="#FFFFFF" opacity="0.22"/>`;
  }
  if (look?.nepcuoi === 'co') {
    extras += `<path d="M42.5 52.5 Q37.5 56.8 39.2 62.5 M57.5 52.5 Q62.5 56.8 60.8 62.5" fill="none" stroke="${skinDeep}" stroke-width="1.7" stroke-linecap="round" opacity="0.72"/>`;
  }
  if (look?.maphan === 'co') {
    extras += `<ellipse cx="32.5" cy="54.2" rx="6.8" ry="3.8" fill="#FF5C8A" opacity="0.42"/><ellipse cx="67.5" cy="54.2" rx="6.8" ry="3.8" fill="#FF5C8A" opacity="0.42"/>`;
  }
  return { head, earL, earR, extras };
}

/** Mắt người thật có khóe mắt, bầu mí trên/dưới, bọng mắt nhẹ, tròng mắt 3 lớp + 2 đốm sáng, eyeliner & lông mi */
function detailedEyesSvg(c: CharacterConfig, ink: string, skin: string): string {
  const look = c.look;
  const female = c.gender === 'nu';
  const skinShadow = darken(skin, 0.16);
  const shape = look?.eyeshape ?? (c.eyes === 'hip' ? 'hip' : c.eyes === 'to' ? 'tron' : c.eyes === 'motmi' ? 'hanhhep' : 'hanhnhan');
  const open = look?.open ?? 'mo';
  const lid = look?.lid ?? (c.eyes === 'motmi' ? 'mot' : 'hai');
  const liner = look?.liner === 'co' || (female && look?.liner === undefined);
  const irisOuter = look?.eyecolor === 'nau' ? '#2B170A' : '#120E0C';
  const irisInner = look?.eyecolor === 'nau' ? '#63371B' : '#2E231D';
  const gx = look?.gaze === 'trai' ? -1.6 : look?.gaze === 'phai' ? 1.6 : 0;
  const asym = look?.asym === 'co';

  if (shape === 'hip') {
    const ry2 = asym ? 49.6 : 48.8;
    return `<path d="M32.5 48.8 Q39 43.2 45.5 48.8 M54.5 ${ry2} Q61 ${asym ? 44.2 : 43.2} 67.5 ${ry2}" stroke="${ink}" stroke-width="${liner ? 3.2 : 2.7}" fill="none" stroke-linecap="round"/>
      <path d="M34 50.8 Q39 48.8 44 50.6 M56 50.8 Q61 48.8 66 50.6" stroke="${skinShadow}" stroke-width="1.3" fill="none" stroke-linecap="round"/>
      ${liner ? `<path d="M32.5 48.8 L30.2 47.2 M67.5 ${ry2} L69.8 ${ry2 - 1.6}" stroke="${ink}" stroke-width="2" stroke-linecap="round"/>` : ''}`;
  }

  const rx = shape === 'tron' ? 6 : shape === 'nho' ? 4.6 : 5.6;
  const baseRy = shape === 'tron' ? 4.8 : shape === 'hanhhep' ? 2.6 : shape === 'nho' ? 2.3 : 3.7;
  const ry = open === 'nheo' ? baseRy * 0.64 : open === 'tru' ? baseRy * 0.78 : baseRy;
  const ryR = asym ? ry * 0.86 : ry;
  const cyR = asym ? 48.5 : 48;

  const drawOne = (cx: number, cy: number, erx: number, ery: number, left: boolean) => {
    const outerX = left ? cx - erx : cx + erx;
    const innerX = left ? cx + erx * 0.94 : cx - erx * 0.94;
    const dir = left ? -1 : 1;
    const irisR = Math.min(3.5, ery * 0.86 + 0.55);
    const scleraPath = `M${innerX} ${cy + 0.4} C${cx + dir * erx * 0.25} ${cy - ery * 1.25}, ${cx + dir * erx * 0.75} ${cy - ery * 1.15}, ${outerX} ${cy - 0.1} C${cx + dir * erx * 0.65} ${cy + ery * 1.15}, ${cx - dir * erx * 0.25} ${cy + ery * 1.15}, ${innerX} ${cy + 0.4} Z`;
    const lidCrease = lid === 'hai'
      ? `<path d="M${innerX - dir * 0.4} ${cy - ery * 0.75} Q${cx} ${cy - ery * 1.55 - 1} ${outerX - dir * 0.3} ${cy - ery * 0.65}" stroke="${skinShadow}" stroke-width="1.25" fill="none" stroke-linecap="round"/>`
      : `<path d="M${cx - erx * 0.7} ${cy - ery - 0.8} Q${cx} ${cy - ery - 1.6} ${cx + erx * 0.7} ${cy - ery - 0.8}" stroke="${skinShadow}" stroke-width="1" fill="none" opacity="0.6" stroke-linecap="round"/>`;
    const underBag = `<path d="M${cx - erx * 0.75} ${cy + ery + 1.3} Q${cx} ${cy + ery + 2.5} ${cx + erx * 0.75} ${cy + ery + 1.3}" stroke="${skinShadow}" stroke-width="1.1" fill="none" opacity="0.55" stroke-linecap="round"/>`;
    const droop = open === 'tru'
      ? `<path d="M${cx - erx - 0.5} ${cy - ery * 0.25} L${cx + erx + 0.5} ${cy - ery * 0.1}" stroke="${ink}" stroke-width="2" stroke-linecap="round"/><rect x="${cx - erx}" y="${cy - ery - 1}" width="${erx * 2}" height="${ery * 0.72}" fill="${skin}"/>`
      : '';
    const upperLine = `<path d="M${innerX} ${cy + 0.4} C${cx - dir * erx * 0.25} ${cy - ery * 1.25}, ${cx + dir * erx * 0.75} ${cy - ery * 1.15}, ${outerX} ${cy - 0.1}" stroke="${ink}" stroke-width="${liner ? 2.5 : 1.9}" fill="none" stroke-linecap="round"/>`;
    const lash = liner
      ? `<path d="M${outerX - dir * 0.4} ${cy - 0.2} L${outerX + dir * 2.6} ${cy - 2.1} M${cx + dir * erx * 0.45} ${cy - ery * 0.85} L${cx + dir * (erx * 0.45 + 1.2)} ${cy - ery * 0.85 - 1.8}" stroke="${ink}" stroke-width="1.9" stroke-linecap="round"/>`
      : '';
    return `${lidCrease}${underBag}
      <path d="${scleraPath}" fill="#FCFBF9" stroke="${ink}" stroke-width="1.35" stroke-linejoin="round"/>
      <circle cx="${innerX - dir * 0.7}" cy="${cy + 0.35}" r="0.75" fill="#E88D8D"/>
      <circle cx="${cx + gx}" cy="${cy - 0.1}" r="${irisR}" fill="${irisOuter}"/>
      <circle cx="${cx + gx}" cy="${cy - 0.1}" r="${irisR * 0.74}" fill="${irisInner}"/>
      <circle cx="${cx + gx}" cy="${cy - 0.1}" r="${irisR * 0.44}" fill="#070606"/>
      <circle cx="${cx + gx + 1.05}" cy="${cy - 1.1}" r="1.15" fill="#FFFFFF"/>
      <circle cx="${cx + gx - 0.85}" cy="${cy + 0.85}" r="0.55" fill="#FFFFFF" opacity="0.85"/>
      ${droop}${upperLine}${lash}`;
  };

  return drawOne(38.8, 48, rx, ry, true) + drawOne(61.2, cyR, rx, ryR, false);
}

/** Lông mày người thật có đầu mày dày, đỉnh cong tự nhiên, đuôi thuôn nhọn & phẩy sợi */
function detailedBrowsSvg(c: CharacterConfig, ink: string): string {
  const look = c.look;
  const shape = look?.browshape ?? (c.brows === 'lieu' ? 'lieu' : c.brows === 'ray' ? 'ngang' : c.gender === 'nu' ? 'cong' : 'ngang');
  const thick = look?.browthick ?? (c.brows === 'ray' ? 'day' : c.brows === 'lieu' ? 'mong' : 'vua');
  const h = thick === 'day' ? 3.2 : thick === 'mong' ? 1.5 : 2.3;
  switch (shape) {
    case 'cong':
      return `<path d="M44.5 41.2 C40 39.2, 35 39.2, 31.2 42.4 C34.8 40.8, 39.8 41, 44.5 42.6 Z M55.5 41.2 C60 39.2, 65 39.2, 68.8 42.4 C65.2 40.8, 60.2 41, 55.5 42.6 Z" fill="${ink}" stroke="${ink}" stroke-width="${h * 0.45}" stroke-linejoin="round"/>`;
    case 'mem':
      return `<path d="M44.5 41 C39.5 38.8, 34 39.5, 31 42.8 C34.5 41, 39.8 41.3, 44.5 42.5 Z M55.5 41 C60.5 38.8, 66 39.5, 69 42.8 C65.5 41, 60.2 41.3, 55.5 42.5 Z" fill="${ink}" stroke="${ink}" stroke-width="${h * 0.48}" stroke-linejoin="round"/>`;
    case 'gap':
      return `<path d="M44.8 41.6 L35.2 39.2 L30.8 42.8 L35.5 41.2 L44.8 43 Z M55.2 41.6 L64.8 39.2 L69.2 42.8 L64.5 41.2 L55.2 43 Z" fill="${ink}" stroke="${ink}" stroke-width="${h * 0.45}" stroke-linejoin="round"/>`;
    case 'lieu':
      return `<path d="M31.5 42.6 Q38.2 36.2 45 41.4 M55 41.4 Q61.8 36.2 68.5 42.6" stroke="${ink}" stroke-width="${Math.min(2, h)}" fill="none" stroke-linecap="round"/>`;
    default:
      return `<path d="M44.8 41.2 L32 40.5 L31.2 42.4 L44.8 42.8 Z M55.2 41.2 L68 40.5 L68.8 42.4 L55.2 42.8 Z" fill="${ink}" stroke="${ink}" stroke-width="${h * 0.5}" stroke-linejoin="round"/>`;
  }
}

/** Mũi giải phẫu 3D: sống mũi nối chân mày, ánh sáng dọc sống mũi, chóp mũi, hai lỗ mũi, cánh mũi và nhân trung */
function noseSvg(look: CharacterLook | undefined, skinShadow: string, ink: string): string {
  const bridge = look?.nose ?? 'vua';
  const tip = look?.nosetip ?? 'tron';
  const nostril = look?.nostril ?? 'vua';
  const shadowDark = darken(skinShadow, 0.22);
  const bridgePath =
    bridge === 'ro'
      ? `<path d="M46.5 42.2 Q48.2 45 48.2 52.2" stroke="${shadowDark}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
         <path d="M53.5 42.2 Q51.8 45 51.8 52.2" stroke="${skinShadow}" stroke-width="1.2" fill="none" opacity="0.65" stroke-linecap="round"/>
         <path d="M50 43.8 L50 52.2" stroke="#FFFFFF" stroke-width="1.4" opacity="0.65" stroke-linecap="round"/>`
      : bridge === 'thap'
        ? `<path d="M48.8 48.5 L48.5 52.2" stroke="${shadowDark}" stroke-width="1.5" fill="none" stroke-linecap="round"/>
           <path d="M50.2 49 L50.2 52" stroke="#FFFFFF" stroke-width="1.1" opacity="0.45" stroke-linecap="round"/>`
        : `<path d="M47.5 44.5 Q48.5 48 48.4 52.2" stroke="${shadowDark}" stroke-width="1.65" fill="none" stroke-linecap="round"/>
           <path d="M50.1 45.2 L50.1 52.2" stroke="#FFFFFF" stroke-width="1.25" opacity="0.55" stroke-linecap="round"/>`;
  const tipR = tip === 'day' ? 3.4 : tip === 'nho' ? 2 : 2.6;
  const wingW = nostril === 'rong' ? 5.4 : nostril === 'hep' ? 3.2 : 4.3;
  const philtrum = `<path d="M48.8 55.2 L48.5 57.6 M51.2 55.2 L51.5 57.6" stroke="${skinShadow}" stroke-width="1.1" opacity="0.7" stroke-linecap="round"/>`;
  return `${bridgePath}
    <ellipse cx="50" cy="52.8" rx="${tipR}" ry="${tipR * 0.78}" fill="${skinShadow}" opacity="0.5"/>
    <circle cx="50" cy="52.2" r="${tipR * 0.45}" fill="#FFFFFF" opacity="0.45"/>
    <path d="M${50 - wingW} 52.2 C${50 - wingW - 1.2} 54.2, ${50 - wingW + 0.8} 55.2, ${50 - 1.8} 54.6 Q50 55.6 ${50 + 1.8} 54.6 C${50 + wingW - 0.8} 55.2, ${50 + wingW + 1.2} 54.2, ${50 + wingW} 52.2" stroke="${shadowDark}" stroke-width="1.65" fill="none" stroke-linecap="round"/>
    <ellipse cx="${50 - wingW * 0.52}" cy="54.1" rx="${nostril === 'rong' ? 1.35 : 0.95}" ry="0.65" fill="${ink}" opacity="0.55"/>
    <ellipse cx="${50 + wingW * 0.52}" cy="54.1" rx="${nostril === 'rong' ? 1.35 : 0.95}" ry="0.65" fill="${ink}" opacity="0.55"/>
    ${philtrum}`;
}

/** Đôi môi 3D có viền tim (Cupid's bow), môi dưới căng bóng, khóe miệng, hàm răng & hõm cằm */
function mouthSvg(c: CharacterConfig, ink: string): string {
  const look = c.look;
  const female = c.gender === 'nu';
  const col =
    look?.lipcolor === 'do'
      ? '#D91E36'
      : look?.lipcolor === 'cam'
        ? '#DF5A3C'
        : look?.lipcolor === 'hongnau'
          ? '#B85D57'
          : female
            ? '#D6336C'
            : '#A65650';
  const upperCol = darken(col, 0.14);
  const lowerCol = lighten(col, 0.08);
  const thick = look?.lipthick ?? (female ? 'duoi' : 'mong');
  const exp = look?.mouth ?? 'khep';
  const lw = thick === 'day' ? 2.6 : thick === 'duoi' ? 2.1 : 1.6;
  const chinCrease = `<path d="M46.5 66.2 Q50 65.2 53.5 66.2" stroke="#B68663" stroke-width="1.2" fill="none" opacity="0.55" stroke-linecap="round"/>`;

  if (exp === 'cuoirang') {
    return `<path d="M40.5 58.6 C44 57.2, 47.5 57.8, 50 58.3 C52.5 57.8, 56 57.2, 59.5 58.6 C58 65.8, 54 66.5, 50 66.5 C46 66.5, 42 65.8, 40.5 58.6 Z" fill="#59111D" stroke="${col}" stroke-width="${lw}" stroke-linejoin="round"/>
      <path d="M41.8 59 C46 59.8, 54 59.8, 58.2 59 L57.4 62.6 Q50 63.4 42.6 62.6 Z" fill="#FFFFFF"/>
      <path d="M45.5 59.2 L45.5 62.5 M50 59.4 L50 62.8 M54.5 59.2 L54.5 62.5" stroke="#DEE2E6" stroke-width="0.8"/>
      <path d="M43 65.2 Q50 66.8 57 65.2" stroke="#FFFFFF" stroke-width="1.1" fill="none" opacity="0.55" stroke-linecap="round"/>
      <path d="M38.5 57.2 Q40 59 41 60.5 M61.5 57.2 Q60 59 59 60.5" stroke="#9C6644" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;
  }
  if (exp === 'cuoitu') {
    return `<path d="M39 58 C43 56.8, 47 57.5, 50 58 C53 57.5, 57 56.8, 61 58 C59.2 66.8, 54.5 67.5, 50 67.5 C45.5 67.5, 40.8 66.8, 39 58 Z" fill="#6E1423" stroke="${col}" stroke-width="${lw}" stroke-linejoin="round"/>
      <path d="M40.6 58.4 Q50 59.8 59.4 58.4 L58.4 62 L41.6 62 Z" fill="#FFFFFF"/>
      <ellipse cx="50" cy="65.2" rx="4.5" ry="2" fill="#FF8FA3"/>
      <path d="M36.5 56.2 Q38.5 58.5 39.5 60.8 M63.5 56.2 Q61.5 58.5 60.5 60.8" stroke="#9C6644" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
  }
  if (exp === 'he') {
    return `<path d="M42.5 59.2 C45.5 56.8, 48 56.8, 50 57.8 C52 56.8, 54.5 56.8, 57.5 59.2 C56 64.6, 53 65.4, 50 65.4 C47 65.4, 44 64.6, 42.5 59.2 Z" fill="#6E1423" stroke="${col}" stroke-width="${lw + 0.4}" stroke-linejoin="round"/>
      <path d="M44.5 58.6 L55.5 58.6 L54.8 60.6 L45.2 60.6 Z" fill="#FFFFFF"/>
      <ellipse cx="50" cy="63" rx="3.4" ry="1.5" fill="#FF8FA3"/>
      <path d="M46.5 64.5 Q50 65.4 53.5 64.5" stroke="#FFFFFF" stroke-width="1" fill="none" opacity="0.6" stroke-linecap="round"/>
      ${chinCrease}`;
  }
  // 'khep': đôi môi khép có viền tim rõ nét
  const upH = thick === 'day' ? 2.6 : thick === 'duoi' ? 1.9 : 1.3;
  const lowH = thick === 'day' ? 4.2 : thick === 'duoi' ? 3.4 : 2.1;
  return `<path d="M42.5 59.6 C45 59.6 - ${upH}, 48 ${59.4 - upH}, 50 ${59.9 - upH * 0.55} C52 ${59.4 - upH}, 55 ${59.6 - upH}, 57.5 59.6 Q50 60.6 42.5 59.6 Z" fill="${upperCol}"/>
    <path d="M42.8 59.6 Q50 60.6 57.2 59.6 C55.8 ${59.6 + lowH}, 44.2 ${59.6 + lowH}, 42.8 59.6 Z" fill="${lowerCol}"/>
    <path d="M46.8 ${60.4 + lowH * 0.42} Q50 ${60.9 + lowH * 0.45} 53.2 ${60.4 + lowH * 0.42}" stroke="#FFFFFF" stroke-width="1.1" fill="none" opacity="0.58" stroke-linecap="round"/>
    <path d="M42 59.5 Q46 60.3 50 59.8 Q54 60.3 58 59.5" stroke="${look?.lipcolor === 'do' ? '#7A0C18' : ink}" stroke-width="1.65" fill="none" stroke-linecap="round"/>
    <circle cx="42" cy="59.4" r="0.8" fill="${ink}" opacity="0.5"/><circle cx="58" cy="59.4" r="0.8" fill="${ink}" opacity="0.5"/>
    ${chinCrease}`;
}

/** Râu vẽ bằng các lớp sợi tự nhiên: ria mép, râu dưới môi/cằm, râu quai nón dọc đường hàm */
function beardSvg(look: CharacterLook | undefined, ink: string): string {
  if (!look) return '';
  let out = '';
  if (look.ria && look.ria !== 'khong') {
    const sw = look.ria === 'vua' ? 1.65 : 1.05;
    const base = look.ria === 'vua' ? `<path d="M41.5 57.2 Q46 55.2 50 56.4 Q54 55.2 58.5 57.2" stroke="${ink}" stroke-width="2.2" fill="none" opacity="0.35" stroke-linecap="round"/>` : '';
    const strokes = [-7.5, -5.8, -4.1, -2.5, -1.1, 1.1, 2.5, 4.1, 5.8, 7.5]
      .map((dx) => `<line x1="${50 + dx * 0.92}" y1="55.3" x2="${50 + dx * 1.12}" y2="57.7" stroke="${ink}" stroke-width="${sw}" stroke-linecap="round"/>`)
      .join('');
    out += `<g opacity="0.88">${base}${strokes}</g>`;
  }
  if (look.raucam && look.raucam !== 'khong') {
    const sw = look.raucam === 'vua' ? 1.6 : 1;
    const soul = [-2, -0.7, 0.7, 2].map((dx) => `<line x1="${50 + dx}" y1="63.6" x2="${50 + dx * 1.1}" y2="65.8" stroke="${ink}" stroke-width="${sw}" stroke-linecap="round"/>`).join('');
    const chin = [-6.5, -4.8, -3.2, -1.6, 0, 1.6, 3.2, 4.8, 6.5]
      .map((dx) => `<line x1="${50 + dx}" y1="${68.4 - Math.abs(dx) * 0.14}" x2="${50 + dx * 1.08}" y2="${71.4 - Math.abs(dx) * 0.14}" stroke="${ink}" stroke-width="${sw}" stroke-linecap="round"/>`)
      .join('');
    out += `<g opacity="0.88">${soul}${chin}</g>`;
  }
  if (look.rauham && look.rauham !== 'khong') {
    const sw = look.rauham === 'vua' ? 1.55 : 0.95;
    const pts: [number, number][] = [
      [26.8, 53.5], [28, 57], [29.8, 60.5], [32.2, 63.8], [35.2, 66.6], [38.8, 68.8],
      [73.2, 53.5], [72, 57], [70.2, 60.5], [67.8, 63.8], [64.8, 66.6], [61.2, 68.8],
    ];
    out += `<g opacity="0.84">${pts.map(([x, y]) => `<line x1="${x}" y1="${y}" x2="${x + (x < 50 ? 0.9 : -0.9)}" y2="${y + 2.4}" stroke="${ink}" stroke-width="${sw}" stroke-linecap="round"/>`).join('')}</g>`;
  }
  return out;
}

/** Các kiểu tóc mở rộng: gồm cả buộc thấp có tóc con, chải ngược phồng + xoăn gáy, vuốt lệch phồng trước, rất ngắn dựng chỏm */
function extraHair(h: CharacterHair, f: string, ink: string, accent: string): { back: string; front: string } | null {
  const st = `fill="${f}" stroke="${ink}" stroke-width="2.3"`;
  const shine = `<path d="M35 20 Q50 15 65 20" stroke="#FFFFFF" stroke-width="1.5" fill="none" opacity="0.22" stroke-linecap="round"/>`;
  switch (h) {
    case 'dinh':
      return {
        back: '',
        front: `<path d="M26 38 C25 22, 37 18.5, 50 19 C63 18.5, 75 22, 74 38 C68 30, 32 30, 26 38 Z" fill="${f}" stroke="${ink}" stroke-width="1.8" opacity="0.88"/>
          <path d="M34 24 L34 27 M42 22 L42 25 M50 21.5 L50 24.5 M58 22 L58 25 M66 24 L66 27" stroke="${ink}" stroke-width="1.3" stroke-linecap="round"/>`,
      };
    case 'mohican':
      return {
        back: `<path d="M23 56 L20 67 L26 65 Z M77 56 L80 67 L74 65 Z" fill="${f}" stroke="${ink}" stroke-width="1.8"/>`,
        front: `<path d="M26 38 C27 27, 38 25, 50 26 C62 25, 73 27, 74 38 C66 32, 34 32, 26 38 Z" fill="${f}" opacity="0.32"/>
          <path d="M38 31 L36 14 L43 19 L46 6 L50 15 L54 4 L58 18 L64 12 L62 31 Q50 27 38 31 Z" ${st} stroke-linejoin="round"/>
          <path d="M45 14 L48 26 M55 12 L52 26" stroke="#FFFFFF" stroke-width="1.2" opacity="0.25" stroke-linecap="round"/>`,
      };
    case 'buicu':
      return {
        back: `<circle cx="50" cy="10" r="9.5" ${st}/><path d="M45 8 Q50 4 55 8" stroke="#FFFFFF" stroke-width="1.4" fill="none" opacity="0.28"/><path d="M42 17 Q50 20.5 58 17" stroke="${accent}" stroke-width="3.6" fill="none" stroke-linecap="round"/>`,
        front: `<path d="M24.5 40 C23.5 22, 36 17.5, 50 17.5 C64 17.5, 76.5 22, 75.5 40 C68 29.5, 58 26.5, 50 28 C42 26.5, 32 29.5, 24.5 40 Z" ${st}/>${shine}`,
      };
    case 'afro':
      return {
        back: `<path d="M18 42 C12 28, 20 12, 35 9 C44 4, 56 4, 65 9 C80 12, 88 28, 82 42 C86 52, 80 62, 73 63 L27 63 C20 62, 14 52, 18 42 Z" ${st}/>`,
        front: `<path d="M24 40 C23 24, 36 20, 50 20 C64 20, 77 24, 76 40 C67 32, 33 32, 24 40 Z" fill="${f}"/>
          <circle cx="34" cy="18" r="4" fill="none" stroke="#FFFFFF" stroke-width="1.1" opacity="0.2"/><circle cx="64" cy="19" r="4" fill="none" stroke="#FFFFFF" stroke-width="1.1" opacity="0.2"/>`,
      };
    case 'maibang':
      return {
        back: `<path d="M21 43 C17 62, 21 75, 29 78 L71 78 C79 75, 83 62, 79 43 Z" ${st}/>`,
        front: `<path d="M22.5 45 C20.5 21, 36 14.5, 50 14.5 C64 14.5, 79.5 21, 77.5 45 L72.5 45 L72 33.5 Q50 37.5 28 33.5 L27.5 45 Z" ${st}/>
          <path d="M36 24 L35 34 M45 23 L45 35 M55 23 L55 35 M64 24 L65 34" stroke="${ink}" stroke-width="1.1" opacity="0.45" stroke-linecap="round"/>${shine}`,
      };
    case 'highlight':
      return {
        back: '',
        front: `<path d="M23.5 42 C21.5 21, 37.5 15, 50 17.5 C62.5 15, 78.5 21, 76.5 42 C70 29.5, 58 25.5, 50 34.5 C42 25.5, 30 29.5, 23.5 42 Z" ${st}/>
          <path d="M32 21 Q36 28 38 35 M40 19 Q43 26 44 32 M62 19 Q66 26 67 34 M68 22 Q71 29 72 36" stroke="${accent}" stroke-width="3.2" fill="none" stroke-linecap="round"/>`,
      };
    case 'nam':
      return {
        back: '',
        front: `<path d="M20.5 46 C18.5 20, 35.5 12.5, 50 12.5 C64.5 12.5, 81.5 20, 79.5 46 C75 40, 73 34.5, 69.5 34.5 C58 37.5, 42 37.5, 30.5 34.5 C27 34.5, 25 40, 20.5 46 Z" ${st}/>${shine}`,
      };
    case 'dailung':
      return {
        back: `<path d="M18 43 C9 66, 11 90, 20 99 L80 99 C89 90, 91 66, 82 43 Z" ${st}/>
          <path d="M22 58 Q18 76 24 94 M78 58 Q82 76 76 94" stroke="#FFFFFF" stroke-width="1.3" fill="none" opacity="0.2"/>`,
        front: `<path d="M22.5 44 C21.5 20.5, 35.5 15.5, 50 15.5 C64.5 15.5, 78.5 20.5, 77.5 44 C71 30.5, 61 27.5, 50 29.5 C39 27.5, 29 30.5, 22.5 44 Z" ${st}/>${shine}`,
      };
    case 'buocthap':
      return {
        back: `<ellipse cx="50" cy="64" rx="15" ry="9" ${st}/>
          <path d="M38 60 Q50 65 62 60" stroke="url(#goldG)" stroke-width="2.6" fill="none" stroke-linecap="round"/>`,
        front: `<path d="M23.5 43 C21.5 20, 35 13.5, 50 14.5 C65 13.5, 78.5 20, 76.5 43 C70.5 29.5, 60.5 25, 50 26.8 C39.5 25, 29.5 29.5, 23.5 43 Z" ${st}/>
          <path d="M32 21 Q42 16 50 18 Q58 16 68 21" stroke="#FFFFFF" stroke-width="1.6" fill="none" opacity="0.28" stroke-linecap="round"/>
          <path d="M26 37 C22 43, 23 50, 26.5 54 M74 37 C78 43, 77 50, 73.5 54 M35 28 q-2.5 4.5 0.8 7.5 M65 28 q2.5 4.5 -0.8 7.5" stroke="${f}" stroke-width="1.9" fill="none" stroke-linecap="round"/>`,
      };
    case 'chaingoc':
      return {
        back: `<path d="M24 50 C17 55, 18 63, 23 67 C18 71, 20 77, 26 78 M76 50 C83 55, 82 63, 77 67 C82 71, 80 77, 74 78" stroke="${ink}" stroke-width="6.5" fill="none" stroke-linecap="round"/>
          <path d="M24 50 C17 55, 18 63, 23 67 C18 71, 20 77, 26 78 M76 50 C83 55, 82 63, 77 67 C82 71, 80 77, 74 78" stroke="${f}" stroke-width="4.2" fill="none" stroke-linecap="round"/>`,
        front: `<path d="M23.5 41 C19 17, 34 7, 51.5 8 C68.5 9, 80.5 19, 76.5 41 C70 26.5, 58 23, 48.5 24.2 C37.5 24.2, 29 29.5, 23.5 41 Z" ${st}/>
          <path d="M33 17 Q50 10 66 17 M38 22 Q51 16 63 21" stroke="#FFFFFF" stroke-width="1.5" fill="none" opacity="0.28" stroke-linecap="round"/>`,
      };
    case 'vuotlech':
      return {
        back: '',
        front: `<path d="M24.5 39 L24.5 30 Q26.5 23 32 23 M75.5 39 L75.5 30 Q73.5 23 68 23" stroke="${f}" stroke-width="3.8" fill="none" opacity="0.42"/>
          <path d="M26.5 35.5 C26.5 16.5, 41.5 9.5, 65.5 13.5 C75.5 15.5, 77.5 25.5, 73.5 35.5 C63.5 25.5, 48 24.5, 36.5 30.5 L34.2 22.5 L32 32.5 Z" ${st} stroke-linejoin="round"/>
          <path d="M34 22.5 L41 16" stroke="#FFFFFF" stroke-width="1.4" opacity="0.3" stroke-linecap="round"/>`,
      };
    case 'dungchom':
      return {
        back: '',
        front: `<path d="M25.5 38 C25.5 23.5, 35 19.5, 43 19.5 L45.5 11 L49.5 16.5 L53 9.5 L56.5 17.5 L60.5 12 L59.5 19.5 C67.5 20.5, 74.5 24.5, 74.5 38 C66.5 29.5, 33.5 29.5, 25.5 38 Z" ${st} stroke-linejoin="round"/>`,
      };
    default:
      return null;
  }
}

/** Phụ kiện trang sức (bông tai kim cương/hoa vàng, nhẫn hoa kim cương, đồng hồ sang trọng, găng tay nilon mukbang) & tư thế tay trong khung tròn */
function jewelryAndPoseSvg(look: CharacterLook | undefined, earL: number, earR: number, skin: string, ink: string): string {
  if (!look) return '';
  const skinShadow = darken(skin, 0.16);
  let out = '';
  if (look.earring === 'da') {
    for (const [idx, x] of [earL - 1.2, earR + 1.2].entries()) {
      const dir = idx === 0 ? -1 : 1;
      out += `<g>
        <circle cx="${x}" cy="53.2" r="2.8" fill="#FFFFFF" stroke="${ink}" stroke-width="1.2"/>
        <polygon points="${x},51.2 ${x + 2 * dir},53.2 ${x},55.2 ${x - 2 * dir},53.2" fill="#A5D8FF"/>
        <path d="M${x} 56 L${x - 2.3} 60.2 L${x} 62.6 L${x + 2.3} 60.2 Z" fill="#E7F5FF" stroke="${ink}" stroke-width="1.15" stroke-linejoin="round"/>
        <polygon points="${x},57 ${x + 1.4},60 ${x},61.6 ${x - 1.4},60" fill="#74C0FC"/>
        ${sparkle(x + 2.6 * dir, 52.5, 2.5)}${sparkle(x + 2.2 * dir, 60.8, 2.1, '#E7F5FF')}
      </g>`;
    }
  } else if (look.earring === 'hoa') {
    for (const x of [earL - 1, earR + 1]) {
      out += `<g>
        <circle cx="${x - 1.7}" cy="53.6" r="1.8" fill="#FF6B8A" stroke="${ink}" stroke-width="0.9"/>
        <circle cx="${x + 1.7}" cy="53.6" r="1.8" fill="#FF6B8A" stroke="${ink}" stroke-width="0.9"/>
        <circle cx="${x}" cy="51.9" r="1.8" fill="#FF6B8A" stroke="${ink}" stroke-width="0.9"/>
        <circle cx="${x}" cy="55.3" r="1.8" fill="#FF6B8A" stroke="${ink}" stroke-width="0.9"/>
        <circle cx="${x}" cy="53.6" r="1.45" fill="url(#goldG)" stroke="${ink}" stroke-width="0.9"/>
      </g>`;
    }
  }

  const hasHand =
    look.pose === 'chongcam' ||
    look.pose === 'chumnguc' ||
    look.pose === 'baochan' ||
    (look.ring && look.ring !== 'khong') ||
    (look.watch && look.watch !== 'khong') ||
    look.glove === 'co';
  if (!hasHand) return out;

  const isGlove = look.glove === 'co';
  const handFill = isGlove ? '#E3F6FF' : skin;
  const handStroke = isGlove ? '#228BE6' : ink;
  const handOp = isGlove ? '0.88' : '1';

  // Tất cả tư thế tay được đặt ở y = 66..85 để luôn hiển thị trọn vẹn và nổi bật bên trong khung tròn avatar
  if (look.pose === 'chongcam' || isGlove) {
    const hx = 61;
    const hy = 69;
    out += `<g opacity="${handOp}">
      ${isGlove ? `<path d="M55 79 L52 87 L72 87 L69 78 Z" fill="#D0EBFF" stroke="${handStroke}" stroke-width="1.6" stroke-linejoin="round"/>` : `<path d="M57 78 L55 88 L68 88 L67 78 Z" fill="${skinShadow}" stroke="${ink}" stroke-width="1.8"/>`}
      <path d="M53 ${hy + 3} C51 ${hy - 2}, 55 ${hy - 5}, 58 ${hy - 1} L58 ${hy - 5.5} C58 ${hy - 8}, 61.5 ${hy - 8}, 61.5 ${hy - 5.5} L61.5 ${hy - 2} C63.5 ${hy - 6}, 67 ${hy - 5.5}, 66.5 ${hy - 1} C69 ${hy - 4}, 71.5 ${hy - 2.5}, 70 ${hy + 2} C69.5 ${hy + 7}, 65 ${hy + 9.5}, 59 ${hy + 9.5} C54.5 ${hy + 9.5}, 53 ${hy + 6.5}, 53 ${hy + 3} Z" fill="${handFill}" stroke="${handStroke}" stroke-width="1.8" stroke-linejoin="round"/>
      ${isGlove ? `<path d="M56 ${hy + 1} L65 ${hy + 1} M57 ${hy + 4.5} L66 ${hy + 3.5} M54 83 L68 82" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M49 62 C45 59, 45 54, 49 52 C53 50, 57 53, 56 58 L59 62 L56 64 L53 60 Z" fill="#F59F00" stroke="${ink}" stroke-width="1.5" stroke-linejoin="round"/>
        <circle cx="58.5" cy="63.5" r="1.8" fill="#FFF9DB" stroke="${ink}" stroke-width="1.1"/>` : ''}
    </g>`;
    if (look.ring === 'hoa') {
      out += `<g>
        <circle cx="${hx}" cy="${hy + 1.5}" r="3.1" fill="url(#goldG)" stroke="${ink}" stroke-width="1.1"/>
        <circle cx="${hx}" cy="${hy + 1.5}" r="1.8" fill="#E7F5FF" stroke="#1C7ED6" stroke-width="0.7"/>
        ${sparkle(hx + 2.5, hy - 1, 2.6)}
      </g>`;
    }
    if (look.watch && look.watch !== 'khong') {
      const wBand = look.watch === 'bac' ? '#DEE2E6' : '#212529';
      const wFace = look.watch === 'bac' ? '#FFFFFF' : '#343A40';
      out += `<g>
        <rect x="55.5" y="${hy + 9}" width="13" height="5.2" rx="1.8" fill="${wBand}" stroke="${ink}" stroke-width="1.3"/>
        <circle cx="62" cy="${hy + 11.6}" r="3.8" fill="${wFace}" stroke="url(#goldG)" stroke-width="1.4"/>
        <path d="M62 ${hy + 9.6} L62 ${hy + 11.6} L63.6 ${hy + 11.6}" stroke="${look.watch === 'bac' ? ink : '#FFD43B'}" stroke-width="1" stroke-linecap="round"/>
      </g>`;
    }
  } else if (look.pose === 'baochan') {
    out += `<g>
      <path d="M26 83 Q50 75 74 83 L72 91 Q50 84 28 91 Z" fill="${skin}" stroke="${ink}" stroke-width="2" stroke-linejoin="round"/>
      <path d="M30 80 Q50 86 70 80" stroke="${skinShadow}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    </g>`;
    if (look.watch && look.watch !== 'khong') {
      const wBand = look.watch === 'bac' ? '#DEE2E6' : '#212529';
      out += `<g><rect x="61" y="78" width="5.5" height="9.5" rx="1.5" fill="${wBand}" stroke="${ink}" stroke-width="1.3"/>
        <circle cx="63.8" cy="82.8" r="3.5" fill="#FFD43B" stroke="${ink}" stroke-width="1.2"/></g>`;
    }
  } else {
    // 'chumnguc' hoặc mặc định có nhẫn / đồng hồ (Cô Phương Hằng đan hai tay trước ngực khoe nhẫn kim cương & đồng hồ bạc)
    const hy = 77;
    out += `<g opacity="${handOp}">
      <path d="M31 ${hy + 4} C31 ${hy - 1}, 36 ${hy - 2.5}, 48 ${hy - 1.5} C51 ${hy - 1}, 51 ${hy + 6.5}, 47 ${hy + 7.5} L34 ${hy + 7.5} Z" fill="${handFill}" stroke="${handStroke}" stroke-width="1.8" stroke-linejoin="round"/>
      <path d="M69 ${hy + 4} C69 ${hy - 1}, 64 ${hy - 2.5}, 51 ${hy - 1.5} C48 ${hy - 1}, 48 ${hy + 6.5}, 53 ${hy + 7.5} L66 ${hy + 7.5} Z" fill="${handFill}" stroke="${handStroke}" stroke-width="1.8" stroke-linejoin="round"/>
      <path d="M44 ${hy + 1} L54 ${hy + 1} M45 ${hy + 3.5} L55 ${hy + 3.5} M46 ${hy + 6} L54 ${hy + 6}" stroke="${skinShadow}" stroke-width="1.3" stroke-linecap="round"/>
    </g>`;
    if (look.ring === 'hoa') {
      out += `<g>
        <circle cx="55.5" cy="${hy + 2.2}" r="3.4" fill="url(#goldG)" stroke="${ink}" stroke-width="1.15"/>
        <circle cx="55.5" cy="${hy + 2.2}" r="2" fill="#E7F5FF" stroke="#1C7ED6" stroke-width="0.8"/>
        ${sparkle(58.5, hy - 0.8, 3)}${sparkle(52.5, hy + 4.2, 2.2, '#E7F5FF')}
      </g>`;
    }
    if (look.watch && look.watch !== 'khong') {
      const wBand = look.watch === 'bac' ? '#E9ECEF' : '#212529';
      const wFace = look.watch === 'bac' ? '#FFFFFF' : '#343A40';
      out += `<g>
        <rect x="63.5" y="${hy - 1.8}" width="5.6" height="10.5" rx="1.6" fill="${wBand}" stroke="${ink}" stroke-width="1.3"/>
        <circle cx="66.3" cy="${hy + 3.4}" r="3.8" fill="${wFace}" stroke="${ink}" stroke-width="1.3"/>
        <circle cx="66.3" cy="${hy + 3.4}" r="2.5" fill="none" stroke="#74C0FC" stroke-width="0.7"/>
        ${sparkle(69.5, hy + 0.5, 2.3)}
      </g>`;
    }
  }
  return out;
}

/** Phụ kiện "lầy": đội trên đầu (vẽ sau tóc) và đeo trên mặt (vẽ sau cùng, rõ nét và không che khuất biểu cảm) */
function accessoryParts(acc: CharacterAccessory | undefined, hairFill: string, ink: string, skin: string) {
  const parts = { behind: '', hat: '', face: '' };
  switch (acc) {
    case 'kinhden':
      parts.face = `<path d="M23.5 45.5 L29.5 44.5 M70.5 44.5 L76.5 45.5" stroke="${ink}" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M29 41.5 L47.5 41.5 L46.5 52.5 Q38 54.5 30 51.5 Z" fill="#14110F" stroke="url(#goldG)" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M52.5 41.5 L71 41.5 L70 51.5 Q62 54.5 53.5 52.5 Z" fill="#14110F" stroke="url(#goldG)" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M47 43.5 Q50 41.5 53 43.5" stroke="url(#goldG)" stroke-width="2.2" fill="none"/>
        <path d="M32 43.8 L37 50.5 M35.5 43.8 L39 48.5 M55.5 43.8 L60.5 50.5 M59 43.8 L62.5 48.5" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round" opacity="0.78"/>`;
      break;
    case 'raukem':
      parts.face = `<path d="M42.5 63.5 Q50 67.5 57.5 63.5 Q58 78.5 50 80 Q42 78.5 42.5 63.5 Z" fill="${hairFill}" stroke="${ink}" stroke-width="1.9" stroke-linejoin="round"/>
        <path d="M46 66 L46 77 M50 66.5 L50 78.5 M54 66 L54 77" stroke="#FFFFFF" stroke-width="1.1" opacity="0.35" stroke-linecap="round"/>`;
      break;
    case 'ria':
      parts.face = `<path d="M50 55 Q43.5 50.5 35 54.8 Q29.5 57.8 32 62.2 Q37.5 58 46 58.8 Q49 58.8 50 57.5 Q51 58.8 54 58.8 Q62.5 58 68 62.2 Q70.5 57.8 65 54.8 Q56.5 50.5 50 55 Z" fill="${hairFill}" stroke="${ink}" stroke-width="1.7" stroke-linejoin="round"/>`;
      break;
    case 'nonla':
      parts.hat = `<path d="M50 0 L94 36 Q50 45 6 36 Z" fill="#EBCB8B" stroke="${ink}" stroke-width="2.4" stroke-linejoin="round"/>
        <path d="M50 0 L28 39 M50 0 L72 39 M50 0 L50 40.5 M50 0 L14 37 M50 0 L86 37" stroke="#C0964B" stroke-width="1.35"/>
        <path d="M22 24 Q50 31 78 24 M13 31 Q50 39 87 31" stroke="#C0964B" stroke-width="1.3" fill="none"/>
        <path d="M26 39 Q29 63 40 70 M74 39 Q71 63 60 70" stroke="#F06595" stroke-width="2.4" fill="none" stroke-linecap="round"/>
        <path d="M46 70 Q50 73 54 70" stroke="#F06595" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
      break;
    case 'nonbh':
      parts.hat = `<path d="M20 39 C16 6, 84 6, 80 39 Z" fill="#FFD43B" stroke="${ink}" stroke-width="2.4" stroke-linejoin="round"/>
        <path d="M46 9 L54 9 L54 37 L46 37 Z" fill="#FFFFFF" stroke="${ink}" stroke-width="1.2"/>
        <path d="M17 40 Q50 33 83 40 L83 35 Q50 28 17 35 Z" fill="#F59F00" stroke="${ink}" stroke-width="2"/>
        <path d="M24 40 Q24 61 34 68 M76 40 Q76 61 66 68" stroke="${ink}" stroke-width="2" fill="none"/>`;
      break;
    case 'bangdo':
      parts.hat = `<path d="M24.5 30 Q50 20.5 75.5 30 L76 37 Q50 27.5 24 37 Z" fill="#E03131" stroke="${ink}" stroke-width="2" stroke-linejoin="round"/>
        <path d="M74 30.5 L90 23.5 L86 32.5 L92 40.5 L75 35.5 Z" fill="#E03131" stroke="${ink}" stroke-width="2" stroke-linejoin="round"/>
        <circle cx="38" cy="29" r="2" fill="#FFF"/><circle cx="50" cy="27" r="2.8" fill="#FFF"/><circle cx="62" cy="29" r="2" fill="#FFF"/>`;
      break;
    case 'khautrang':
      parts.face = `<path d="M30 52 L24 49 M70 52 L76 49" stroke="#74C0FC" stroke-width="2" stroke-linecap="round"/>
        <path d="M29 53 Q50 50 71 53 L68 67 Q50 79 32 67 Z" fill="#E7F5FF" stroke="${ink}" stroke-width="2.2" stroke-linejoin="round"/>
        <path d="M33 59 Q50 63 67 59 M34 65 Q50 70 66 65" stroke="#74C0FC" stroke-width="1.5" fill="none"/>`;
      break;
    case 'muihe':
      parts.face = `<circle cx="50" cy="53" r="7.2" fill="#F03E3E" stroke="${ink}" stroke-width="2"/><circle cx="47.5" cy="50.5" r="2.3" fill="#FFF" opacity="0.88"/>`;
      break;
    case 'taitho':
      parts.behind = `<g transform="rotate(-14 36 14)"><ellipse cx="36" cy="12" rx="7.5" ry="17" fill="#FFF" stroke="${ink}" stroke-width="2.3"/><ellipse cx="36" cy="14" rx="3.8" ry="11.5" fill="#FFA8C5"/></g>
        <g transform="rotate(14 64 14)"><ellipse cx="64" cy="12" rx="7.5" ry="17" fill="#FFF" stroke="${ink}" stroke-width="2.3"/><ellipse cx="64" cy="14" rx="3.8" ry="11.5" fill="#FFA8C5"/></g>`;
      break;
    case 'bangcanhan':
      parts.face = `<g transform="rotate(-24 66 56)"><rect x="56" y="51.5" width="19" height="8.5" rx="3.8" fill="#F4C79A" stroke="${ink}" stroke-width="1.6"/>
        <rect x="62" y="51.5" width="7" height="8.5" fill="#E3A56F"/><circle cx="59.5" cy="55.8" r="0.9" fill="#B87942"/><circle cx="72" cy="55.8" r="0.9" fill="#B87942"/></g>
        <path d="M32 34 L38 40 M36 33 L33 40" stroke="#C92A2A" stroke-width="1.8" stroke-linecap="round"/>`;
      break;
    case 'troc':
      parts.face = `<path d="M33 30.5 Q38 22 50 21" stroke="#FFF" stroke-width="3.6" fill="none" stroke-linecap="round" opacity="0.95"/>
        ${sparkle(63, 24, 4.5)}
        <path d="M50 20.5 q-1 -6 -5 -7 M50 20.5 q2 -6 6 -6" stroke="${ink}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
      break;
    case 'mahong':
      parts.face = `<circle cx="30.5" cy="55" r="6.5" fill="#FF6B8A" opacity="0.78"/><circle cx="69.5" cy="55" r="6.5" fill="#FF6B8A" opacity="0.78"/>
        <path d="M27.5 53 l2 4 M31.5 52 l2 4 M66.5 52 l2 4 M70.5 53 l2 4" stroke="#FFF" stroke-width="1.3" stroke-linecap="round" opacity="0.88"/>`;
      break;
    case 'prideghim':
      parts.face = `<g><rect x="58" y="75" width="16" height="10.5" rx="1.8" fill="#FFF" stroke="${ink}" stroke-width="1.6"/>
        ${PRIDE.map((c, i) => `<rect x="59" y="${76 + i * 1.5}" width="14" height="1.5" fill="${c}"/>`).join('')}
        <circle cx="58" cy="75" r="1.7" fill="url(#goldG)" stroke="${ink}" stroke-width="0.9"/></g>`;
      break;
    case 'prideco':
      parts.face = `<g transform="rotate(8 75 74)"><line x1="71" y1="64" x2="71" y2="90" stroke="${ink}" stroke-width="2.2" stroke-linecap="round"/>
        <rect x="71" y="64" width="17" height="11.5" rx="1.5" fill="#FFF" stroke="${ink}" stroke-width="1.5"/>
        ${PRIDE.map((c, i) => `<rect x="71.8" y="${64.8 + i * 1.7}" width="15.4" height="1.7" fill="${c}"/>`).join('')}</g>`;
      break;
    case 'pridetoc':
      parts.hat = `<g stroke-linecap="round" fill="none" stroke-width="2.3">${PRIDE.map((c, i) => `<path d="M${26 + i * 2.3} ${22 - i * 0.6} Q${24 + i * 2.3} 33 ${28 + i * 2.3} ${45 + i}" stroke="${c}"/>`).join('')}</g>`;
      break;
    case 'pridebang':
      parts.hat = `<defs><linearGradient id="pr" gradientUnits="userSpaceOnUse" x1="0" y1="22" x2="0" y2="38">${PRIDE.map((c, i) => `<stop offset="${(i / 6).toFixed(3)}" stop-color="${c}"/><stop offset="${((i + 1) / 6).toFixed(3)}" stop-color="${c}"/>`).join('')}</linearGradient></defs>
        <path d="M25 30 Q50 21 75 30 L75.5 37 Q50 28 24.5 37 Z" fill="url(#pr)" stroke="${ink}" stroke-width="2" stroke-linejoin="round"/>
        <path d="M74 31 L90 24 L86 33 L92 41 L75 36 Z" fill="#7048E8" stroke="${ink}" stroke-width="2" stroke-linejoin="round"/>`;
      break;
    default:
  }
  void skin;
  return parts;
}

/** Vẽ chân dung SVG sắc nét theo cấu hình nhân vật (đầy đủ nét mặt, da, mắt, mày, mũi, môi, tóc, râu, trang phục, phụ kiện, hình xăm) và tâm trạng. */
export function characterSvgUri(cfg?: CharacterConfig, mood: Mood = 'normal'): string {
  const c: CharacterConfig = cfg ?? { gender: 'nam', age: 'tre', hair: 'han', color: 0 };
  const look = c.look;
  const col = playerColorOf(c.color);
  const hairFill =
    c.age === 'lao'
      ? '#CED4DA'
      : look?.haircolor === 'nau'
        ? '#5E3A22'
        : look?.haircolor === 'nauden'
          ? '#2F1F18'
          : look?.haircolor === 'den'
            ? '#181412'
            : c.gender === 'nu'
              ? '#3B231A'
              : '#241814';
  const hairStroke = '#15110F';
  const skin = c.skin !== undefined && SKIN_PALETTE[c.skin] ? SKIN_PALETTE[c.skin] : c.gender === 'nu' ? '#FFE4C9' : '#FAD6B3';
  const skinShadow = c.skin !== undefined && SKIN_PALETTE[c.skin] ? darken(skin, 0.14) : '#EAC098';
  const xh = extraHair(c.hair, hairFill, hairStroke, col.hex);
  const fshape = faceShape(c.face, c.age === 'nhi', skin, skinShadow, hairStroke, look);
  const sx = c.build === 'gay' ? 0.84 : c.build === 'mum' ? 1.15 : c.build === 'khoe' ? 1.24 : 1;
  const neckW = look?.neck === 'thon' ? 11 : look?.neck === 'day' || c.build === 'khoe' ? 18 : 14;
  const acc = accessoryParts(c.accessory, hairFill, hairStroke, skin);
  const bald = c.accessory === 'troc';
  const mf = moodFace(mood, hairStroke, skin, c.gender === 'nu');

  // Tóc sau lưng
  const backHair = bald ? '' : xh ? xh.back :
    c.hair === 'dai'
      ? `<path d="M22 44 C16 62, 18 85, 25 94 L75 94 C82 85, 84 62, 78 44 Z" fill="${hairFill}" stroke="${hairStroke}" stroke-width="2.5"/>`
      : c.hair === 'bui'
        ? `<circle cx="50" cy="14" r="13" fill="${hairFill}" stroke="${hairStroke}" stroke-width="2.5"/>
           <path d="M38 19 Q50 14 62 19" stroke="${col.hex}" stroke-width="4" fill="none" stroke-linecap="round"/>`
        : c.hair === 'xoan'
          ? `<circle cx="26" cy="40" r="10" fill="${hairFill}"/><circle cx="74" cy="40" r="10" fill="${hairFill}"/>`
          : '';

  // Trang phục theo độ tuổi & màu sắc
  const ageOutfit =
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

  const outfit = c.outfit && c.outfit !== 'none' ? outfitSvg(c.outfit, col.hex, hairStroke, skin, look) : ageOutfit;
  const muscle = c.build === 'khoe' ? `<path d="M34 71 L42 66 M66 71 L58 66" stroke="${hairStroke}" stroke-width="2" stroke-linecap="round"/>` : '';

  // Phụ kiện độ tuổi
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

  // Tóc mái phía trước + chi tiết tóc (độ phồng, ngôi lệch, hai bên mai, tóc con, highlight)
  const hairSheen = lighten(hairFill, 0.24);
  const baseFrontHair = bald ? '' : xh ? xh.front :
    c.hair === 'han'
      ? `<path d="M24 42 C22 22, 38 16, 50 18 C62 16, 78 22, 76 42 C70 30, 58 26, 50 35 C42 26, 30 30, 24 42 Z" fill="${hairFill}" stroke="${hairStroke}" stroke-width="2.1"/>
         <path d="M31 24 Q41 20 48 28 M53 27 Q60 20 69 24" stroke="${hairSheen}" stroke-width="1.6" fill="none" stroke-linecap="round" opacity="0.45"/>`
      : c.hair === 'xoan'
        ? `<path d="M23 41 C20 23, 35 15, 50 16 C65 15, 80 23, 77 41 C72 35, 65 38, 60 32 C55 38, 45 38, 40 32 C35 38, 28 35, 23 41 Z" fill="${hairFill}" stroke="${hairStroke}" stroke-width="2.1"/>
           <circle cx="34" cy="24" r="7" fill="${hairFill}"/><circle cx="50" cy="21" r="8" fill="${hairFill}"/><circle cx="66" cy="24" r="7" fill="${hairFill}"/>
           <path d="M31 23 Q35 19 39 23 M46 20 Q50 16 54 20 M61 23 Q65 19 69 23" stroke="${hairSheen}" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.45"/>`
        : c.hair === 'dai'
          ? `<path d="M23 44 C22 21, 36 16, 50 16 C64 16, 78 21, 77 44 C71 31, 61 28, 50 30 C39 28, 29 31, 23 44 Z" fill="${hairFill}" stroke="${hairStroke}" stroke-width="2.1"/>
             <path d="M31 24 Q42 19 50 23 Q58 19 69 24" stroke="${hairSheen}" stroke-width="1.7" fill="none" stroke-linecap="round" opacity="0.45"/>`
          : c.hair === 'bui'
            ? `<path d="M24 42 C24 22, 36 18, 50 18 C64 18, 76 22, 76 42 C68 30, 58 27, 50 29 C42 27, 32 30, 24 42 Z" fill="${hairFill}" stroke="${hairStroke}" stroke-width="2.1"/>
               <path d="M33 24 Q50 19 67 24" stroke="${hairSheen}" stroke-width="1.6" fill="none" stroke-linecap="round" opacity="0.42"/>`
            : c.hair === 'undercut'
              ? `<path d="M28 36 C28 18, 45 12, 68 16 C75 18, 76 28, 72 34 C62 28, 42 28, 28 36 Z" fill="${hairFill}" stroke="${hairStroke}" stroke-width="2.1"/>
                 <path d="M35 23 Q50 16 66 20" stroke="${hairSheen}" stroke-width="1.8" fill="none" stroke-linecap="round" opacity="0.48"/>`
              : `<path d="M24 40 C24 21, 36 17, 50 17 C64 17, 76 21, 76 40 C66 31, 34 31, 24 40 Z" fill="${hairFill}" stroke="${hairStroke}" stroke-width="2.1"/>
                 <path d="M34 23 Q50 19 66 23" stroke="${hairSheen}" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.4"/>`;

  const hairVolY = look?.volume === 'cao' ? 1.1 : look?.volume === 'sat' ? 0.92 : 1;
  const foreheadShift = look?.forehead === 'rong' ? -2.2 : 0;
  const hairExtras = bald ? '' : [
    look?.part === 'lech' ? `<path d="M39 18 L41 28" stroke="${skin}" stroke-width="1.6" stroke-linecap="round" opacity="0.85"/>` : '',
    look?.sides === 'sat' ? `<path d="M24.5 36 L25.5 44 M75.5 36 L74.5 44" stroke="${hairStroke}" stroke-width="1.4" stroke-dasharray="1.5 2" opacity="0.55"/>` : '',
    look?.babyhair === 'co' ? `<path d="M28 34 q-2 4 1 6 M35 30 q-1 4 2 5 M65 30 q1 4 -2 5 M72 34 q2 4 -1 6" stroke="${hairFill}" stroke-width="1.5" fill="none" stroke-linecap="round"/>` : '',
    look?.haircolor === 'highlight' ? `<path d="M34 22 Q37 28 39 34 M62 21 Q65 27 66 33" stroke="${col.hex}" stroke-width="2.8" fill="none" stroke-linecap="round"/>` : '',
  ].join('');
  const frontHair = bald
    ? ''
    : `<g transform="translate(50 ${30 + foreheadShift}) scale(1 ${hairVolY}) translate(-50 -30)">${baseFrontHair}${hairExtras}</g>`;

  const eyes = mf ? mf.eyes : detailedEyesSvg(c, hairStroke, skin) + detailedBrowsSvg(c, hairStroke);
  const mouth = mf ? mf.mouth : mouthSvg(c, hairStroke);
  const tiltDeg = look?.tilt === 'trai' ? -5.5 : look?.tilt === 'phai' ? 5.5 : 0;
  const headTransform = tiltDeg !== 0 ? `transform="rotate(${tiltDeg} 50 52)"` : '';
  const skinHi = lighten(skin, 0.12);
  const earDeep = darken(skin, 0.24);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <defs>
      <radialGradient id="skinG" cx="46%" cy="38%" r="58%">
        <stop offset="0%" stop-color="${skinHi}"/>
        <stop offset="68%" stop-color="${skin}"/>
        <stop offset="100%" stop-color="${skinShadow}"/>
      </radialGradient>
      <linearGradient id="goldG" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#FFF3BF"/>
        <stop offset="50%" stop-color="#FCC419"/>
        <stop offset="100%" stop-color="#E67700"/>
      </linearGradient>
    </defs>
    <rect width="100" height="100" rx="50" fill="${col.light}"/>
    <circle cx="50" cy="50" r="46" fill="none" stroke="${col.hex}" stroke-width="4" opacity="0.35"/>
    <g ${headTransform}>
      ${backHair}
      ${acc.behind}
    </g>
    <g transform="translate(50 0) scale(${sx} 1) translate(-50 0)">
      ${muscle}
      <rect x="${50 - neckW / 2}" y="61" width="${neckW}" height="15" rx="5" fill="${skin}" stroke="${hairStroke}" stroke-width="1.9"/>
      <path d="M${50 - neckW / 2 + 0.5} 62 Q50 69 ${50 + neckW / 2 - 0.5} 62 L${50 + neckW / 2 - 0.5} 68 Q50 73 ${50 - neckW / 2 + 0.5} 68 Z" fill="${skinShadow}" opacity="0.72"/>
      <path d="M${50 - neckW / 2 + 2.5} 71 Q50 74 ${50 + neckW / 2 - 2.5} 71" stroke="${earDeep}" stroke-width="0.9" fill="none" opacity="0.45"/>
      ${outfit}
      ${tattooSvg(look)}
    </g>
    <g ${headTransform}>
      ${earsSvg(fshape.earL, fshape.earR, skin, skinShadow, earDeep, hairStroke)}
      ${fshape.head}
      ${fshape.extras}
      ${mf?.tint ?? ''}
      ${beardSvg(look, hairStroke)}
      ${eyes}
      ${noseSvg(look, skinShadow, hairStroke)}
      ${mouth}
      ${ageExtra}
      ${frontHair}
      ${detailSvg(c.detail, hairStroke, mood, look)}
      ${jewelryAndPoseSvg(look, fshape.earL, fshape.earR, skin, hairStroke)}
      ${acc.face}
      ${acc.hat}
      ${mf?.over ?? ''}
    </g>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const svgCache = new Map<string, string>();
/**
 * Chân dung theo nhân vật + tâm trạng (có nhớ lại). Dùng cho mọi nơi muốn đổi mặt theo sự kiện,
 * vd Tỷ phú: `portraitUri(p.character, 'smug')` khi giàu lên, `'cry'` khi sạt nghiệp.
 */
export function portraitUri(character?: CharacterConfig, mood: Mood = 'normal'): string {
  const lk = character?.look ? JSON.stringify(character.look) : '';
  const k = `${character ? `${character.gender}|${character.age}|${character.hair}|${character.color}|${character.accessory ?? ''}|${character.detail ?? ''}|${character.outfit ?? ''}|${character.skin ?? ''}|${character.face ?? ''}|${character.build ?? ''}|${character.eyes ?? ''}|${character.brows ?? ''}|${lk}` : '-'}|${mood}`;
  let u = svgCache.get(k);
  if (!u) {
    if (svgCache.size > 400) svgCache.clear();
    u = characterSvgUri(character, mood);
    svgCache.set(k, u);
  }
  return u;
}

/** Tạo một cấu hình nhân vật ngẫu nhiên đa dạng (giữ nguyên màu đại diện hiện tại của người chơi) */
export function randomCharacter(color: number, rng: () => number = Math.random): CharacterConfig {
  const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];
  const accs = CHARACTER_ACCESSORIES.filter((a) => !a.startsWith('pride') && a !== 'khautrang');
  const look: CharacterLook = {};
  const lookKeys: LookKey[] = [
    'jaw', 'chin', 'cheek', 'forehead', 'neck', 'nepcuoi', 'maphan', 'tilt',
    'eyeshape', 'lid', 'open', 'liner', 'eyecolor', 'gaze', 'asym',
    'browshape', 'browthick', 'nose', 'nosetip', 'nostril',
    'lipthick', 'lipcolor', 'mouth', 'haircolor', 'part', 'volume', 'sides', 'babyhair',
    'outfitcolor', 'earring',
  ];
  for (const k of lookKeys) {
    const opts = LOOK_OPTIONS[k] as readonly string[];
    (look as Record<string, string>)[k] = pick(opts);
  }
  if (rng() < 0.35) look.ria = pick(['manh', 'vua'] as const);
  if (rng() < 0.3) look.raucam = pick(['manh', 'vua'] as const);
  if (rng() < 0.25) look.rauham = pick(['manh', 'vua'] as const);
  if (rng() < 0.35) {
    look.tattoo = 'co';
    look.tattooside = pick(['trai', 'phai'] as const);
    look.tattoosize = pick(['vai', 'vaibap'] as const);
  }
  return {
    gender: pick(CHARACTER_GENDERS.slice(0, 3)),
    age: pick(CHARACTER_AGES),
    hair: pick(CHARACTER_HAIRS),
    color,
    skin: Math.floor(rng() * SKIN_TONES),
    face: pick(CHARACTER_FACES),
    build: pick(CHARACTER_BUILDS),
    eyes: pick(CHARACTER_EYES),
    brows: pick(CHARACTER_BROWS),
    accessory: rng() < 0.55 ? pick(accs) : 'none',
    detail: pick(CHARACTER_DETAILS),
    outfit: pick(CHARACTER_OUTFITS),
    look,
  };
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

export { AVATAR_PRESETS, AVATAR_PRESET_NAMES };

export function presetOf(i: number): CharacterConfig {
  return AVATAR_PRESETS[((i % AVATAR_PRESETS.length) + AVATAR_PRESETS.length) % AVATAR_PRESETS.length];
}

const presetCache = new Map<number, string>();
/** Chân dung SVG (data URI) của mẫu số i, có nhớ lại để khỏi vẽ lại. */
export function presetUri(i: number, mood: Mood = 'normal'): string {
  const k = ((i % AVATAR_PRESETS.length) + AVATAR_PRESETS.length) % AVATAR_PRESETS.length;
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
