import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LudoGame } from '../src/games/ludo';
import type { EngineContext } from '../src/games/engine';
import type { GameResult, LudoView } from '../../shared/src/types';
import { smallDict } from './helpers';

const TURN = 15_000;

/** rng trả về đúng các mặt xúc xắc cho trước */
function diceRng(faces: number[]) {
  const q = [...faces];
  return () => {
    const d = q.shift();
    if (d === undefined) throw new Error('hết xúc xắc giả');
    return (d - 1) / 6 + 0.01;
  };
}

function make(names: string[], faces: number[], opts: { pieces?: 2 | 4; away?: string[] } = {}) {
  const finished: GameResult[] = [];
  const changed = vi.fn();
  const ctx: EngineContext = {
    rng: diceRng(faces),
    dict: smallDict(),
    settings: { ludoPieces: opts.pieces ?? 4 },
    turnMs: TURN,
    hostId: () => 'p0',
    isConnected: (id) => !(opts.away ?? []).includes(id),
    changed,
    finish: (r) => finished.push(r),
  };
  const g = new LudoGame(ctx);
  g.start(names.map((n, i) => ({ id: `p${i}`, name: n })));
  /** đặt vị trí ngựa trực tiếp để dựng tình huống */
  const place = (pi: number, pieces: number[]) => {
    (g as unknown as { players: { pieces: number[] }[] }).players[pi].pieces = [...pieces];
  };
  const v = () => g.view() as LudoView;
  return { g, v, place, finished, changed };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('Cờ cá ngựa', () => {
  it('2 người ngồi đối diện (đỏ – vàng), ngựa nằm trong chuồng, chờ đổ xúc xắc', () => {
    const { v } = make(['An', 'Bình'], []);
    const s = v();
    expect(s.colors).toEqual(['red', 'yellow']);
    expect(s.pieces).toEqual([[-1, -1, -1, -1], [-1, -1, -1, -1]]);
    expect(s.step).toBe('roll');
    expect(s.currentPlayerId).toBe('p0');
  });

  it('chọn 2 ngựa thì mỗi người có 2 con', () => {
    const { v } = make(['An', 'Bình', 'Chi'], [], { pieces: 2 });
    expect(v().pieces).toEqual([[-1, -1], [-1, -1], [-1, -1]]);
    expect(v().colors).toEqual(['red', 'green', 'yellow']);
  });

  it('chưa ra quân mà đổ khác 1/6 thì mất lượt sau một chút', () => {
    const { g, v } = make(['An', 'Bình'], [3]);
    expect(g.action('p1', { type: 'roll' })).toEqual({ ok: false, reason: 'not_your_turn' });
    expect(g.action('p0', { type: 'roll' })).toEqual({ ok: true });
    expect(v().dice).toBe(3);
    expect(v().step).toBe('wait');
    expect(v().lastEvent).toEqual({ kind: 'noMove', playerId: 'p0' });
    vi.advanceTimersByTime(1400);
    expect(v().currentPlayerId).toBe('p1');
    expect(v().step).toBe('roll');
  });

  it('đổ 6 được ra quân và được đổ tiếp', () => {
    const { g, v } = make(['An', 'Bình'], [6]);
    g.action('p0', { type: 'roll' });
    expect(v().step).toBe('move');
    expect(v().legal).toEqual([0, 1, 2, 3]);
    expect(g.action('p0', { type: 'move', piece: 9 })).toEqual({ ok: false, reason: 'illegal_move' });
    expect(g.action('p0', { type: 'move', piece: 2 })).toEqual({ ok: true });
    expect(v().pieces[0]).toEqual([-1, -1, 0, -1]);
    expect(v().lastEvent).toEqual({ kind: 'exit', playerId: 'p0' });
    expect(v().currentPlayerId).toBe('p0');
    expect(v().step).toBe('roll');
  });

  it('đổ 1 cũng được ra quân; ô xuất phát có ngựa mình thì không ra thêm được', () => {
    const { g, v, place } = make(['An', 'Bình'], [1]);
    place(0, [0, -1, -1, -1]);
    g.action('p0', { type: 'roll' });
    // chỉ con đang ở ô 0 đi được (lên ô 1) -> tự đi
    expect(v().legal).toEqual([0]);
    vi.advanceTimersByTime(800);
    expect(v().pieces[0]).toEqual([1, -1, -1, -1]);
    expect(v().currentPlayerId).toBe('p1');
  });

  it('không được đi qua đầu ngựa khác', () => {
    const { g, v, place } = make(['An', 'Bình'], [4]);
    place(0, [3, -1, -1, -1]); // đỏ ở ô 3
    place(1, [31, -1, -1, -1]); // vàng ở ô (26+31)%52 = 5
    g.action('p0', { type: 'roll' });
    expect(v().legal).toEqual([]);
    expect(v().lastEvent).toEqual({ kind: 'noMove', playerId: 'p0' });
  });

  it('dừng đúng ô ngựa đối thủ thì đá về chuồng', () => {
    const { g, v, place } = make(['An', 'Bình'], [2]);
    place(0, [3, -1, -1, -1]);
    place(1, [31, -1, -1, -1]);
    g.action('p0', { type: 'roll' });
    vi.advanceTimersByTime(800); // chỉ 1 nước -> tự đi
    expect(v().pieces[0][0]).toBe(5);
    expect(v().pieces[1][0]).toBe(-1);
    expect(v().lastEvent).toEqual({ kind: 'capture', playerId: 'p0', victimId: 'p1' });
  });

  it('không được dừng lên ngựa mình', () => {
    const { g, v, place } = make(['An', 'Bình'], [2]);
    place(0, [3, 5, -1, -1]);
    g.action('p0', { type: 'roll' });
    // con 0 (3->5) bị chặn bởi con 1; con 1 (5->7) đi được
    expect(v().legal).toEqual([1]);
  });

  it('về đích phải đổ vừa đủ, đổ dư thì không đi được', () => {
    const { g, v, place } = make(['An', 'Bình'], [5, 3]);
    place(0, [53, 56, 56, 56]);
    g.action('p0', { type: 'roll' }); // 53+5 = 58 > 56
    expect(v().legal).toEqual([]);
    vi.advanceTimersByTime(1400);
    expect(v().currentPlayerId).toBe('p1');
  });

  it('con cuối cùng về đích thì thắng ngay', () => {
    const { g, finished, place } = make(['An', 'Bình'], [3]);
    place(0, [53, 56, 56, 56]);
    place(1, [10, 20, -1, -1]);
    g.action('p0', { type: 'roll' });
    vi.advanceTimersByTime(800);
    expect(finished).toHaveLength(1);
    expect(finished[0].winnerId).toBe('p0');
    expect(finished[0].ranking.map((r) => r.playerId)).toEqual(['p0', 'p1']);
    expect(finished[0].ranking[0].detail).toBe('4/4 ngựa về đích');
  });

  it('đổ 6 ba lần liên tiếp thì mất lượt', () => {
    const { g, v, place } = make(['An', 'Bình'], [6, 6, 6]);
    place(0, [10, 20, 30, 40]);
    for (let i = 0; i < 2; i++) {
      g.action('p0', { type: 'roll' });
      g.action('p0', { type: 'move', piece: v().legal[0] });
    }
    g.action('p0', { type: 'roll' });
    expect(v().lastEvent).toEqual({ kind: 'threeSixes', playerId: 'p0' });
    vi.advanceTimersByTime(1400);
    expect(v().currentPlayerId).toBe('p1');
  });

  it('hết giờ thì tự đổ và tự đi, ưu tiên đá ngựa', () => {
    const { v, place } = make(['An', 'Bình'], [2]);
    place(0, [3, 10, -1, -1]);
    place(1, [31, -1, -1, -1]); // ô 5
    vi.advanceTimersByTime(TURN); // tự đổ ra 2
    expect(v().dice).toBe(2);
    expect(v().legal).toEqual([0, 1]);
    vi.advanceTimersByTime(TURN); // tự đi: con 0 đá được ngựa vàng
    expect(v().pieces[0][0]).toBe(5);
    expect(v().pieces[1][0]).toBe(-1);
  });

  it('người mất kết nối được tự đi sau vài giây', () => {
    const { v } = make(['An', 'Bình'], [3], { away: ['p0'] });
    vi.advanceTimersByTime(2500);
    expect(v().dice).toBe(3);
  });

  it('người chơi thoát: ngựa bị dọn khỏi bàn; còn 1 người thì người đó thắng', () => {
    const { g, v, finished, place } = make(['An', 'Bình', 'Chi'], []);
    place(1, [5, -1, -1, -1]);
    g.removePlayer('p1');
    expect(v().left).toEqual(['p1']);
    expect(v().pieces[1]).toEqual([-1, -1, -1, -1]);
    g.removePlayer('p0');
    expect(finished[0].winnerId).toBe('p2');
  });

  it('người đang tới lượt thoát thì chuyển lượt cho người kế tiếp', () => {
    const { g, v } = make(['An', 'Bình', 'Chi'], []);
    g.removePlayer('p0');
    expect(v().currentPlayerId).toBe('p1');
  });
});
