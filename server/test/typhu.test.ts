import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TyPhuGame, TYPHU_CARDS } from '../src/games/typhu';
import type { EngineContext } from '../src/games/engine';
import type { GameResult, TyPhuView } from '../../shared/src/types';
import { TYPHU_BOARD, TYPHU_MOVE_STEP_MS, rentOf, typhuCellPos, stationRent, utilityRent } from '../../shared/src/typhu';
import { simulateThrow } from '../src/games/dice3d';
import { DICE_DEFAULT_IMPULSE, DICE_FRAME_STRIDE, TRAY_HX, TRAY_HZ, sanitizeImpulse } from '../../shared/src/dice';
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
    // test: mặt xúc xắc lấy từ dãy giả như trước (bỏ qua mô phỏng vật lý)
    rollDice: (_i, r) => {
      const d1 = 1 + Math.floor(r() * 6);
      const d2 = 1 + Math.floor(r() * 6);
      return { dice: [d1, d2], frames: [], ms: 0, fps: 30 };
    },
    dict: smallDict(),
    settings: { ludoPieces: 4 },
    turnMs: TURN,
    hostId: () => 'p0',
    isConnected: (id) => !away.includes(id),
    changed: vi.fn(),
    finish: (r) => finished.push(r),
    learnWord: () => {},
  };
  const g = new TyPhuGame(ctx);
  g.start(names.map((n, i) => ({ id: `p${i}`, name: n })));
  const v = () => g.view();
  const settle = () => { while (v().movement) vi.advanceTimersByTime(v().movement!.endsAt - Date.now()); };
  type P = { cash: number; pos: number; jail: number | null };
  const pl = (i: number) => (g as unknown as { players: P[] }).players[i];
  const own = (cells: number[], who: string) => {
    for (const c of cells) (g as unknown as { owners: Record<number, string> }).owners[c] = who;
  };
  return { g, v, pl, own, finished, settle };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());


describe('Cờ tỷ phú V2', () => {
 it('has exactly 32 perimeter cells and the complete property mix', () => {
  expect(TYPHU_BOARD).toHaveLength(32);
  for (const [kind, count] of Object.entries({land:16, station:4, utility:2, chance:2, community:2, tax:2}))
   expect(TYPHU_BOARD.filter(c => c.kind === kind)).toHaveLength(count);
  expect([0,8,16,24].map(i => TYPHU_BOARD[i].kind)).toEqual(['start','jail','rest','gotojail']);
  expect(new Set(TYPHU_BOARD.map((_, i) => typhuCellPos(i).join(','))).size).toBe(32);
 });
 it('locks actions until authoritative movement finishes, exposes reconnect-safe timing, then buys', () => {
  const {g,v,settle}=make(['An','Bình'],[1,2]);
  g.action('p0',{type:'roll'});
  expect(v().movement?.path).toEqual([1,2,3]); expect(v().step).toBe('wait');
  expect(g.action('p0',{type:'buy'}).ok).toBe(false);
  expect(g.action('p0',{type:'roll'}).ok).toBe(false);
  expect(g.action('p0',{type:'end'}).ok).toBe(false);
  const snap=v(); snap.movement!.path.length=0; expect(v().movement?.path).toHaveLength(3);
  settle(); expect(v().pendingBuy).toBe(3); expect(g.action('p0',{type:'buy'}).ok).toBe(true);
  expect(v().cash.p0).toBe(1440); expect(v().owners[3]).toBe('p0');
 });
 it('times out buying and advances the turn', () => {
  const {g,v,settle}=make(['An','Bình'],[1,2]); g.action('p0',{type:'roll'});settle();
  vi.advanceTimersByTime(TURN+WAIT);expect(v().currentPlayerId).toBe('p1');expect(v().owners[3]).toBeUndefined();
 });
 it('charges land rent and allows full-group construction', () => {
  const {g,v,own,settle}=make(['An','Bình'],[1,2]); own([1,3],'p1');
  g.action('p0',{type:'roll'});settle();expect(v().cash.p0).toBe(1488);
  expect(rentOf(3,2,true)).toBe(90);
  const b=make(['An','Bình']);b.own([1,3],'p0');expect(b.g.action('p0',{type:'build',cell:1}).ok).toBe(true);
  expect(b.v().houses[1]).toBe(1);expect(b.v().cash.p0).toBe(1450);
 });
 it('buys stations and utilities and scales their rent by owned count', () => {
  expect([1,2,3,4].map(stationRent)).toEqual([25,50,100,200]);expect(utilityRent(2,7)).toBe(70);
  const a=make(['An','Bình'],[2,3]); a.g.action('p0',{type:'roll'});a.settle();
  expect(a.v().pendingBuy).toBe(5); a.g.action('p0',{type:'buy'});expect(a.v().cash.p0).toBe(1300);
  const b=make(['An','Bình'],[2,3]);b.own([5,12,20],'p1');b.g.action('p0',{type:'roll'});b.settle();expect(b.v().cash.p0).toBe(1400);
  const c=make(['An','Bình'],[3,4]);c.pl(0).pos=3;c.own([10,22],'p1');c.g.action('p0',{type:'roll'});c.settle();expect(c.v().cash.p0).toBe(1430);
  expect(c.g.action('p0',{type:'build',cell:10}).ok).toBe(false);
 });
 it('draws community cards separately and preserves doubles', () => {
  const {g,v,settle}=make(['An','Bình'],[1,1,{card:0}]);g.action('p0',{type:'roll'});settle();
  expect(v().card?.text).toContain('hoàn thuế');expect(v().cash.p0).toBe(1600);expect(v().step).toBe('roll');
 });
 it('draws chance and publishes chained card movement', () => {
  const {g,v,pl,settle}=make(['An','Bình'],[1,2,{card:6}]);pl(0).pos=15;g.action('p0',{type:'roll'});
  vi.advanceTimersByTime(v().movement!.endsAt-Date.now());expect(v().movement?.kind).toBe('card');
  settle();expect(v().pos.p0).toBe(0);expect(v().cash.p0).toBe(1700);
 });
 it('passes start, charges tax and sends players to jail', () => {
  const a=make(['An','Bình'],[2,3]);a.pl(0).pos=28;a.g.action('p0',{type:'roll'});a.settle();expect(a.v().cash.p0).toBe(1700);
  const b=make(['An','Bình'],[1,3]);b.g.action('p0',{type:'roll'});b.settle();expect(b.v().cash.p0).toBe(1300);
  const c=make(['An','Bình'],[1,3]);c.pl(0).pos=20;c.g.action('p0',{type:'roll'});c.settle();expect(c.v().pos.p0).toBe(8);expect(c.v().jail.p0).toBe(0);
 });
 it('handles jail release, third doubles, liquidation, bankruptcy and asset ranking', () => {
  const a=make(['An','Bình']);a.pl(0).jail=0;expect(a.g.action('p0',{type:'payJail'}).ok).toBe(true);expect(a.v().cash.p0).toBe(1450);
  const b=make(['An','Bình'],[2,2]);(b.g as unknown as {players:{doubles:number}[]}).players[0].doubles=2;b.g.action('p0',{type:'roll'});expect(b.v().jail.p0).toBe(0);
  const c=make(['An','Bình'],[1,3]);c.pl(0).cash=1;c.own([5],'p0');c.g.action('p0',{type:'roll'});c.settle();expect(c.v().bankrupt).toEqual(['p0']);expect(c.finished[0].winnerId).toBe('p1');expect(c.v().owners[5]).toBeUndefined();
  const d=make(['An','Bình']);d.own([5,13],'p1');d.g.action('p0',{type:'end'});expect(d.finished[0].winnerId).toBe('p1');
 });
 it('keeps jailed players in place, releases doubles and charges on the third failed attempt', () => {
  const a=make(['An','Bình'],[1,2]);a.pl(0).jail=0;a.pl(0).pos=8;a.g.action('p0',{type:'roll'});
  expect(a.v().jail.p0).toBe(1);expect(a.v().pos.p0).toBe(8);expect(a.v().movement).toBeNull();
  const b=make(['An','Bình'],[1,1]);b.pl(0).jail=1;b.pl(0).pos=8;b.g.action('p0',{type:'roll'});b.settle();
  expect(b.v().jail.p0).toBeUndefined();expect(b.v().pos.p0).toBe(10);expect(b.v().step).toBe('buy');
  b.g.action('p0',{type:'skip'});expect(b.v().step).toBe('wait');
  const c=make(['An','Bình'],[1,2]);c.pl(0).jail=2;c.pl(0).pos=8;c.g.action('p0',{type:'roll'});c.settle();
  expect(c.v().jail.p0).toBeUndefined();expect(c.v().pos.p0).toBe(11);expect(c.v().cash.p0).toBe(1450);
 });
 it('clears moving callbacks when the current player leaves', () => {
  const {g,v,settle}=make(['An','Bình','Chi'],[1,2]);g.action('p0',{type:'roll'});g.removePlayer('p0');
  expect(v().movement).toBeNull();expect(v().currentPlayerId).toBe('p1');
 });
});

describe('Xúc xắc 3D vật lý và nhịp chơi', () => {
  const noise = (seed: number) => { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; };

  it('mô phỏng xác định: cùng cú tung + cùng nhiễu cho cùng mặt và cùng khung hình', () => {
    const a = simulateThrow({ x: 0.9, z: -0.2, p: 0.7 }, noise(7));
    const b = simulateThrow({ x: 0.9, z: -0.2, p: 0.7 }, noise(7));
    expect(a.dice).toEqual(b.dice);
    expect(a.frames).toEqual(b.frames);
  });
  it('mặt ra là 1..6, thời gian lăn 1,6-2,6s, khung cuối nằm phẳng trong khay', () => {
    for (let s = 1; s <= 25; s++) {
      const r = simulateThrow({ x: Math.cos(s), z: Math.sin(s), p: (s % 10) / 10 + 0.1 }, noise(s * 31));
      expect(r.dice.every((d) => d >= 1 && d <= 6)).toBe(true);
      expect(r.ms).toBeGreaterThanOrEqual(1600);
      expect(r.ms).toBeLessThanOrEqual(2600);
      expect(r.frames.length / DICE_FRAME_STRIDE).toBe(Math.round((r.ms / 1000) * r.fps));
      const last = r.frames.slice(-DICE_FRAME_STRIDE);
      for (const o of [0, 7]) {
        expect(Math.abs(last[o])).toBeLessThanOrEqual(TRAY_HX);
        expect(Math.abs(last[o + 2])).toBeLessThanOrEqual(TRAY_HZ);
        expect(last[o + 1]).toBeCloseTo(0.5, 1);
      }
    }
  });
  it('nhiễu của server làm kết quả không đoán trước được từ cú tung', () => {
    const outcomes = new Set<string>();
    for (let s = 1; s <= 40; s++) outcomes.add(simulateThrow({ x: 0.85, z: -0.3, p: 0.6 }, noise(s * 977)).dice.join(','));
    expect(outcomes.size).toBeGreaterThan(12);
  });
  it('các mặt ra gần đều nhau (không thiên lệch nặng)', () => {
    const faces = Array(7).fill(0);
    for (let s = 1; s <= 300; s++) {
      const r = simulateThrow({ x: 0.85, z: -0.3, p: 0.6 }, noise(s * 7919));
      faces[r.dice[0]]++; faces[r.dice[1]]++;
    }
    for (let f = 1; f <= 6; f++) { expect(faces[f] / 600).toBeGreaterThan(0.1); expect(faces[f] / 600).toBeLessThan(0.24); }
  });
  it('cú tung từ client bị kẹp/chuẩn hoá', () => {
    expect(sanitizeImpulse({ x: 1e9, z: 0, p: 99 })).toEqual({ x: 1, z: 0, p: 1 });
    expect(sanitizeImpulse({ x: NaN, z: 1, p: 1 })).toEqual(DICE_DEFAULT_IMPULSE);
    expect(sanitizeImpulse('xxx')).toEqual(DICE_DEFAULT_IMPULSE);
    expect(sanitizeImpulse({ x: 0, z: 0, p: 0 }).p).toBeGreaterThanOrEqual(0.3);
    const s = sanitizeImpulse({ x: 30, z: 40, p: 0.5 });
    expect(Math.hypot(s.x, s.z)).toBeCloseTo(1);
  });
  it('server dùng mô phỏng thật: view có khung hình, mặt khớp, quân cờ đi sau khi xúc xắc lăn xong, đồng hồ lượt không bị ăn', () => {
    const finished: GameResult[] = [];
    const ctx: EngineContext = {
      rng: noise(5), dict: smallDict(), settings: { ludoPieces: 4 }, turnMs: TURN, hostId: () => 'p0', isConnected: () => true,
      changed: vi.fn(), finish: (r) => finished.push(r), learnWord: () => {},
    };
    const g = new TyPhuGame(ctx);
    g.start([{ id: 'p0', name: 'An' }, { id: 'p1', name: 'Bình' }]);
    const t0 = Date.now();
    expect(g.action('p0', { type: 'roll', impulse: { x: 1, z: 0, p: 0.8 } }).ok).toBe(true);
    const v = g.view();
    expect(v.roll).not.toBeNull();
    expect(v.roll!.ms).toBeGreaterThanOrEqual(1600);
    expect(v.roll!.startedAt).toBe(t0);
    const sim = simulateThrow(sanitizeImpulse({ x: 1, z: 0, p: 0.8 }), noise(5));
    expect(v.dice).toEqual(sim.dice); // cùng nhiễu giả => cùng kết quả
    if (v.movement) {
      expect(v.movement.delay).toBe(v.roll!.ms);
      expect(v.movement.endsAt - v.movement.startedAt).toBe(v.roll!.ms + v.movement.path.length * TYPHU_MOVE_STEP_MS);
      expect(TYPHU_MOVE_STEP_MS).toBeGreaterThanOrEqual(350);
      expect(TYPHU_MOVE_STEP_MS).toBeLessThanOrEqual(450);
      // đồng hồ lượt chỉ chạy sau khi hoạt ảnh xong
      vi.advanceTimersByTime(v.movement.endsAt - Date.now() + 1);
      const after = g.view();
      expect(after.roll).toBeNull();
      expect(after.turnEndsAt === null || after.turnEndsAt - Date.now() >= TURN - 100 || after.step === 'wait').toBe(true);
    }
  });
  it('tung bằng impulse không hợp lệ vẫn chạy (dùng cú mặc định)', () => {
    const { g } = make(['An', 'Bình'], [1, 2]);
    expect(g.action('p0', { type: 'roll', impulse: { x: NaN, z: 'a', p: -5 } as never }).ok).toBe(true);
  });
});
