/**
 * Hàm phụ trợ cho server game "Sàn Diễn Xóm Lầy" (`thoitrang`):
 * - Xếp hạng & so sánh hòa 5 tầng (`compareThoiTrangScores`, `computeThoiTrangScores`)
 * - Lập kế hoạch phối đồ v4 cho Bot (`buildBotDressPlan`) phủ đầy đủ 6 dáng, khuôn mặt, biểu cảm, áo khoác & phụ kiện.
 */
import {
  THOI_TRANG_MAX_HALF_STARS,
  THOI_TRANG_MIN_HALF_STARS,
  type ThoiTrangAccSubSlot,
  type ThoiTrangBeardStyle,
  type ThoiTrangBodyType,
  type ThoiTrangBrowShape,
  type ThoiTrangCatalogItem,
  type ThoiTrangCategoryId,
  type ThoiTrangEquippedItem,
  type ThoiTrangExpressionId,
  type ThoiTrangFace,
  type ThoiTrangHairTwoTone,
  type ThoiTrangJudgeResult,
  type ThoiTrangMustHaveSlot,
  type ThoiTrangOutfit,
  type ThoiTrangPatternId,
  type ThoiTrangPrimarySlotId,
  type ThoiTrangScoreRow,
  type ThoiTrangTheme,
} from '../../../shared/src/thoitrang';
import {
  ACC_SUB,
  BASE_OUTFIT,
  BODY_DEFAULTS,
  BODY_TYPES,
  CATALOG,
  DEFAULT_FACE,
  FACE_OPTS,
  PALETTES,
  PATTERNS,
  cloneOutfit,
  validateOutfit,
} from '../../../shared/src/thoitrang-catalog';
import { colorDist, judgeOutfit } from '../../../shared/src/thoitrang-judge';
import type { Rng } from '../dictionary';

export interface BotDressPlan {
  step1: ThoiTrangOutfit;
  final: ThoiTrangOutfit;
  step: 0 | 1 | 2 | 3;
}

/** So sánh thứ hạng 5 tầng (trả < 0 nếu a đứng trước b). */
export function compareThoiTrangScores(a: ThoiTrangScoreRow, b: ThoiTrangScoreRow): number {
  const avgDiff = b.totalHalfStars * a.voterCount - a.totalHalfStars * b.voterCount;
  if (avgDiff !== 0) return avgDiff;
  if (b.fiveStarCount !== a.fiveStarCount) return b.fiveStarCount - a.fiveStarCount;
  if (b.medianHalfStars !== a.medianHalfStars) return b.medianHalfStars - a.medianHalfStars;
  if (a.oneStarCount !== b.oneStarCount) return a.oneStarCount - b.oneStarCount;
  return 0;
}

function medianOf(nums: readonly number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function computeThoiTrangScores(
  order: readonly string[],
  active: ReadonlySet<string>,
  names: ReadonlyMap<string, string>,
  outfits: ReadonlyMap<string, ThoiTrangOutfit>,
  machineScores: ReadonlyMap<string, ThoiTrangJudgeResult>,
  ratings: ReadonlyMap<string, ReadonlyMap<string, number>>,
  theme: ThoiTrangTheme,
): ThoiTrangScoreRow[] {
  const rows: ThoiTrangScoreRow[] = [];
  for (const id of order) {
    if (!active.has(id)) continue;
    const outfit = outfits.get(id) ?? cloneOutfit(BASE_OUTFIT);
    const machine = machineScores.get(id) ?? judgeOutfit(outfit, theme);
    const humanMap = ratings.get(id);
    const humanVotes: number[] = [];
    if (humanMap) {
      for (const [voterId, hs] of humanMap) {
        if (voterId !== id) humanVotes.push(hs);
      }
    }
    const allVotes = [...humanVotes, machine.halfStars];
    const totalHalfStars = allVotes.reduce((s, v) => s + v, 0);
    const voterCount = allVotes.length;
    const humanVoterCount = humanVotes.length;
    const humanSum = humanVotes.reduce((s, v) => s + v, 0);

    rows.push({
      playerId: id,
      name: names.get(id) ?? id,
      rank: 1,
      totalHalfStars,
      voterCount,
      finalAvg: totalHalfStars / 2 / voterCount,
      humanAvg: humanVoterCount > 0 ? humanSum / 2 / humanVoterCount : null,
      humanVoterCount,
      machineHalfStars: machine.halfStars,
      machineReason: machine.reason,
      fiveStarCount: allVotes.filter((v) => v === THOI_TRANG_MAX_HALF_STARS).length,
      medianHalfStars: medianOf(allVotes),
      oneStarCount: allVotes.filter((v) => v === THOI_TRANG_MIN_HALF_STARS).length,
    });
  }

  rows.sort(compareThoiTrangScores);
  for (let i = 0; i < rows.length; i++) {
    rows[i].rank = i === 0 ? 1 : compareThoiTrangScores(rows[i - 1], rows[i]) === 0 ? rows[i - 1].rank : i + 1;
  }
  return rows;
}

export function pickFrom<T>(list: readonly T[], rng: Rng): T {
  return list[Math.min(list.length - 1, Math.floor(rng() * list.length))];
}

function closestPaletteHex(targets: readonly string[], pool: readonly string[], rng: Rng): string {
  if (targets.length === 0) return pickFrom(pool, rng);
  const scored = pool.map((hex) => ({
    hex,
    dist: Math.min(...targets.map((t) => colorDist(hex, t))),
  })).sort((a, b) => a.dist - b.dist);
  return pickFrom(scored.slice(0, Math.min(4, scored.length)), rng).hex;
}

function pickCatalogItem(
  rawList: readonly ThoiTrangCatalogItem[],
  theme: ThoiTrangTheme,
  rng: Rng,
  allowUnmatched: boolean,
): ThoiTrangCatalogItem | null {
  const themeTags = new Set<string>(theme.tags);
  const matched = rawList.filter((it) => !it.excluded && it.tags.some((t) => themeTags.has(t)));
  const pool = matched.length > 0 ? matched : allowUnmatched ? rawList.filter((it) => !it.excluded) : [];
  if (pool.length === 0) return null;
  matched.sort((a, b) =>
    b.tags.filter((t) => themeTags.has(t)).length - a.tags.filter((t) => themeTags.has(t)).length,
  );
  return pickFrom(matched.length > 0 ? matched.slice(0, Math.min(5, matched.length)) : pool, rng);
}

function equipItem(item: ThoiTrangCatalogItem, theme: ThoiTrangTheme, rng: Rng): ThoiTrangEquippedItem {
  const c = closestPaletteHex(theme.palette, PALETTES[item.cPal], rng);
  const c2 = item.c2Pal ? closestPaletteHex(theme.palette, PALETTES[item.c2Pal], rng) : item.c2;
  const p: ThoiTrangPatternId = item.pat && rng() < 0.35 ? pickFrom(PATTERNS, rng)[0] : 'plain';
  return { id: item.id, c, c2, p };
}

function buildEquipped(
  cat: ThoiTrangCategoryId,
  theme: ThoiTrangTheme,
  rng: Rng,
  allowUnmatched: boolean,
): ThoiTrangEquippedItem | null {
  const item = pickCatalogItem(CATALOG[cat], theme, rng, allowUnmatched);
  return item ? equipItem(item, theme, rng) : null;
}

function mustHaveAccSubs(mustHave?: ThoiTrangMustHaveSlot): ThoiTrangAccSubSlot[] {
  if (mustHave === 'bag') return ['handR', 'hipBag'];
  if (mustHave === 'back') return ['back'];
  if (mustHave === 'held') return ['handL', 'chestProp'];
  if (mustHave === 'necklace') return ['neck'];
  if (mustHave === 'earrings') return ['ears', 'head'];
  if (mustHave === 'tail') return ['tail'];
  return [];
}

function buildBotFace(body: ThoiTrangBodyType, theme: ThoiTrangTheme, rng: Rng): ThoiTrangFace {
  const bd = BODY_DEFAULTS[body];
  const isMale = body === 'nam_thu_sinh' || body === 'nam_vam_vo';
  const tags = new Set<string>(theme.tags);
  const exprPool: readonly ThoiTrangExpressionId[] = tags.has('lay_loi')
    ? ['grin', 'blep', 'wink', 'surprised']
    : tags.has('kinh_di') || tags.has('bi_an') || tags.has('scifi')
      ? ['cool', 'confident', 'neutral']
      : tags.has('de_thuong') || tags.has('ngot_ngao')
        ? ['happy', 'wink', 'shy', 'kiss']
        : ['neutral', 'happy', 'confident', 'wink', 'cool'];

  const maleBrows: readonly ThoiTrangBrowShape[] = ['straight', 'thick', 'sharp', 'slit'];
  const beards: readonly ThoiTrangBeardStyle[] = ['stubble', 'moustache', 'goatee', 'full_beard'];
  return {
    ...DEFAULT_FACE,
    eyes: rng() < 0.45 ? bd.eyes : pickFrom(FACE_OPTS.eyes, rng)[0],
    eyeColor: pickFrom(PALETTES.eye, rng),
    brows: isMale ? pickFrom(maleBrows, rng) : (rng() < 0.5 ? bd.brows : pickFrom(FACE_OPTS.brows, rng)[0]),
    mouth: pickFrom(FACE_OPTS.mouths, rng)[0],
    lipColor: isMale ? PALETTES.lip[7] : pickFrom(PALETTES.lip, rng),
    nose: bd.nose,
    blush: isMale ? 'none' : (rng() < 0.5 ? bd.blush : pickFrom(FACE_OPTS.blush, rng)[0]),
    eyeliner: isMale ? 'none' : (rng() < 0.5 ? bd.eyeliner : pickFrom(FACE_OPTS.eyeliner, rng)[0]),
    eyeshadow: isMale ? 'none' : (rng() < 0.4 ? pickFrom(FACE_OPTS.eyeshadow, rng)[0] : 'none'),
    eyeshadowColor: closestPaletteHex(theme.palette, PALETTES.shadow, rng),
    beautyMark: rng() < 0.25 ? pickFrom(FACE_OPTS.beautyMark, rng)[0] : 'none',
    beard: isMale && rng() < 0.35 ? pickFrom(beards, rng) : 'none',
    freckles: rng() < 0.2,
    expression: pickFrom(exprPool, rng),
  };
}

export function buildBotOutfitCandidate(theme: ThoiTrangTheme, rng: Rng): ThoiTrangOutfit {
  const body: ThoiTrangBodyType = pickFrom(BODY_TYPES, rng)[0];
  const skin = pickFrom(PALETTES.skin, rng);
  const height = Math.round((0.92 + rng() * 0.16) * 100) / 100;
  const face = buildBotFace(body, theme, rng);
  const hairItem = pickCatalogItem(CATALOG.hair, theme, rng, true)!;
  const hairC = closestPaletteHex(theme.palette, PALETTES.hair, rng);
  const hairC2 = pickFrom(PALETTES.hair, rng);
  const twoTone: ThoiTrangHairTwoTone = rng() < 0.3 ? (rng() < 0.5 ? 'tips' : 'streaks') : 'none';

  const slots: Partial<Record<ThoiTrangPrimarySlotId, ThoiTrangEquippedItem>> = {};
  const hasMatchingDress = CATALOG.dress.some((it) => !it.excluded && it.tags.some((t) => theme.tags.includes(t)));
  const useDress = theme.mustHave === 'dress' || (hasMatchingDress && rng() < 0.42);
  if (useDress) {
    const d = buildEquipped('dress', theme, rng, true);
    if (d) slots.dress = d;
  } else {
    const t = buildEquipped('top', theme, rng, true);
    const b = buildEquipped('bottom', theme, rng, true);
    if (t) slots.top = t;
    if (b) slots.bottom = b;
  }
  const shoes = buildEquipped('shoes', theme, rng, true);
  if (shoes) slots.shoes = shoes;

  const bulkyDress = slots.dress && new Set([
    'hanfu_gown', 'wedding_gown', 'ballgown', 'gothic_lolita', 'pirate_dress', 'onesie', 'cyber_suit',
  ]).has(slots.dress.id);
  if (theme.mustHave === 'outer' || (!bulkyDress && rng() < 0.48)) {
    const outer = buildEquipped('outer', theme, rng, theme.mustHave === 'outer');
    if (outer && (!bulkyDress || outer.id === 'royal_cape')) slots.outer = outer;
  }
  if (theme.mustHave === 'hat' || rng() < 0.45) {
    const hat = buildEquipped('hat', theme, rng, theme.mustHave === 'hat');
    if (hat) slots.hat = hat;
  }
  if (theme.mustHave === 'glasses' || rng() < 0.35) {
    const glasses = buildEquipped('glasses', theme, rng, theme.mustHave === 'glasses');
    if (glasses) slots.glasses = glasses;
  }

  const acc: ThoiTrangEquippedItem[] = [];
  const usedSubs = new Set<ThoiTrangAccSubSlot>();
  const reqSubs = mustHaveAccSubs(theme.mustHave);
  if (reqSubs.length > 0) {
    const reqList = CATALOG.acc.filter((it) => it.subSlot && reqSubs.includes(it.subSlot));
    const picked = pickCatalogItem(reqList, theme, rng, true);
    if (picked && picked.subSlot) {
      acc.push(equipItem(picked, theme, rng));
      usedSubs.add(picked.subSlot);
    }
  }

  const subOrder: readonly ThoiTrangAccSubSlot[] = ['handL', 'back', 'handR', 'hipBag', 'neck', 'tail', 'ears', 'head', 'chestProp'];
  for (const sub of subOrder) {
    if (usedSubs.has(sub) || acc.length >= 3) continue;
    if (rng() < 0.38) {
      const subItems = CATALOG.acc.filter((it) => it.subSlot === sub);
      const picked = pickCatalogItem(subItems, theme, rng, false);
      if (picked && ACC_SUB[picked.id]) {
        acc.push(equipItem(picked, theme, rng));
        usedSubs.add(sub);
      }
    }
  }

  return validateOutfit({
    body,
    skin,
    height,
    face,
    hair: { id: hairItem.id, c: hairC, c2: hairC2, twoTone },
    slots,
    acc,
  }).outfit;
}

export function buildBotDressPlan(theme: ThoiTrangTheme, rng: Rng): BotDressPlan {
  const candidates = Array.from({ length: 5 }, () => buildBotOutfitCandidate(theme, rng))
    .map((cand) => ({ cand, total: judgeOutfit(cand, theme).total }))
    .sort((a, b) => b.total - a.total);
  const chosen = candidates[candidates.length > 1 && rng() < 0.35 ? 1 : 0].cand;
  const step1 = cloneOutfit(chosen);
  delete step1.slots.outer;
  delete step1.slots.hat;
  delete step1.slots.glasses;
  step1.acc = [];
  return { step1, final: chosen, step: 0 };
}
