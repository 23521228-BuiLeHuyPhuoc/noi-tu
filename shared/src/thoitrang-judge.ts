/**
 * Giám khảo Máy tất định & giải thích được cho "Sàn Diễn Xóm Lầy" (`thoitrang`, thiết kế v4).
 * Thuần hàm (không phụ thuộc Three.js, không ngẫu nhiên): chấm 0–100đ → 1,0–5,0★ bước 0,5★ (`halfStars: 2..10`).
 * Phiếu Giám khảo Máy có trọng số bằng đúng 1 khán giả trong điểm trung bình.
 */
import {
  THOI_TRANG_MAX_HALF_STARS,
  THOI_TRANG_MIN_HALF_STARS,
  type ThoiTrangAccSubSlot,
  type ThoiTrangCatalogItem,
  type ThoiTrangCategoryId,
  type ThoiTrangJudgeParts,
  type ThoiTrangJudgeResult,
  type ThoiTrangMustHaveSlot,
  type ThoiTrangOutfit,
  type ThoiTrangPrimarySlotId,
  type ThoiTrangTag,
  type ThoiTrangTheme,
} from './thoitrang';
import {
  ACC_SUB,
  BASE_OUTFIT,
  DEFAULT_FACE,
  SLOTS,
  getItem,
  validateOutfit,
} from './thoitrang-catalog';

const PRIMARY_WEIGHT: Readonly<Record<'hair' | ThoiTrangPrimarySlotId, number>> = {
  dress: 3.0,
  top: 1.6,
  bottom: 1.6,
  outer: 1.2,
  shoes: 1.0,
  hair: 1.0,
  hat: 1.0,
  glasses: 0.8,
};

const ACC_SUB_WEIGHT: Readonly<Record<ThoiTrangAccSubSlot, number>> = {
  back: 1.0,
  handL: 0.9,
  chestProp: 0.9,
  tail: 0.8,
  handR: 0.7,
  hipBag: 0.7,
  neck: 0.6,
  ears: 0.5,
  head: 0.5,
};

const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x));

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.startsWith('#') ? hex.slice(1) : hex;
  const n = Number.parseInt(clean, 16);
  if (!Number.isFinite(n)) return [128, 128, 128];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Khoảng cách màu cảm nhận redmean chuẩn hóa về [0..1]. */
export function colorDist(hexA: string, hexB: string): number {
  const [r1, g1, b1] = hexToRgb(hexA);
  const [r2, g2, b2] = hexToRgb(hexB);
  const rMean = (r1 + r2) * 0.5;
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  const d = Math.sqrt(
    (2 + rMean / 256) * dr * dr +
    4 * dg * dg +
    (2 + (255 - rMean) / 256) * db * db,
  );
  return Math.min(1, d / 765);
}

function isNeutralHex(hex: string): boolean {
  const [r, g, b] = hexToRgb(hex);
  const hi = Math.max(r, g, b);
  const lo = Math.min(r, g, b);
  const luma = 0.299 * r + 0.587 * g + 0.114 * b;
  return hi - lo <= 22 && (luma <= 48 || luma >= 224);
}

/** Trả về nhóm sắc độ (0..11) hoặc -1 nếu là màu trung tính độ bão hòa thấp. */
function hueBucket(hex: string): number {
  const [r0, g0, b0] = hexToRgb(hex);
  const r = r0 / 255, g = g0 / 255, b = b0 / 255;
  const hi = Math.max(r, g, b), lo = Math.min(r, g, b), d = hi - lo;
  if (hi === 0 || d / hi < 0.16) return -1;
  let h = 0;
  if (hi === r) h = ((g - b) / d) % 6;
  else if (hi === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h = ((h * 60) + 360) % 360;
  return Math.floor(h / 30) % 12;
}

/** Kiểm tra trang phục có đáp ứng ô gợi ý `mustHave` của chủ đề hay không. */
export function hasMustHave(outfit: ThoiTrangOutfit, mustHave: ThoiTrangMustHaveSlot): boolean {
  if (
    mustHave === 'dress' || mustHave === 'top' || mustHave === 'bottom' ||
    mustHave === 'outer' || mustHave === 'shoes' || mustHave === 'hat' || mustHave === 'glasses'
  ) {
    return Boolean(outfit.slots[mustHave]);
  }
  const accs = outfit.acc ?? [];
  if (mustHave === 'acc') return accs.length > 0;
  if (mustHave === 'bag') {
    return accs.some((a) => ACC_SUB[a.id] === 'handR' || ACC_SUB[a.id] === 'hipBag' || a.id === 'backpack');
  }
  if (mustHave === 'back') {
    return accs.some((a) => ACC_SUB[a.id] === 'back') || outfit.slots.outer?.id === 'royal_cape';
  }
  if (mustHave === 'held') {
    return accs.some((a) => ACC_SUB[a.id] === 'handL' || ACC_SUB[a.id] === 'chestProp');
  }
  if (mustHave === 'necklace') return accs.some((a) => ACC_SUB[a.id] === 'neck');
  if (mustHave === 'earrings') return accs.some((a) => ACC_SUB[a.id] === 'ears' || ACC_SUB[a.id] === 'head');
  if (mustHave === 'tail') return accs.some((a) => ACC_SUB[a.id] === 'tail');
  if (mustHave === 'belt') return accs.length > 0 || Boolean(outfit.slots.outer);
  return false;
}

/** Kiểm tra trang phục có vẫn giữ nguyên bộ mặc định ban đầu (AFK chưa phối đồ) hay không. */
export function isDefaultOutfit(outfit: ThoiTrangOutfit): boolean {
  if ((outfit.acc ?? []).length > 0) return false;
  const s = outfit.slots;
  const keys = Object.keys(s).filter((k) => Boolean(s[k as ThoiTrangPrimarySlotId]));
  if (keys.length !== 3) return false;
  if (!s.top || !s.bottom || !s.shoes) return false;
  const bt = BASE_OUTFIT.slots.top!;
  const bb = BASE_OUTFIT.slots.bottom!;
  const bs = BASE_OUTFIT.slots.shoes!;
  return (
    outfit.hair.id === BASE_OUTFIT.hair.id &&
    outfit.hair.twoTone === 'none' &&
    s.top.id === bt.id && s.top.c === bt.c && s.top.p === bt.p &&
    s.bottom.id === bb.id && s.bottom.c === bb.c && s.bottom.p === bb.p &&
    s.shoes.id === bs.id && s.shoes.c === bs.c && s.shoes.p === bs.p
  );
}

function bestPaletteSim(hex: string, palette: readonly string[]): number {
  if (palette.length === 0) return 0.7;
  let minD = 1;
  for (const target of palette) {
    const d = colorDist(hex, target);
    if (d < minD) minD = d;
  }
  const sim = clamp(1 - minD / 0.42, 0, 1);
  return isNeutralHex(hex) ? Math.max(sim, 0.25) : sim;
}

function hasCustomFace(outfit: ThoiTrangOutfit): boolean {
  const f = outfit.face;
  return (
    f.eyes !== DEFAULT_FACE.eyes ||
    f.eyeColor !== DEFAULT_FACE.eyeColor ||
    f.brows !== DEFAULT_FACE.brows ||
    f.mouth !== DEFAULT_FACE.mouth ||
    f.lipColor !== DEFAULT_FACE.lipColor ||
    f.nose !== DEFAULT_FACE.nose ||
    f.blush !== DEFAULT_FACE.blush ||
    f.eyeliner !== DEFAULT_FACE.eyeliner ||
    f.eyeshadow !== DEFAULT_FACE.eyeshadow ||
    f.beautyMark !== DEFAULT_FACE.beautyMark ||
    f.beard !== DEFAULT_FACE.beard ||
    f.freckles !== DEFAULT_FACE.freckles ||
    f.expression !== DEFAULT_FACE.expression
  );
}

export function judgeOutfit(rawOutfit: ThoiTrangOutfit, theme: ThoiTrangTheme): ThoiTrangJudgeResult {
  const { outfit } = validateOutfit(rawOutfit);
  const themeTagSet = new Set<ThoiTrangTag>(theme.tags);
  const isLayLoi = themeTagSet.has('lay_loi');
  const isDefault = isDefaultOutfit(outfit);

  interface WornEntry {
    cat: ThoiTrangCategoryId;
    weight: number;
    item: ThoiTrangCatalogItem;
    c: string;
    c2: string;
    p: string;
  }

  const worn: WornEntry[] = [];
  const hairItem = getItem('hair', outfit.hair.id);
  if (hairItem) {
    worn.push({ cat: 'hair', weight: PRIMARY_WEIGHT.hair, item: hairItem, c: outfit.hair.c, c2: outfit.hair.c2, p: 'plain' });
  }

  for (const s of SLOTS) {
    const eq = outfit.slots[s.id];
    if (!eq) continue;
    const item = getItem(s.id, eq.id);
    if (!item) continue;
    worn.push({ cat: s.id, weight: PRIMARY_WEIGHT[s.id], item, c: eq.c, c2: eq.c2, p: eq.p });
  }

  for (const eq of outfit.acc) {
    const item = getItem('acc', eq.id);
    if (!item) continue;
    const w = item.subSlot ? ACC_SUB_WEIGHT[item.subSlot] : 0.6;
    worn.push({ cat: 'acc', weight: w, item, c: eq.c, c2: eq.c2, p: eq.p });
  }

  // 1. Khớp thẻ chủ đề (tối đa 42đ) + 2. Độ phủ thẻ gợi ý (tối đa 16đ)
  let weightedMatch = 0;
  let totalWeight = 0;
  let matchedCount = 0;
  const coveredTags = new Set<ThoiTrangTag>();

  for (const w of worn) {
    let hits = 0;
    for (const tag of w.item.tags) {
      if (themeTagSet.has(tag)) {
        hits += 1;
        coveredTags.add(tag);
      }
    }
    const credit = hits >= 2 ? 1.0 : hits === 1 ? 0.78 : 0;
    if (hits >= 1) matchedCount += 1;
    weightedMatch += w.weight * credit;
    totalWeight += w.weight;
  }

  const matchRatio = weightedMatch / Math.max(4.5, totalWeight);
  const themeMatch = Math.round(42 * Math.min(1, matchRatio));

  let tagCoverage = theme.tags.length > 0 ? Math.round(16 * (coveredTags.size / theme.tags.length)) : 16;
  if (theme.mustHave && hasMustHave(outfit, theme.mustHave)) {
    tagCoverage = Math.min(16, tagCoverage + 3);
  }

  // 3. Độ hợp tông màu (tối đa 20đ)
  let palWeighted = 0;
  let palWeightSum = 0;
  const wornGarments = worn.filter((w) => w.cat !== 'hair');
  for (const w of wornGarments) {
    palWeighted += w.weight * bestPaletteSim(w.c, theme.palette);
    palWeightSum += w.weight;
    if (w.item.c2Pal !== null && w.c2 && w.c2.toLowerCase() !== w.c.toLowerCase()) {
      const aw = w.weight * 0.35;
      palWeighted += aw * bestPaletteSim(w.c2, theme.palette);
      palWeightSum += aw;
    }
  }
  const palette = palWeightSum > 0 ? Math.round(20 * (palWeighted / palWeightSum)) : 0;

  // 4. Độ hoàn chỉnh bộ đồ (tối đa 14đ)
  const hasCoreBody = Boolean(outfit.slots.dress || (outfit.slots.top && outfit.slots.bottom));
  const hasPartialBody = Boolean(!hasCoreBody && (outfit.slots.top || outfit.slots.bottom));
  const hasShoes = Boolean(outfit.slots.shoes);
  const hasHair = Boolean(hairItem);
  const accCount =
    (outfit.slots.outer ? 1 : 0) +
    (outfit.slots.hat ? 1 : 0) +
    (outfit.slots.glasses ? 1 : 0) +
    outfit.acc.length;

  const completeness =
    (hasCoreBody ? 7 : hasPartialBody ? 3 : 0) +
    (hasShoes ? 3 : 0) +
    (hasHair ? 2 : 0) +
    (accCount >= 2 ? 2 : accCount === 1 ? 1 : 0);

  // 5. Sáng tạo & Chăm chút (tối đa 8đ)
  let styling = 0;
  if (!isDefault) {
    styling += 2; // đã thay đồ khỏi mặc định

    const accentUses = wornGarments.filter(
      (w) => w.item.c2Pal !== null && w.c2.toLowerCase() !== w.c.toLowerCase(),
    ).length;
    if (accentUses >= 2 || outfit.hair.twoTone !== 'none') styling += 2;

    const hasPattern = wornGarments.some((w) => w.p !== 'plain');
    if (hasPattern || outfit.hair.twoTone !== 'none' || hasCustomFace(outfit) || outfit.body !== BASE_OUTFIT.body) {
      styling += 2;
    }

    const hues = new Set<number>();
    for (const w of wornGarments) {
      const b = hueBucket(w.c);
      if (b >= 0) hues.add(b);
    }
    if (hues.size <= 4 || isLayLoi) styling += 2;
  }

  const parts: ThoiTrangJudgeParts = { themeMatch, tagCoverage, palette, completeness, styling };
  const total = clamp(themeMatch + tagCoverage + palette + completeness + styling, 0, 100);

  let halfStars = clamp(
    Math.round(THOI_TRANG_MIN_HALF_STARS + (total / 100) * (THOI_TRANG_MAX_HALF_STARS - THOI_TRANG_MIN_HALF_STARS)),
    THOI_TRANG_MIN_HALF_STARS,
    THOI_TRANG_MAX_HALF_STARS,
  );
  if (!hasCoreBody && !hasPartialBody) halfStars = Math.min(halfStars, 3); // trần 1,5★ nếu trống đồ chính
  if (isDefault) halfStars = Math.min(halfStars, 4); // trần 2,0★ nếu giữ nguyên đồ mặc định AFK

  // Nhận xét 1 dòng tiếng Việt
  const totalCount = worn.length;
  const p1 = isDefault
    ? `Lạc chủ đề ${matchedCount}/${totalCount} món · chưa đổi đồ mặc định`
    : !hasCoreBody && !hasPartialBody
      ? 'Thiếu trang phục chính'
      : matchedCount === 0
        ? `Lạc chủ đề 0/${totalCount} món`
        : matchedCount / Math.max(1, totalCount) >= 0.7
          ? `Hợp chủ đề ${matchedCount}/${totalCount} món`
          : `Khớp một phần ${matchedCount}/${totalCount} món`;

  const p2 = palette >= 15 ? 'chuẩn tông màu' : palette >= 9 ? 'khá đúng tông màu' : 'lệch tông màu';

  const p3 = isDefault
    ? ''
    : !hasShoes
      ? 'thiếu giày dép'
      : accCount === 0
        ? 'thiếu phụ kiện'
        : styling >= 7 && completeness >= 13
          ? 'phối hoạ tiết & phụ kiện xuất sắc'
          : accCount === 1
            ? 'thêm phụ kiện sẽ cháy hơn'
            : 'tổng thể gọn gàng';

  const reason = [p1, p2, p3].filter(Boolean).join(' · ');
  return { total, halfStars, parts, reason };
}
