/**
 * Tổng hợp & parse toàn bộ 640 chủ đề "Sàn Diễn Xóm Lầy" chia theo 16 nhóm.
 * Dùng chung cho Server (FreshDeck + Giám khảo Máy) và App (Bộ lọc & Gợi ý).
 */
import {
  THOI_TRANG_ALL_TAGS,
  THOI_TRANG_DECK,
  THOI_TRANG_THEME_GROUP_IDS,
  type ThoiTrangMustHaveSlot,
  type ThoiTrangTag,
  type ThoiTrangTheme,
  type ThoiTrangThemeGroupId,
  type ThoiTrangThemeGroupMeta,
  type ThoiTrangThemeGroupSetting,
} from './thoitrang';
import { THEME_ROWS_PART1 } from './thoitrang-themes-1';
import { THEME_ROWS_PART2 } from './thoitrang-themes-2';
import { THEME_ROWS_PART3 } from './thoitrang-themes-3';

export { THOI_TRANG_DECK };

export const THOI_TRANG_THEME_GROUPS: readonly ThoiTrangThemeGroupMeta[] = [
  { id: 'viet_nam', name: 'Văn hóa Việt', emoji: '🇻🇳' },
  { id: 'lay_loi', name: 'Đời thường lầy', emoji: '🤪' },
  { id: 'da_tiec', name: 'Dạ tiệc & Hoàng gia', emoji: '👑' },
  { id: 'duong_pho', name: 'Đường phố & Thể thao', emoji: '🛹' },
  { id: 'cong_so', name: 'Công sở & Sang chảnh', emoji: '💼' },
  { id: 'co_trang', name: 'Cổ trang & Lịch sử', emoji: '🏯' },
  { id: 'ky_ao', name: 'Kỳ ảo & Thần thoại', emoji: '🧚' },
  { id: 'kinh_di', name: 'Kinh dị & Halloween', emoji: '🎃' },
  { id: 'scifi', name: 'Sci-Fi & Tương lai', emoji: '🚀' },
  { id: 'mua_he', name: 'Mùa hè & Biển đảo', emoji: '🏖️' },
  { id: 'mua_dong', name: 'Mùa đông & Lễ hội', emoji: '❄️' },
  { id: 'am_nhac', name: 'Âm nhạc & Biểu diễn', emoji: '🎤' },
  { id: 'hoc_duong', name: 'Học đường', emoji: '🎒' },
  { id: 'cuoi_hoi', name: 'Cưới hỏi & Tình yêu', emoji: '💍' },
  { id: 'phieu_luu', name: 'Phiêu lưu & Hải tặc', emoji: '🏴‍☠️' },
  { id: 'thu_thach', name: 'Thử thách màu & Style', emoji: '🎨' },
];

export const THOI_TRANG_THEME_GROUP_MAP: Readonly<Record<ThoiTrangThemeGroupId, ThoiTrangThemeGroupMeta>> = (() => {
  const map = {} as Record<ThoiTrangThemeGroupId, ThoiTrangThemeGroupMeta>;
  for (const meta of THOI_TRANG_THEME_GROUPS) map[meta.id] = meta;
  return map;
})();

const VALID_TAGS = new Set<string>(THOI_TRANG_ALL_TAGS);
const VALID_SLOTS = new Set<string>([
  'dress', 'top', 'bottom', 'outer', 'shoes',
  'hat', 'glasses', 'acc', 'earrings', 'necklace', 'belt',
  'bag', 'held', 'back', 'tail',
]);
const HEX_RE = /^#[0-9a-f]{6}$/;

function parseThemeRow(group: ThoiTrangThemeGroupId, row: string): ThoiTrangTheme {
  const parts = row.split('|');
  if (parts.length !== 5 && parts.length !== 6) {
    throw new Error(`Invalid theme row format in group "${group}": ${row}`);
  }
  const id = parts[0].trim();
  const title = parts[1].trim();
  const desc = parts[2].trim();
  const rawTags = parts[3].split(',').map((t) => t.trim()).filter(Boolean);
  const rawPalette = parts[4].split(',').map((c) => c.trim().toLowerCase()).filter(Boolean);
  const rawMustHave = parts[5]?.trim() ?? '';

  if (!id || !title || !desc) {
    throw new Error(`Missing id/title/desc in theme row: ${row}`);
  }
  if (rawTags.length === 0) {
    throw new Error(`Theme "${id}" has no tags`);
  }
  for (const tag of rawTags) {
    if (!VALID_TAGS.has(tag)) {
      throw new Error(`Theme "${id}" has unknown tag "${tag}"`);
    }
  }
  if (rawPalette.length === 0) {
    throw new Error(`Theme "${id}" has no palette colors`);
  }
  for (const hex of rawPalette) {
    if (!HEX_RE.test(hex)) {
      throw new Error(`Theme "${id}" has invalid hex color "${hex}"`);
    }
  }
  if (rawMustHave && !VALID_SLOTS.has(rawMustHave)) {
    throw new Error(`Theme "${id}" has invalid mustHave slot "${rawMustHave}"`);
  }

  const base: ThoiTrangTheme = {
    id,
    group,
    title,
    desc,
    tags: rawTags as ThoiTrangTag[],
    palette: rawPalette,
  };
  return rawMustHave ? { ...base, mustHave: rawMustHave as ThoiTrangMustHaveSlot } : base;
}

const PART_SOURCES = [THEME_ROWS_PART1, THEME_ROWS_PART2, THEME_ROWS_PART3] as const;

const BUILT = (() => {
  const all: ThoiTrangTheme[] = [];
  const byGroup = {} as Record<ThoiTrangThemeGroupId, readonly ThoiTrangTheme[]>;
  const keysByGroup = {} as Record<ThoiTrangThemeGroupId, readonly string[]>;
  const byId = new Map<string, ThoiTrangTheme>();

  for (const groupId of THOI_TRANG_THEME_GROUP_IDS) {
    const groupList: ThoiTrangTheme[] = [];
    for (const part of PART_SOURCES) {
      const rows = part[groupId];
      if (!rows) continue;
      for (const row of rows) {
        const theme = parseThemeRow(groupId, row);
        groupList.push(theme);
        all.push(theme);
        byId.set(theme.id, theme);
      }
    }
    byGroup[groupId] = groupList;
    keysByGroup[groupId] = groupList.map((t) => t.id);
  }

  return {
    all,
    byGroup,
    keys: all.map((t) => t.id),
    keysByGroup,
    byId,
  };
})();

export const THOI_TRANG_THEMES: readonly ThoiTrangTheme[] = BUILT.all;
export const THOI_TRANG_THEMES_BY_GROUP: Readonly<Record<ThoiTrangThemeGroupId, readonly ThoiTrangTheme[]>> = BUILT.byGroup;
export const THOI_TRANG_THEME_KEYS: readonly string[] = BUILT.keys;
export const THOI_TRANG_THEME_KEYS_BY_GROUP: Readonly<Record<ThoiTrangThemeGroupId, readonly string[]>> = BUILT.keysByGroup;
export const THOI_TRANG_THEME_MAP: ReadonlyMap<string, ThoiTrangTheme> = BUILT.byId;

export function getThoiTrangTheme(id: string): ThoiTrangTheme | undefined {
  return THOI_TRANG_THEME_MAP.get(id);
}

export function getThoiTrangThemeKeys(group: ThoiTrangThemeGroupSetting = 'random'): readonly string[] {
  if (group === 'random') return THOI_TRANG_THEME_KEYS;
  return THOI_TRANG_THEME_KEYS_BY_GROUP[group] ?? THOI_TRANG_THEME_KEYS;
}

export function getThoiTrangThemeGroupMeta(id: ThoiTrangThemeGroupId): ThoiTrangThemeGroupMeta {
  return THOI_TRANG_THEME_GROUP_MAP[id];
}
