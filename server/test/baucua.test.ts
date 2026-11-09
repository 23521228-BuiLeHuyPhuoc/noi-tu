import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BauCuaGame } from '../src/games/baucua';
import type { EngineContext } from '../src/games/engine';
import { BAUCUA_SYMBOLS, type BauCuaSymbol, type BauCuaView, type GameResult } from '../../shared/src/types';
import { smallDict } from './helpers';

const BET = 20_000;
const ROLL = 2600;
const RESULT = 5000;

/** rng trả về đúng các con vật cho trước khi lắc */
function symbolRng(rolls: BauCuaSymbol[]) {
  const q = [...rolls];
  return () => {
    const s = q.shift();
    if (!s) throw new Error('hết kết quả giả');
    return BAUCUA_SYMBOLS.indexOf(s) / 6 + 0.01;
  };
}

function make(names: string[], rolls: BauCuaSymbol[] = []) {
  const finished: GameResult[] = [];
  let host = 'p0';
  const ctx: EngineContext = {
    rng: symbolRng(rolls),
    dict: smallDict(),
    settings: { ludoPieces: 4 },
    turnMs: BET,
    hostId: () => host,
    isConnected: () => true,
    changed: vi.fn(),
    finish: (r) => finished.push(r),
  };
  const g = new BauCuaGame(ctx);
  g.start(names.map((n, i) => ({ id: `p${i}`, name: n })));
  const v = () => g.view() as BauCuaView;
  return { g, v, finished, setHost: (h: string) => (host = h) };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('Bầu cua', () => {
  it('mỗi người bắt đầu với 1.000 xu, đang đặt cược', () => {
    const { v } = make(['An', 'Bình']);
    expect(v().balances).toEqual({ p0: 1000, p1: 1000 });
    expect(v().step).toBe('betting');
    expect(v().round).toBe(1);
    expect(v().dice).toBeNull();
  });

  it('đặt cược cộng dồn, không vượt quá số xu đang có', () => {
    const { g, v } = make(['An']);
    expect(g.action('p0', { type: 'bet', symbol: 'cua', amount: 500 })).toEqual({ ok: true });
    expect(g.action('p0', { type: 'bet', symbol: 'cua', amount: 100 })).toEqual({ ok: true });
    expect(g.action('p0', { type: 'bet', symbol: 'ga', amount: 500 })).toEqual({ ok: false, reason: 'insufficient' });
    expect(g.action('p0', { type: 'bet', symbol: 'ga', amount: 400 })).toEqual({ ok: true });
    expect(v().bets.p0).toEqual({ cua: 600, ga: 400 });
    expect(g.action('p0', { type: 'bet', symbol: 'rong' as never, amount: 10 })).toEqual({ ok: false, reason: 'bad_action' });
    expect(g.action('p0', { type: 'bet', symbol: 'ga', amount: -5 })).toEqual({ ok: false, reason: 'bad_action' });
    expect(g.action('p0', { type: 'clearBets' })).toEqual({ ok: true });
    expect(v().bets.p0).toEqual({});
  });

  it('mở bát: trúng k lần ăn cược × k, trượt mất cược', () => {
    const { g, v } = make(['An', 'Bình'], ['cua', 'cua', 'ga']);
    g.action('p0', { type: 'bet', symbol: 'cua', amount: 100 }); // trúng 2 -> +200
    g.action('p0', { type: 'bet', symbol: 'nai', amount: 50 }); // trượt -> -50
    g.action('p1', { type: 'bet', symbol: 'ga', amount: 10 }); // trúng 1 -> +10
    vi.advanceTimersByTime(BET);
    expect(v().step).toBe('rolling');
    expect(v().dice).toBeNull(); // chưa mở bát thì chưa lộ
    vi.advanceTimersByTime(ROLL);
    const s = v();
    expect(s.step).toBe('result');
    expect(s.dice).toEqual(['cua', 'cua', 'ga']);
    expect(s.lastDeltas).toEqual({ p0: 150, p1: 10 });
    expect(s.balances).toEqual({ p0: 1150, p1: 1010 });
    expect(s.bets).toEqual({ p0: {}, p1: {} });
    expect(s.recent).toEqual([['cua', 'cua', 'ga']]);
    vi.advanceTimersByTime(RESULT);
    expect(v().step).toBe('betting');
    expect(v().round).toBe(2);
  });

  it('chỉ chủ phòng được lắc sớm và tổng kết', () => {
    const { g, v, finished } = make(['An', 'Bình'], ['tom', 'tom', 'tom']);
    expect(g.action('p1', { type: 'shake' })).toEqual({ ok: false, reason: 'not_host' });
    expect(g.action('p0', { type: 'shake' })).toEqual({ ok: true });
    expect(v().step).toBe('rolling');
    expect(g.action('p0', { type: 'bet', symbol: 'tom', amount: 10 })).toEqual({ ok: false, reason: 'not_betting' });
    expect(g.action('p1', { type: 'end' })).toEqual({ ok: false, reason: 'not_host' });
    expect(g.action('p0', { type: 'end' })).toEqual({ ok: true });
    expect(finished).toHaveLength(1);
  });

  it('cháy túi thì được vay nóng 500 xu, bị ghi nợ; còn xu thì không cho vay', () => {
    const { g, v } = make(['An'], ['ga', 'ga', 'ga']);
    expect(g.action('p0', { type: 'loan' })).toEqual({ ok: false, reason: 'loan_denied' });
    g.action('p0', { type: 'bet', symbol: 'cua', amount: 1000 });
    vi.advanceTimersByTime(BET + ROLL);
    expect(v().balances.p0).toBe(0);
    expect(g.action('p0', { type: 'loan' })).toEqual({ ok: true });
    expect(v().balances.p0).toBe(500);
    expect(v().debts.p0).toBe(1);
  });

  it('tổng kết: xếp hạng theo xu sau khi trừ nợ', () => {
    const { g, finished } = make(['An', 'Bình'], ['cua', 'cua', 'cua']);
    g.action('p0', { type: 'bet', symbol: 'ga', amount: 1000 }); // mất hết
    g.action('p1', { type: 'bet', symbol: 'cua', amount: 100 }); // +300
    vi.advanceTimersByTime(BET + ROLL);
    g.action('p0', { type: 'loan' }); // 500 xu, nợ 1 -> tài sản ròng 0
    g.action('p0', { type: 'end' });
    const r = finished[0];
    expect(r.winnerId).toBe('p1');
    expect(r.ranking.map((x) => x.playerId)).toEqual(['p1', 'p0']);
    expect(r.ranking[0].detail).toBe('1.300 xu');
    expect(r.ranking[1].detail).toBe('0 xu · nợ 1 lần');
  });

  it('người chơi thoát: bỏ cược của họ, chủ phòng mới vẫn điều khiển được', () => {
    const { g, v, setHost } = make(['An', 'Bình']);
    g.action('p1', { type: 'bet', symbol: 'ca', amount: 100 });
    g.removePlayer('p0');
    setHost('p1');
    expect(Object.keys(v().balances)).toEqual(['p1']);
    expect(g.action('p1', { type: 'end' })).toEqual({ ok: true });
  });
});
