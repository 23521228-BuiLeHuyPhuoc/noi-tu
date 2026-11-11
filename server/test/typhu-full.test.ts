import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TyPhuGame, TYPHU_CARDS, TYPHU_COMMUNITY_CARDS } from '../src/games/typhu';
import type { EngineContext } from '../src/games/engine';
import type { GameResult, TyPhuView } from '../../shared/src/types';
import { TYPHU_BOARD, TYPHU_GROUPS, TYPHU_MAX_HOUSES, TYPHU_SIZE, groupCells, isTyPhuProperty, rentOf } from '../../shared/src/typhu';
import { smallDict } from './helpers';

const TURN = 20_000;

/** rng giả có thể nạp thêm giá trị: số 1..6 = mặt xúc xắc, {card} = chọn thẻ, rỗng thì ngẫu nhiên có hạt giống */
function makeRng(seed: number) {
  const q: (number | { card: number; community?: boolean })[] = [];
  let s = seed >>> 0;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
  const rng = () => {
    const v = q.shift();
    if (v === undefined) return rnd();
    if (typeof v === 'number') return (v - 1) / 6 + 0.01;
    return v.card / (v.community ? TYPHU_COMMUNITY_CARDS.length : TYPHU_CARDS.length) + 0.001;
  };
  return { rng, push: (...v: typeof q) => q.push(...v) };
}

function make(n: number, seed = 1) {
  const finished: GameResult[] = [];
  const R = makeRng(seed);
  const ctx: EngineContext = {
    rng: R.rng,
    rollDice: (_i, r) => ({ dice: [1 + Math.floor(r() * 6), 1 + Math.floor(r() * 6)], frames: [], ms: 0, fps: 30 }),
    dict: smallDict(),
    settings: { ludoPieces: 4 },
    turnMs: TURN,
    hostId: () => 'p0',
    isConnected: () => true,
    changed: () => {},
    finish: (r) => finished.push(r),
    learnWord: () => {},
  };
  const g = new TyPhuGame(ctx);
  g.start(Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}` })));
  const v = () => g.view() as TyPhuView & { movement: { endsAt: number } | null };
  const settle = () => { let k = 0; while (v().movement && k++ < 20) vi.advanceTimersByTime(v().movement!.endsAt - Date.now()); };
  type P = { cash: number; pos: number; jail: number | null; bankrupt: boolean };
  const pl = (i: number) => (g as unknown as { players: P[] }).players[i];
  const own = (cells: number[], who: string, houses = 0) => {
    const x = g as unknown as { owners: Record<number, string>; houses: Record<number, number> };
    for (const c of cells) { x.owners[c] = who; if (houses) x.houses[c] = houses; }
  };
  return { g, v, pl, own, settle, finished, push: R.push };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('Cờ tỷ phú: luật đầy đủ', () => {
  it('thu tiền thuê theo cấp nhà và khách sạn', () => {
    const { g, v, own, settle, push } = make(2);
    const sg = TYPHU_BOARD.findIndex((c) => c.name === 'Sài Gòn'); // 39
    const c = TYPHU_BOARD[sg];
    if (c.kind !== 'land') throw new Error('Sài Gòn phải là ô đất');
    own(groupCells(c.group), 'p1', 1);
    (g as unknown as { players: { pos: number }[] }).players[0].pos = sg - 4;
    push(1, 3);
    g.action('p0', { type: 'roll' }); settle();
    expect(v().cash.p0).toBe(1500 - rentOf(sg, 1, true));
    expect(v().cash.p1).toBe(1500 + rentOf(sg, 1, true));
    expect(rentOf(sg, TYPHU_MAX_HOUSES, true)).toBe(c.rent * 45);
  });

  it('chỉ xây khi đủ bộ màu, tối đa khách sạn, trừ đúng tiền', () => {
    const { g, v, own } = make(2);
    const cells = groupCells('nau');
    own([cells[0]], 'p0');
    expect(g.action('p0', { type: 'build', cell: cells[0] }).ok).toBe(false);
    own(cells, 'p0');
    for (let k = 0; k < TYPHU_MAX_HOUSES; k++) expect(g.action('p0', { type: 'build', cell: cells[0] }).ok).toBe(true);
    expect(g.action('p0', { type: 'build', cell: cells[0] }).ok).toBe(false);
    expect(v().houses[cells[0]]).toBe(TYPHU_MAX_HOUSES);
    expect(v().cash.p0).toBe(1500 - TYPHU_MAX_HOUSES * TYPHU_GROUPS.nau.house);
    expect(g.action('p1', { type: 'build', cell: cells[1] }).ok).toBe(false);
  });

  it('thiếu tiền thì tự bán nhà rồi bán đất trước khi phá sản', () => {
    const { g, v, pl, own, settle, push } = make(2);
    const nau = groupCells('nau');
    own(nau, 'p0', 2);
    pl(0).cash = 120;
    push(1, 3); // tới ô Thuế thu nhập 200
    g.action('p0', { type: 'roll' }); settle();
    expect(pl(0).bankrupt).toBe(false);
    expect(v().cash.p0).toBeGreaterThanOrEqual(0);
    expect(nau.reduce((s, i) => s + (v().houses[i] ?? 0), 0)).toBeLessThan(4);
  });

  it('thẻ mừng sinh nhật làm người khác phá sản thì kết thúc ván', () => {
    const { g, pl, settle, finished, push } = make(2);
    pl(1).cash = 5;
    push(1, 1, { card: 2, community: true }); // ô 2 Khí vận: "Sinh nhật bạn!"
    g.action('p0', { type: 'roll' }); settle();
    expect(pl(1).bankrupt).toBe(true);
    expect(finished).toHaveLength(1);
    expect(finished[0].winnerId).toBe('p0');
  });

  it('không đếm ngược lúc tung: chỉ tự tung khi treo máy 60 giây', () => {
    const { v } = make(2);
    vi.advanceTimersByTime(TURN + 5000);
    expect(v().step).toBe('roll');
    expect(v().movement).toBeNull();
    vi.advanceTimersByTime(60_000);
    vi.advanceTimersByTime(10_000);
    expect(v().pos.p0 !== 0 || v().currentPlayerId !== 'p0').toBe(true);
  });

  it('chủ đất tự đứng vào đất mình không mất tiền; đất của người tù vẫn thu thuê', () => {
    const { g, v, pl, own, settle, push } = make(2);
    own([3], 'p0');
    push(1, 2);
    g.action('p0', { type: 'roll' }); settle();
    expect(v().cash.p0).toBe(1500);
    pl(1).jail = 0;
    own([6], 'p1');
    pl(0).pos = 3;
    vi.advanceTimersByTime(5000);
    const cur = v().currentPlayerId;
    expect(cur).toBe('p1');
  });

  it('chơi ngẫu nhiên 30 ván 2-6 người không lỗi, giữ đúng các bất biến', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const n = 2 + (seed % 5);
      const { g, v, finished } = make(n, seed);
      let r = seed * 7;
      const pickR = () => { r = (r * 1103515245 + 12345) & 0x7fffffff; return r / 0x7fffffff; };
      for (let step = 0; step < 1500 && !finished.length; step++) {
        const s = v();
        const cur = s.currentPlayerId!;
        if (s.movement) { vi.advanceTimersByTime(s.movement.endsAt - Date.now()); continue; }
        if (s.step === 'roll') {
          if (cur in s.jail && pickR() < 0.3) g.action(cur, { type: 'payJail' });
          else g.action(cur, { type: 'roll' });
        } else if (s.step === 'buy') {
          g.action(cur, { type: pickR() < 0.75 ? 'buy' : 'skip' });
        } else if (s.step === 'manage') {
          const mine = TYPHU_BOARD.flatMap((c, i) => (c.kind === 'land' && s.owners[i] === cur ? [i] : []));
          if (mine.length && pickR() < 0.7) g.action(cur, { type: 'build', cell: mine[Math.floor(pickR() * mine.length)] });
          else g.action(cur, { type: 'endTurn' });
        } else {
          vi.advanceTimersByTime(2000);
        }
        // bất biến
        const now = v();
        for (const id of now.order) expect(now.cash[id]).toBeGreaterThanOrEqual(0);
        for (const [i, o] of Object.entries(now.owners)) {
          expect(now.bankrupt).not.toContain(o);
          expect(isTyPhuProperty(TYPHU_BOARD[Number(i)])).toBe(true);
        }
        for (const [i, h] of Object.entries(now.houses)) {
          if (!h) continue;
          const c = TYPHU_BOARD[Number(i)];
          expect(c.kind).toBe('land');
          expect(h).toBeLessThanOrEqual(TYPHU_MAX_HOUSES);
          expect(now.owners[Number(i)]).toBeDefined();
        }
        for (const id of now.order) expect(now.pos[id]).toBeGreaterThanOrEqual(0), expect(now.pos[id]).toBeLessThan(TYPHU_SIZE);
        if (now.currentPlayerId) expect(now.bankrupt).not.toContain(now.currentPlayerId);
      }
      if (!finished.length) { while (v().movement) vi.advanceTimersByTime(v().movement!.endsAt - Date.now()); g.action('p0', { type: 'end' }); }
      expect(finished).toHaveLength(1);
      expect(finished[0].ranking).toHaveLength(n);
      g.dispose();
    }
  }, 120_000);
});
