/**
 * Danh mục 3.200+ món đồ (đủ trang phục Nam/Nữ/Unisex thế giới + Xóm Lầy) cho "Sàn Diễn Xóm Lầy" (`thoitrang`).
 * Đồng bộ 1:1 với `app/src/thoitrang3d/` (6 dáng người, 14 biểu cảm, 32 hoạ tiết, 11 nhóm phụ kiện, 440+ hình khối 3D + dựng tham số).
 */
import type {
  ThoiTrangAccSubSlot,
  ThoiTrangBeautyMarkStyle,
  ThoiTrangBeardStyle,
  ThoiTrangBlushStyle,
  ThoiTrangBodyType,
  ThoiTrangBrowShape,
  ThoiTrangCatalogItem,
  ThoiTrangCategoryId,
  ThoiTrangEquippedItem,
  ThoiTrangExpressionId,
  ThoiTrangEyeShape,
  ThoiTrangEyelinerStyle,
  ThoiTrangEyeshadowStyle,
  ThoiTrangFace,
  ThoiTrangHairTwoTone,
  ThoiTrangMouthShape,
  ThoiTrangNoseShape,
  ThoiTrangOutfit,
  ThoiTrangPaletteKey,
  ThoiTrangPatternId,
  ThoiTrangPrimarySlotId,
  ThoiTrangSlotDef,
  ThoiTrangTag,
  ThoiTrangWardrobeTab,
} from './thoitrang';
import { EXTRA_ACC_SUB, EXTRA_ARCHETYPES } from './thoitrang-catalog-archetypes';
import {
  MEME_PRINTS,
  MEME_PRINT_MAP,
  UNIQUE_ACC_SUB_V2,
  UNIQUE_ARCHETYPES_V2,
} from './thoitrang-catalog-expanded';

export { MEME_PRINTS, MEME_PRINT_MAP };

export const PALETTES: Readonly<Record<ThoiTrangPaletteKey, readonly string[]>> = {
  fashion: [
    '#ffffff', '#d9d3cb', '#7c828f', '#2b2533', '#15121b',
    '#ff6b8b', '#ff9ec4', '#ffb3c7', '#c92a46', '#781d32',
    '#c79bff', '#7c5cff', '#4b2d80',
    '#6ec6ff', '#2f6fd6', '#1c3568',
    '#5fd3a6', '#1a6b4f', '#ffd56b', '#ff9f5a', '#c95e2f', '#a6774f', '#f6e7d8',
    '#ff2e93', '#ff5722', '#ffea00', '#76ff03', '#00e5ff', '#18ffff',
    '#e040fb', '#556b2f', '#008080', '#d4af37', '#5a3825', '#c98b2c',
  ],
  hair: [
    '#1b1518', '#33211b', '#5a3825', '#875331', '#ba7e43', '#e8c47a', '#f5e6c4', '#c9c5c0',
    '#a62936', '#e85f8c', '#ff9ec4', '#a98bff', '#6242b8', '#4285d6', '#52c4bd', '#4f9460',
    '#ff2e93', '#ff6d00', '#ffd600', '#76ff03', '#00e5ff', '#f8fafc', '#7f1d1d', '#1e3a8a',
  ],
  skin: ['#fce4d4', '#f7cfb6', '#eab08e', '#d69772', '#b3744f', '#845034', '#593523'],
  eye: ['#4a2d24', '#221d26', '#7a5230', '#3d7d5a', '#2f6fd6', '#56b4d3', '#8a5cc9', '#d14b7a', '#c98b2c', '#828b99'],
  lip: ['#e0707a', '#c94c5b', '#9e263c', '#f09aad', '#d97a5d', '#b85b7e', '#752d40', '#c78c7d', '#542633', '#f5b8c2'],
  shadow: ['#f2a6c2', '#b990e8', '#7bb7eb', '#e8b974', '#5c4d66', '#72c9a6', '#d96b6b', '#ffffff'],
};

export const PATTERNS: readonly (readonly [ThoiTrangPatternId, string])[] = [
  ['plain', 'Trơn'], ['stripe', 'Sọc ngang'], ['pinstripe', 'Sọc dọc'], ['dots', 'Chấm bi'],
  ['check', 'Caro nhỏ'], ['tartan', 'Caro Tartan'], ['houndstooth', 'Răng sói'], ['heart', 'Trái tim'],
  ['flower', 'Hoa nhí'], ['stars', 'Ngôi sao'], ['leopard', 'Da báo'], ['zebra', 'Ngựa vằn'],
  ['camo', 'Rằn ri'], ['ombre', 'Ombre'], ['sequin', 'Kim sa'],
  ['argyle', 'Quả trám'], ['chevron', 'Zíc zắc'], ['paisley', 'Paisley'], ['tie_dye', 'Tie-Dye'],
  ['denim', 'Vải bò'], ['lace', 'Ren lưới'], ['brocade', 'Gấm cung đình'], ['tho_cam', 'Thổ cẩm'],
  ['dragon_scale', 'Vảy rồng'], ['cow', 'Bò sữa'], ['tiger', 'Vằn hổ'], ['rainbow', 'Cầu vồng'],
  ['galaxy', 'Vũ trụ'], ['flame', 'Ngọn lửa'], ['lightning', 'Sấm sét'], ['cyber_grid', 'Lưới Neon'],
  ['chan_con_cong', 'Chăn con công'],
];

export const HAIR_TWO_TONES: readonly (readonly [ThoiTrangHairTwoTone, string])[] = [
  ['none', '1 màu'], ['tips', 'Ombre đuôi'], ['streaks', 'Highlight sọc'],
];

export const BODY_TYPES: readonly (readonly [ThoiTrangBodyType, string])[] = [
  ['nu_manh', 'Nữ mảnh mai'], ['nu_day', 'Nữ đồng hồ cát'], ['nam_thu_sinh', 'Nam thư sinh'],
  ['nam_vam_vo', 'Nam vạm vỡ'], ['chibi', 'Nhỏ nhắn Chibi'], ['cao_mau', 'Cao người mẫu'],
];

export const BODY_DEFAULTS: Readonly<Record<ThoiTrangBodyType, {
  hair: string; eyes: ThoiTrangEyeShape; brows: ThoiTrangBrowShape;
  eyeliner: ThoiTrangEyelinerStyle; blush: ThoiTrangBlushStyle; nose: ThoiTrangNoseShape;
}>> = {
  nu_manh: { hair: 'long_straight', eyes: 'almond', brows: 'arched', eyeliner: 'wing', blush: 'soft', nose: 'button' },
  nu_day: { hair: 'long_wavy', eyes: 'doe', brows: 'arched', eyeliner: 'classic', blush: 'soft', nose: 'button' },
  nam_thu_sinh: { hair: 'side_part', eyes: 'almond', brows: 'thick', eyeliner: 'none', blush: 'none', nose: 'sharp' },
  nam_vam_vo: { hair: 'undercut', eyes: 'cool', brows: 'thick', eyeliner: 'none', blush: 'none', nose: 'sharp' },
  chibi: { hair: 'space_buns', eyes: 'sparkle', brows: 'short', eyeliner: 'classic', blush: 'soft', nose: 'cute_dot' },
  cao_mau: { hair: 'elegant_bun', eyes: 'cat', brows: 'sharp', eyeliner: 'wing', blush: 'soft', nose: 'slim' },
};

export const FACE_OPTS = {
  eyes: [
    ['round', 'Mắt tròn'], ['almond', 'Hạnh nhân'], ['cat', 'Mắt mèo'], ['smiling', 'Mắt cười'], ['sleepy', 'Buồn ngủ'],
    ['sparkle', 'Lấp lánh'], ['cool', 'Nheo ngầu'], ['doe', 'To long lanh'], ['upturned', 'Mắt xếch'], ['gentle', 'Dịu dàng'],
  ] as readonly (readonly [ThoiTrangEyeShape, string])[],
  brows: [
    ['arched', 'Mày cong'], ['straight', 'Mày ngang'], ['thick', 'Mày rậm'], ['thin', 'Mày mảnh'],
    ['sharp', 'Mày sắc'], ['soft', 'Mày tròn'], ['short', 'Mày ngắn'], ['slit', 'Mày xẻ'],
  ] as readonly (readonly [ThoiTrangBrowShape, string])[],
  mouths: [
    ['smile', 'Cười nhẹ'], ['big_smile', 'Cười tươi'], ['cat_mouth', 'Miệng mèo :3'], ['pout', 'Chu môi'], ['plump', 'Môi đầy'],
    ['smirk', 'Nhếch mép'], ['neutral', 'Lạnh lùng'], ['open_happy', 'Cười hở miệng'], ['tiny_o', 'Môi chữ O'], ['heart_lip', 'Môi tim'],
  ] as readonly (readonly [ThoiTrangMouthShape, string])[],
  noses: [
    ['button', 'Mũi nút'], ['slim', 'Mũi thẳng'], ['cute_dot', 'Chấm nhỏ'], ['sharp', 'Mũi cao'], ['none', 'Tối giản'],
  ] as readonly (readonly [ThoiTrangNoseShape, string])[],
  blush: [
    ['soft', 'Má hồng'], ['none', 'Không má'], ['drunk', 'Má say'], ['peach', 'Cam đào'], ['anime', 'Gạch ///'], ['heart', 'Dán tim'],
  ] as readonly (readonly [ThoiTrangBlushStyle, string])[],
  eyeliner: [
    ['none', 'Không'], ['classic', 'Cơ bản'], ['wing', 'Kẻ cánh'], ['bold', 'Đậm cá tính'],
  ] as readonly (readonly [ThoiTrangEyelinerStyle, string])[],
  eyeshadow: [
    ['none', 'Không'], ['soft', 'Nhẹ'], ['smoky', 'Mắt khói'], ['glitter', 'Nhũ sáng'],
  ] as readonly (readonly [ThoiTrangEyeshadowStyle, string])[],
  beautyMark: [
    ['none', 'Không'], ['under_eye', 'Dưới mắt'], ['cheek', 'Gò má'], ['lip', 'Khóe môi'],
  ] as readonly (readonly [ThoiTrangBeautyMarkStyle, string])[],
  beard: [
    ['none', 'Không râu'], ['stubble', 'Râu lún phún'], ['moustache', 'Ria mép'],
    ['goatee', 'Râu dê'], ['full_beard', 'Quai nón'], ['handlebar', 'Ria vểnh'],
  ] as readonly (readonly [ThoiTrangBeardStyle, string])[],
} as const;

export const EXPRESSIONS: readonly (readonly [ThoiTrangExpressionId, string])[] = [
  ['neutral', 'Bình thường'], ['happy', 'Vui vẻ'], ['grin', 'Cười toe'], ['wink', 'Nháy mắt'],
  ['surprised', 'Ngạc nhiên'], ['angry', 'Giận dữ'], ['sad', 'Buồn bã'], ['cry', 'Khóc òa'],
  ['blep', 'Lè lưỡi'], ['kiss', 'Hôn gió'], ['cool', 'Ngầu lòi'], ['shy', 'Ngượng đỏ mặt'],
  ['dizzy', 'Choáng @_@'], ['confident', 'Tự tin'],
];

export const WARDROBE_TABS: readonly (readonly [ThoiTrangWardrobeTab, string, string])[] = [
  ['body', '🧸', 'Cơ thể'], ['face', '😊', 'Khuôn mặt'], ['hair', '💇‍♀️', 'Tóc'],
  ['top', '👚', 'Áo'], ['outer', '🧥', 'Khoác'], ['bottom', '👖', 'Quần/Váy'],
  ['dress', '👗', 'Đầm/Bộ'], ['shoes', '👟', 'Giày'], ['hat', '👒', 'Mũ'],
  ['glasses', '🕶️', 'Kính'], ['acc', '👜', 'Phụ kiện'],
];

export const SLOTS: readonly ThoiTrangSlotDef[] = [
  { id: 'top', name: 'Áo', emoji: '👚', optional: true },
  { id: 'outer', name: 'Khoác', emoji: '🧥', optional: true },
  { id: 'bottom', name: 'Quần/Váy', emoji: '👖', optional: true },
  { id: 'dress', name: 'Đầm/Bộ', emoji: '👗', optional: true },
  { id: 'shoes', name: 'Giày', emoji: '👟', optional: true },
  { id: 'hat', name: 'Mũ', emoji: '👒', optional: true },
  { id: 'glasses', name: 'Kính', emoji: '🕶️', optional: true },
];

const BASE_ACC_SUB: Readonly<Record<string, ThoiTrangAccSubSlot>> = {
  handbag: 'handR', clutch: 'handR', heart_purse: 'hipBag', backpack: 'back',
  pearls: 'neck', choker: 'neck', gold_chain: 'neck', necktie: 'neck', bowtie: 'neck', scarf: 'neck', khan_ran: 'neck',
  earrings_hoop: 'ears', headphones: 'head',
  fairy_wings: 'back', angel_wings: 'back', bat_wings: 'back',
  cat_tail: 'tail', fox_tail: 'tail', devil_tail: 'tail',
  phone: 'handL', mic: 'handL', folding_fan: 'handL', umbrella: 'handL',
  guitar: 'chestProp', bubble_tea: 'handL', sword: 'handL', wand: 'handL', bouquet: 'handL',
  ...EXTRA_ACC_SUB,
};

const mk = (
  id: string, name: string, tags: readonly ThoiTrangTag[], c: string, c2 = '#ffffff', p: ThoiTrangPatternId = 'plain',
  cPal: ThoiTrangPaletteKey = 'fashion', c2Pal: ThoiTrangPaletteKey = 'fashion', pat = true, subSlot?: ThoiTrangAccSubSlot,
): ThoiTrangCatalogItem => ({
  id, name, tags, c, c2, p, cPal, c2Pal, c2Label: cPal === 'hair' ? 'Màu phụ / 2-tone' : 'Màu phụ', pat,
  ...(subSlot ? { subSlot } : {}),
});
const H = (id: string, n: string, t: readonly ThoiTrangTag[], c: string, c2: string) => mk(id, n, t, c, c2, 'plain', 'hair', 'hair', false);
const G = (id: string, n: string, t: readonly ThoiTrangTag[], c: string, c2: string) => mk(id, n, t, c, c2, 'plain', 'fashion', 'fashion', false);
const W = (id: string, n: string, t: readonly ThoiTrangTag[], c: string, c2 = '#ffffff', p: ThoiTrangPatternId = 'plain') => mk(id, n, t, c, c2, p);
const A = (id: string, n: string, t: readonly ThoiTrangTag[], c: string, c2 = '#ffffff') => mk(id, n, t, c, c2, 'plain', 'fashion', 'fashion', true, BASE_ACC_SUB[id]);

const CORE_CATALOG: Readonly<Record<ThoiTrangCategoryId, readonly ThoiTrangCatalogItem[]>> = {
  hair: [
    H('undercut', 'Undercut', ['duong_pho', 'the_thao', 'cong_so', 'ca_tinh', 'hanh_dong', 'toi_gian'], '#33211b', '#4285d6'),
    H('quiff', 'Tóc vuốt Quiff', ['cong_so', 'da_hoi', 'sang_chanh', 'retro', 'ca_tinh'], '#33211b', '#ba7e43'),
    H('buzz', 'Tóc cua Buzz', ['the_thao', 'duong_pho', 'hanh_dong', 'toi_gian', 'ca_tinh'], '#1b1518', '#1b1518'),
    H('mohawk', 'Tóc Mohawk', ['duong_pho', 'am_nhac', 'scifi', 'lay_loi', 'ca_tinh', 'kinh_di'], '#1b1518', '#e85f8c'),
    H('man_bun', 'Búi nam Man Bun', ['duong_pho', 'co_trang', 'bi_an', 'ca_tinh', 'am_nhac'], '#33211b', '#e8c47a'),
    H('wolf_cut', 'Tóc Wolf Cut', ['duong_pho', 'kinh_di', 'scifi', 'am_nhac', 'bi_an', 'ca_tinh'], '#1b1518', '#a98bff'),
    H('slick_back', 'Vuốt ngược lịch lãm', ['cong_so', 'da_hoi', 'hoang_gia', 'sang_chanh', 'bi_an'], '#1b1518', '#5a3825'),
    H('curly_fro', 'Tóc xoăn Afro', ['duong_pho', 'lay_loi', 'am_nhac', 'mua_he', 'retro', 'ca_tinh'], '#33211b', '#875331'),
    H('side_part', 'Rẽ ngôi thư sinh', ['cong_so', 'hoc_duong', 'van_hoa_vn', 'toi_gian', 'tinh_yeu'], '#33211b', '#5a3825'),
    H('bob', 'Tóc Bob', ['cong_so', 'de_thuong', 'hoc_duong', 'retro', 'toi_gian'], '#5a3825', '#ff9ec4'),
    H('lob', 'Tóc ngang vai Lob', ['cong_so', 'mua_he', 'sang_chanh', 'bien_dao', 'toi_gian'], '#875331', '#e8c47a'),
    H('long_straight', 'Tóc dài thẳng', ['da_hoi', 'cuoi_hoi', 'van_hoa_vn', 'hoc_duong', 'sang_chanh', 'tinh_yeu'], '#1b1518', '#6242b8'),
    H('long_wavy', 'Tóc dài gợn sóng', ['da_hoi', 'cuoi_hoi', 'ky_ao', 'am_nhac', 'ngot_ngao', 'bien_dao'], '#ba7e43', '#ff9ec4'),
    H('high_ponytail', 'Đuôi ngựa cao', ['the_thao', 'duong_pho', 'hoc_duong', 'am_nhac', 'hanh_dong'], '#5a3825', '#e85f8c'),
    H('low_ponytail', 'Đuôi ngựa thấp', ['cong_so', 'van_hoa_vn', 'hoc_duong', 'toi_gian', 'tinh_yeu'], '#33211b', '#e8c47a'),
    H('elegant_bun', 'Búi cao quý phái', ['da_hoi', 'cuoi_hoi', 'hoang_gia', 'cong_so', 'sang_chanh'], '#33211b', '#e8c47a'),
    H('space_buns', 'Búi Na Tra đôi', ['de_thuong', 'duong_pho', 'scifi', 'lay_loi', 'am_nhac', 'dong_vat'], '#ff9ec4', '#e8c47a'),
    H('twin_tails', 'Hai đuôi sam', ['de_thuong', 'ky_ao', 'hoc_duong', 'ngot_ngao', 'am_nhac'], '#e8c47a', '#e85f8c'),
    H('braids', 'Tết hai bím', ['van_hoa_vn', 'hoc_duong', 'de_thuong', 'mua_he', 'retro'], '#5a3825', '#e85f8c'),
    H('hime_cut', 'Công chúa Hime', ['co_trang', 'kinh_di', 'de_thuong', 'bi_an', 'ngot_ngao'], '#1b1518', '#a62936'),
    H('pixie', 'Tóc tém Pixie', ['cong_so', 'the_thao', 'ca_tinh', 'hanh_dong', 'toi_gian'], '#e8c47a', '#f5e6c4'),
    H('curtain_bangs', 'Mái bay Hàn Quốc', ['de_thuong', 'hoc_duong', 'ngot_ngao', 'tinh_yeu', 'cong_so'], '#875331', '#e8c47a'),
    H('imperial_updo', 'Búi cổ trang cài trâm', ['co_trang', 'hoang_gia', 'ky_ao', 'van_hoa_vn', 'sang_chanh'], '#1b1518', '#e8c47a'),
    H('braid_crown', 'Tết vương miện', ['cuoi_hoi', 'hoang_gia', 'ky_ao', 'co_trang', 'tinh_yeu'], '#e8c47a', '#ff9ec4'),
  ],
  top: [
    W('tee', 'Áo thun basic', ['duong_pho', 'the_thao', 'mua_he', 'hoc_duong', 'toi_gian'], '#ffffff', '#ff6b8b'),
    W('crop_top', 'Áo croptop', ['duong_pho', 'mua_he', 'de_thuong', 'am_nhac', 'ca_tinh', 'bien_dao'], '#ff9ec4', '#ffffff'),
    W('tank', 'Áo hai dây', ['mua_he', 'bien_dao', 'de_thuong', 'toi_gian'], '#6ec6ff', '#ffffff'),
    W('tank_sport', 'Áo ba lỗ thể thao', ['the_thao', 'mua_he', 'hanh_dong', 'duong_pho'], '#2f6fd6', '#ffd56b'),
    W('blouse', 'Áo sơ mi công sở', ['cong_so', 'hoc_duong', 'sang_chanh', 'toi_gian', 'van_hoa_vn'], '#ffffff', '#6ec6ff'),
    W('puff_blouse', 'Blouse tay bồng', ['de_thuong', 'hoang_gia', 'ngot_ngao', 'retro', 'tinh_yeu'], '#ffb3c7', '#ffffff'),
    W('hoodie', 'Áo hoodie', ['duong_pho', 'mua_dong', 'lay_loi', 'hoc_duong', 'ca_tinh', 'the_thao'], '#7c5cff', '#ffd56b'),
    W('sweater', 'Áo len cổ lọ', ['mua_dong', 'cong_so', 'hoc_duong', 'retro', 'toi_gian'], '#5fd3a6', '#f6e7d8'),
    W('corset_top', 'Áo corset buộc dây', ['da_hoi', 'hoang_gia', 'kinh_di', 'hai_tac', 'ca_tinh', 'bi_an'], '#781d32', '#ffd56b'),
    W('off_shoulder', 'Áo trễ vai', ['mua_he', 'da_hoi', 'ngot_ngao', 'bien_dao', 'tinh_yeu'], '#ff6b8b', '#ffffff'),
    W('halter_top', 'Áo cổ yếm hiện đại', ['mua_he', 'da_hoi', 'sang_chanh', 'bien_dao', 'tinh_yeu'], '#c79bff', '#ffd56b'),
    W('polo_shirt', 'Áo polo cổ bẻ', ['the_thao', 'cong_so', 'hoc_duong', 'mua_he', 'retro'], '#1a6b4f', '#ffffff'),
    W('vest_gilet', 'Áo gile cổ điển', ['cong_so', 'hoang_gia', 'hai_tac', 'sang_chanh', 'retro'], '#2b2533', '#ffd56b'),
    W('pirate_shirt', 'Áo sơ mi cướp biển', ['hai_tac', 'co_trang', 'ky_ao', 'hanh_dong', 'bi_an'], '#f6e7d8', '#c92a46'),
    W('cyber_top', 'Áo giáp Sci-Fi', ['scifi', 'ky_ao', 'ca_tinh', 'hanh_dong', 'am_nhac'], '#2b2533', '#6ec6ff'),
    W('jersey', 'Áo đấu thể thao', ['the_thao', 'duong_pho', 'lay_loi', 'hanh_dong', 'am_nhac'], '#c92a46', '#ffffff'),
    W('sailor_top', 'Áo thủy thủ học đường', ['hoc_duong', 'de_thuong', 'bien_dao', 'ngot_ngao', 'retro'], '#ffffff', '#1c3568'),
    W('ao_ba_ba', 'Áo bà ba Nam Bộ', ['van_hoa_vn', 'co_trang', 'mua_he', 'retro'], '#5fd3a6', '#f6e7d8'),
    W('ao_yem', 'Áo yếm truyền thống', ['van_hoa_vn', 'co_trang', 'mua_he', 'tinh_yeu'], '#c92a46', '#ffd56b'),
    W('tube_top', 'Áo ống quây', ['mua_he', 'da_hoi', 'am_nhac', 'ca_tinh', 'bien_dao'], '#ff6b8b', '#ffd56b'),
    W('hanfu_top', 'Áo giao lĩnh cổ trang', ['co_trang', 'ky_ao', 'hoang_gia', 'van_hoa_vn'], '#6ec6ff', '#ffffff'),
    W('idol_crop', 'Áo idol lấp lánh', ['am_nhac', 'de_thuong', 'duong_pho', 'ca_tinh', 'scifi'], '#ff6b8b', '#ffd56b'),
    W('hawaiian_shirt', 'Áo sơ mi Hawaii', ['mua_he', 'bien_dao', 'lay_loi', 'retro', 'duong_pho'], '#6ec6ff', '#ffd56b', 'flower'),
    W('goth_mesh', 'Áo Gothic cổ ren', ['kinh_di', 'bi_an', 'ca_tinh', 'am_nhac'], '#15121b', '#781d32'),
  ],
  outer: [
    W('blazer', 'Áo khoác Blazer', ['cong_so', 'da_hoi', 'hoc_duong', 'sang_chanh', 'toi_gian'], '#2b2533', '#ffffff'),
    W('trench_coat', 'Áo măng tô Trench', ['cong_so', 'mua_dong', 'bi_an', 'sang_chanh', 'retro'], '#ffd56b', '#a6774f'),
    W('cardigan', 'Áo len Cardigan', ['hoc_duong', 'mua_dong', 'de_thuong', 'ngot_ngao', 'toi_gian'], '#ffb3c7', '#ffffff'),
    W('puffer_jacket', 'Áo phao béo', ['mua_dong', 'duong_pho', 'the_thao', 'ca_tinh', 'dong_vat'], '#ff9f5a', '#2b2533'),
    W('leather_jacket', 'Áo khoác da Biker', ['duong_pho', 'kinh_di', 'am_nhac', 'ca_tinh', 'hanh_dong'], '#15121b', '#d9d3cb'),
    W('kimono_haori', 'Áo choàng Kimono', ['co_trang', 'ky_ao', 'van_hoa_vn', 'mua_he', 'bi_an'], '#c92a46', '#ffd56b'),
    W('royal_cape', 'Áo choàng Hoàng gia', ['hoang_gia', 'co_trang', 'ky_ao', 'kinh_di', 'hai_tac', 'sang_chanh'], '#781d32', '#ffffff'),
    W('varsity_jacket', 'Áo khoác Varsity', ['the_thao', 'duong_pho', 'hoc_duong', 'ca_tinh', 'retro'], '#2f6fd6', '#ffffff'),
    W('lab_coat', 'Áo blouse Bác sĩ', ['cong_so', 'scifi', 'hoc_duong', 'lay_loi', 'toi_gian'], '#ffffff', '#6ec6ff'),
    W('denim_jacket', 'Áo khoác bò Denim', ['duong_pho', 'mua_he', 'hoc_duong', 'ca_tinh', 'retro'], '#2f6fd6', '#f6e7d8'),
    W('fur_coat', 'Áo khoác lông sang', ['da_hoi', 'mua_dong', 'hoang_gia', 'sang_chanh', 'am_nhac'], '#f6e7d8', '#ffb3c7'),
    W('cyber_cloak', 'Áo khoác Techwear', ['scifi', 'ca_tinh', 'hanh_dong', 'duong_pho', 'am_nhac'], '#15121b', '#5fd3a6'),
  ],
  bottom: [
    W('jeans', 'Quần jeans', ['duong_pho', 'hoc_duong', 'cong_so', 'retro', 'toi_gian'], '#2f6fd6', '#ffd56b'),
    W('wide_trousers', 'Quần tây ống rộng', ['cong_so', 'da_hoi', 'sang_chanh', 'van_hoa_vn', 'toi_gian'], '#a6774f', '#f6e7d8'),
    W('cargo_pants', 'Quần túi hộp Cargo', ['duong_pho', 'the_thao', 'scifi', 'ca_tinh', 'hanh_dong'], '#1a6b4f', '#2b2533'),
    W('tailored_slacks', 'Quần âu ôm', ['cong_so', 'hoang_gia', 'sang_chanh', 'toi_gian'], '#2b2533', '#d9d3cb'),
    W('shorts', 'Quần short', ['mua_he', 'the_thao', 'duong_pho', 'bien_dao', 'hoc_duong'], '#6ec6ff', '#ffffff'),
    W('biker_shorts', 'Quần biker ôm', ['the_thao', 'duong_pho', 'scifi', 'ca_tinh', 'hanh_dong'], '#2b2533', '#ff6b8b'),
    W('joggers', 'Quần jogger thể thao', ['the_thao', 'duong_pho', 'mua_dong', 'hoc_duong', 'lay_loi'], '#7c828f', '#ffffff'),
    W('bell_bottoms', 'Quần ống loe Retro', ['retro', 'am_nhac', 'duong_pho', 'ca_tinh'], '#2f6fd6', '#ffd56b'),
    W('bermuda', 'Quần lửng Bermuda', ['mua_he', 'cong_so', 'bien_dao', 'duong_pho'], '#f6e7d8', '#a6774f'),
    W('mini_skirt', 'Chân váy ngắn', ['de_thuong', 'duong_pho', 'mua_he', 'ca_tinh', 'am_nhac'], '#ff6b8b', '#ffffff'),
    W('pleated_skirt', 'Váy xếp ly', ['hoc_duong', 'de_thuong', 'am_nhac', 'ngot_ngao', 'van_hoa_vn'], '#1c3568', '#ffffff', 'check'),
    W('pencil_skirt', 'Chân váy bút chì', ['cong_so', 'da_hoi', 'sang_chanh', 'retro', 'toi_gian'], '#2b2533', '#ffd56b'),
    W('aline_skirt', 'Chân váy chữ A', ['cong_so', 'de_thuong', 'hoc_duong', 'ngot_ngao', 'toi_gian'], '#c95e2f', '#ffd56b'),
    W('maxi_skirt', 'Váy dài thướt tha', ['mua_he', 'da_hoi', 'bien_dao', 'van_hoa_vn', 'tinh_yeu'], '#c79bff', '#ffffff'),
    W('tutu_skirt', 'Chân váy voan Tutu', ['de_thuong', 'ky_ao', 'am_nhac', 'lay_loi', 'ngot_ngao'], '#ffb3c7', '#ffffff'),
    W('tiered_skirt', 'Chân váy tầng bèo', ['mua_he', 'hai_tac', 'co_trang', 'ngot_ngao', 'retro'], '#ffd56b', '#ffffff'),
    W('slit_maxi', 'Váy dài xẻ tà', ['da_hoi', 'kinh_di', 'bi_an', 'sang_chanh', 'am_nhac'], '#781d32', '#ffd56b'),
    W('silk_pants', 'Quần lụa truyền thống', ['van_hoa_vn', 'co_trang', 'cuoi_hoi', 'sang_chanh'], '#ffffff', '#ffd56b'),
  ],
  dress: [
    W('aodai', 'Áo dài truyền thống', ['van_hoa_vn', 'co_trang', 'cuoi_hoi', 'hoc_duong', 'hoang_gia', 'sang_chanh'], '#ff6b8b', '#ffffff'),
    W('ballgown', 'Đầm dạ hội xòe', ['da_hoi', 'hoang_gia', 'cuoi_hoi', 'sang_chanh', 'tinh_yeu'], '#7c5cff', '#ffd56b'),
    W('qipao', 'Sườn xám cách tân', ['co_trang', 'da_hoi', 'van_hoa_vn', 'sang_chanh', 'bi_an'], '#c92a46', '#ffd56b'),
    W('overall', 'Quần yếm bò', ['duong_pho', 'de_thuong', 'lay_loi', 'hoc_duong', 'retro'], '#2f6fd6', '#ffffff'),
    W('jumpsuit', 'Bộ Jumpsuit', ['cong_so', 'da_hoi', 'sang_chanh', 'ca_tinh', 'toi_gian'], '#1a6b4f', '#ffd56b'),
    W('wedding_gown', 'Váy cưới công chúa', ['cuoi_hoi', 'hoang_gia', 'ngot_ngao', 'tinh_yeu', 'sang_chanh'], '#ffffff', '#ffb3c7'),
    W('school_uniform', 'Đồng phục học sinh', ['hoc_duong', 'de_thuong', 'ngot_ngao', 'van_hoa_vn'], '#1c3568', '#c92a46'),
    W('sundress', 'Đầm hai dây mùa hè', ['mua_he', 'de_thuong', 'bien_dao', 'ngot_ngao', 'tinh_yeu'], '#ffd56b', '#ffffff', 'flower'),
    W('minidress', 'Đầm xòe tay bồng', ['de_thuong', 'am_nhac', 'ngot_ngao', 'da_hoi'], '#ffb3c7', '#ffffff'),
    W('mermaid_gown', 'Đầm đuôi cá', ['da_hoi', 'cuoi_hoi', 'sang_chanh', 'bien_dao', 'hoang_gia'], '#5fd3a6', '#ffd56b'),
    W('hanfu_gown', 'Váy cổ trang tay tiên', ['co_trang', 'ky_ao', 'hoang_gia', 'van_hoa_vn', 'bi_an'], '#c79bff', '#ffd56b'),
    W('gothic_lolita', 'Đầm Lolita ren bèo', ['kinh_di', 'de_thuong', 'ky_ao', 'bi_an', 'ngot_ngao'], '#2b2533', '#ffffff'),
    W('pirate_dress', 'Đầm cướp biển', ['hai_tac', 'ky_ao', 'hanh_dong', 'bien_dao', 'bi_an'], '#c92a46', '#2b2533'),
    W('cyber_suit', 'Giáp chiến binh Sci-Fi', ['scifi', 'hanh_dong', 'ca_tinh', 'ky_ao', 'the_thao'], '#2b2533', '#6ec6ff'),
    W('suit_full', 'Bộ Vest lịch lãm', ['cong_so', 'da_hoi', 'cuoi_hoi', 'hoang_gia', 'sang_chanh'], '#1c3568', '#c92a46'),
    W('onesie', 'Đồ ngủ thú Onesie', ['lay_loi', 'dong_vat', 'de_thuong', 'mua_dong'], '#ffd56b', '#ffffff'),
  ],
  shoes: [
    W('sneaker', 'Sneaker cổ thấp', ['the_thao', 'duong_pho', 'hoc_duong', 'mua_he', 'toi_gian'], '#ffffff', '#ff6b8b'),
    W('high_top', 'Sneaker cổ cao', ['duong_pho', 'the_thao', 'am_nhac', 'ca_tinh', 'retro'], '#c92a46', '#ffffff'),
    W('platform', 'Giày đế độn', ['duong_pho', 'de_thuong', 'am_nhac', 'ca_tinh', 'scifi'], '#ffb3c7', '#ffffff'),
    W('stiletto', 'Cao gót nhọn', ['da_hoi', 'cong_so', 'cuoi_hoi', 'hoang_gia', 'sang_chanh', 'van_hoa_vn'], '#c92a46', '#ffd56b'),
    W('mary_jane', 'Giày Mary Jane', ['de_thuong', 'hoc_duong', 'kinh_di', 'ngot_ngao', 'retro'], '#2b2533', '#ffffff'),
    W('ankle_boots', 'Bốt cổ ngắn', ['duong_pho', 'mua_dong', 'hai_tac', 'ca_tinh', 'bi_an'], '#a6774f', '#2b2533'),
    W('knee_boots', 'Bốt cao cổ', ['da_hoi', 'mua_dong', 'hai_tac', 'scifi', 'sang_chanh', 'hanh_dong'], '#2b2533', '#ffd56b'),
    W('combat_boots', 'Bốt chiến binh', ['duong_pho', 'kinh_di', 'hai_tac', 'ca_tinh', 'hanh_dong', 'am_nhac'], '#15121b', '#7c828f'),
    W('loafer', 'Giày lười công sở', ['cong_so', 'hoc_duong', 'sang_chanh', 'retro', 'toi_gian'], '#2b2533', '#a6774f'),
    W('oxford', 'Giày tây Oxford', ['cong_so', 'da_hoi', 'cuoi_hoi', 'hoang_gia', 'retro'], '#4b2d80', '#2b2533'),
    W('sandals', 'Sandal quai mảnh', ['mua_he', 'bien_dao', 'ngot_ngao', 'van_hoa_vn'], '#ffd56b', '#f6e7d8'),
    W('flip_flops', 'Dép kẹp / Dép biển', ['mua_he', 'bien_dao', 'lay_loi', 'van_hoa_vn'], '#6ec6ff', '#ffffff'),
    W('ballet', 'Giày ba lê ruy băng', ['de_thuong', 'cuoi_hoi', 'ky_ao', 'ngot_ngao'], '#ffb3c7', '#ff6b8b'),
    W('cyber_boots', 'Bốt Neon Sci-Fi', ['scifi', 'am_nhac', 'ca_tinh', 'hanh_dong', 'lay_loi'], '#15121b', '#6ec6ff'),
    W('wooden_clogs', 'Guốc mộc truyền thống', ['van_hoa_vn', 'co_trang', 'retro', 'lay_loi'], '#c92a46', '#a6774f'),
  ],
  hat: [
    W('non_la', 'Nón lá Việt Nam', ['van_hoa_vn', 'co_trang', 'mua_he', 'bien_dao'], '#f6e7d8', '#ff6b8b'),
    W('tiara', 'Vương miện Tiara', ['cuoi_hoi', 'da_hoi', 'hoang_gia', 'ngot_ngao', 'tinh_yeu'], '#ff6b8b', '#ffd56b'),
    W('crown', 'Vương miện hoàng gia', ['hoang_gia', 'da_hoi', 'cuoi_hoi', 'sang_chanh'], '#c92a46', '#ffd56b'),
    W('chef_hat', 'Mũ đầu bếp', ['lay_loi', 'cong_so', 'de_thuong', 'van_hoa_vn'], '#ffffff', '#ff6b8b'),
    W('pirate_hat', 'Mũ cướp biển', ['hai_tac', 'hanh_dong', 'bien_dao', 'bi_an'], '#2b2533', '#c92a46'),
    W('helmet', 'Mũ bảo hiểm Sci-Fi', ['scifi', 'the_thao', 'hanh_dong', 'duong_pho', 'lay_loi'], '#ffffff', '#6ec6ff'),
    W('cat_ears', 'Bờm tai mèo', ['de_thuong', 'dong_vat', 'am_nhac', 'ngot_ngao', 'lay_loi'], '#2b2533', '#ffb3c7'),
    W('bunny_ears', 'Bờm tai thỏ', ['de_thuong', 'dong_vat', 'ngot_ngao', 'lay_loi', 'ky_ao'], '#ffffff', '#ffb3c7'),
    W('demon_horns', 'Sừng ác quỷ', ['kinh_di', 'ky_ao', 'bi_an', 'ca_tinh', 'dong_vat'], '#c92a46', '#ffd56b'),
    W('angel_halo', 'Vòng hào quang', ['ky_ao', 'cuoi_hoi', 'hoang_gia', 'tinh_yeu'], '#ffd56b', '#ffffff'),
    W('beret', 'Mũ nồi Beret', ['cong_so', 'de_thuong', 'mua_dong', 'hoc_duong', 'retro'], '#ff6b8b', '#2b2533'),
    W('cap', 'Mũ lưỡi trai', ['the_thao', 'duong_pho', 'mua_he', 'hoc_duong', 'ca_tinh'], '#2f6fd6', '#ffffff'),
    W('bucket_hat', 'Mũ tai bèo Bucket', ['duong_pho', 'mua_he', 'bien_dao', 'van_hoa_vn', 'lay_loi'], '#5fd3a6', '#ffffff'),
    W('sunhat', 'Mũ rộng vành đi biển', ['mua_he', 'bien_dao', 'de_thuong', 'ngot_ngao', 'retro'], '#f6e7d8', '#ff6b8b'),
    W('witch', 'Mũ phù thủy', ['kinh_di', 'ky_ao', 'bi_an', 'lay_loi'], '#2b2533', '#c79bff'),
    W('fedora', 'Mũ phớt Fedora', ['cong_so', 'bi_an', 'am_nhac', 'sang_chanh', 'retro'], '#a6774f', '#2b2533'),
    W('top_hat', 'Mũ chóp cao quý tộc', ['hoang_gia', 'kinh_di', 'ky_ao', 'bi_an', 'sang_chanh'], '#15121b', '#c92a46'),
    W('beanie', 'Mũ len mùa đông', ['mua_dong', 'duong_pho', 'de_thuong', 'hoc_duong'], '#ff6b8b', '#ffffff'),
    W('khan_dong', 'Khăn đóng truyền thống', ['van_hoa_vn', 'co_trang', 'cuoi_hoi', 'hoang_gia'], '#c92a46', '#ffd56b'),
    W('bridal_veil', 'Khăn voan cô dâu', ['cuoi_hoi', 'hoang_gia', 'tinh_yeu', 'ngot_ngao'], '#ffffff', '#ffd56b'),
  ],
  glasses: [
    G('round', 'Kính gọng tròn', ['cong_so', 'hoc_duong', 'retro', 'de_thuong', 'toi_gian'], '#2b2533', '#ffffff'),
    G('shades', 'Kính râm Wayfarer', ['duong_pho', 'mua_he', 'ca_tinh', 'bien_dao', 'am_nhac'], '#15121b', '#2b2533'),
    G('heart', 'Kính trái tim', ['de_thuong', 'ngot_ngao', 'lay_loi', 'tinh_yeu', 'am_nhac'], '#ffffff', '#ff6b8b'),
    G('cat_eye', 'Kính mắt mèo', ['da_hoi', 'sang_chanh', 'retro', 'cong_so', 'bi_an'], '#c92a46', '#2b2533'),
    G('aviator', 'Kính phi công', ['duong_pho', 'the_thao', 'hanh_dong', 'ca_tinh', 'retro'], '#ffd56b', '#1a6b4f'),
    G('cyber_visor', 'Kính Sci-Fi Neon', ['scifi', 'am_nhac', 'ca_tinh', 'hanh_dong', 'lay_loi'], '#2b2533', '#6ec6ff'),
    G('monocle', 'Kính một mắt', ['hoang_gia', 'bi_an', 'kinh_di', 'sang_chanh', 'retro'], '#ffd56b', '#ffffff'),
    G('star_shades', 'Kính ngôi sao Idol', ['am_nhac', 'lay_loi', 'de_thuong', 'duong_pho'], '#ffffff', '#ffd56b'),
    G('square_geek', 'Kính vuông tri thức', ['cong_so', 'hoc_duong', 'toi_gian', 'retro'], '#2b2533', '#ffffff'),
    G('eye_patch', 'Bịt mắt hải tặc', ['hai_tac', 'kinh_di', 'bi_an', 'hanh_dong', 'lay_loi'], '#15121b', '#2b2533'),
  ],
  acc: [
    A('handbag', 'Túi xách tay', ['cong_so', 'sang_chanh', 'da_hoi', 'toi_gian'], '#ff6b8b', '#ffd56b'),
    A('clutch', 'Ví cầm tay dự tiệc', ['da_hoi', 'cuoi_hoi', 'sang_chanh', 'hoang_gia'], '#2b2533', '#ffd56b'),
    A('backpack', 'Ba lô mini', ['hoc_duong', 'duong_pho', 'the_thao', 'de_thuong'], '#ff9f5a', '#ffffff'),
    A('heart_purse', 'Túi tim đeo chéo', ['de_thuong', 'ngot_ngao', 'tinh_yeu', 'mua_he'], '#ff6b8b', '#ffffff'),
    A('pearls', 'Vòng ngọc trai', ['da_hoi', 'cuoi_hoi', 'hoang_gia', 'sang_chanh', 'van_hoa_vn'], '#ffffff', '#ffd56b'),
    A('choker', 'Choker trái tim', ['duong_pho', 'kinh_di', 'ca_tinh', 'am_nhac', 'de_thuong'], '#15121b', '#ff6b8b'),
    A('gold_chain', 'Dây chuyền Hip-hop', ['duong_pho', 'am_nhac', 'lay_loi', 'ca_tinh', 'sang_chanh'], '#ffd56b', '#ffffff'),
    A('necktie', 'Cà vạt công sở', ['cong_so', 'hoc_duong', 'sang_chanh', 'toi_gian'], '#c92a46', '#1c3568'),
    A('bowtie', 'Nơ cổ quý ông', ['da_hoi', 'cuoi_hoi', 'hoang_gia', 'hoc_duong', 'retro'], '#c92a46', '#ffd56b'),
    A('scarf', 'Khăn quàng mùa đông', ['mua_dong', 'hoc_duong', 'de_thuong', 'duong_pho'], '#ff6b8b', '#ffffff'),
    A('khan_ran', 'Khăn rằn Nam Bộ', ['van_hoa_vn', 'co_trang', 'retro', 'hanh_dong'], '#15121b', '#ffffff'),
    A('earrings_hoop', 'Bông tai khoen tròn', ['duong_pho', 'hai_tac', 'am_nhac', 'mua_he', 'ca_tinh'], '#ffd56b', '#ff6b8b'),
    A('headphones', 'Tai nghe chụp tai', ['am_nhac', 'duong_pho', 'scifi', 'hoc_duong', 'ca_tinh'], '#ff6b8b', '#ffffff'),
    A('fairy_wings', 'Cánh tiên lung linh', ['ky_ao', 'de_thuong', 'ngot_ngao', 'mua_he'], '#c79bff', '#ffb3c7'),
    A('angel_wings', 'Cánh thiên thần', ['ky_ao', 'cuoi_hoi', 'hoang_gia', 'tinh_yeu'], '#ffffff', '#ffd56b'),
    A('bat_wings', 'Cánh dơi ác quỷ', ['kinh_di', 'ky_ao', 'bi_an', 'ca_tinh', 'dong_vat'], '#2b2533', '#781d32'),
    A('cat_tail', 'Đuôi mèo mềm mại', ['dong_vat', 'de_thuong', 'ngot_ngao', 'lay_loi'], '#2b2533', '#ffffff'),
    A('fox_tail', 'Đuôi hồ ly xù lớn', ['co_trang', 'ky_ao', 'dong_vat', 'de_thuong'], '#ff9f5a', '#ffffff'),
    A('devil_tail', 'Đuôi quỷ mũi nhọn', ['kinh_di', 'ky_ao', 'bi_an', 'ca_tinh', 'dong_vat'], '#c92a46', '#15121b'),
    A('phone', 'Điện thoại Selfie', ['duong_pho', 'lay_loi', 'hoc_duong', 'scifi', 'am_nhac'], '#ffb3c7', '#ffffff'),
    A('mic', 'Micro sân khấu', ['am_nhac', 'da_hoi', 'duong_pho', 'lay_loi', 'ca_tinh'], '#2b2533', '#d9d3cb'),
    A('folding_fan', 'Quạt xếp cổ trang', ['co_trang', 'van_hoa_vn', 'da_hoi', 'hoang_gia', 'bi_an'], '#c92a46', '#ffd56b'),
    A('umbrella', 'Ô / Dù che nắng', ['mua_he', 'co_trang', 'kinh_di', 'van_hoa_vn', 'sang_chanh'], '#ffb3c7', '#ffffff'),
    A('guitar', 'Đàn Guitar điện', ['am_nhac', 'duong_pho', 'ca_tinh', 'scifi', 'lay_loi'], '#c92a46', '#ffffff'),
    A('bubble_tea', 'Ly trà sữa trân châu', ['duong_pho', 'lay_loi', 'hoc_duong', 'van_hoa_vn', 'de_thuong'], '#f6e7d8', '#ff6b8b'),
    A('sword', 'Thanh kiếm hiệp sĩ', ['hai_tac', 'ky_ao', 'co_trang', 'hanh_dong', 'bi_an'], '#d9d3cb', '#ffd56b'),
    A('wand', 'Đũa phép sao sáng', ['ky_ao', 'de_thuong', 'hoang_gia', 'ngot_ngao'], '#ffd56b', '#ffffff'),
    A('bouquet', 'Bó hoa cầm tay', ['cuoi_hoi', 'da_hoi', 'tinh_yeu', 'van_hoa_vn', 'ngot_ngao'], '#ff6b8b', '#f6e7d8'),
  ],
};

/** Tất cả ~648 hình khối 3D ĐỘC NHẤT — KHÔNG trùng hình dạng, KHÔNG bản sao chỉ đổi màu! */
export const ARCHETYPE_CATALOG: Readonly<Record<ThoiTrangCategoryId, readonly ThoiTrangCatalogItem[]>> = {
  hair: [...CORE_CATALOG.hair, ...EXTRA_ARCHETYPES.hair, ...UNIQUE_ARCHETYPES_V2.hair],
  top: [...CORE_CATALOG.top, ...EXTRA_ARCHETYPES.top, ...UNIQUE_ARCHETYPES_V2.top],
  outer: [...CORE_CATALOG.outer, ...EXTRA_ARCHETYPES.outer, ...UNIQUE_ARCHETYPES_V2.outer],
  bottom: [...CORE_CATALOG.bottom, ...EXTRA_ARCHETYPES.bottom, ...UNIQUE_ARCHETYPES_V2.bottom],
  dress: [...CORE_CATALOG.dress, ...EXTRA_ARCHETYPES.dress, ...UNIQUE_ARCHETYPES_V2.dress],
  shoes: [...CORE_CATALOG.shoes, ...EXTRA_ARCHETYPES.shoes, ...UNIQUE_ARCHETYPES_V2.shoes],
  hat: [...CORE_CATALOG.hat, ...EXTRA_ARCHETYPES.hat, ...UNIQUE_ARCHETYPES_V2.hat],
  glasses: [...CORE_CATALOG.glasses, ...EXTRA_ARCHETYPES.glasses, ...UNIQUE_ARCHETYPES_V2.glasses],
  acc: [...CORE_CATALOG.acc, ...EXTRA_ARCHETYPES.acc, ...UNIQUE_ARCHETYPES_V2.acc],
};

export const ACC_SUB: Readonly<Record<string, ThoiTrangAccSubSlot>> = {
  ...BASE_ACC_SUB,
  ...UNIQUE_ACC_SUB_V2,
};

export const CATALOG: Readonly<Record<ThoiTrangCategoryId, readonly ThoiTrangCatalogItem[]>> = ARCHETYPE_CATALOG;

const ITEM_MAP = new Map<string, ThoiTrangCatalogItem>();
for (const [cat, items] of Object.entries(CATALOG)) {
  for (const item of items) ITEM_MAP.set(`${cat}:${item.id}`, item);
}

export function getItem(cat: ThoiTrangCategoryId, id: string): ThoiTrangCatalogItem | undefined {
  return ITEM_MAP.get(`${cat}:${id}`);
}

export const DEFAULT_FACE: ThoiTrangFace = {
  eyes: 'round', eyeColor: '#4a2d24', brows: 'arched', mouth: 'smile', lipColor: '#e0707a',
  nose: 'button', blush: 'soft', eyeliner: 'classic', eyeshadow: 'none', eyeshadowColor: '#f2a6c2',
  beautyMark: 'none', beard: 'none', freckles: false, expression: 'neutral',
};

export const BASE_OUTFIT: ThoiTrangOutfit = {
  body: 'nu_manh',
  skin: PALETTES.skin[1],
  height: 1.0,
  face: { ...DEFAULT_FACE },
  hair: { id: 'long_straight', c: '#33211b', c2: '#6242b8', twoTone: 'none' },
  slots: {
    top: { id: 'tee', c: '#ffffff', c2: '#ff6b8b', p: 'plain' },
    bottom: { id: 'shorts', c: '#6ec6ff', c2: '#ffffff', p: 'plain' },
    shoes: { id: 'sneaker', c: '#ffffff', c2: '#ff6b8b', p: 'plain' },
  },
  acc: [],
};

export function cloneOutfit(o: ThoiTrangOutfit): ThoiTrangOutfit {
  const slots: Partial<Record<ThoiTrangPrimarySlotId, ThoiTrangEquippedItem>> = {};
  for (const s of SLOTS) {
    const eq = o.slots[s.id];
    if (eq) slots[s.id] = { ...eq };
  }
  return {
    body: o.body,
    skin: o.skin,
    height: o.height,
    face: { ...o.face },
    hair: { ...o.hair },
    slots,
    acc: (o.acc ?? []).map((a) => ({ ...a })),
  };
}

const VALID_BODY = new Set<string>(BODY_TYPES.map((b) => b[0]));
const VALID_PAT = new Set<string>(PATTERNS.map((p) => p[0]));
const PAT_ALIAS: Record<string, ThoiTrangPatternId> = {
  solid: 'plain', polka: 'dots', gingham: 'check', hearts: 'heart', floral: 'flower',
};
const VALID_TT = new Set<string>(HAIR_TWO_TONES.map((t) => t[0]));
const VALID_PAL = Object.fromEntries(
  Object.entries(PALETTES).map(([k, arr]) => [k, new Set(arr.map((x) => x.toLowerCase()))]),
) as Record<ThoiTrangPaletteKey, Set<string>>;
const VALID_OPT = {
  eyes: new Set<string>(FACE_OPTS.eyes.map((x) => x[0])),
  brows: new Set<string>(FACE_OPTS.brows.map((x) => x[0])),
  mouths: new Set<string>(FACE_OPTS.mouths.map((x) => x[0])),
  noses: new Set<string>(FACE_OPTS.noses.map((x) => x[0])),
  blush: new Set<string>(FACE_OPTS.blush.map((x) => x[0])),
  eyeliner: new Set<string>(FACE_OPTS.eyeliner.map((x) => x[0])),
  eyeshadow: new Set<string>(FACE_OPTS.eyeshadow.map((x) => x[0])),
  beautyMark: new Set<string>(FACE_OPTS.beautyMark.map((x) => x[0])),
  beard: new Set<string>(FACE_OPTS.beard.map((x) => x[0])),
  expr: new Set<string>(EXPRESSIONS.map((x) => x[0])),
};

const pickHex = (raw: unknown, pal: ThoiTrangPaletteKey, fallback: string): string => {
  if (typeof raw === 'string' && VALID_PAL[pal].has(raw.toLowerCase())) return raw.toLowerCase();
  return fallback;
};

const pickPat = (raw: unknown, allow: boolean, fallback: ThoiTrangPatternId): ThoiTrangPatternId => {
  if (!allow) return 'plain';
  if (typeof raw !== 'string') return fallback;
  if (VALID_PAT.has(raw)) return raw as ThoiTrangPatternId;
  return PAT_ALIAS[raw] ?? fallback;
};

function sanitizeBody(raw: unknown): ThoiTrangBodyType {
  if (typeof raw === 'string') {
    if (VALID_BODY.has(raw)) return raw as ThoiTrangBodyType;
    if (raw === 'female' || raw === 'girl') return 'nu_manh';
    if (raw === 'curvy') return 'nu_day';
    if (raw === 'male' || raw === 'boy') return 'nam_thu_sinh';
  }
  return BASE_OUTFIT.body;
}

const MEME_PRINT_SLOTS = new Set<ThoiTrangPrimarySlotId>(['top', 'outer', 'dress']);
const pickMemeTxt = (raw: unknown, slot: ThoiTrangPrimarySlotId): string | undefined => {
  if (!MEME_PRINT_SLOTS.has(slot) || typeof raw !== 'string') return undefined;
  return MEME_PRINT_MAP[raw] ? raw : undefined;
};

export function validateOutfit(raw: unknown): { outfit: ThoiTrangOutfit; warnings: string[] } {
  const warnings: string[] = [];
  const src = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const body = sanitizeBody(src.body);
  const skin = pickHex(src.skin, 'skin', BASE_OUTFIT.skin);
  const rawH = typeof src.height === 'number' && Number.isFinite(src.height) ? src.height : 1.0;
  const height = Math.round(Math.min(1.15, Math.max(0.85, rawH)) * 100) / 100;

  const rf = (src.face && typeof src.face === 'object' ? src.face : {}) as Record<string, unknown>;
  const face: ThoiTrangFace = {
    eyes: VALID_OPT.eyes.has(String(rf.eyes)) ? (rf.eyes as ThoiTrangEyeShape) : DEFAULT_FACE.eyes,
    eyeColor: pickHex(rf.eyeColor, 'eye', DEFAULT_FACE.eyeColor),
    brows: VALID_OPT.brows.has(String(rf.brows)) ? (rf.brows as ThoiTrangBrowShape) : DEFAULT_FACE.brows,
    mouth: VALID_OPT.mouths.has(String(rf.mouth)) ? (rf.mouth as ThoiTrangMouthShape) : DEFAULT_FACE.mouth,
    lipColor: pickHex(rf.lipColor, 'lip', DEFAULT_FACE.lipColor),
    nose: VALID_OPT.noses.has(String(rf.nose)) ? (rf.nose as ThoiTrangNoseShape) : DEFAULT_FACE.nose,
    blush: VALID_OPT.blush.has(String(rf.blush)) ? (rf.blush as ThoiTrangBlushStyle) : DEFAULT_FACE.blush,
    eyeliner: VALID_OPT.eyeliner.has(String(rf.eyeliner)) ? (rf.eyeliner as ThoiTrangEyelinerStyle) : DEFAULT_FACE.eyeliner,
    eyeshadow: VALID_OPT.eyeshadow.has(String(rf.eyeshadow)) ? (rf.eyeshadow as ThoiTrangEyeshadowStyle) : DEFAULT_FACE.eyeshadow,
    eyeshadowColor: pickHex(rf.eyeshadowColor, 'shadow', DEFAULT_FACE.eyeshadowColor),
    beautyMark: VALID_OPT.beautyMark.has(String(rf.beautyMark)) ? (rf.beautyMark as ThoiTrangBeautyMarkStyle) : DEFAULT_FACE.beautyMark,
    beard: VALID_OPT.beard.has(String(rf.beard)) ? (rf.beard as ThoiTrangBeardStyle) : DEFAULT_FACE.beard,
    freckles: Boolean(rf.freckles),
    expression: VALID_OPT.expr.has(String(rf.expression)) ? (rf.expression as ThoiTrangExpressionId) : DEFAULT_FACE.expression,
  };

  const rh = (src.hair && typeof src.hair === 'object' ? src.hair : {}) as Record<string, unknown>;
  const hairItem = (typeof rh.id === 'string' && getItem('hair', rh.id)) || getItem('hair', BASE_OUTFIT.hair.id)!;
  const hair = {
    id: hairItem.id,
    c: pickHex(rh.c, 'hair', hairItem.c),
    c2: pickHex(rh.c2, 'hair', hairItem.c2),
    twoTone: VALID_TT.has(String(rh.twoTone)) ? (rh.twoTone as ThoiTrangHairTwoTone) : 'none',
  };

  const rawSlots = (src.slots && typeof src.slots === 'object' ? src.slots : {}) as Record<string, unknown>;
  const slots: Partial<Record<ThoiTrangPrimarySlotId, ThoiTrangEquippedItem>> = {};
  for (const s of SLOTS) {
    const rs = rawSlots[s.id];
    if (!rs || typeof rs !== 'object') continue;
    const obj = rs as Record<string, unknown>;
    const item = typeof obj.id === 'string' ? getItem(s.id, obj.id) : undefined;
    if (!item) { warnings.push(`invalid:${s.id}`); continue; }
    const txt = pickMemeTxt(obj.txt, s.id);
    slots[s.id] = {
      id: item.id,
      c: pickHex(obj.c, item.cPal, item.c),
      c2: pickHex(obj.c2, item.c2Pal ?? 'fashion', item.c2),
      p: pickPat(obj.p, item.pat, item.p),
      ...(txt ? { txt } : {}),
    };
  }
  if (slots.dress) {
    if (slots.top) { delete slots.top; warnings.push('exclusive:dress_clears_top'); }
    if (slots.bottom) { delete slots.bottom; warnings.push('exclusive:dress_clears_bottom'); }
  }

  const rawAcc = Array.isArray(src.acc) ? src.acc : [];
  const accBySub = new Map<ThoiTrangAccSubSlot, ThoiTrangEquippedItem>();
  for (const entry of rawAcc) {
    if (!entry || typeof entry !== 'object') continue;
    const obj = entry as Record<string, unknown>;
    const item = typeof obj.id === 'string' ? getItem('acc', obj.id) : undefined;
    if (!item || !item.subSlot) { warnings.push('invalid:acc'); continue; }
    accBySub.set(item.subSlot, {
      id: item.id,
      c: pickHex(obj.c, item.cPal, item.c),
      c2: pickHex(obj.c2, item.c2Pal ?? 'fashion', item.c2),
      p: pickPat(obj.p, item.pat, item.p),
    });
  }

  return { outfit: { body, skin, height, face, hair, slots, acc: [...accBySub.values()] }, warnings };
}

export function setSlot(
  outfit: ThoiTrangOutfit,
  slot: ThoiTrangPrimarySlotId,
  value: ThoiTrangEquippedItem | null,
): ThoiTrangOutfit {
  const next = cloneOutfit(outfit);
  if (!value) {
    delete next.slots[slot];
  } else {
    next.slots[slot] = { ...value };
    if (slot === 'dress') { delete next.slots.top; delete next.slots.bottom; }
    else if (slot === 'top' || slot === 'bottom') { delete next.slots.dress; }
  }
  return validateOutfit(next).outfit;
}

export function toggleAcc(outfit: ThoiTrangOutfit, id: string | null): ThoiTrangOutfit {
  const next = cloneOutfit(outfit);
  if (!id) { next.acc = []; return next; }
  const idx = next.acc.findIndex((a) => a.id === id);
  if (idx >= 0) {
    next.acc.splice(idx, 1);
  } else {
    const item = getItem('acc', id);
    if (!item || !item.subSlot) return next;
    next.acc = next.acc.filter((a) => ACC_SUB[a.id] !== item.subSlot);
    next.acc.push({ id: item.id, c: item.c, c2: item.c2, p: item.p });
  }
  return validateOutfit(next).outfit;
}

export function updateAcc(
  outfit: ThoiTrangOutfit,
  id: string,
  patch: Partial<Pick<ThoiTrangEquippedItem, 'c' | 'c2' | 'p'>>,
): ThoiTrangOutfit {
  const next = cloneOutfit(outfit);
  const tgt = next.acc.find((a) => a.id === id);
  if (!tgt) return next;
  Object.assign(tgt, patch);
  return validateOutfit(next).outfit;
}

export function outfitHash(outfit: ThoiTrangOutfit): string {
  const clean = validateOutfit(outfit).outfit;
  const slotStr = SLOTS.map((s) => {
    const eq = clean.slots[s.id];
    return eq ? `${s.id}:${eq.id}:${eq.c}:${eq.c2}:${eq.p}${eq.txt ? ':' + eq.txt : ''}` : '';
  }).filter(Boolean).join('|');
  const accStr = [...clean.acc].sort((a, b) => a.id.localeCompare(b.id))
    .map((a) => `${a.id}:${a.c}:${a.c2}:${a.p}`).join(',');
  const f = clean.face;
  const fStr = `${f.eyes}.${f.eyeColor}.${f.brows}.${f.mouth}.${f.lipColor}.${f.nose}.${f.blush}.${f.eyeliner}.${f.eyeshadow}.${f.eyeshadowColor}.${f.beautyMark}.${f.beard}.${f.freckles ? 1 : 0}.${f.expression}`;
  return `${clean.body}|${clean.skin}|${clean.height}|${fStr}|${clean.hair.id}:${clean.hair.c}:${clean.hair.c2}:${clean.hair.twoTone}|${slotStr}|${accStr}`;
}

export function countVariants(): {
  baseItems: number;
  total: number;
  byCategory: Record<ThoiTrangCategoryId, number>;
  bodyTypes: number;
  expressions: number;
} {
  const byCategory = {} as Record<ThoiTrangCategoryId, number>;
  let baseItems = 0;
  let total = 0;
  for (const [cat, items] of Object.entries(CATALOG) as [ThoiTrangCategoryId, readonly ThoiTrangCatalogItem[]][]) {
    let catTotal = 0;
    const printMult = (cat === 'top' || cat === 'outer' || cat === 'dress') ? MEME_PRINTS.length : 1;
    for (const item of items) {
      if (item.excluded) continue;
      baseItems += 1;
      const c1 = PALETTES[item.cPal].length;
      if (cat === 'hair') {
        catTotal += c1 * (1 + (HAIR_TWO_TONES.length - 1) * (c1 - 1));
      } else {
        const c2 = item.c2Pal ? PALETTES[item.c2Pal].length : 1;
        const pCount = item.pat ? PATTERNS.length : 1;
        catTotal += c1 * c2 * pCount * printMult;
      }
    }
    byCategory[cat] = catTotal;
    total += catTotal;
  }
  return { baseItems, total, byCategory, bodyTypes: BODY_TYPES.length, expressions: EXPRESSIONS.length };
}
