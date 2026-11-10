import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TyPhuGame, TYPHU_CARDS } from '../src/games/typhu';
import type { EngineContext } from '../src/games/engine';
import type { GameResult, TyPhuView } from '../../shared/src/types';
import { TYPHU_BOARD, rentOf } from '../../shared/src/typhu';
import { smallDict } from './helpers';

const TURN = 20_000;
const WAIT = 1600;

/** rng trả về các giá trị cho trước: số 1..6 cho xúc xắc, hoặc {card: i} để rút thẻ thứ i */
function seq(values: (number | { card: number })[]) {
  const q = [...values];
  return () => {
    const v = q.shift();
    if (v === undefined) throw new Error('hết giá trị giả');
    if (typeof v === 'number') return (v - 1) / 6 + 0.01;
    return v.card / TYPHU_CARDS.length + 0.001;
  };
}

function make(names: string[], values: (number | { card: number })[] = [], away: string[] = []) {
  const finished: GameResult[] = [];
  const ctx: EngineContext = {
    rng: seq(values),
    dict: smallDict(),
    settings: { ludoPieces: 4 },
    turnMs: TURN,
    hostId: () => 'p0',
    isConnected: (id) => !away.includes(id),
    changed: vi.fn(),
    finish: (r) => finished.push(r),
  };
  const g = new TyPhuGame(ctx);
  g.start(names.map((n, i) => ({ id: `p${i}`, name: n })));
  const v = () => g.view() as TyPhuView;
  type P = { cash: number; pos: number; jail: number | null };
  const pl = (i: number) => (g as unknown as { players: P[] }).players[i];
  const own = (cells: number[], who: string) => {
    for (const c of cells) (g as unknown as { owners: Record<number, string> }).owners[c] = who;
  };
  return { g, v, pl, own, finished };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('Cờ tỷ phú', () => {
  it('bàn có 28 ô, 18 ô đất; mỗi người 1.500 xu ở Xuất phát', () => {
    expect(TYPHU_BOARD).toHaveLength(28);
    expect(TYPHU_BOARD.filter((c) => c.kind === 'land')).toHaveLength(18);
    const { v } = make(['An', 'Bình']);
    expect(v().cash).toEqual({ p0: 1500, p1: 1500 });
    expect(v().pos).toEqual({ p0: 0, p1: 0 });
    expect(v().step).toBe('roll');
  });

  it('đổ xúc xắc, dừng ở đất trống thì được mua', () => {
    const { g, v } = make(['An', 'Bình'], [1, 3]); // 4 ô -> Sóc Trăng (80)
    expect(g.action('p1', { type: 'roll' })).toEqual({ ok: false, reason: 'not_your_turn' });
    g.action('p0', { type: 'roll' });
    expect(v().pos.p0).toBe(4);
    expect(v().step).toBe('buy');
    expect(v().pendingBuy).toBe(4);
    expect(g.action('p0', { type: 'buy' })).toEqual({ ok: true });
    expect(v().owners[4]).toBe('p0');
    expect(v().cash.p0).toBe(1420);
    expect(v().log.at(-1)?.text).toContain('mua Sóc Trăng');
    vi.advanceTimersByTime(WAIT);
    expect(v().currentPlayerId).toBe('p1');
  });

  it('bỏ qua hoặc hết giờ thì không mua', () => {
    const { g, v } = make(['An', 'Bình'], [1, 3]);
    g.action('p0', { type: 'roll' });
    vi.advanceTimersByTime(TURN);
    expect(v().owners[4]).toBeUndefined();
    expect(v().log.at(-1)?.text).toContain('bỏ qua');
  });

  it('dừng ở đất người khác thì trả tiền thuê; đủ bộ màu thì gấp đôi', () => {
    const { g, v, own } = make(['An', 'Bình'], [1, 3, 1, 3]);
    own([4], 'p1');
    g.action('p0', { type: 'roll' });
    expect(v().cash.p0).toBe(1500 - 8);
    expect(v().cash.p1).toBe(1500 + 8);
    // đủ bộ Miền Tây (1, 3, 4)
    own([1, 3], 'p1');
    expect(rentOf(4, 0, true)).toBe(16);
  });

  it('có đủ bộ màu thì xây nhà, tiền thuê tăng theo số nhà', () => {
    const { g, v, own } = make(['An', 'Bình']);
    own([1, 3, 4], 'p0');
    expect(g.action('p0', { type: 'build', cell: 6 })).toEqual({ ok: false, reason: 'cannot_build' });
    expect(g.action('p0', { type: 'build', cell: 4 })).toEqual({ ok: true });
    expect(g.action('p0', { type: 'build', cell: 4 })).toEqual({ ok: true });
    expect(v().houses[4]).toBe(2);
    expect(v().cash.p0).toBe(1400);
    expect(rentOf(4, 2, true)).toBe(8 * 15);
    expect(g.action('p1', { type: 'build', cell: 4 })).toEqual({ ok: false, reason: 'not_your_turn' });
  });

  it('chưa đủ bộ thì không xây được', () => {
    const { g, own } = make(['An', 'Bình']);
    own([1, 3], 'p0');
    expect(g.action('p0', { type: 'build', cell: 1 })).toEqual({ ok: false, reason: 'cannot_build' });
  });

  it('qua Xuất phát được 200 xu', () => {
    const { g, v, pl } = make(['An', 'Bình'], [2, 3]);
    pl(0).pos = 24; // Đà Lạt -> +5 = ô 1 (Cà Mau)
    g.action('p0', { type: 'roll' });
    expect(v().pos.p0).toBe(1);
    expect(v().cash.p0).toBe(1700);
  });

  it('dừng ô Vào tù thì về Nhà tù; ở tù đổ đôi thì ra, không thì ngồi tiếp, đủ 3 lượt thì nộp phạt', () => {
    const { g, v, pl } = make(['An', 'Bình'], [3, 4, 1, 2, 1, 2, 2, 3, 4, 5, 2, 3, 1, 5]);
    pl(0).pos = 14; // +7 = 21 (Vào tù)
    g.action('p0', { type: 'roll' });
    expect(v().pos.p0).toBe(7);
    expect(v().jail.p0).toBe(0);
    vi.advanceTimersByTime(WAIT);
    g.action('p1', { type: 'roll' }); // p1: 1+2 -> ô 3, mua? chờ hết giờ
    vi.advanceTimersByTime(TURN + WAIT);
    g.action('p0', { type: 'roll' }); // 1+2: không đôi -> ngồi 1/3
    expect(v().jail.p0).toBe(1);
    vi.advanceTimersByTime(WAIT);
    g.action('p1', { type: 'roll' }); // 2+3 -> ô 8
    vi.advanceTimersByTime(TURN + WAIT);
    g.action('p0', { type: 'roll' }); // 4+5 -> 2/3
    expect(v().jail.p0).toBe(2);
    vi.advanceTimersByTime(WAIT);
    g.action('p1', { type: 'roll' }); // 2+3 -> ô 13
    vi.advanceTimersByTime(TURN + WAIT);
    const before = v().cash.p0;
    g.action('p0', { type: 'roll' }); // 1+5: đủ 3 lượt -> nộp 50 rồi đi 6 ô -> ô 13
    expect(v().jail.p0).toBeUndefined();
    expect(v().pos.p0).toBe(13);
    expect(v().cash.p0).toBeLessThanOrEqual(before - 50);
  });

  it('ở tù có thể nộp 50 xu để ra ngay', () => {
    const { g, v, pl } = make(['An', 'Bình']);
    pl(0).jail = 0;
    pl(0).pos = 7;
    expect(g.action('p0', { type: 'payJail' })).toEqual({ ok: true });
    expect(v().jail.p0).toBeUndefined();
    expect(v().cash.p0).toBe(1450);
  });

  it('rút thẻ cơ hội: trúng vé số +150', () => {
    const { g, v } = make(['An', 'Bình'], [1, 1, { card: 0 }]); // ô 2 = Cơ hội, đôi
    g.action('p0', { type: 'roll' });
    expect(v().card?.text).toContain('vé số');
    expect(v().cash.p0).toBe(1650);
    // đổ đôi nên được đổ tiếp
    expect(v().step).toBe('roll');
    expect(v().currentPlayerId).toBe('p0');
  });

  it('thẻ "sinh nhật": mỗi người khác mừng 30 xu', () => {
    const { g, v } = make(['An', 'Bình', 'Chi'], [1, 1, { card: 2 }]);
    g.action('p0', { type: 'roll' });
    expect(v().cash).toEqual({ p0: 1560, p1: 1470, p2: 1470 });
  });

  it('đổ đôi 3 lần liên tiếp thì vào tù', () => {
    const { g, v, own } = make(['An', 'Bình'], [2, 2, 2, 2, 3, 3]);
    own([4, 8], 'p1'); // tránh bước mua đất
    g.action('p0', { type: 'roll' }); // ô 4 (đất p1) -> trả thuê, đổ tiếp
    expect(v().step).toBe('roll');
    g.action('p0', { type: 'roll' }); // ô 8 (đất p1)
    g.action('p0', { type: 'roll' }); // đôi lần 3 -> vào tù
    expect(v().pos.p0).toBe(7);
    expect(v().jail.p0).toBe(0);
  });

  it('thiếu tiền thì tự bán đất; vẫn thiếu thì phá sản và người còn lại thắng', () => {
    const { g, v, pl, own, finished } = make(['An', 'Bình'], [1, 3]);
    own([4], 'p1');
    (g as unknown as { houses: Record<number, number> }).houses[4] = 4; // khách sạn: 8×45 = 360
    own([1, 3], 'p1');
    pl(0).cash = 100;
    own([6], 'p0'); // Châu Đốc 100 -> bán được 50
    g.action('p0', { type: 'roll' }); // tới ô 4, phải trả 360
    expect(v().bankrupt).toEqual(['p0']);
    expect(v().owners[6]).toBeUndefined();
    expect(finished).toHaveLength(1);
    expect(finished[0].winnerId).toBe('p1');
    expect(finished[0].ranking[1].detail).toBe('phá sản');
  });

  it('chủ phòng tổng kết sớm: xếp theo tổng tài sản', () => {
    const { g, own, pl, finished } = make(['An', 'Bình']);
    own([27], 'p1'); // Sài Gòn 350
    pl(1).cash = 1400;
    expect(g.action('p1', { type: 'end' })).toEqual({ ok: false, reason: 'not_host' });
    g.action('p0', { type: 'end' });
    expect(finished[0].winnerId).toBe('p1');
    expect(finished[0].ranking[0].detail).toBe('tài sản 1.750 xu');
  });

  it('hết giờ thì tự đổ; người mất kết nối được đi thay sau vài giây', () => {
    const { v } = make(['An', 'Bình'], [2, 3], ['p0']);
    vi.advanceTimersByTime(2500);
    expect(v().dice).toEqual([2, 3]);
  });

  it('người chơi thoát giữa ván: phá sản, đất trả về ngân hàng', () => {
    const { g, v, own } = make(['An', 'Bình', 'Chi']);
    own([1], 'p1');
    g.removePlayer('p1');
    expect(v().bankrupt).toEqual(['p1']);
    expect(v().owners[1]).toBeUndefined();
    g.removePlayer('p0');
    expect(v().bankrupt).toContain('p0');
  });
});
