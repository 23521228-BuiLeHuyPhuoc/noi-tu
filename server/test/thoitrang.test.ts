import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  THOI_TRANG_ALL_TAGS,
  THOI_TRANG_DEFAULT_DRESS_SEC,
  THOI_TRANG_DRESS_OPTIONS,
  THOI_TRANG_POSES,
  THOI_TRANG_RUNWAY_POSES,
  THOI_TRANG_THEME_GROUP_IDS,
  formatAvgStars,
  formatHalfStars,
  halfStarsToStars,
  runwaySecondsForPlayers,
  type ThoiTrangOutfit,
  type ThoiTrangPosePayload,
  type ThoiTrangScoreRow,
  type ThoiTrangView,
} from '../../shared/src/thoitrang';
import {
  ACC_SUB,
  ARCHETYPE_CATALOG,
  BASE_OUTFIT,
  CATALOG,
  DEFAULT_FACE,
  MEME_PRINTS,
  PALETTES,
  PATTERNS,
  cloneOutfit,
  countVariants,
  outfitHash,
  setSlot,
  toggleAcc,
  validateOutfit,
} from '../../shared/src/thoitrang-catalog';
import { colorDist, hasMustHave, isDefaultOutfit, judgeOutfit } from '../../shared/src/thoitrang-judge';
import {
  THOI_TRANG_DECK,
  THOI_TRANG_THEMES,
  THOI_TRANG_THEMES_BY_GROUP,
  THOI_TRANG_THEME_GROUPS,
  THOI_TRANG_THEME_KEYS,
  getThoiTrangTheme,
  getThoiTrangThemeKeys,
} from '../../shared/src/thoitrang-themes';
import type { GameResult } from '../../shared/src/types';
import { Dictionary } from '../src/dictionary';
import { FreshDeck } from '../src/freshDeck';
import type { EngineContext } from '../src/games/engine';
import { ThoiTrangGame, compareThoiTrangScores } from '../src/games/thoitrang';
import { Room } from '../src/room';
import { SMALL_WORDS } from './helpers';

function makePlayers(n: number) {
  return Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `Người ${i}` }));
}

function makeCtx(opts: {
  rng?: () => number;
  turnMs?: number;
  connected?: (id: string) => boolean;
  thoiTrangThemeGroup?: 'random' | (typeof THOI_TRANG_THEME_GROUP_IDS)[number];
  drawFresh?: (pool: string, keys: readonly string[]) => number;
} = {}) {
  let result: GameResult | null = null;
  let changes = 0;
  const poses: ThoiTrangPosePayload[] = [];
  const ctx: EngineContext = {
    rng: opts.rng ?? Math.random,
    dict: new Dictionary(SMALL_WORDS),
    settings: {
      ...(opts.thoiTrangThemeGroup ? { thoiTrangThemeGroup: opts.thoiTrangThemeGroup } : {}),
    },
    ...(opts.turnMs !== undefined ? { turnMs: opts.turnMs } : {}),
    hostId: () => 'p0',
    isConnected: opts.connected ?? (() => true),
    isBot: () => false,
    changed: () => { changes += 1; },
    emitThoiTrangPose: (p) => { poses.push(p); },
    finish: (r) => { result = r; },
    learnWord: () => {},
    ...(opts.drawFresh ? { drawFresh: opts.drawFresh } : {}),
  };
  return { ctx, getResult: () => result, getChanges: () => changes, poses };
}

describe('thoitrang shared constants & helpers', () => {
  it('uses approved dressing timer options, 11 v4 runway poses (no spin), and star formatters', () => {
    expect([...THOI_TRANG_DRESS_OPTIONS]).toEqual([120, 180, 240, 300, 420]);
    expect(THOI_TRANG_DEFAULT_DRESS_SEC).toBe(240);

    const allPoses: readonly string[] = THOI_TRANG_POSES;
    const runwayPoses: readonly string[] = THOI_TRANG_RUNWAY_POSES;
    expect(allPoses).toContain('idle');
    expect(allPoses).not.toContain('spin');
    expect(runwayPoses).toHaveLength(11);
    expect(runwayPoses).toEqual(expect.arrayContaining(['blow_kiss', 'superhero', 'selfie', 'shy_pose', 'dramatic']));
    expect(runwayPoses).not.toContain('idle');
    expect(runwayPoses).not.toContain('spin');

    expect(runwaySecondsForPlayers(2)).toBe(18);
    expect(runwaySecondsForPlayers(6)).toBe(18);
    expect(runwaySecondsForPlayers(7)).toBe(14);
    expect(runwaySecondsForPlayers(12)).toBe(14);
    expect(halfStarsToStars(9)).toBe(4.5);
    expect(formatHalfStars(9)).toBe('4,5');
    expect(formatAvgStars(4.5)).toBe('4,5');
  });
});

describe('thoitrang v6 unique-shape catalog & outfit validation', () => {
  it('exposes >= 640 100% unique 3D archetypes (zero recolor clones), 48 meme prints, >= 200M honest variants, valid palettes/patterns/subSlots, and balanced menswear/womenswear/lay_loi', () => {
    const stats = countVariants();
    const archetypeCount = Object.values(ARCHETYPE_CATALOG).reduce((s, list) => s + list.length, 0);
    expect(archetypeCount).toBeGreaterThanOrEqual(640);
    // Strict invariant: EVERY item in CATALOG is a unique 3D shape (ZERO recolor duplicates!)
    expect(stats.baseItems).toBe(archetypeCount);
    expect(stats.total).toBeGreaterThanOrEqual(200_000_000);
    expect(MEME_PRINTS.length).toBeGreaterThanOrEqual(49);
    expect(stats.bodyTypes).toBe(6);
    expect(stats.expressions).toBe(14);

    const validTagSet = new Set<string>(THOI_TRANG_ALL_TAGS);
    const validPatSet = new Set<string>(PATTERNS.map(([id]) => id));
    const paletteSets = {
      fashion: new Set<string>(PALETTES.fashion),
      hair: new Set<string>(PALETTES.hair),
      skin: new Set<string>(PALETTES.skin),
      eye: new Set<string>(PALETTES.eye),
      lip: new Set<string>(PALETTES.lip),
      shadow: new Set<string>(PALETTES.shadow),
    };

    let maleCount = 0;
    let femaleCount = 0;
    let layCount = 0;

    for (const [cat, items] of Object.entries(CATALOG)) {
      const seenIds = new Set<string>();
      for (const item of items) {
        expect(item.id.length, `${cat} id`).toBeGreaterThan(0);
        expect(seenIds.has(item.id), `duplicate id ${cat}:${item.id}`).toBe(false);
        seenIds.add(item.id);
        expect(item.iconKey, `${cat}:${item.id} must not reuse another iconKey`).toBeUndefined();
        expect(item.v3d, `${cat}:${item.id} must be a standalone unique 3D archetype`).toBeUndefined();
        expect(item.name.length, `${cat}:${item.id} name`).toBeGreaterThan(0);
        expect(item.tags.length, `${cat}:${item.id} tags`).toBeGreaterThanOrEqual(3);
        for (const tag of item.tags) expect(validTagSet.has(tag), `${cat}:${item.id}:${tag}`).toBe(true);
        const pal = paletteSets[item.cPal];
        expect(pal.has(item.c), `${cat}:${item.id} c=${item.c} not in ${item.cPal}`).toBe(true);
        expect(pal.has(item.c2), `${cat}:${item.id} c2=${item.c2} not in ${item.cPal}`).toBe(true);
        if (item.p) expect(validPatSet.has(item.p), `${cat}:${item.id} p=${item.p}`).toBe(true);
        if (cat === 'acc') {
          expect(item.subSlot, `acc:${item.id} subSlot`).toBeTruthy();
          expect(ACC_SUB[item.id], `ACC_SUB[${item.id}]`).toBe(item.subSlot);
        }
        if (item.group === 'nam') maleCount += 1;
        if (item.group === 'nu') femaleCount += 1;
        if (item.group === 'lay_loi' || item.tags.includes('lay_loi')) layCount += 1;
      }
    }

    expect(maleCount).toBeGreaterThanOrEqual(75);
    expect(femaleCount).toBeGreaterThanOrEqual(35);
    expect(layCount).toBeGreaterThanOrEqual(160);

    // Meme slogan customizer validation + outfitHash sensitivity
    const withTxt = setSlot(cloneOutfit(BASE_OUTFIT), 'top', { id: 'tee', c: '#ffffff', c2: '#15121b', p: 'plain', txt: 'flexing' });
    expect(withTxt.slots.top?.txt).toBe('flexing');
    expect(outfitHash(withTxt)).not.toBe(outfitHash(BASE_OUTFIT));
    const badTxt = setSlot(cloneOutfit(BASE_OUTFIT), 'top', { id: 'tee', c: '#ffffff', c2: '#15121b', p: 'plain', txt: 'invalid_meme_id' });
    expect(badTxt.slots.top?.txt).toBeUndefined();
  });

  it('sanitizes fields, enforces dress/top+bottom exclusivity, outer layering, acc sub-slots, and outfitHash', () => {
    const low = validateOutfit({ height: 0.5, body: 'invalid', skin: 'bad' });
    expect(low.outfit.height).toBe(0.85);
    expect(low.outfit.body).toBe('nu_manh');
    expect(low.outfit.skin).toBe(BASE_OUTFIT.skin);
    expect(validateOutfit({ body: 'male' }).outfit.body).toBe('nam_thu_sinh');

    const high = validateOutfit({
      height: 1.9,
      slots: {
        dress: { id: 'ballgown', c: '#c92a46', c2: '#ffd56b', p: 'sequin' },
        top: { id: 'tee', c: '#ffffff', c2: '#ff6b8b', p: 'plain' },
        outer: { id: 'royal_cape', c: '#781d32', c2: '#ffffff', p: 'plain' },
        hat: { id: 'nonexistent', c: '#000000', c2: '#000000', p: 'plain' },
      },
      acc: [
        { id: 'handbag', c: '#ff6b8b', c2: '#ffd56b', p: 'plain' },
        { id: 'clutch', c: '#2b2533', c2: '#ffd56b', p: 'plain' },
        { id: 'fairy_wings', c: '#c79bff', c2: '#ffb3c7', p: 'plain' },
      ],
    });
    expect(high.outfit.height).toBe(1.15);
    expect(high.outfit.slots.dress?.id).toBe('ballgown');
    expect(high.outfit.slots.top).toBeUndefined();
    expect(high.outfit.slots.outer?.id).toBe('royal_cape');
    expect(high.outfit.slots.hat).toBeUndefined();
    expect(high.outfit.acc.map((a) => a.id)).toEqual(['clutch', 'fairy_wings']);

    let outfit = setSlot(cloneOutfit(BASE_OUTFIT), 'dress', { id: 'aodai', c: '#ff6b8b', c2: '#ffffff', p: 'plain' });
    expect(outfit.slots.top).toBeUndefined();
    expect(outfit.slots.bottom).toBeUndefined();
    outfit = setSlot(outfit, 'outer', { id: 'blazer', c: '#2b2533', c2: '#ffffff', p: 'plain' });
    expect(outfit.slots.dress?.id).toBe('aodai');
    outfit = setSlot(outfit, 'top', { id: 'puff_blouse', c: '#ffb3c7', c2: '#ffffff', p: 'plain' });
    expect(outfit.slots.dress).toBeUndefined();
    expect(outfit.slots.outer?.id).toBe('blazer');

    outfit = toggleAcc(outfit, 'handbag');
    outfit = toggleAcc(outfit, 'phone');
    expect(outfit.acc.map((a) => a.id)).toEqual(['handbag', 'phone']);
    outfit = toggleAcc(outfit, 'handbag');
    expect(outfit.acc.map((a) => a.id)).toEqual(['phone']);

    const h1 = outfitHash(outfit);
    expect(h1).toBe(outfitHash(cloneOutfit(outfit)));
    expect(outfitHash(setSlot(outfit, 'shoes', null))).not.toBe(h1);
  });
});

describe('thoitrang machine judge (judgeOutfit)', () => {
  const metGala = getThoiTrangTheme('dt_met_gala')!;
  const makeExcellent = (): ThoiTrangOutfit => ({
    ...cloneOutfit(BASE_OUTFIT),
    face: { ...DEFAULT_FACE, expression: 'confident', eyeshadow: 'glitter' },
    hair: { id: 'elegant_bun', c: '#1b1518', c2: '#e8c47a', twoTone: 'tips' },
    slots: {
      dress: { id: 'ballgown', c: '#781d32', c2: '#ffd56b', p: 'sequin' },
      outer: { id: 'royal_cape', c: '#15121b', c2: '#ffd56b', p: 'plain' },
      shoes: { id: 'stiletto', c: '#15121b', c2: '#ffd56b', p: 'plain' },
      hat: { id: 'crown', c: '#ffd56b', c2: '#c92a46', p: 'plain' },
    },
    acc: [
      { id: 'pearls', c: '#ffffff', c2: '#ffd56b', p: 'plain' },
      { id: 'clutch', c: '#15121b', c2: '#ffd56b', p: 'plain' },
    ],
  });
  const makeMid = (): ThoiTrangOutfit => ({
    ...cloneOutfit(BASE_OUTFIT),
    hair: { id: 'bob', c: '#33211b', c2: '#ff9ec4', twoTone: 'none' },
    slots: {
      top: { id: 'blouse', c: '#ffffff', c2: '#ffffff', p: 'plain' },
      bottom: { id: 'pencil_skirt', c: '#15121b', c2: '#15121b', p: 'plain' },
      shoes: { id: 'sneaker', c: '#5fd3a6', c2: '#ffffff', p: 'plain' },
    },
    acc: [{ id: 'backpack', c: '#2f6fd6', c2: '#2f6fd6', p: 'plain' }],
  });
  const makeOffTheme = (): ThoiTrangOutfit => ({
    ...cloneOutfit(BASE_OUTFIT),
    hair: { id: 'high_ponytail', c: '#1b1518', c2: '#e85f8c', twoTone: 'none' },
    slots: {
      top: { id: 'tank_sport', c: '#5fd3a6', c2: '#6ec6ff', p: 'plain' },
      bottom: { id: 'shorts', c: '#6ec6ff', c2: '#5fd3a6', p: 'plain' },
      shoes: { id: 'sneaker', c: '#5fd3a6', c2: '#6ec6ff', p: 'plain' },
      hat: { id: 'cap', c: '#6ec6ff', c2: '#5fd3a6', p: 'plain' },
    },
    acc: [],
  });

  it('is deterministic across 3 worked tiers, handles mustHave mapping, and caps AFK/empty outfits', () => {
    const a1 = judgeOutfit(makeExcellent(), metGala);
    expect(a1).toEqual(judgeOutfit(makeExcellent(), metGala));
    expect(a1.halfStars).toBeGreaterThanOrEqual(9);
    expect(a1.parts.tagCoverage).toBe(16);
    expect(a1.parts.completeness).toBe(14);
    expect(a1.reason).toContain('Hợp chủ đề');
    expect(hasMustHave(makeExcellent(), 'back')).toBe(true);
    expect(hasMustHave(makeExcellent(), 'bag')).toBe(true);

    const mid = judgeOutfit(makeMid(), metGala);
    expect(mid.halfStars).toBeGreaterThanOrEqual(5);
    expect(mid.halfStars).toBeLessThan(a1.halfStars);

    const off = judgeOutfit(makeOffTheme(), metGala);
    expect(off.parts.themeMatch).toBe(0);
    expect(off.halfStars).toBeLessThanOrEqual(4);
    expect(off.halfStars).toBeLessThan(mid.halfStars);

    expect(isDefaultOutfit(BASE_OUTFIT)).toBe(true);
    expect(judgeOutfit(BASE_OUTFIT, metGala).halfStars).toBeLessThanOrEqual(4);
    expect(judgeOutfit({ ...cloneOutfit(BASE_OUTFIT), slots: {}, acc: [] }, metGala).halfStars).toBeLessThanOrEqual(3);
    expect(colorDist('#000000', '#000000')).toBe(0);
    expect(colorDist('#000000', '#ffffff')).toBeGreaterThan(0.9);
  });
});

describe('thoitrang theme bank', () => {
  it('provides >= 628 unique themes with >= 12 matching items over >= 4 slots each', () => {
    expect(THOI_TRANG_DECK).toBe('thoitrang_themes');
    expect(THOI_TRANG_THEMES.length).toBeGreaterThanOrEqual(628);
    expect(THOI_TRANG_THEME_KEYS.length).toBe(THOI_TRANG_THEMES.length);
    expect(THOI_TRANG_THEME_GROUPS.length).toBe(16);
    for (const g of THOI_TRANG_THEME_GROUP_IDS) expect(THOI_TRANG_THEMES_BY_GROUP[g].length).toBeGreaterThanOrEqual(30);

    const ids = new Set<string>();
    const titles = new Set<string>();
    const coverageViolations: string[] = [];

    for (const t of THOI_TRANG_THEMES) {
      expect(ids.has(t.id)).toBe(false);
      ids.add(t.id);
      const normTitle = t.title.trim().toLowerCase();
      expect(titles.has(normTitle), t.id).toBe(false);
      titles.add(normTitle);
      expect(t.tags.length).toBeGreaterThanOrEqual(3);
      expect(t.palette.length).toBeGreaterThanOrEqual(3);

      const tSet = new Set<string>(t.tags);
      let count = 0;
      const slots = new Set<string>();
      for (const [cat, items] of Object.entries(CATALOG)) {
        for (const item of items) {
          if (!item.excluded && item.tags.some((tag) => tSet.has(tag))) {
            count += 1;
            slots.add(cat);
          }
        }
      }
      if (count < 12 || slots.size < 4) coverageViolations.push(`${t.id}:${count}/${slots.size}`);
    }
    expect(coverageViolations).toEqual([]);
    expect(getThoiTrangThemeKeys('random').length).toBe(THOI_TRANG_THEMES.length);
  });
});

describe('ThoiTrangGame server engine & Room flow', () => {
  afterEach(() => { vi.useRealTimers(); });

  it('runs 4 phases, coalesces outfits, shortens on ready, blocks self-rating, hides scores until reveal, and counts judge once', () => {
    vi.useFakeTimers();
    const { ctx, getResult, getChanges, poses } = makeCtx();
    const game = new ThoiTrangGame(ctx);
    game.start(makePlayers(3));

    expect(game.view('p0').phase).toBe('theme_reveal');
    expect(game.view('p0').scores).toBeNull();
    vi.advanceTimersByTime(6_000);
    expect(game.view('p0').phase).toBe('dressing');
    expect(game.view('p0').phaseSeconds).toBe(240);

    const cBefore = getChanges();
    const custom = setSlot(cloneOutfit(BASE_OUTFIT), 'hat', { id: 'crown', c: '#ffd56b', c2: '#c92a46', p: 'plain' });
    expect(game.action('p0', { type: 'tt_outfit', outfit: custom })).toEqual({ ok: true });
    expect(game.action('p0', { type: 'tt_outfit', outfit: custom })).toEqual({ ok: true });
    expect(getChanges()).toBe(cBefore);
    vi.advanceTimersByTime(500);
    expect(getChanges()).toBe(cBefore + 1);
    expect(game.view('p1').outfits.p0.slots.hat?.id).toBe('crown');

    expect(game.action('p0', { type: 'tt_ready', ready: true })).toEqual({ ok: true });
    expect(game.action('p1', { type: 'tt_ready', ready: true })).toEqual({ ok: true });
    expect(game.view('p0').phase).toBe('dressing');
    expect(game.action('p2', { type: 'tt_ready', ready: true })).toEqual({ ok: true });
    vi.advanceTimersByTime(5_000);
    expect(game.view('p0').phase).toBe('runway');

    const w0 = game.view('p0').walkerId!;
    const others = ['p0', 'p1', 'p2'].filter((id) => id !== w0);
    expect(game.action(others[0], { type: 'tt_pose', pose: 'blow_kiss' })).toEqual({ ok: false, reason: 'not_your_turn' });
    expect(game.action(w0, { type: 'tt_pose', pose: 'blow_kiss' })).toEqual({ ok: true });
    expect(game.action(w0, { type: 'tt_pose', pose: 'shy_pose' })).toEqual({ ok: true });
    expect(poses.filter((p) => p.kind === 'pose')).toHaveLength(1);
    expect(game.action(w0, { type: 'tt_cheer', cheer: '🔥' })).toEqual({ ok: false, reason: 'bad_action' });
    expect(game.action(others[0], { type: 'tt_cheer', cheer: '🔥' })).toEqual({ ok: true });
    expect(poses.some((p) => p.kind === 'cheer')).toBe(true);

    expect(game.action(w0, { type: 'tt_rate', halfStars: 10 })).toEqual({ ok: false, reason: 'bad_action' });
    expect(game.action(others[0], { type: 'tt_rate', halfStars: 4.5 })).toEqual({ ok: false, reason: 'bad_action' });
    expect(game.action(others[0], { type: 'tt_rate', halfStars: 6 })).toEqual({ ok: true });
    expect(game.action(others[0], { type: 'tt_rate', halfStars: 10 })).toEqual({ ok: true });
    expect(game.action(others[1], { type: 'tt_rate', halfStars: 8 })).toEqual({ ok: true });

    const vMid = game.view(others[0]);
    expect(vMid.myRating).toBe(10);
    expect(vMid.scores).toBeNull();
    expect(vMid.ratedBy).toHaveLength(2);
    expect(game.view(w0).myRating).toBeNull();

    vi.advanceTimersByTime(9_000);
    expect(game.view('p0').walkerId).not.toBe(w0);

    vi.advanceTimersByTime(36_000);
    const vRev = game.view('p0');
    expect(vRev.phase).toBe('reveal');
    expect(vRev.scores).toHaveLength(3);
    const w0Score = vRev.scores!.find((r) => r.playerId === w0)!;
    expect(w0Score.humanVoterCount).toBe(2);
    expect(w0Score.voterCount).toBe(3);
    expect(w0Score.finalAvg).toBeCloseTo((18 + w0Score.machineHalfStars) / 2 / 3, 6);

    expect(game.action('p0', { type: 'tt_skip_reveal' })).toEqual({ ok: true });
    expect(getResult()?.ranking).toHaveLength(3);
  });

  it('enforces 5-level tie-break and awards co-winners on full tie', () => {
    vi.useFakeTimers();
    const row = (over: Partial<ThoiTrangScoreRow>): ThoiTrangScoreRow => ({
      playerId: 'a', name: 'A', rank: 1, totalHalfStars: 16, voterCount: 2, finalAvg: 4,
      humanAvg: 4, humanVoterCount: 1, machineHalfStars: 8, machineReason: '',
      fiveStarCount: 0, medianHalfStars: 8, oneStarCount: 0, ...over,
    });
    expect(compareThoiTrangScores(row({ fiveStarCount: 2 }), row({ fiveStarCount: 1 }))).toBeLessThan(0);
    expect(compareThoiTrangScores(row({ medianHalfStars: 9 }), row({ medianHalfStars: 8 }))).toBeLessThan(0);
    expect(compareThoiTrangScores(row({ oneStarCount: 0 }), row({ oneStarCount: 1 }))).toBeLessThan(0);
    expect(compareThoiTrangScores(row({ playerId: 'a' }), row({ playerId: 'b' }))).toBe(0);

    const { ctx, getResult } = makeCtx({ turnMs: 500 });
    const game = new ThoiTrangGame(ctx);
    game.start(makePlayers(2));
    vi.advanceTimersByTime(500);
    game.action('p0', { type: 'tt_ready', ready: true });
    game.action('p1', { type: 'tt_ready', ready: true });
    vi.advanceTimersByTime(300);
    for (let i = 0; i < 2; i++) {
      const w = game.view('p0').walkerId!;
      game.action(w === 'p0' ? 'p1' : 'p0', { type: 'tt_rate', halfStars: 8 });
      vi.advanceTimersByTime(550);
    }
    vi.advanceTimersByTime(600);
    expect(getResult()?.winnerIds).toHaveLength(2);
    expect(getResult()?.headline).toContain('Đồng Quán quân');
  });

  it('excludes AFK voters from average and advances cleanly when walker leaves mid-runway', () => {
    vi.useFakeTimers();
    const connected = new Set(['p0', 'p1']);
    const { ctx, getResult } = makeCtx({ connected: (id) => connected.has(id) });
    const game = new ThoiTrangGame(ctx);
    game.start(makePlayers(3));
    vi.advanceTimersByTime(6_000);

    game.action('p0', { type: 'tt_ready', ready: true });
    game.action('p1', { type: 'tt_ready', ready: true });
    vi.advanceTimersByTime(5_000);
    const w0 = game.view('p0').walkerId!;
    game.action(['p0', 'p1'].find((id) => id !== w0)!, { type: 'tt_rate', halfStars: 10 });
    vi.advanceTimersByTime(18_000);

    const w1 = game.view('p0').walkerId!;
    expect(w1).not.toBe(w0);
    game.removePlayer(w1);
    expect(game.view('p0').walkerId).not.toBe(w1);

    vi.advanceTimersByTime(19_000);
    const rev = game.view('p0');
    expect(rev.phase).toBe('reveal');
    expect(rev.scores?.some((r) => r.playerId === w1)).toBe(false);
    const row0 = rev.scores!.find((r) => r.playerId === w0)!;
    expect(row0.humanVoterCount).toBe(1);
    expect(row0.voterCount).toBe(2);
    for (const id of ['p0', 'p1'].filter((pid) => pid !== w1)) game.action(id, { type: 'tt_skip_reveal' });
    expect(getResult()?.ranking).toHaveLength(2);
  });

  it('wires Room settings, bots dressing via judge + posing + rating, and FreshDeck non-repeat', () => {
    vi.useFakeTimers();
    const poses: ThoiTrangPosePayload[] = [];
    const room = new Room('TTTEST', new Dictionary(SMALL_WORDS), {
      turnMs: 600,
      onThoiTrangPose: (_r, p) => poses.push(p),
    });
    const host = room.addPlayer('Chủ xóm');
    expect(host.ok).toBe(true);
    if (!host.ok) return;
    const hostId = host.playerId;

    expect(room.configure(hostId, 'thoitrang', { thoiTrangDressSec: 180, thoiTrangThemeGroup: 'viet_nam' })).toEqual({ ok: true });
    expect(room.configure(hostId, 'thoitrang', { thoiTrangDressSec: 99 as never })).toEqual({ ok: false, error: 'bad_request' });
    expect(room.configure(hostId, 'thoitrang', { thoiTrangThemeGroup: 'nope' as never })).toEqual({ ok: false, error: 'bad_request' });

    const b1 = room.addBot(hostId);
    const b2 = room.addBot(hostId);
    expect(b1.ok && b2.ok).toBe(true);
    expect(room.start(hostId)).toEqual({ ok: true });

    const botIds = room.players.filter((p) => p.bot).map((p) => p.id);
    expect((room.toPublic(hostId).game as ThoiTrangView).theme.group).toBe('viet_nam');

    let finalOutfits: Record<string, ThoiTrangOutfit> = {};
    for (let i = 0; i < 80 && room.phase === 'playing'; i++) {
      vi.advanceTimersByTime(150);
      const gv = room.toPublic(hostId).game as ThoiTrangView | null;
      if (gv) finalOutfits = gv.outfits;
    }
    expect(room.phase).toBe('finished');
    for (const bid of botIds) expect(isDefaultOutfit(finalOutfits[bid])).toBe(false);
    expect(poses.some((p) => p.kind === 'pose')).toBe(true);

    const deck = new FreshDeck();
    const seenThemes = new Set<string>();
    for (let i = 0; i < 5; i++) {
      const { ctx } = makeCtx({ thoiTrangThemeGroup: 'viet_nam', drawFresh: (pool, keys) => deck.draw(pool, keys) });
      const g = new ThoiTrangGame(ctx);
      g.start(makePlayers(2));
      const t = g.view('p0').theme;
      expect(t.group).toBe('viet_nam');
      expect(seenThemes.has(t.id)).toBe(false);
      seenThemes.add(t.id);
      g.dispose();
    }
  });
});
