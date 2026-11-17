import { createAvatar, type Style } from '@dicebear/core';
import { avataaars } from '@dicebear/collection';
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

type AvataaarsOpts = typeof avataaars extends Style<infer O> ? Partial<O> : never;
type TopKey = NonNullable<AvataaarsOpts['top']>[number];
type ClothingKey = NonNullable<AvataaarsOpts['clothing']>[number];
type GraphicKey = NonNullable<AvataaarsOpts['clothingGraphic']>[number];
type EyesKey = NonNullable<AvataaarsOpts['eyes']>[number];
type BrowsKey = NonNullable<AvataaarsOpts['eyebrows']>[number];
type MouthKey = NonNullable<AvataaarsOpts['mouth']>[number];
type AccKey = NonNullable<AvataaarsOpts['accessories']>[number];
type BeardKey = NonNullable<AvataaarsOpts['facialHair']>[number];

/** 16 biểu tượng dự phòng, mỗi người một màu nền. Server gán chỉ số không trùng trong phòng. */
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
  { id: 'twintails', label: 'Buộc hai chùm' },
  { id: 'wolfcut', label: 'Wolfcut cá tính' },
  { id: 'mullet', label: 'Mullet gáy dài' },
  { id: 'tetbim', label: 'Tết bím hai bên' },
  { id: 'pompadour', label: 'Pompadour cổ điển' },
  { id: 'tocvan', label: 'Tóc vấn hoàng gia' },
  { id: 'xoanxu', label: 'Xoăn xù retro' },
  { id: 'hime', label: 'Tóc Hime công chúa' },
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
  { id: 'vuongmien', label: 'Vương miện vàng', icon: '👑' },
  { id: 'kinhcyber', label: 'Kính Cyber', icon: '🕶️' },
  { id: 'taimeo', label: 'Tai mèo', icon: '🐱' },
  { id: 'sungquy', label: 'Sừng quỷ', icon: '😈' },
  { id: 'vongthienthan', label: 'Vòng thiên thần', icon: '😇' },
  { id: 'matnasoi', label: 'Mặt nạ sói', icon: '🐺' },
  { id: 'kinhdiepvien', label: 'Kính điệp viên', icon: '🕵️' },
  { id: 'hoacaitoc', label: 'Hoa cài tóc', icon: '🌸' },
  { id: 'tainghe', label: 'Tai nghe RGB', icon: '🎧' },
  { id: 'keomut', label: 'Kẹo mút', icon: '🍭' },
  { id: 'matnaho', label: 'Mặt nạ hổ', icon: '🐯' },
  { id: 'docnhan', label: 'Bịt mắt hải tặc', icon: '🏴‍☠️' },
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
  { id: 'hoangbao', label: 'Hoàng bào rồng', icon: '👑' },
  { id: 'aochoangsoi', label: 'Áo choàng sói', icon: '🐺' },
  { id: 'thamtu', label: 'Áo thám tử', icon: '🕵️' },
  { id: 'hoodiergb', label: 'Hoodie Gaming', icon: '🎮' },
  { id: 'kimono', label: 'Kimono anh đào', icon: '🌸' },
  { id: 'giapvang', label: 'Giáp chiến thần', icon: '🛡️' },
  { id: 'vesttrang', label: 'Vest trắng VIP', icon: '🤍' },
  { id: 'hiphop', label: 'Hip-hop dây xích', icon: '🎤' },
];

export const MOOD_EMOJI: Record<Mood, string> = { normal: '', smug: '😏', cry: '😭', angry: '😡', shock: '😱', dizzy: '😵‍💫' };

/** 11 tông da tự nhiên từ rất sáng tới nâu sẫm */
export const SKIN_PALETTE = [
  '#FCECE3',
  '#F8DEC8',
  '#F3CFB2',
  '#ECC09E',
  '#E3AF8E',
  '#D9A17C',
  '#C98E67',
  '#B67952',
  '#9E633E',
  '#7E4B2D',
  '#5B351F',
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

const stripHex = (hex: string) => hex.replace(/^#/, '').toLowerCase();

const HAIR_MAP: Record<CharacterHair, TopKey> = {
  ngan: 'shortFlat',
  han: 'theCaesarAndSidePart',
  xoan: 'shortCurly',
  dai: 'longButNotTooLong',
  bui: 'bun',
  undercut: 'shavedSides',
  dinh: 'theCaesar',
  mohican: 'shortWaved',
  buicu: 'bun',
  afro: 'fro',
  maibang: 'miaWallace',
  highlight: 'straightAndStrand',
  nam: 'shortRound',
  dailung: 'straight02',
  buocthap: 'straight01',
  chaingoc: 'dreads02',
  vuotlech: 'sides',
  dungchom: 'frizzle',
  twintails: 'curly',
  wolfcut: 'shaggy',
  mullet: 'shaggyMullet',
  tetbim: 'dreads',
  pompadour: 'bigHair',
  tocvan: 'frida',
  xoanxu: 'dreads01',
  hime: 'bob',
};

const OUTFIT_MAP: Record<CharacterOutfit, { clothing: ClothingKey; graphic?: GraphicKey; color?: string }> = {
  none: { clothing: 'collarAndSweater' },
  thun: { clothing: 'shirtCrewNeck', graphic: 'hola' },
  beo: { clothing: 'shirtScoopNeck', color: 'f8fafc' },
  somi: { clothing: 'shirtVNeck' },
  balden: { clothing: 'shirtScoopNeck', color: '1e293b' },
  aohoa: { clothing: 'graphicShirt', graphic: 'cumbia', color: '0ea5e9' },
  dobo: { clothing: 'overall', color: 'f472b6' },
  bala: { clothing: 'shirtVNeck', color: 'e2e8f0' },
  vestbong: { clothing: 'blazerAndShirt', color: '18181b' },
  aodai: { clothing: 'collarAndSweater', color: 'e11d48' },
  dongphuc: { clothing: 'blazerAndSweater', color: '1d4ed8' },
  aomua: { clothing: 'hoodie', color: 'eab308' },
  dayvang: { clothing: 'shirtCrewNeck', graphic: 'diamond', color: '111827' },
  hoangbao: { clothing: 'blazerAndSweater', color: 'd97706' },
  aochoangsoi: { clothing: 'hoodie', color: '334155' },
  thamtu: { clothing: 'blazerAndShirt', color: '78350f' },
  hoodiergb: { clothing: 'hoodie', color: '6d28d9' },
  kimono: { clothing: 'collarAndSweater', color: 'f43f5e' },
  giapvang: { clothing: 'overall', color: 'f59e0b' },
  vesttrang: { clothing: 'blazerAndShirt', color: 'f1f5f9' },
  hiphop: { clothing: 'hoodie', graphic: 'bear', color: '0f172a' },
};

const MOOD_FACE: Record<Mood, { eyes: EyesKey; eyebrows: BrowsKey; mouth: MouthKey } | undefined> = {
  normal: undefined,
  smug: { eyes: 'wink', eyebrows: 'raisedExcitedNatural', mouth: 'twinkle' },
  cry: { eyes: 'cry', eyebrows: 'sadConcernedNatural', mouth: 'sad' },
  angry: { eyes: 'squint', eyebrows: 'angryNatural', mouth: 'grimace' },
  shock: { eyes: 'surprised', eyebrows: 'raisedExcited', mouth: 'screamOpen' },
  dizzy: { eyes: 'xDizzy', eyebrows: 'upDownNatural', mouth: 'concerned' },
};

function customVectorOverlays(c: CharacterConfig, accentHex: string): string {
  const parts: string[] = [];
  // Vương miện / phụ kiện đầu & mặt phong cách vector studio (toạ độ 280x280)
  switch (c.accessory) {
    case 'vuongmien':
      parts.push(
        `<path d="M96 42 L106 16 L124 30 L140 12 L156 30 L174 16 L184 42 Z" fill="#FACC15" stroke="#92400E" stroke-width="4" stroke-linejoin="round"/>`,
        `<circle cx="140" cy="28" r="4.5" fill="#E11D48"/><circle cx="112" cy="32" r="3.5" fill="#0EA5E9"/><circle cx="168" cy="32" r="3.5" fill="#10B981"/>`,
      );
      break;
    case 'vongthienthan':
      parts.push(`<ellipse cx="140" cy="24" rx="46" ry="11" fill="none" stroke="#FDE047" stroke-width="6"/><ellipse cx="140" cy="24" rx="46" ry="11" fill="none" stroke="#FFFFFF" stroke-width="2" opacity="0.7"/>`);
      break;
    case 'sungquy':
      parts.push(
        `<path d="M96 62 C82 40, 82 22, 98 16 C96 34, 106 46, 114 54 Z" fill="#DC2626" stroke="#7F1D1D" stroke-width="3"/>`,
        `<path d="M184 62 C198 40, 198 22, 182 16 C184 34, 174 46, 166 54 Z" fill="#DC2626" stroke="#7F1D1D" stroke-width="3"/>`,
      );
      break;
    case 'taimeo':
      parts.push(
        `<path d="M90 68 L84 26 L116 48 Z" fill="#334155" stroke="#0F172A" stroke-width="3" stroke-linejoin="round"/><path d="M93 60 L90 36 L110 49 Z" fill="#FDA4AF"/>`,
        `<path d="M190 68 L196 26 L164 48 Z" fill="#334155" stroke="#0F172A" stroke-width="3" stroke-linejoin="round"/><path d="M187 60 L190 36 L170 49 Z" fill="#FDA4AF"/>`,
      );
      break;
    case 'taitho':
      parts.push(
        `<ellipse cx="110" cy="34" rx="12" ry="30" transform="rotate(-10 110 34)" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="3"/><ellipse cx="110" cy="36" rx="6" ry="20" transform="rotate(-10 110 36)" fill="#F9A8D4"/>`,
        `<ellipse cx="170" cy="34" rx="12" ry="30" transform="rotate(10 170 34)" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="3"/><ellipse cx="170" cy="36" rx="6" ry="20" transform="rotate(10 170 36)" fill="#F9A8D4"/>`,
      );
      break;
    case 'nonla':
      parts.push(
        `<path d="M46 72 L140 14 L234 72 Q140 84 46 72 Z" fill="#FDE68A" stroke="#92400E" stroke-width="3.5" stroke-linejoin="round"/>`,
        `<path d="M74 62 Q140 72 206 62" stroke="#D97706" stroke-width="2.5" fill="none"/>`,
      );
      break;
    case 'hoacaitoc':
      parts.push(
        `<g transform="translate(182 64)"><circle cx="0" cy="-9" r="7" fill="#FB7185"/><circle cx="9" cy="-2" r="7" fill="#FDA4AF"/><circle cx="5" cy="8" r="7" fill="#FB7185"/><circle cx="-6" cy="8" r="7" fill="#FDA4AF"/><circle cx="-9" cy="-2" r="7" fill="#FB7185"/><circle cx="0" cy="1" r="5" fill="#FACC15"/></g>`,
      );
      break;
    case 'tainghe':
      parts.push(
        `<path d="M76 118 C76 56, 204 56, 204 118" fill="none" stroke="#1E293B" stroke-width="9" stroke-linecap="round"/>`,
        `<rect x="64" y="96" width="18" height="44" rx="8" fill="#0F172A" stroke="#06B6D4" stroke-width="3"/>`,
        `<rect x="198" y="96" width="18" height="44" rx="8" fill="#0F172A" stroke="#EC4899" stroke-width="3"/>`,
      );
      break;
    case 'kinhcyber':
      parts.push(
        `<path d="M90 100 L190 100 L182 124 L148 124 L140 112 L132 124 L98 124 Z" fill="rgba(8,247,254,0.72)" stroke="#0F172A" stroke-width="3" stroke-linejoin="round"/>`,
        `<line x1="98" y1="106" x2="124" y2="106" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" opacity="0.85"/>`,
      );
      break;
    case 'khautrang':
      parts.push(
        `<path d="M102 140 Q140 132 178 140 L172 176 Q140 190 108 176 Z" fill="#E0F2FE" stroke="#0284C7" stroke-width="3" stroke-linejoin="round"/>`,
        `<line x1="102" y1="146" x2="86" y2="130" stroke="#7DD3FC" stroke-width="2.5"/><line x1="178" y1="146" x2="194" y2="130" stroke="#7DD3FC" stroke-width="2.5"/>`,
      );
      break;
    case 'muihe':
      parts.push(`<circle cx="140" cy="134" r="11" fill="#EF4444" stroke="#7F1D1D" stroke-width="2.5"/><circle cx="136" cy="130" r="3.5" fill="#FFFFFF" opacity="0.8"/>`);
      break;
    case 'mahong':
      parts.push(`<ellipse cx="104" cy="136" rx="11" ry="6" fill="#FB7185" opacity="0.55"/><ellipse cx="176" cy="136" rx="11" ry="6" fill="#FB7185" opacity="0.55"/>`);
      break;
    case 'bangcanhan':
      parts.push(`<rect x="150" y="128" width="26" height="10" rx="4" transform="rotate(-14 163 133)" fill="#FDE68A" stroke="#D97706" stroke-width="2"/>`);
      break;
    case 'matnasoi':
      parts.push(
        `<path d="M90 98 L108 82 L140 94 L172 82 L190 98 L178 124 L140 112 L102 124 Z" fill="#475569" stroke="#0F172A" stroke-width="3" opacity="0.92"/>`,
        `<circle cx="118" cy="108" r="5" fill="#38BDF8"/><circle cx="162" cy="108" r="5" fill="#38BDF8"/>`,
      );
      break;
    case 'matnaho':
      parts.push(
        `<path d="M92 98 L112 82 L140 94 L168 82 L188 98 L176 124 L140 112 L104 124 Z" fill="#F97316" stroke="#7C2D12" stroke-width="3" opacity="0.92"/>`,
        `<circle cx="118" cy="108" r="5" fill="#FEF08A"/><circle cx="162" cy="108" r="5" fill="#FEF08A"/>`,
      );
      break;
    case 'prideco':
    case 'prideghim':
    case 'pridebang':
      parts.push(
        `<rect x="186" y="198" width="32" height="20" rx="4" fill="#EF4444" stroke="#0F172A" stroke-width="2"/>`,
        `<rect x="188" y="202" width="28" height="4" fill="#FACC15"/><rect x="188" y="206" width="28" height="4" fill="#22C55E"/><rect x="188" y="210" width="28" height="6" fill="#3B82F6"/>`,
      );
      break;
    case 'keomut':
      parts.push(
        `<line x1="164" y1="158" x2="188" y2="196" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round"/>`,
        `<circle cx="192" cy="200" r="11" fill="#EC4899" stroke="#831843" stroke-width="2.5"/>`,
        `<path d="M187 195 Q192 205 197 195" stroke="#FFFFFF" stroke-width="2.2" fill="none"/>`,
      );
      break;
    default:
      break;
  }

  if (c.outfit === 'hoangbao') {
    parts.push(`<circle cx="140" cy="236" r="14" fill="#FACC15" stroke="#92400E" stroke-width="3"/>`);
  }
  if (c.detail === 'notruoi') {
    parts.push(`<circle cx="164" cy="142" r="3" fill="#27272A"/>`);
  } else if (c.detail === 'tannhang') {
    parts.push(
      `<circle cx="104" cy="136" r="2" fill="#B45309" opacity="0.65"/><circle cx="110" cy="140" r="2" fill="#B45309" opacity="0.65"/>`,
      `<circle cx="176" cy="136" r="2" fill="#B45309" opacity="0.65"/><circle cx="170" cy="140" r="2" fill="#B45309" opacity="0.65"/>`,
    );
  }
  if (c.age === 'nhi') {
    parts.push(`<ellipse cx="102" cy="136" rx="8" ry="4.5" fill="#FDA4AF" opacity="0.55"/><ellipse cx="178" cy="136" rx="8" ry="4.5" fill="#FDA4AF" opacity="0.55"/>`);
  }
  if (accentHex && c.accessory === 'pridetoc') {
    parts.push(`<rect x="112" y="48" width="56" height="8" rx="4" fill="#EC4899" opacity="0.85"/>`);
  }
  return parts.join('');
}

const MAX_SVG_CACHE = 600;
const svgCache = new Map<string, string>();

function configCacheKey(c: CharacterConfig, mood: Mood): string {
  const lk = c.look ? Object.entries(c.look).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join(';') : '';
  return `db|${c.gender}|${c.age}|${c.hair}|${c.color}|${c.skin ?? 1}|${c.face ?? ''}|${c.build ?? ''}|${c.eyes ?? ''}|${c.brows ?? ''}|${c.accessory ?? ''}|${c.detail ?? ''}|${c.outfit ?? ''}|${lk}|${mood}`;
}

/**
 * Render chân dung vector chuyên nghiệp bằng `@dicebear/core` + `@dicebear/collection` (`avataaars`)
 * kết hợp lớp phụ kiện tiếng Việt & biểu cảm `Mood` sống động.
 */
export function characterSvgUri(cfg?: CharacterConfig, mood: Mood = 'normal'): string {
  const c: CharacterConfig = cfg ?? { gender: 'nam', age: 'tre', hair: 'han', color: 0 };
  const key = configCacheKey(c, mood);
  const hit = svgCache.get(key);
  if (hit) {
    svgCache.delete(key);
    svgCache.set(key, hit);
    return hit;
  }

  const col = playerColorOf(c.color);
  const look = c.look;
  const skinHex = stripHex(SKIN_PALETTE[c.skin ?? (c.gender === 'nu' ? 1 : 2)] ?? SKIN_PALETTE[2]);

  const hairColorHex =
    c.age === 'lao'
      ? 'd6d3d1'
      : look?.haircolor === 'nau'
        ? '724133'
        : look?.haircolor === 'nauden'
          ? '4a312c'
          : look?.haircolor === 'den'
            ? '2c1b18'
            : look?.haircolor === 'highlight'
              ? stripHex(col.hex)
              : c.gender === 'nu'
                ? '4a312c'
                : '2c1b18';

  const bald = c.accessory === 'troc';
  const topChoice: TopKey =
    c.accessory === 'nonbh' ? 'winterHat03' : HAIR_MAP[c.hair] ?? 'shortFlat';

  const outfitSpec = OUTFIT_MAP[c.outfit ?? 'none'];
  const ageClothing: ClothingKey =
    c.age === 'trung' ? 'blazerAndShirt' : c.age === 'lao' ? 'blazerAndSweater' : c.age === 'nhi' ? 'overall' : 'hoodie';
  const clothing = c.outfit && c.outfit !== 'none' ? outfitSpec.clothing : ageClothing;
  const clothesColor = stripHex(outfitSpec.color ?? col.hex);

  // Kính / râu tự nhiên từ DiceBear
  let diceAcc: AccKey | undefined;
  if (c.accessory === 'kinhden' || c.accessory === 'kinhdiepvien') diceAcc = 'sunglasses';
  else if (c.accessory === 'docnhan') diceAcc = 'eyepatch';
  else if (c.accessory === 'bangdo') diceAcc = 'kurt';
  else if (c.age === 'trung') diceAcc = 'prescription02';

  let facialHair: BeardKey | undefined;
  if (c.accessory === 'raukem' || look?.raucam) facialHair = 'beardLight';
  else if (c.accessory === 'ria' || look?.ria) facialHair = 'moustacheFancy';
  else if (look?.rauham) facialHair = 'beardMedium';
  else if (c.age === 'lao' && c.gender === 'nam') facialHair = 'beardMajestic';

  const moodSet = MOOD_FACE[mood];
  const baseEyes: EyesKey =
    c.eyes === 'hip' ? 'squint' : c.eyes === 'to' ? 'surprised' : c.eyes === 'motmi' ? 'side' : 'default';
  const baseBrows: BrowsKey =
    c.brows === 'ray' || c.detail === 'longmay' ? 'default' : c.brows === 'lieu' ? 'raisedExcitedNatural' : 'defaultNatural';
  const baseMouth: MouthKey =
    look?.mouth === 'cuoitu' ? 'twinkle' : look?.mouth === 'he' ? 'tongue' : look?.mouth === 'khep' ? 'default' : 'smile';

  const rawSvg = createAvatar(avataaars, {
    seed: key,
    style: ['default'],
    backgroundColor: [stripHex(col.light)],
    skinColor: [skinHex],
    top: [topChoice],
    topProbability: bald ? 0 : 100,
    hairColor: [hairColorHex],
    hatColor: [stripHex(col.hex)],
    clothing: [clothing],
    clothesColor: [clothesColor],
    clothingGraphic: [outfitSpec.graphic ?? 'diamond'],
    accessories: diceAcc ? [diceAcc] : undefined,
    accessoriesProbability: diceAcc ? 100 : 0,
    facialHair: facialHair ? [facialHair] : undefined,
    facialHairProbability: facialHair ? 100 : 0,
    facialHairColor: [hairColorHex],
    eyes: [moodSet?.eyes ?? baseEyes],
    eyebrows: [moodSet?.eyebrows ?? baseBrows],
    mouth: [moodSet?.mouth ?? baseMouth],
  }).toString();

  // Gỡ khối RDF metadata thừa để giữ URI gọn nhẹ, gắn thêm phụ kiện party tiếng Việt nếu có
  const cleanSvg = rawSvg.replace(/<metadata[\s\S]*?<\/metadata>/, '');
  const overlay = customVectorOverlays(c, col.hex);
  const finalSvg = overlay ? cleanSvg.replace('</svg>', `${overlay}</svg>`) : cleanSvg;
  const uri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(finalSvg)}`;

  if (svgCache.size >= MAX_SVG_CACHE) {
    const oldest = svgCache.keys().next().value;
    if (oldest !== undefined) svgCache.delete(oldest);
  }
  svgCache.set(key, uri);
  return uri;
}

export function portraitUri(character?: CharacterConfig, mood: Mood = 'normal'): string {
  return characterSvgUri(character, mood);
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
