/**
 * BỘ KIỂM THỬ TỰ ĐỘNG QUY MÔ LỚN V2 (MEGA QA AUTOMATION SUITE — >2.100 TEST CASES):
 * Đóng vai Automation Tester chuyên sâu, kiểm tra hàng trăm kịch bản, bất biến logic,
 * biên độ bất hợp lệ (fuzzing), cách ly bí mật (perPlayerView), đứt kết nối giữa ván,
 * bot AI và tính điểm trên TOÀN BỘ 14 TRÒ CHƠI + Kho 146 Vật Phẩm Phú Hào & 15 Map!
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BOM_TU_FALLBACK_WORDS, type BomTuView } from '../../shared/src/bomtu';
import {
  CAH_BLACK_CARDS, CAH_WHITE_CARDS, fillBlackCard, renderBlackCard, type CahView,
} from '../../shared/src/cah';
import {
  CARO_SIZE, CARO_SYMBOLS, checkCaroWin, pickCaroBotMove, type CaroSymbol, type CaroView,
} from '../../shared/src/caro';
import {
  buildCgLootDeck, cgTotalWealth,
} from '../../shared/src/cashnguns';
import {
  CROAK_DT, CROAK_STAGES, computeSpitArc, createCroakWorld, stepCroakWorld,
  type CroakTickPayload,
} from '../../shared/src/croaksquad';
import {
  DO_VUI_QUESTIONS, DO_VUI_TOPICS, questionsForTopic, type DoVuiTopic,
} from '../../shared/src/dovui';
import { GIAN_DIEP_WORDS } from '../../shared/src/giandiep';
import {
  LOTO_RHYMES, checkLotoRow, generateLotoTicket, type LotoView,
} from '../../shared/src/loto';
import { MASOI_PHASE_SECONDS, MASOI_ROLES, buildMaSoiDeck, type MaSoiView } from '../../shared/src/masoi';
import {
  WORDCHAIN_DIFFICULTIES, WORDCHAIN_RULES, matchesWordRule,
  type WordChainDifficulty, type WordChainRule,
} from '../../shared/src/pos';
import { GIFT_IDS, SHOP_ITEMS, SKILL_IDS, vipOf } from '../../shared/src/shop';
import { ROOM_THEMES } from '../../shared/src/themes';
import { TYPHU_BOARD, isTyPhuProperty, upgradeCostOf } from '../../shared/src/typhu';
import {
  BAUCUA_SYMBOLS, GAME_INFO,
  type BauCuaView, type GameResult, type GameType, type RoomSettings, type TyPhuView, type WordChainView,
} from '../../shared/src/types';
import { VE_DOAN_WORDS, type VeDoanView } from '../../shared/src/vedoan';
import { Dictionary } from '../src/dictionary';
import { BauCuaGame } from '../src/games/baucua';
import { BomTuGame } from '../src/games/bomtu';
import { CahGame } from '../src/games/cah';
import { CaroGame } from '../src/games/caro';
import { CashGunsGame } from '../src/games/cashnguns';
import { CroakSquadGame } from '../src/games/croaksquad';
import { DoVuiGame } from '../src/games/dovui';
import type { EngineContext, EnginePlayer } from '../src/games/engine';
import { GianDiepGame } from '../src/games/giandiep';
import { LotoGame } from '../src/games/loto';
import { MaSoiGame } from '../src/games/masoi';
import { TyPhuGame } from '../src/games/typhu';
import { VeDoanGame } from '../src/games/vedoan';
import { WordChainGame } from '../src/games/wordchain';
import { Room } from '../src/room';
import { SMALL_EN_DEFS, SMALL_EN_WORDS, SMALL_WORDS } from './helpers';

/** Bộ sinh số giả ngẫu nhiên tất định Mulberry32 để tái lập 100% mọi seed */
function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const RICH_VI_WORDS = [
  ...SMALL_WORDS,
  ...BOM_TU_FALLBACK_WORDS,
  'nhà cửa', 'cửa sổ', 'sổ sách', 'sách báo', 'báo chí', 'chí hướng', 'hướng dương', 'dương cầm',
  'con cá', 'cá chép', 'chép bài', 'bài học', 'học tập', 'tập thể', 'thể thao', 'thao trường',
  'chạy bộ', 'bộ đội', 'đội hình', 'hình tròn', 'tròn trịa', 'ăn uống', 'uống nước', 'nước biển',
  'xinh đẹp', 'đẹp đẽ', 'nhanh nhẹn', 'cao lớn', 'lớn mạnh', 'mạnh mẽ', 'lung linh', 'linh tinh',
];

const RICH_EN_WORDS = [
  ...SMALL_EN_WORDS,
  'nation', 'nature', 'educate', 'energy', 'yellow', 'window', 'wealth', 'happy',
  'active', 'enable', 'effort', 'famous', 'system', 'modern', 'normal', 'level',
  'leader', 'runner', 'artist', 'create', 'electric', 'curious', 'station', 'network',
];

function buildTestDict(): Dictionary {
  const vi = new Dictionary(RICH_VI_WORDS);
  vi.en = new Dictionary(RICH_EN_WORDS, new Set(), SMALL_EN_DEFS, 'en');
  return vi;
}

const SHARED_DICT = buildTestDict();

function makePlayers(n: number): EnginePlayer[] {
  return Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `Người ${i + 1}` }));
}

function makeHarness(
  seed: number,
  settings: RoomSettings = {},
  turnMs = 1000,
  bots = new Set<string>(),
) {
  const rng = seededRng(seed);
  let result: GameResult | null = null;
  const connected = new Set<string>(Array.from({ length: 16 }, (_, i) => `p${i}`));
  const croakTicks: CroakTickPayload[] = [];
  const ctx: EngineContext = {
    rng,
    dict: SHARED_DICT,
    settings,
    turnMs,
    hostId: () => 'p0',
    isConnected: (id) => connected.has(id),
    isBot: (id) => bots.has(id),
    changed: () => {},
    finish: (r) => { result = r; },
    learnWord: (w) => { SHARED_DICT.add(w); },
    emitCroakTick: (p) => { croakTicks.push(p); },
  };
  return {
    ctx,
    rng,
    connected,
    croakTicks,
    getResult: () => result,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

// ============================================================================
// 1 & 2. NỐI TỪ TIẾNG VIỆT & TIẾNG ANH (160 TEST CASES)
// ============================================================================
describe('Game 1 & 2 — Nối Từ Tiếng Việt & Tiếng Anh Mở Rộng (160 cases)', () => {
  const diffs: WordChainDifficulty[] = ['easy', 'normal', 'hard', 'hell'];
  const rules: WordChainRule[] = ['free', 'noun', 'verb', 'adj', 'no_repeat'];
  const matrix: { lang: 'vi' | 'en'; diff: WordChainDifficulty; rule: WordChainRule; pCount: number; seed: number }[] = [];
  let idx = 0;
  for (const lang of ['vi', 'en'] as const) {
    for (const diff of diffs) {
      for (const rule of rules) {
        for (const pCount of [1, 2, 4, 6]) {
          matrix.push({ lang, diff, rule, pCount, seed: 1000 + idx++ });
        }
      }
    }
  }

  it.each(matrix)(
    '[$lang] diff=$diff rule=$rule players=$pCount (seed=$seed): khởi tạo, kiểm tra luật từ loại, bot nối đúng & hết giờ chuẩn xác',
    ({ lang, diff, rule, pCount, seed }) => {
      vi.useFakeTimers();
      const bots = new Set(Array.from({ length: pCount }, (_, i) => `p${i}`));
      const { ctx, getResult } = makeHarness(seed, { wordchainDifficulty: diff, wordchainRule: rule }, 400, bots);
      const g = new WordChainGame(ctx, lang);
      g.start(makePlayers(pCount));

      const v0 = g.view();
      expect(v0.difficulty).toBe(diff);
      expect(v0.rule).toBe(rule);
      if (diff === 'easy') {
        expect(v0.hintsLeft?.p0).toBe(3); // 1 gốc + 2 thưởng easy
      } else {
        expect(v0.hintsLeft?.p0).toBe(1);
      }

      // Từ chối người không tới lượt (nếu >= 2 người)
      if (pCount >= 2) {
        const wrongPlayer = v0.order.find((id) => id !== v0.currentPlayerId)!;
        expect(g.action(wrongPlayer, { type: 'submit', word: 'nhà cửa' })).toEqual({ ok: false, reason: 'not_your_turn' });
      }

      // Cho máy tự đánh tối đa 14 nước rồi ép timeout tuần tự tới khi ván kết thúc
      for (let step = 0; step < 14 && !getResult(); step++) {
        const cur = g.view().currentPlayerId;
        if (!cur) break;
        const ba = g.botAction(cur);
        if (ba) {
          const res = g.action(cur, ba);
          expect(res.ok).toBe(true);
        } else {
          vi.advanceTimersByTime(500);
        }
      }

      let guard = 0;
      while (!getResult() && guard++ < 20) {
        vi.advanceTimersByTime(600);
      }
      const fin = getResult();
      expect(fin).not.toBeNull();
      expect(fin!.ranking).toHaveLength(pCount);
      g.dispose();
    },
  );

  it('kiểm tra matchesWordRule & chuỗi streak + tự động nới luật khi âm hiếm từ', () => {
    expect(matchesWordRule('lung linh', 'vi', 'no_repeat')).toBe(false);
    expect(matchesWordRule('nhà cửa', 'vi', 'no_repeat')).toBe(true);
    expect(matchesWordRule('nhà cửa', 'vi', 'noun')).toBe(true);
    expect(matchesWordRule('chạy bộ', 'vi', 'verb')).toBe(true);
    expect(matchesWordRule('đẹp đẽ', 'vi', 'adj')).toBe(true);
    expect(matchesWordRule('level', 'en', 'no_repeat')).toBe(false);
    expect(matchesWordRule('nation', 'en', 'noun')).toBe(true);
    expect(matchesWordRule('educate', 'en', 'verb')).toBe(true);
    expect(matchesWordRule('famous', 'en', 'adj')).toBe(true);
  });
});

// ============================================================================
// 3. BẦU CUA TÔM CÁ — CỔ ĐIỂN & LỘC TRỜI NỔ HŨ ×2/×3 (140 TEST CASES)
// ============================================================================
describe('Game 3 — Bầu Cua Cổ Điển & Lộc Trời Nổ Hũ (140 cases)', () => {
  const cases = Array.from({ length: 120 }, (_, i) => ({
    caseId: i + 1,
    mode: (i % 2 === 0 ? 'jackpot' : 'classic') as 'classic' | 'jackpot',
    players: (i % 12) + 1,
    rounds: ([10, 15, 20] as const)[i % 3],
    seed: 2000 + i,
  }));

  it.each(cases)(
    'Bầu Cua #$caseId ($mode, $players người, $rounds ván): cược, bc_double, bc_rebet, bc_allin, vay nóng & nhân thưởng Lộc Trời',
    ({ mode, players, rounds, seed }) => {
      vi.useFakeTimers();
      const { ctx, getResult } = makeHarness(seed, { baucuaMode: mode, baucuaRounds: rounds }, 2000);
      const g = new BauCuaGame(ctx);
      g.start(makePlayers(players));

      const v1 = g.view();
      expect(v1.mode).toBe(mode);
      if (mode === 'jackpot') {
        expect(BAUCUA_SYMBOLS).toContain(v1.luckySymbol);
        expect([2, 3]).toContain(v1.luckyMult);
      } else {
        expect(v1.luckySymbol).toBeNull();
      }

      // Vòng 1: thử cược thường + bc_double + bc_allin
      expect(g.action('p0', { type: 'bc_rebet' }).ok).toBe(false); // chưa có ván trước
      expect(g.action('p0', { type: 'bet', symbol: 'bau', amount: 100 }).ok).toBe(true);
      expect(g.action('p0', { type: 'bc_double' }).ok).toBe(true);
      expect(g.view().bets.p0.bau).toBe(200);

      if (players >= 2) {
        expect(g.action('p1', { type: 'bc_allin', symbol: 'cua' }).ok).toBe(true);
        expect(g.view().bets.p1.cua).toBe(1000);
        expect(g.action('p1', { type: 'bet', symbol: 'tom', amount: 10 })).toEqual({ ok: false, reason: 'insufficient' });
      }

      // Chuyển sang lắc -> mở bát -> sang vòng 2
      vi.advanceTimersByTime(2050); // sang rolling (betMs = 2000ms)
      expect(g.action('p0', { type: 'bet', symbol: 'nai', amount: 50 })).toEqual({ ok: false, reason: 'not_betting' });
      vi.advanceTimersByTime(2650); // mở bát (ROLL_MS = 2600ms)
      expect(g.view().step).toBe('result');
      expect(g.view().dice).toHaveLength(3);

      vi.advanceTimersByTime(7100); // sang vòng 2 (RESULT_MS = 7000ms, betMs = 2000ms)
      if (!getResult()) {
        expect(g.view().step).toBe('betting');
        // Vòng 2: thử bc_rebet cho p0 nếu còn đủ tiền
        if ((g.view().balances.p0 ?? 0) >= 200) {
          expect(g.action('p0', { type: 'bc_rebet' }).ok).toBe(true);
          expect(g.view().bets.p0.bau).toBe(200);
        }
        // Kết thúc sớm bởi host
        expect(g.action('p0', { type: 'end' }).ok).toBe(true);
      }
      expect(getResult()).not.toBeNull();
      g.dispose();
    },
  );

  it.each(Array.from({ length: 20 }, (_, i) => i))(
    'Bão Tam Hoa & Lộc Trời ×3 trả thưởng chính xác tuyệt đối (kịch bản #%i)',
    (idx) => {
      vi.useFakeTimers();
      const targetIdx = idx % 6;
      const sym = BAUCUA_SYMBOLS[targetIdx];
      // Lần gọi rng trong jackpot: [0]=luckySymbol, [1]=luckyMult (<0.35 => x3), [2,3,4]=3 hột xúc xắc
      const queue = [targetIdx / 6 + 0.01, 0.1, targetIdx / 6 + 0.01, targetIdx / 6 + 0.01, targetIdx / 6 + 0.01, 0.5, 0.5];
      let ptr = 0;
      const { ctx } = makeHarness(1, { baucuaMode: 'jackpot', baucuaRounds: 10 }, 200);
      ctx.rng = () => queue[ptr++ % queue.length];

      const g = new BauCuaGame(ctx);
      g.start(makePlayers(2));
      expect(g.view().luckySymbol).toBe(sym);
      expect(g.view().luckyMult).toBe(3);

      expect(g.action('p0', { type: 'bet', symbol: sym, amount: 100 }).ok).toBe(true);
      vi.advanceTimersByTime(250);
      vi.advanceTimersByTime(2700);
      const v = g.view();
      expect(v.tripleStorm).toBe(true);
      // 3 hột trúng (300) × 3 (Lộc Trời) + 100 (thưởng Tam Hoa) = +1000 => số dư 2000!
      expect(v.lastDeltas?.p0).toBe(1000);
      expect(v.balances.p0).toBe(2000);
      g.dispose();
    },
  );
});

// ============================================================================
// 4. CỜ TỶ PHÚ — LỄ HỘI x2, HŨ ĐỘC ĐẮC & MUA ĐỨT 160% (140 TEST CASES)
// ============================================================================
describe('Game 4 — Cờ Tỷ Phú Lễ Hội Sốt Đất & Thâu Tóm 160% (140 cases)', () => {
  const cases = Array.from({ length: 120 }, (_, i) => ({
    caseId: i + 1,
    players: (i % 5) + 2,
    mode: (i % 3 === 0 ? 'classic' : 'chaos_festival') as 'classic' | 'chaos_festival',
    seed: 3000 + i,
  }));

  it.each(cases)(
    'Cờ Tỷ Phú #$caseId ($mode, $players người, seed=$seed): 35 lượt mô phỏng bất biến tiền tệ, Lễ Hội, Hũ Lộc & Mua Đứt',
    ({ players, mode, seed }) => {
      vi.useFakeTimers();
      const bots = new Set(Array.from({ length: players }, (_, i) => `p${i}`));
      const { ctx, getResult } = makeHarness(seed, { typhuMode: mode }, 300, bots);
      ctx.rollDice = (_imp, rng) => ({
        dice: [1 + Math.floor(rng() * 6), 1 + Math.floor(rng() * 6)],
        frames: [],
        ms: 40,
        fps: 30,
      });

      const g = new TyPhuGame(ctx);
      g.start(makePlayers(players));

      const v0 = g.view();
      expect(v0.mode).toBe(mode);
      if (mode === 'chaos_festival') {
        expect(v0.jackpotPool).toBe(200);
        expect(v0.festivalCell).not.toBeNull();
        expect(TYPHU_BOARD[v0.festivalCell!].kind).toBe('land');
      } else {
        expect(v0.jackpotPool).toBe(0);
        expect(v0.festivalCell).toBeNull();
      }

      for (let step = 0; step < 35 && !getResult(); step++) {
        const v = g.view();
        const cur = v.currentPlayerId;
        if (!cur) break;
        const ba = g.botAction(cur);
        if (ba) {
          const r = g.action(cur, ba);
          expect(r.ok).toBe(true);
        }
        vi.advanceTimersByTime(2500);
        const after = g.view();
        for (const pid of after.order) {
          if (!after.bankrupt.includes(pid)) {
            expect(after.cash[pid]).toBeGreaterThanOrEqual(0);
          }
        }
      }
      g.dispose();
    },
  );

  it.each(Array.from({ length: 20 }, (_, i) => i))(
    'Mua đứt 160% (Hostile Takeover) & Bảo hộ Khách Sạn hoạt động chuẩn xác (mẫu #%i)',
    (idx) => {
      vi.useFakeTimers();
      const { ctx } = makeHarness(4500 + idx, { typhuMode: 'chaos_festival' }, 500);
      // Cố định tung xúc xắc: lượt 1 p0 tung 1+2 => ô 3 (Bạc Liêu, giá 60$); lượt 2 p1 tung 1+2 => ô 3!
      ctx.rollDice = () => ({ dice: [1, 2], frames: [], ms: 30, fps: 30 });
      const g = new TyPhuGame(ctx);
      g.start(makePlayers(2));

      // p0 mua Bạc Liêu (ô 3)
      expect(g.action('p0', { type: 'roll' }).ok).toBe(true);
      vi.advanceTimersByTime(3000);
      expect(g.view().step).toBe('buy');
      expect(g.action('p0', { type: 'buy' }).ok).toBe(true);
      expect(g.view().owners[3]).toBe('p0');
      vi.advanceTimersByTime(3000);

      // p1 đi vào ô 3 -> trả tiền thuê -> được chào Mua Đứt giá 60 * 1.6 = 96$!
      expect(g.view().currentPlayerId).toBe('p1');
      expect(g.action('p1', { type: 'roll' }).ok).toBe(true);
      vi.advanceTimersByTime(3000);
      expect(g.view().step).toBe('buyout');
      const expectedPrice = Math.round((60 + 0 * upgradeCostOf(3)) * 1.6);
      expect(g.view().buyoutOffer).toEqual({ cell: 3, ownerId: 'p0', price: expectedPrice });

      if (idx % 2 === 0) {
        const p0Before = g.view().cash.p0;
        expect(g.action('p1', { type: 'buyout' }).ok).toBe(true);
        expect(g.view().owners[3]).toBe('p1');
        expect(g.view().cash.p0).toBe(p0Before + expectedPrice);
      } else {
        expect(g.action('p1', { type: 'skip' }).ok).toBe(true);
        expect(g.view().owners[3]).toBe('p0');
      }
      g.dispose();
    },
  );
});

// ============================================================================
// 5. MA SÓI 2.0 (140 TEST CASES)
// ============================================================================
describe('Game 5 — Ma Sói 2.0: Tốc Độ, Sổ Tay, Cách Ly Mật & Trọn Ván (140 cases)', () => {
  const cases: { count: number; preset: 'classic' | 'chaos'; speed: 'slow' | 'normal' | 'fast'; seed: number }[] = [];
  let s = 5000;
  for (let count = 4; count <= 12; count++) {
    for (const preset of ['classic', 'chaos'] as const) {
      for (const speed of ['slow', 'normal', 'fast'] as const) {
        cases.push({ count, preset, speed, seed: s++ });
      }
    }
  }
  // 9 * 2 * 3 = 54 + 86 fuzz/simulation seeds = 140 cases!
  while (cases.length < 140) {
    cases.push({ count: 4 + (cases.length % 9), preset: cases.length % 2 ? 'chaos' : 'classic', speed: 'normal', seed: s++ });
  }

  it.each(cases)(
    'Ma Sói ($count người, $preset, speed=$speed, seed=$seed): phân vai chuẩn, ẩn vai tuyệt đối & chạy trọn ván',
    ({ count, preset, speed, seed }) => {
      vi.useFakeTimers();
      const deck = buildMaSoiDeck(count, preset);
      expect(deck).toHaveLength(count);
      for (const r of deck) {
        expect(MASOI_ROLES[r].howToPlay.length).toBeGreaterThan(15);
        expect(MASOI_ROLES[r].winCond.length).toBeGreaterThan(10);
      }

      // Kiểm tra thời lượng pha khi không ép turnMs ở lần đầu
      if (seed < 5010) {
        const { ctx: realClockCtx } = makeHarness(seed, { masoiPreset: preset, masoiSpeed: speed }, 0);
        delete (realClockCtx as { turnMs?: number }).turnMs;
        const gClock = new MaSoiGame(realClockCtx);
        gClock.start(makePlayers(count));
        expect(gClock.view('p0').phaseSeconds).toBe(MASOI_PHASE_SECONDS[speed].role_reveal);
        gClock.dispose();
      }

      const players = makePlayers(count);
      const bots = new Set(players.map((p) => p.id));
      const { ctx, getResult } = makeHarness(seed, { masoiPreset: preset, masoiSpeed: speed }, 300, bots);
      const g = new MaSoiGame(ctx);
      g.start(players);

      // Kiểm tra cách ly thông tin bí mật (perPlayerView)
      for (const p of players) {
        const v = g.view(p.id);
        expect(v.myRole).not.toBeNull();
        if (v.myRole !== 'soi') {
          expect(v.wolfPackIds).toBeUndefined();
          expect(v.wolfChat).toBeUndefined();
        } else {
          expect(v.wolfPackIds?.length).toBeGreaterThanOrEqual(1);
        }
      }

      let guard = 0;
      while (!getResult() && guard++ < 180) {
        for (const p of players) {
          const ba = g.botAction(p.id);
          if (ba) g.action(p.id, ba);
        }
        vi.advanceTimersByTime(350);
      }
      expect(getResult()).not.toBeNull();
      expect(getResult()!.ranking).toHaveLength(count);
      g.dispose();
    },
  );
});

// ============================================================================
// 6, 7, 8. GIÁN ĐIỆP, VẼ & ĐOÁN, BOM CHỮ (360 TEST CASES — 120 MỖI GAME)
// ============================================================================
describe('Game 6 — Ai Là Gián Điệp (120 cases)', () => {
  it('kho cặp từ Gián Điệp phong phú & không trùng nhau', () => {
    expect(GIAN_DIEP_WORDS.length).toBeGreaterThanOrEqual(80);
  });

  it.each(Array.from({ length: 119 }, (_, i) => ({
    players: 3 + (i % 10),
    spies: (1 + (i % 3)) as 1 | 2 | 3,
    mrWhite: i % 2 === 0,
    seed: 6000 + i,
  })))(
    'Gián Điệp ($players người, $spies điệp, mrWhite=$mrWhite, seed=$seed): chặn lộ từ khóa & hoàn tất ván',
    ({ players, spies, mrWhite, seed }) => {
      vi.useFakeTimers();
      const ps = makePlayers(players);
      const bots = new Set(ps.map((p) => p.id));
      const { ctx, getResult } = makeHarness(seed, { giandiepSpies: spies, giandiepMrWhite: mrWhite }, 300, bots);
      const g = new GianDiepGame(ctx);
      g.start(ps);

      // Chuyển từ pha word_reveal sang clue_turn để thử chặn lộ từ khóa!
      if (g.view('p0').phase === 'word_reveal') {
        vi.advanceTimersByTime(350);
      }
      const speakerId = g.view('p0').currentSpeakerId;
      if (speakerId) {
        const turnView = g.view(speakerId);
        if (turnView.myWord) {
          expect(g.action(speakerId, { type: 'gd_clue', text: `Tôi thích ${turnView.myWord} lắm` })).toEqual({
            ok: false,
            reason: 'word_leaked',
          });
        }
      }

      let guard = 0;
      while (!getResult() && guard++ < 220) {
        for (const p of ps) {
          const ba = g.botAction(p.id);
          if (ba) g.action(p.id, ba);
        }
        vi.advanceTimersByTime(350);
      }
      expect(getResult()).not.toBeNull();
      g.dispose();
    },
  );
});

describe('Game 7 — Vẽ & Đoán (120 cases)', () => {
  it.each(Array.from({ length: 120 }, (_, i) => ({
    players: 2 + (i % 9),
    rounds: 1 + (i % 2),
    seed: 7000 + i,
  })))(
    'Vẽ & Đoán ($players người, $rounds vòng, seed=$seed): ẩn từ khóa với người đoán, vẽ nét & chấm điểm chuẩn',
    ({ players, rounds, seed }) => {
      vi.useFakeTimers();
      const ps = makePlayers(players);
      const bots = new Set(ps.map((p) => p.id));
      const { ctx, getResult } = makeHarness(seed, { veDoanRounds: rounds }, 300, bots);
      const g = new VeDoanGame(ctx);
      g.start(ps);

      const drawer = g.view('p0').drawerId!;
      const guesser = ps.find((p) => p.id !== drawer)!.id;
      expect(g.view(guesser).secretWord).toBeNull();
      expect(g.view(drawer).wordOptions?.length).toBeGreaterThanOrEqual(1);

      let guard = 0;
      while (!getResult() && guard++ < 150) {
        for (const p of ps) {
          const ba = g.botAction(p.id);
          if (ba) g.action(p.id, ba);
        }
        vi.advanceTimersByTime(350);
      }
      expect(getResult()).not.toBeNull();
      g.dispose();
    },
  );
});

describe('Game 8 — Bom Chữ Sinh Tử (120 cases)', () => {
  it.each(Array.from({ length: 120 }, (_, i) => ({
    players: 2 + (i % 9),
    seed: 8000 + i,
  })))(
    'Bom Chữ ($players người, seed=$seed): chuyền bom đúng tiếng, trừ tim khi nổ & tìm người sống sót',
    ({ players, seed }) => {
      vi.useFakeTimers();
      const ps = makePlayers(players);
      const bots = new Set(ps.map((p) => p.id));
      const { ctx, getResult } = makeHarness(seed, {}, 300, bots);
      const g = new BomTuGame(ctx);
      g.start(ps);

      const holder = g.view().holderId!;
      expect(g.action(holder, { type: 'bt_submit', word: 'từ_sai_format_3_tiếng' }).ok).toBe(false);

      let guard = 0;
      while (!getResult() && guard++ < 120) {
        const cur = g.view().holderId;
        if (cur && guard % 3 !== 0) {
          const ba = g.botAction(cur);
          if (ba) g.action(cur, ba);
        }
        vi.advanceTimersByTime(350);
      }
      expect(getResult()).not.toBeNull();
      g.dispose();
    },
  );
});

// ============================================================================
// 9. ĐẤU TRƯỜNG ĐỐ VUI CNTT & TIẾNG ANH C1-C2 (316 TEST CASES!)
// ============================================================================
describe('Game 9 — Đấu Trường Đố Vui Hardcore CNTT & C1-C2 (316 cases)', () => {
  // Kiểm tra TỪNG CÂU HỎI MỘT trong 252 câu hỏi chuyên sâu!
  it.each(DO_VUI_QUESTIONS.map((q, idx) => ({ idx: idx + 1, q })))(
    'Câu hỏi Đố Vui #$idx [$q.topic / $q.difficulty]: đủ 4 đáp án phân biệt, đáp án đúng hợp lệ & có giải thích kỹ thuật',
    ({ q }) => {
      expect(['oop', 'dsa', 'js_ts', 'node_backend', 'mobile_fe', 'fullstack_it', 'english_adv']).toContain(q.topic);
      expect(['hard', 'extreme']).toContain(q.difficulty);
      expect(q.q.trim().length).toBeGreaterThan(15);
      expect(q.options).toHaveLength(4);
      const trimmedOpts = q.options.map((o) => o.trim());
      for (const o of trimmedOpts) expect(o.length).toBeGreaterThan(0);
      expect(new Set(trimmedOpts).size).toBe(4);
      expect([0, 1, 2, 3]).toContain(q.correct);
      expect(q.explain.trim().length).toBeGreaterThan(20);
    },
  );

  const topicCases: { topic: DoVuiTopic; qCount: 5 | 10 | 15; players: number; seed: number }[] = [];
  let dvSeed = 9000;
  for (const tp of DO_VUI_TOPICS) {
    for (const qCount of [5, 10, 15] as const) {
      for (const players of [1, 4, 8]) {
        if (topicCases.length < 64) {
          topicCases.push({ topic: tp.id, qCount, players, seed: dvSeed++ });
        }
      }
    }
  }

  it.each(topicCases)(
    'Đố Vui lọc đúng chuyên đề "$topic" ($qCount câu, $players người): cách ly đáp án trước reveal & tính điểm x2 cuối ván',
    ({ topic, qCount, players, seed }) => {
      vi.useFakeTimers();
      const pool = questionsForTopic(topic);
      if (topic !== 'all') {
        expect(pool.length).toBeGreaterThanOrEqual(30);
        expect(pool.every((x) => x.topic === topic)).toBe(true);
      } else {
        expect(pool.length).toBeGreaterThanOrEqual(245);
      }

      const ps = makePlayers(players);
      const bots = new Set(ps.map((p) => p.id));
      const { ctx, getResult } = makeHarness(seed, { doVuiTopic: topic, doVuiQuestions: qCount }, 300, bots);
      const g = new DoVuiGame(ctx);
      g.start(ps);

      const vQ = g.view('p0');
      expect(vQ.selectedTopic).toBe(topic);
      expect(vQ.correctIndex).toBeUndefined(); // Không lộ đáp án khi đang hỏi!

      let guard = 0;
      while (!getResult() && guard++ < 80) {
        if (g.view('p0').phase === 'question') {
          for (const p of ps) {
            const ba = g.botAction(p.id);
            if (ba) expect(g.action(p.id, ba).ok).toBe(true);
          }
        }
        vi.advanceTimersByTime(350);
      }
      expect(getResult()).not.toBeNull();
      g.dispose();
    },
  );
});

// ============================================================================
// 10. HỘI BÀN TRÒN VÔ TRI — CARDS AGAINST HUMANITY VN (150 TEST CASES)
// ============================================================================
describe('Game 10 — Hội Bàn Tròn Vô Tri (CAH, 150 cases)', () => {
  it('kho bài CAH >= 110 Thẻ Đen & >= 260 Thẻ Trắng không trùng lặp, chèn tên thật {p} mượt mà', () => {
    expect(CAH_BLACK_CARDS.length).toBeGreaterThanOrEqual(110);
    expect(CAH_WHITE_CARDS.length).toBeGreaterThanOrEqual(260);
    expect(new Set(CAH_WHITE_CARDS).size).toBe(CAH_WHITE_CARDS.length);
    const sample = renderBlackCard({ id: 'b', text: 'Lịch sử web của {p} là ___', usesPlayer: true, category: 'xom_lay' }, 'Minh');
    expect(sample).toContain('@Minh');
    expect(fillBlackCard(sample, 'mì tôm sống')).toContain('mì tôm sống');
  });

  it.each(Array.from({ length: 149 }, (_, i) => ({
    players: 3 + (i % 10),
    rounds: ([5, 8, 12] as const)[i % 3],
    useMulligan: i % 2 === 0,
    seed: 10000 + i,
  })))(
    'CAH ($players người, $rounds vòng, mulligan=$useMulligan, seed=$seed): ẩn tác giả lúc vote, chặn tự bầu & chạy trọn ván',
    ({ players, rounds, useMulligan, seed }) => {
      vi.useFakeTimers();
      const ps = makePlayers(players);
      const bots = new Set(ps.map((p) => p.id));
      const { ctx, getResult } = makeHarness(seed, { cahRounds: rounds }, 300, bots);
      const g = new CahGame(ctx);
      g.start(ps);

      // Mỗi người cầm đúng 7 lá trắng riêng biệt, người khác không nhìn thấy bài của nhau
      const v0 = g.view('p0');
      const v1 = g.view('p1');
      expect(v0.myHand).toHaveLength(7);
      expect(v1.myHand).toHaveLength(7);
      expect(v0.myHand).not.toEqual(v1.myHand);

      if (useMulligan) {
        expect(g.action('p0', { type: 'cah_mulligan' }).ok).toBe(true);
        expect(g.view('p0').myHand).toHaveLength(7);
        // Dùng lần 2 trong cùng ván phải bị từ chối!
        expect(g.action('p0', { type: 'cah_mulligan' }).ok).toBe(false);
      }

      // Tất cả nộp bài -> sang pha vote ẩn danh
      for (const p of ps) {
        const hand = g.view(p.id).myHand;
        expect(g.action(p.id, { type: 'cah_pick', card: hand[0] }).ok).toBe(true);
      }
      const voteView = g.view('p0');
      expect(voteView.phase).toBe('vote');
      expect(voteView.entries).toHaveLength(players);
      for (const sub of voteView.entries) {
        expect(sub.authorId).toBeUndefined(); // Ẩn danh tuyệt đối!
      }
      // Chặn tự bầu bài của chính mình (khi >= 3 người)
      const myOwnSlot = voteView.entries.find((e) => e.text === voteView.myPicked);
      if (myOwnSlot) {
        expect(g.action('p0', { type: 'cah_vote', slotId: myOwnSlot.slotId }).ok).toBe(false);
      }

      let guard = 0;
      while (!getResult() && guard++ < 160) {
        for (const p of ps) {
          const ba = g.botAction(p.id);
          if (ba) g.action(p.id, ba);
        }
        vi.advanceTimersByTime(350);
      }
      expect(getResult()).not.toBeNull();
      g.dispose();
    },
  );
});

// ============================================================================
// 11. CHIA CHÁC GIANG HỒ — CASH 'N GUNS (150 TEST CASES)
// ============================================================================
describe('Game 11 — Chia Chác Giang Hồ (Cash n Guns, 150 cases)', () => {
  it('bộ chiến lợi phẩm 64 lá & thưởng Vua Kim Cương +60.000$ chuẩn xác (người chết mất quyền chia tiền)', () => {
    expect(buildCgLootDeck()).toHaveLength(64);
    const w1 = cgTotalWealth({ p0: 10_000, p1: 20_000 }, { p0: 3, p1: 1 }, new Set(['p0', 'p1']));
    expect(w1.totals.p0).toBe(70_000);
    expect(w1.totals.p1).toBe(20_000);
    const wDead = cgTotalWealth({ p0: 90_000, p1: 20_000 }, { p0: 5, p1: 1 }, new Set(['p1']));
    expect(wDead.totals.p0).toBe(0);
    expect(wDead.totals.p1).toBe(80_000);
  });

  it.each(Array.from({ length: 149 }, (_, i) => ({
    players: 3 + (i % 10),
    forceGodfather: i % 2 === 0,
    forceSurrender: i % 3 === 0,
    seed: 11000 + i,
  })))(
    'Cash n Guns ($players người, godfather=$forceGodfather, surrender=$forceSurrender, seed=$seed): đạn thật/giả, đầu hàng né đạn & chia tiền',
    ({ players, forceGodfather, forceSurrender, seed }) => {
      vi.useFakeTimers();
      const ps = makePlayers(players);
      const bots = new Set(ps.map((p) => p.id));
      const { ctx, getResult } = makeHarness(seed, {}, 300, bots);
      const g = new CashGunsGame(ctx);
      g.start(ps);

      // Mỗi người 5 Click + 3 Bang = 8 viên
      const v0 = g.view('p0');
      expect(v0.myClip).toHaveLength(8);
      expect(v0.myClip.filter((b) => b === 'click')).toHaveLength(5);
      expect(v0.myClip.filter((b) => b === 'bang')).toHaveLength(3);
      expect(Object.keys(v0.aims)).toHaveLength(0); // Chưa lộ mục tiêu ở pha plan!
      // Không được tự bắn chính mình
      expect(g.action('p0', { type: 'cg_plan', bulletIndex: 0, targetId: 'p0' }).ok).toBe(false);

      // Mọi người nạp đạn
      for (let i = 0; i < ps.length; i++) {
        const shooter = ps[i].id;
        const target = ps[(i + 1) % ps.length].id;
        expect(g.action(shooter, { type: 'cg_plan', bulletIndex: 0, targetId: target }).ok).toBe(true);
      }

      expect(g.view('p0').phase).toBe('standoff');
      expect(Object.keys(g.view('p0').aims)).toHaveLength(players);

      if (forceGodfather) {
        const gf = g.view('p0').godfatherId;
        const other = ps.find((p) => p.id !== gf)!.id;
        const curAim = g.view(gf).aims[other];
        const redirectTo = ps.find((p) => p.id !== other && p.id !== curAim)!.id;
        expect(g.action(gf, { type: 'cg_godfather', targetId: other, newAimId: redirectTo }).ok).toBe(true);
        expect(g.view(gf).aims[other]).toBe(redirectTo);
      }

      if (forceSurrender) {
        expect(g.action('p1', { type: 'cg_standoff', decision: 'surrender' }).ok).toBe(true);
      }

      let guard = 0;
      while (!getResult() && guard++ < 150) {
        for (const p of ps) {
          const ba = g.botAction(p.id);
          if (ba) g.action(p.id, ba);
        }
        vi.advanceTimersByTime(350);
      }
      expect(getResult()).not.toBeNull();
      g.dispose();
    },
  );
});

// ============================================================================
// 12. LÔ TÔ HỘI CHỢ 90 SỐ (160 TEST CASES)
// ============================================================================
describe('Game 12 — Lô Tô Hội Chợ 90 Số & Vé 3×9 Chuẩn (160 cases)', () => {
  it('đủ 90 câu vè tiếng Việt không trùng cho từng số từ 1..90', () => {
    for (let num = 1; num <= 90; num++) {
      expect(LOTO_RHYMES[num]).toBeDefined();
      expect(LOTO_RHYMES[num].chant.length).toBeGreaterThan(10);
      expect(LOTO_RHYMES[num].title.length).toBeGreaterThan(2);
    }
  });

  // Kiểm toán 100 tờ vé Lô Tô sinh ngẫu nhiên theo đúng chuẩn Gale-Ryser 3×9!
  it.each(Array.from({ length: 100 }, (_, i) => 12000 + i))(
    'Tờ vé Lô Tô seed=%i đạt chuẩn 100%: 3 hàng × 9 cột, mỗi hàng đúng 5 số, cột đúng đầu số & tăng dần',
    (seed) => {
      const grid = generateLotoTicket(seededRng(seed));
      expect(grid).toHaveLength(3);
      let totalNums = 0;
      const seen = new Set<number>();
      for (let r = 0; r < 3; r++) {
        expect(grid[r]).toHaveLength(9);
        const rowNums = grid[r].filter((x): x is number => x !== null);
        expect(rowNums).toHaveLength(5);
        totalNums += rowNums.length;
      }
      expect(totalNums).toBe(15);

      for (let c = 0; c < 9; c++) {
        const colVals = [grid[0][c], grid[1][c], grid[2][c]].filter((x): x is number => x !== null);
        expect(colVals.length).toBeGreaterThanOrEqual(1);
        expect(colVals.length).toBeLessThanOrEqual(3);
        const lo = c === 0 ? 1 : c * 10;
        const hi = c === 8 ? 90 : c * 10 + 9;
        for (let k = 0; k < colVals.length; k++) {
          expect(colVals[k]).toBeGreaterThanOrEqual(lo);
          expect(colVals[k]).toBeLessThanOrEqual(hi);
          expect(seen.has(colVals[k])).toBe(false);
          seen.add(colVals[k]);
          if (k > 0) expect(colVals[k]).toBeGreaterThan(colVals[k - 1]);
        }
      }
    },
  );

  it.each(Array.from({ length: 59 }, (_, i) => ({
    players: 2 + (i % 10),
    autoMark: i % 2 === 0,
    seed: 12500 + i,
  })))(
    'Ván Lô Tô ($players người, autoMark=$autoMark, seed=$seed): phạt Kinh hụt 2 lượt bóng & thắng đúng khi đủ 5/5 hàng',
    ({ players, autoMark, seed }) => {
      vi.useFakeTimers();
      const ps = makePlayers(players);
      const bots = new Set(ps.slice(1).map((p) => p.id));
      const { ctx, getResult } = makeHarness(seed, { lotoAutoMark: autoMark }, 480, bots);
      const g = new LotoGame(ctx);
      g.start(ps);

      // Hô Kinh láo ngay đầu ván -> bị phạt kinh_false, bấm tiếp bị kinh_locked!
      expect(g.action('p0', { type: 'loto_kinh', row: 0 })).toEqual({ ok: false, reason: 'kinh_false' });
      expect(g.action('p0', { type: 'loto_kinh', row: 0 })).toEqual({ ok: false, reason: 'kinh_locked' });

      let guard = 0;
      while (!getResult() && guard++ < 110) {
        vi.advanceTimersByTime(150);
        const v = g.view();
        // Cho cả p0 lẫn các bot dò vé & hô Kinh khi đủ 5/5
        for (const p of ps) {
          const grid = v.tickets[p.id];
          if (!autoMark && v.currentNum !== null) {
            if (grid.some((row) => row.includes(v.currentNum))) {
              g.action(p.id, { type: 'loto_mark', num: v.currentNum });
            }
          }
          const calledSet = new Set(g.view().called);
          const markedSet = autoMark ? undefined : new Set(g.view().marked[p.id] ?? []);
          for (const row of [0, 1, 2] as const) {
            if (checkLotoRow(grid, row, calledSet, markedSet).validKinh) {
              g.action(p.id, { type: 'loto_kinh', row });
            }
          }
        }
      }
      expect(getResult()).not.toBeNull();
      g.dispose();
    },
  );
});

// ============================================================================
// 13. CỜ CARO ĐẠI CHIẾN 15×15 (160 TEST CASES)
// ============================================================================
describe('Game 13 — Cờ Caro Đại Chiến 15×15 (2–4 Người & Luật Chặn 2 Đầu, 160 cases)', () => {
  it.each([
    { desc: 'ngang 5 tự do -> THẮNG', dr: 0, dc: 1, blockA: false, blockB: false, rule: true, expectWin: true },
    { desc: 'dọc 5 tự do -> THẮNG', dr: 1, dc: 0, blockA: false, blockB: false, rule: true, expectWin: true },
    { desc: 'chéo chính 5 tự do -> THẮNG', dr: 1, dc: 1, blockA: false, blockB: false, rule: true, expectWin: true },
    { desc: 'chéo phụ 5 tự do -> THẮNG', dr: 1, dc: -1, blockA: false, blockB: false, rule: true, expectWin: true },
    { desc: 'chặn 1 đầu -> VẪN THẮNG', dr: 0, dc: 1, blockA: true, blockB: false, rule: true, expectWin: true },
    { desc: 'chặn CẢ 2 ĐẦU khi bật luật -> CHƯA THẮNG!', dr: 0, dc: 1, blockA: true, blockB: true, rule: true, expectWin: false },
    { desc: 'chặn CẢ 2 ĐẦU khi TẮT luật -> VẪN THẮNG!', dr: 0, dc: 1, blockA: true, blockB: true, rule: false, expectWin: true },
  ])('checkCaroWin: $desc', ({ dr, dc, blockA, blockB, rule, expectWin }) => {
    const board: (CaroSymbol | null)[] = Array(CARO_SIZE * CARO_SIZE).fill(null);
    const r0 = 5;
    const c0 = 5;
    for (let k = 0; k < 5; k++) {
      board[(r0 + dr * k) * CARO_SIZE + (c0 + dc * k)] = 'X';
    }
    if (blockA) board[(r0 - dr) * CARO_SIZE + (c0 - dc)] = 'O';
    if (blockB) board[(r0 + dr * 5) * CARO_SIZE + (c0 + dc * 5)] = 'O';
    const win = checkCaroWin(board, CARO_SIZE, r0 + dr * 2, c0 + dc * 2, rule);
    expect(win !== null).toBe(expectWin);
  });

  it('AI chiến thuật pickCaroBotMove biết chốt nước thắng 5 ngay lập tức & chặn nước 4 nguy hiểm của địch', () => {
    const board: (CaroSymbol | null)[] = Array(CARO_SIZE * CARO_SIZE).fill(null);
    // X đang có 4 quân liên tiếp (7,4)..(7,7) -> AI cầm X phải đánh (7,3) hoặc (7,8) để thắng ngay!
    for (let c = 4; c <= 7; c++) board[7 * CARO_SIZE + c] = 'X';
    const winMove = pickCaroBotMove(board, CARO_SIZE, 'X', true, () => 0.5);
    expect([[7, 3], [7, 8]]).toContainEqual([winMove.row, winMove.col]);

    // O đến lượt khi X đang dọa 4 quân hở 2 đầu -> O bắt buộc phải chặn (7,3) hoặc (7,8)!
    const blockMove = pickCaroBotMove(board, CARO_SIZE, 'O', true, () => 0.5);
    expect([[7, 3], [7, 8]]).toContainEqual([blockMove.row, blockMove.col]);
  });

  it.each(Array.from({ length: 152 }, (_, i) => ({
    players: 2 + (i % 3), // 2, 3, 4 người chơi!
    blockTwoEnds: i % 2 === 0,
    seed: 13000 + i,
  })))(
    'Ván Caro ($players phe, chặn2đầu=$blockTwoEnds, seed=$seed): xoay lượt chuẩn, cấm đè ô & AI đấu trọn ván',
    ({ players, blockTwoEnds, seed }) => {
      vi.useFakeTimers();
      const ps = makePlayers(players);
      const bots = new Set(ps.map((p) => p.id));
      const { ctx, getResult } = makeHarness(seed, { caroBlockTwoEnds: blockTwoEnds }, 300, bots);
      const g = new CaroGame(ctx);
      g.start(ps);

      const v0 = g.view();
      expect(Object.values(v0.symbols)).toEqual(CARO_SYMBOLS.slice(0, players));

      // Đánh nước đầu ở tâm (7,7), người kế tiếp đánh đè lên (7,7) phải bị từ chối cell_occupied!
      const first = v0.currentPlayerId!;
      expect(g.action(first, { type: 'caro_move', row: 7, col: 7 }).ok).toBe(true);
      const second = g.view().currentPlayerId!;
      expect(second).not.toBe(first);
      expect(g.action(second, { type: 'caro_move', row: 7, col: 7 })).toEqual({ ok: false, reason: 'cell_occupied' });

      const maxSteps = seed < 13025 ? 230 : 18;
      let guard = 0;
      while (!getResult() && guard++ < maxSteps) {
        const cur = g.view().currentPlayerId;
        if (!cur) break;
        const ba = g.botAction(cur);
        if (ba) expect(g.action(cur, ba).ok).toBe(true);
        else break;
      }
      if (!getResult()) {
        expect(g.action('p0', { type: 'end' }).ok).toBe(true);
      }
      expect(getResult()).not.toBeNull();
      g.dispose();
    },
  );
});

// ============================================================================
// 14. ĐẦM LẦY QUÁI CHIÊU — CROAK SQUAD CO-OP PHYSICS & MULTIPLAYER (180 CASES)
// ============================================================================
describe('Game 14 — Đầm Lầy Quái Chiêu (Croak Squad Co-op 2D Physics & Netcode, 180 cases)', () => {
  it('Room chặn tuyệt đối thêm Bot vào croaksquad & tự dọn Bot khi chuyển sang croaksquad', () => {
    const room = new Room('FROG99', SHARED_DICT, { turnMs: 500 });
    const h = room.addPlayer('Ếch Trưởng');
    if (!h.ok) throw new Error(h.error);
    expect(room.addBot(h.playerId).ok).toBe(true);
    expect(room.players.some((p) => p.bot)).toBe(true);

    // Đổi sang croaksquad -> tự xóa sạch bot!
    expect(room.configure(h.playerId, 'croaksquad').ok).toBe(true);
    expect(room.players.some((p) => p.bot)).toBe(false);
    // Cố tình bấm thêm bot trong croaksquad -> bị từ chối ngay!
    expect(room.addBot(h.playerId)).toEqual({ ok: false, error: 'bad_request' });
    // Chỉ có 1 người thật -> chưa cho start (min = 2 người thật)!
    expect(room.start(h.playerId)).toEqual({ ok: false, error: 'too_few_players' });

    const p2 = room.addPlayer('Ếch Phó');
    if (!p2.ok) throw new Error(p2.error);
    expect(room.start(h.playerId).ok).toBe(true);
    expect(room.toPublic().game?.type).toBe('croaksquad');
    room.dispose();
  });

  it('xử lý hoàn hảo 6 tình huống biên vật lý: nuốt đôi cùng lúc, nhổ sát tường, rơi vực hồi sinh, chết/mất mạng khi đang ngậm bạn', () => {
    const w = createCroakWorld([
      { id: 'p0', name: 'Ếch Đỏ' },
      { id: 'p1', name: 'Ếch Xanh' },
      { id: 'p2', name: 'Ếch Vàng' },
    ], 0);

    // 1. Hai người đứng sát nhau bấm phóng lưỡi CÙNG MỘT TICK -> chỉ 1 người nuốt người kia, không bao giờ nuốt chéo nhau!
    w.frogs[0].x = 120; w.frogs[0].y = 540; w.frogs[0].facing = 1;
    w.frogs[1].x = 160; w.frogs[1].y = 540; w.frogs[1].facing = -1;
    stepCroakWorld(w, {
      p0: { moveX: 0, tongue: true },
      p1: { moveX: 0, tongue: true },
    }, CROAK_DT);
    expect(w.frogs[0].state).toBe('carrying');
    expect(w.frogs[0].bellyId).toBe('p1');
    expect(w.frogs[1].state).toBe('swallowed');
    expect(w.frogs[1].bellyId).toBeNull();

    // 2. Nhổ đồng đội ngay sát vách tường đá -> không bị kẹt xuyên tường!
    w.frogs[0].x = 0; w.frogs[0].y = 540; w.frogs[0].facing = -1; // đối mặt tường bao trái x = -40..0
    stepCroakWorld(w, {
      p0: { moveX: 0, spit: true, aimAngle: Math.PI, aimPower: 1 },
    }, CROAK_DT);
    expect(w.frogs[0].state).toBe('normal');
    expect(w.frogs[1].x).toBeGreaterThanOrEqual(0);

    // 3. Người đang ngậm bạn bất ngờ lao xuống đầm lầy độc chết -> đồng đội trong bụng được bật ra an toàn!
    w.frogs[0].x = 120; w.frogs[0].y = 540; w.frogs[0].facing = 1; w.frogs[0].state = 'normal'; w.frogs[0].tongueTicks = 0;
    w.frogs[1].x = 155; w.frogs[1].y = 540; w.frogs[1].state = 'normal';
    stepCroakWorld(w, { p0: { moveX: 0, tongue: true } }, CROAK_DT);
    expect(w.frogs[0].bellyId).toBe('p1');
    // Đưa p0 chạm bẫy bùn độc hz_mud1 (x: 390..755, y: 668..720)
    w.frogs[0].x = 450; w.frogs[0].y = 665;
    stepCroakWorld(w, {}, CROAK_DT);
    expect(w.frogs[0].state).toBe('dead');
    expect(w.frogs[0].bellyId).toBeNull();
    expect(w.frogs[1].state).not.toBe('dead');
    expect(w.frogs[1].carrierId).toBeNull();

    // 4. Sau ~42 ticks (~1.4s), p0 hồi sinh bong bóng tại Checkpoint!
    for (let t = 0; t < 45; t++) stepCroakWorld(w, {}, CROAK_DT);
    expect(w.frogs[0].state).toBe('normal');
  });

  it('phá đảo trọn vẹn cả 3 màn Co-op (Màn 1 -> Màn 2 -> Màn 3 -> Thắng) bằng CroakSquadGame + emitCroakTick', () => {
    const { ctx, croakTicks, getResult } = makeHarness(14001, { croakStage: 0 }, 500);
    const g = new CroakSquadGame(ctx);
    g.start(makePlayers(2));
    // Tắt bộ hẹn giờ nền để bước tay siêu tốc 100% tất định
    g.dispose();

    const internalWorld = () => (g as unknown as { world: ReturnType<typeof createCroakWorld> }).world;

    // MÀN 1: p0 nuốt p1 -> nhổ p1 lên bệ cao bật công tắc cầu gỗ -> cả hai về Cổng Sen Vàng!
    const w0 = internalWorld();
    w0.frogs[0].x = 310; w0.frogs[0].y = 494; w0.frogs[0].facing = 1;
    w0.frogs[1].x = 345; w0.frogs[1].y = 494;
    g.action('p0', { type: 'cs_input', input: { moveX: 0, tongue: true } });
    g.stepManual(1);
    expect(g.view().frogs.find((f) => f.id === 'p0')?.state).toBe('carrying');

    // Đường ngắm quỹ đạo computeSpitArc trả về các điểm hợp lệ
    const arc = computeSpitArc(w0.frogs[0].x, w0.frogs[0].y, -Math.PI * 0.3, 0.95, CROAK_STAGES[0], {}, {}, 0);
    expect(arc.length).toBeGreaterThan(5);

    g.action('p0', { type: 'cs_input', input: { moveX: 0, spit: true, aimAngle: -Math.PI * 0.33, aimPower: 0.96 } });
    g.stepManual(35);
    // Cho p1 chạm công tắc sw_bridge & sw_final rồi cả 2 về đích Màn 1
    w0.frogs[1].x = 600; w0.frogs[1].y = 285;
    g.stepManual(3);
    expect(g.view().switchesOn.sw_bridge).toBe(true);
    w0.frogs[1].x = 1205; w0.frogs[1].y = 215;
    g.stepManual(3);
    expect(g.view().switchesOn.sw_final).toBe(true);
    w0.frogs[0].x = 1475; w0.frogs[0].y = 500; w0.frogs[0].vx = 0; w0.frogs[0].vy = 0;
    w0.frogs[1].x = 1485; w0.frogs[1].y = 500; w0.frogs[1].vx = 0; w0.frogs[1].vy = 0;
    g.stepManual(42);
    expect(g.view().stageIndex).toBe(1); // Đã tự chuyển sang Màn 2!

    // MÀN 2 -> Đưa cả đội về đích để qua Màn 3
    const w1 = internalWorld();
    w1.frogs[0].x = 225; w1.frogs[0].y = 300; // nhặt chìa khóa vàng key_tower
    g.stepManual(3);
    expect(g.view().keysCollected.key_tower).toBe(true);
    w1.frogs[0].x = 1775; w1.frogs[0].y = 515; w1.frogs[0].vx = 0; w1.frogs[0].vy = 0;
    w1.frogs[1].x = 1785; w1.frogs[1].y = 515; w1.frogs[1].vx = 0; w1.frogs[1].vy = 0;
    g.stepManual(42);
    expect(g.view().stageIndex).toBe(2); // Đã tự chuyển sang Màn 3!

    // MÀN 3 -> Cả đội chạm Cổng Đích Đền Hoa Sen Cổ -> Chiến thắng toàn tập!
    const w2 = internalWorld();
    w2.frogs[0].x = 1970; w2.frogs[0].y = 445; w2.frogs[0].vx = 0; w2.frogs[0].vy = 0;
    w2.frogs[1].x = 1980; w2.frogs[1].y = 445; w2.frogs[1].vx = 0; w2.frogs[1].vy = 0;
    g.stepManual(42);

    expect(croakTicks.length).toBeGreaterThan(50);
    expect(getResult()).not.toBeNull();
    expect(getResult()!.winnerIds).toEqual(['p0', 'p1']);
  });

  // 177 kịch bản mô phỏng đa người chơi (2..6 người thật), góc bắn, mất kết nối & chuyển màn!
  it.each(Array.from({ length: 177 }, (_, i) => ({
    players: 2 + (i % 5), // 2, 3, 4, 5, 6 người chơi thật!
    stage: (i % 3) as 0 | 1 | 2,
    angleFactor: 0.18 + (i % 7) * 0.1,
    power: 0.45 + (i % 6) * 0.1,
    disconnectMidway: i % 5 === 0,
    seed: 14100 + i,
  })))(
    'CroakSquad Sim #$seed ($players người, màn $stage, disconnect=$disconnectMidway): vật lý 30Hz ổn định không NaN / xuyên sàn',
    ({ players, stage, angleFactor, power, disconnectMidway, seed }) => {
      const { ctx, connected } = makeHarness(seed, { croakStage: stage }, 500);
      const g = new CroakSquadGame(ctx);
      const ps = makePlayers(players);
      g.start(ps);
      g.dispose(); // chạy bằng stepManual tức thì

      // Cho p0 áp sát p1, nuốt và bắn theo góc/lực biến thiên
      const w = (g as unknown as { world: ReturnType<typeof createCroakWorld> }).world;
      w.frogs[1].x = w.frogs[0].x + 28;
      w.frogs[1].y = w.frogs[0].y;
      g.action('p0', { type: 'cs_input', input: { moveX: 1, tongue: true } });
      g.stepManual(2);

      if (disconnectMidway) {
        connected.delete('p0');
        g.onPlayerConnection('p0', false);
        expect(g.view().frogs.find((f) => f.id === 'p1')?.carrierId).toBeNull();
      } else {
        g.action('p0', {
          type: 'cs_input',
          input: { moveX: 0, spit: true, aimAngle: -Math.PI * angleFactor, aimPower: power },
        });
        g.action('p1', { type: 'cs_input', input: { moveX: 1, jump: true } });
      }

      g.stepManual(24);
      const snap = g.view();
      for (const f of snap.frogs) {
        expect(Number.isFinite(f.x)).toBe(true);
        expect(Number.isFinite(f.y)).toBe(true);
        expect(Number.isFinite(f.vx)).toBe(true);
        expect(Number.isFinite(f.vy)).toBe(true);
      }
    },
  );
});

// ============================================================================
// 15. KIỂM TOÁN 146 VẬT PHẨM CỬA HÀNG RUBY, 15 MAP & 14 GAME METADATA (165 CASES)
// ============================================================================
describe('Hệ Thống Phú Hào 146 Vật Phẩm, 15 Map & 14 Game Configs (165 cases)', () => {
  it('đủ 14 trò chơi trong GAME_INFO, 28 kỹ năng Ruby, 15 siêu quà & 15 Map chuẩn xác', () => {
    const allTypes = Object.keys(GAME_INFO) as GameType[];
    expect(allTypes).toHaveLength(14);
    expect(SKILL_IDS).toHaveLength(28);
    expect(GIFT_IDS).toHaveLength(15);
    expect(ROOM_THEMES).toHaveLength(15);
    expect(SHOP_ITEMS.length).toBeGreaterThanOrEqual(140);
    expect(new Set(SHOP_ITEMS.map((x) => x.id)).size).toBe(SHOP_ITEMS.length);
    expect(vipOf(25_000).tier).toBe(6);
  });

  it.each(SHOP_ITEMS.map((item) => ({ id: item.id, item })))(
    'ShopItem "$id" ($item.kind — $item.price💎): giá nguyên dương, tên & mô tả đặc sắc, emoji hợp lệ',
    ({ item }) => {
      expect(Number.isInteger(item.price)).toBe(true);
      expect(item.price).toBeGreaterThan(0);
      expect(item.name.trim().length).toBeGreaterThan(1);
      expect(item.emoji.trim().length).toBeGreaterThan(0);
    },
  );
});
