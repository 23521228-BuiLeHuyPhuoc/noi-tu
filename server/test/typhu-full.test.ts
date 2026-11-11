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
    expect(rentOf(sg, TYPHU_MAX_HOUSES, true)).toBe(c.rent * 9);
  });

  it('dừng ở đất của mình thì nâng đúng 1 cấp, không nhảy cóc', () => {
    const { g, v, own, settle, push } = make(2);
    own([3], 'p0');
    expect(g.action('p0', { type: 'build', cell: 3 }).ok).toBe(false); // chưa tới ô thì chưa xây được
    push(1, 2);
    g.action('p0', { type: 'roll' }); settle();
    expect(v().step).toBe('upgrade');
    expect(g.action('p0', { type: 'build', cell: 1 }).ok).toBe(false); // chỉ ô đang đứng
    expect(g.action('p0', { type: 'build', cell: 3, levels: 2 }).ok).toBe(false); // không nhảy cóc 2 cấp
    expect(g.action('p0', { type: 'build', cell: 3 }).ok).toBe(true);
    expect(v().houses[3]).toBe(1);
    expect(v().cash.p0).toBe(1500 - TYPHU_GROUPS.nau.house);
    expect(v().step).not.toBe('upgrade');
  });

  it('khách sạn rồi thì không hỏi nâng cấp nữa; bỏ qua nâng cấp thì sang lượt', () => {
    const { g, v, own, settle, push } = make(2);
    own([3], 'p0', TYPHU_MAX_HOUSES);
    push(1, 2);
    g.action('p0', { type: 'roll' }); settle();
    expect(v().step).not.toBe('upgrade');
    const b = make(2, 5);
    b.own([3], 'p0');
    b.push(1, 2);
    b.g.action('p0', { type: 'roll' }); b.settle();
    expect(b.g.action('p0', { type: 'skip' }).ok).toBe(true);
    expect(b.v().houses[3] ?? 0).toBe(0);
  });

  it('thuế và tiền phạt vào hũ, dừng Nghỉ chân thì ăn cả hũ', () => {
    const { g, v, pl, settle, push } = make(2);
    push(1, 3); // ô 4: thuế thu nhập 200
    g.action('p0', { type: 'roll' }); settle();
    expect(v().pot).toBe(200);
    vi.advanceTimersByTime(3000);
    pl(1).pos = 17;
    push(1, 2); // tới ô 20 Nghỉ chân
    g.action('p1', { type: 'roll' }); settle();
    expect(v().cash.p1).toBe(1700);
    expect(v().pot).toBe(0);
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
    g.action('p0', { type: 'skip' });
    pl(1).jail = 0;
    own([6], 'p1');
    pl(0).pos = 3;
    vi.advanceTimersByTime(5000);
    const cur = v().currentPlayerId;
    expect(cur).toBe('p1');
  });

  it('phá sản vì nợ người chơi khác thì chủ nợ nhận toàn bộ đất', () => {
    const { g, v, pl, own, settle, push } = make(2);
    const sg = TYPHU_BOARD.findIndex((c) => c.name === 'Sài Gòn');
    const hn = TYPHU_BOARD.findIndex((c) => c.name === 'Hà Nội');
    own([hn, sg], 'p1', 3);
    own([1], 'p0');
    pl(0).cash = 50;
    pl(0).pos = sg - 4;
    push(1, 3);
    g.action('p0', { type: 'roll' }); settle();
    expect(pl(0).bankrupt).toBe(true);
    expect(v().owners[1]).toBe('p1');
  });

  it('chỉnh tốc độ x2, x3 rút ngắn thời gian đi quân', () => {
    const { g, v, push } = make(2);
    expect(g.action('p1', { type: 'speed', value: 3 }).ok).toBe(true);
    expect(v().speed).toBe(3);
    expect(g.action('p1', { type: 'speed', value: 5 }).ok).toBe(false);
    push(2, 3);
    g.action('p0', { type: 'roll' });
    const m = v().movement!;
    expect(m.endsAt - (m as unknown as { startedAt: number }).startedAt).toBe(5 * 100);
  });

  it('đổ đôi được tung tiếp và view báo extraRoll', () => {
    const { g, v, settle, push } = make(2);
    push(2, 2);
    g.action('p0', { type: 'roll' }); settle();
    if (v().step === 'buy') g.action('p0', { type: 'skip' });
    expect(v().currentPlayerId).toBe('p0');
    expect(v().step).toBe('roll');
    expect(v().extraRoll).toBe(true);
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
        } else if (s.step === 'upgrade') {
          if (pickR() < 0.7) g.action(cur, { type: 'build', cell: s.pendingBuy! });
          if (v().step === 'upgrade') g.action(cur, { type: 'skip' });
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
        if (now.currentPlayerId && now.step !== 'wait') expect(now.bankrupt).not.toContain(now.currentPlayerId);
      }
      if (!finished.length) { while (v().movement) vi.advanceTimersByTime(v().movement!.endsAt - Date.now()); g.action('p0', { type: 'end' }); }
      expect(finished).toHaveLength(1);
      expect(finished[0].ranking).toHaveLength(n);
      g.dispose();
    }
  }, 120_000);
});
