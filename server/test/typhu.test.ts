import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TyPhuGame, TYPHU_CARDS, TYPHU_COMMUNITY_CARDS } from '../src/games/typhu';
import type { EngineContext } from '../src/games/engine';
import type { GameResult, TyPhuView } from '../../shared/src/types';
import { TYPHU_BOARD, TYPHU_MOVE_STEP_MS, TYPHU_PASS_START, rentOf, typhuCellPos, stationRent, utilityRent, suggestSales } from '../../shared/src/typhu';
import { simulateThrow } from '../src/games/dice3d';
import { DICE_DEFAULT_IMPULSE, DICE_FACES, DICE_FRAME_STRIDE, TRAY_HX, TRAY_HZ, sanitizeImpulse } from '../../shared/src/dice';
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
 it('has exactly 40 perimeter cells and the complete property mix', () => {
  expect(TYPHU_BOARD).toHaveLength(40);
  for (const [kind, count] of Object.entries({land:22, station:4, utility:2, chance:3, community:3, tax:2}))
   expect(TYPHU_BOARD.filter(c => c.kind === kind)).toHaveLength(count);
  expect([0,10,20,30].map(i => TYPHU_BOARD[i].kind)).toEqual(['start','jail','airport','gotojail']);
  expect(new Set(TYPHU_BOARD.map((_, i) => typhuCellPos(i).join(','))).size).toBe(40);
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
 it('does not count down while choosing to buy; only skips after a long idle', () => {
  const {g,v,settle}=make(['An','Bình'],[1,2]); g.action('p0',{type:'roll'});settle();
  vi.advanceTimersByTime(TURN+WAIT);expect(v().step).toBe('buy');
  vi.advanceTimersByTime(60_000+WAIT);expect(v().currentPlayerId).toBe('p1');expect(v().owners[3]).toBeUndefined();
 });
 it('charges land rent and allows full-group construction', () => {
  const {g,v,own,settle}=make(['An','Bình'],[1,2]); own([1,3],'p1');
  g.action('p0',{type:'roll'});settle();expect(v().cash.p0).toBe(1410);
  expect(rentOf(3,2,true)).toBe(180);
  // nâng cấp kiểu Cờ tỷ phú Việt: dừng ở đất của mình thì được xây ngay tại ô đó, không cần đủ bộ
  const b=make(['An','Bình'],[1,2]);b.own([3],'p0');expect(b.g.action('p0',{type:'build',cell:3}).ok).toBe(false);
  b.g.action('p0',{type:'roll'});b.settle();expect(b.v().step).toBe('upgrade');expect(b.v().pendingBuy).toBe(3);
  expect(b.g.action('p0',{type:'build',cell:3}).ok).toBe(true);
  expect(b.v().houses[3]).toBe(1);expect(b.v().cash.p0).toBe(1450);
 });
 it('buys stations and utilities and scales their rent by owned count', () => {
  expect([1,2,3,4].map(n=>stationRent(n))).toEqual([50,100,200,400]);expect(stationRent(2,3)).toBe(800);expect(utilityRent(2,7)).toBe(140);
  const a=make(['An','Bình'],[2,3]); a.g.action('p0',{type:'roll'});a.settle();
  expect(a.v().pendingBuy).toBe(5); a.g.action('p0',{type:'buy'});expect(a.v().cash.p0).toBe(1300);
  const b=make(['An','Bình'],[2,3]);b.own([5,15,25],'p1');b.g.action('p0',{type:'roll'});b.settle();expect(b.v().cash.p0).toBe(1300);
  const c=make(['An','Bình'],[3,4]);c.pl(0).pos=5;c.own([12,28],'p1');c.g.action('p0',{type:'roll'});c.settle();expect(c.v().cash.p0).toBe(1360);
  expect(c.g.action('p0',{type:'build',cell:12}).ok).toBe(false);
 });
 it('Rủi ro only draws bad cards (into the pot at Start) and preserves doubles', () => {
  const {g,v,settle}=make(['An','Bình'],[1,1,{card:0}]);g.action('p0',{type:'roll'});settle();
  expect(v().card).toMatchObject({good:false});expect(v().card?.text).toContain('mũ bảo hiểm');
  expect(v().cash.p0).toBe(1450);expect(v().pot).toBe(50);expect(v().step).toBe('roll');
 });
 it('every Cơ hội card helps and every Rủi ro card hurts', () => {
  for (const c of TYPHU_CARDS) expect((c.money ?? 0) >= 0 && !c.jail && !c.perLevel && (c.move ?? 0) >= 0).toBe(true);
  for (const c of TYPHU_COMMUNITY_CARDS) expect((c.money ?? 0) <= 0 && !c.each && !c.ownLand && (c.move ?? 0) <= 0).toBe(true);
 });
 it('Cơ hội: flies straight to Start (no pass bonus, only the card reward) and eats the pot', () => {
  const {g,v,pl,settle}=make(['An','Bình'],[1,2,{card:6}]);pl(0).pos=4;
  (g as unknown as {pot:number}).pot=80;
  g.action('p0',{type:'roll'});
  vi.advanceTimersByTime(v().movement!.endsAt-Date.now());expect(v().movement?.kind).toBe('fly');expect(v().movement?.path).toEqual([0]);
  settle();expect(v().pos.p0).toBe(0);expect(v().cash.p0).toBe(1500+TYPHU_PASS_START+80);expect(v().pot).toBe(0);
 });
 it('Cơ hội: walks to your nearest own land to upgrade it', () => {
  const {g,v,pl,own,settle}=make(['An','Bình'],[1,2,{card:7}]);pl(0).pos=4;own([11],'p0');
  g.action('p0',{type:'roll'});settle();
  expect(v().pos.p0).toBe(11);expect(v().step).toBe('upgrade');expect(v().pendingBuy).toBe(11);
 });
 it('Sân bay flies to a random cell (never itself) and handles that cell', () => {
  const {g,v,pl,settle}=make(['An','Bình'],[1,2,{card:7.99}]);pl(0).pos=17;
  g.action('p0',{type:'roll'});
  vi.advanceTimersByTime(v().movement!.endsAt-Date.now());
  expect(v().movement?.kind).toBe('fly');
  settle();
  expect(v().pos.p0).toBe(39);expect(v().step).toBe('buy');
 });
 it('passes start, charges tax and sends players to jail', () => {
  const a=make(['An','Bình'],[2,3]);a.pl(0).pos=36;a.g.action('p0',{type:'roll'});a.settle();expect(a.v().cash.p0).toBe(1500+TYPHU_PASS_START);
  const b=make(['An','Bình'],[1,3]);b.g.action('p0',{type:'roll'});b.settle();expect(b.v().cash.p0).toBe(1300);
  const c=make(['An','Bình'],[3,4]);c.pl(0).pos=23;c.g.action('p0',{type:'roll'});c.settle();expect(c.v().pos.p0).toBe(10);expect(c.v().jail.p0).toBe(0);
 });
 it('handles jail release, third doubles, liquidation, bankruptcy and asset ranking', () => {
  const a=make(['An','Bình']);a.pl(0).jail=0;expect(a.g.action('p0',{type:'payJail'}).ok).toBe(true);expect(a.v().cash.p0).toBe(1450);
  const b=make(['An','Bình'],[2,2]);(b.g as unknown as {players:{doubles:number}[]}).players[0].doubles=2;b.g.action('p0',{type:'roll'});expect(b.v().jail.p0).toBe(0);
  // thiếu tiền thuế: không tự bán, chờ người chơi tự chọn; bán hết vẫn thiếu mới phá sản
  const c=make(['An','Bình'],[1,3]);c.pl(0).cash=1;c.own([5],'p0');c.g.action('p0',{type:'roll'});c.settle();
  expect(c.v().step).toBe('debt');expect(c.v().debt).toEqual({amount:200,to:null,why:'nộp Thuế thu nhập'});expect(c.v().owners[5]).toBe('p0');expect(c.v().bankrupt).toEqual([]);
  expect(c.g.action('p0',{type:'roll'}).ok).toBe(false);
  expect(c.g.action('p0',{type:'sell',cell:5}).ok).toBe(true);
  expect(c.v().bankrupt).toEqual(['p0']);expect(c.finished[0].winnerId).toBe('p1');expect(c.v().owners[5]).toBeUndefined();
  const d=make(['An','Bình']);d.own([5,12],'p1');d.g.action('p0',{type:'end'});expect(d.finished[0].winnerId).toBe('p1');
 });
 it('keeps jailed players in place, releases doubles and charges on the third failed attempt', () => {
  const a=make(['An','Bình'],[1,2]);a.pl(0).jail=0;a.pl(0).pos=10;a.g.action('p0',{type:'roll'});
  expect(a.v().jail.p0).toBe(1);expect(a.v().pos.p0).toBe(10);expect(a.v().movement).toBeNull();
  const b=make(['An','Bình'],[1,1]);b.pl(0).jail=1;b.pl(0).pos=10;b.g.action('p0',{type:'roll'});b.settle();
  expect(b.v().jail.p0).toBeUndefined();expect(b.v().pos.p0).toBe(12);expect(b.v().step).toBe('buy');
  b.g.action('p0',{type:'skip'});expect(b.v().step).toBe('wait');
  const c=make(['An','Bình'],[1,2]);c.pl(0).jail=2;c.pl(0).pos=10;c.g.action('p0',{type:'roll'});c.settle();
  expect(c.v().jail.p0).toBeUndefined();expect(c.v().pos.p0).toBe(13);expect(c.v().cash.p0).toBe(1450);
 });
 it('clears moving callbacks when the current player leaves', () => {
  const {g,v}=make(['An','Bình','Chi'],[1,2]);g.action('p0',{type:'roll'});g.removePlayer('p0');
  expect(v().movement).toBeNull();expect(v().currentPlayerId).toBe('p1');
 });
 it('has no quick-win rule: owning all 4 stations does not end the game; only the last player standing wins', () => {
  const {g,v,pl,own,finished,settle}=make(['An','Bình','Chi'],[2,3]);
  own([5,15,25,35],'p1');pl(2).cash=9999;
  g.action('p0',{type:'roll'});settle();
  expect(finished).toHaveLength(0);
  expect(v().cash.p0).toBe(1500-stationRent(4));
  const b=make(['An','Bình','Chi'],[2,3]);
  b.own([5,15,25],'p1');b.own([35],'p0');b.pl(0).cash=10;
  b.g.action('p0',{type:'roll'});b.settle();
  expect(b.v().debt).toMatchObject({amount:200,to:'p1'});
  b.g.action('p0',{type:'sell',cell:35});
  expect(b.v().bankrupt).toEqual(['p0']);expect(b.finished).toHaveLength(0);
  expect(b.v().cash.p1).toBe(1500+110);
  const away: string[] = [];
  const d = make(['An','Bình'],[1,2],away);
  away.push('p0');
  d.g.onPlayerConnection?.('p0', false);
  vi.advanceTimersByTime(2600);
  d.settle();
  expect(d.v().pos.p0).toBe(3);
 });
 it('allows selling houses or properties to pay jail fine, buy land, or upgrade houses when cash is short', () => {
  // 1. Trong tù không đủ 50 xu tiền mặt nhưng có nhà/đất: tự chọn bán hoặc bấm payJail tự bán tài sản rẻ nhất
  const a = make(['An', 'Bình']);
  a.pl(0).jail = 0;
  a.pl(0).cash = 20;
  a.own([1, 11], 'p0'); // ô 1 (Cà Mau, giá 60 -> bán được 30), ô 11 (Quy Nhơn, giá 140 -> bán được 70)
  const suggestedJail = suggestSales('p0', 50, 20, a.v().owners, a.v().houses);
  expect(suggestedJail[0]).toMatchObject({ cell: 1, kind: 'property', refund: 30, suggested: true });
  // không tự bán: phải tự chọn bán trước rồi mới nộp được
  expect(a.g.action('p0', { type: 'payJail' }).ok).toBe(false);
  expect(a.v().owners[1]).toBe('p0');
  expect(a.g.action('p0', { type: 'sell', cell: 1 }).ok).toBe(true);
  expect(a.g.action('p0', { type: 'payJail' }).ok).toBe(true);
  expect(a.v().jail.p0).toBeUndefined();
  expect(a.v().owners[1]).toBeUndefined();
  expect(a.v().owners[11]).toBe('p0');
  expect(a.v().cash.p0).toBe(0); // 20 + 30 - 50 = 0

  // 2. Trong tù: chủ động chọn bán ô 11 (Quy Nhơn +70 xu) thay vì ô đề xuất, rồi nộp phạt ra tù
  const b = make(['An', 'Bình']);
  b.pl(0).jail = 0;
  b.pl(0).cash = 10;
  b.own([1, 11], 'p0');
  expect(b.g.action('p0', { type: 'sell', cell: 11 }).ok).toBe(true);
  expect(b.v().cash.p0).toBe(80);
  expect(b.v().owners[11]).toBeUndefined();
  expect(b.g.action('p0', { type: 'payJail' }).ok).toBe(true);
  expect(b.v().cash.p0).toBe(30);
  expect(b.v().owners[1]).toBe('p0');

  // 3. Dừng ở đất trống không đủ tiền mặt nhưng có tài sản bán đủ: vẫn hiện bước 'buy' và cho bán để mua
  const c = make(['An', 'Bình'], [1, 2]); // tới ô 3 (Bạc Liêu, giá 60)
  c.pl(0).cash = 40;
  c.own([1], 'p0'); // Cà Mau bán được 30 -> 40 + 30 = 70 >= 60
  c.g.action('p0', { type: 'roll' });
  c.settle();
  expect(c.v().step).toBe('buy');
  expect(c.v().pendingBuy).toBe(3);
  expect(c.g.action('p0', { type: 'buy' }).ok).toBe(false);
  expect(c.g.action('p0', { type: 'sell', cell: 1 }).ok).toBe(true);
  expect(c.g.action('p0', { type: 'buy' }).ok).toBe(true);
  expect(c.v().owners[1]).toBeUndefined();
  expect(c.v().owners[3]).toBe('p0');
  expect(c.v().cash.p0).toBe(10); // 40 + 30 - 60 = 10

  // 4. Dừng ở đất của mình không đủ tiền mặt nâng nhà nhưng có tài sản khác bán đủ: hiện 'upgrade' và cho bán để nâng
  const d = make(['An', 'Bình'], [1, 2]); // tới ô 3 (Bạc Liêu, nâng nhà tốn 50)
  d.pl(0).cash = 25;
  d.own([1, 3], 'p0');
  (d.g as unknown as { houses: Record<number, number> }).houses[1] = 1; // nhà ở Cà Mau bán được 25 -> 25 + 25 = 50
  d.g.action('p0', { type: 'roll' });
  d.settle();
  expect(d.v().step).toBe('upgrade');
  expect(d.v().pendingBuy).toBe(3);
  expect(d.g.action('p0', { type: 'sell', cell: 3 }).ok).toBe(false); // không được bán chính ô đang xét nâng cấp
  expect(d.g.action('p0', { type: 'build', cell: 3 }).ok).toBe(false);
  expect(d.g.action('p0', { type: 'sell', cell: 1 }).ok).toBe(true);
  expect(d.g.action('p0', { type: 'build', cell: 3 }).ok).toBe(true);
  expect(d.v().houses[1]).toBeUndefined();
  expect(d.v().houses[3]).toBe(1);
  expect(d.v().cash.p0).toBe(0);
 });
 it('upgrades own stations with stars (max 3, 100 each) that double their rent, never houses', () => {
  const a=make(['An','Bình'],[2,3]);a.own([5],'p0');a.g.action('p0',{type:'roll'});a.settle();
  expect(a.v().step).toBe('upgrade');expect(a.g.action('p0',{type:'build',cell:5}).ok).toBe(true);
  expect(a.v().houses[5]).toBe(1);expect(a.v().cash.p0).toBe(1400);
  const b=make(['An','Bình'],[2,3]);b.own([5],'p0');(b.g as unknown as {houses:Record<number,number>}).houses[5]=3;
  b.g.action('p0',{type:'roll'});b.settle();expect(b.v().step).not.toBe('upgrade');
  const c=make(['An','Bình'],[2,3]);c.own([5,15],'p1');(c.g as unknown as {houses:Record<number,number>}).houses[5]=2;
  c.g.action('p0',{type:'roll'});c.settle();expect(c.v().cash.p0).toBe(1500-stationRent(2,2));expect(stationRent(2,2)).toBe(400);
 });
 it('debt: picks what to sell one at a time, pays automatically once cash is enough, then the turn goes on', () => {
  const {g,v,pl,own,settle}=make(['An','Bình'],[1,3]); // ô 4 Thuế 200
  pl(0).cash=50;own([1,3,11],'p0');(g as unknown as {houses:Record<number,number>}).houses[11]=2;
  g.action('p0',{type:'roll'});settle();
  expect(v().step).toBe('debt');expect(v().cash.p0).toBe(50);
  expect(g.action('p0',{type:'sell',cell:11}).ok).toBe(true); // bán 1 cấp nhà Quy Nhơn +50
  expect(v().step).toBe('debt');expect(v().houses[11]).toBe(1);expect(v().cash.p0).toBe(100);
  expect(g.action('p0',{type:'sell',cell:11}).ok).toBe(true); // +50
  expect(g.action('p0',{type:'sell',cell:1}).ok).toBe(true); // +30 -> 180
  expect(v().step).toBe('debt');
  expect(g.action('p0',{type:'sell',cell:3}).ok).toBe(true); // +30 -> 210 >= 200: tự trả
  expect(v().step).toBe('wait');expect(v().cash.p0).toBe(10);expect(v().pot).toBe(200);expect(v().owners[11]).toBe('p0');
  vi.advanceTimersByTime(WAIT);expect(v().currentPlayerId).toBe('p1');
 });
 it('debt: an idle player gets helped by the system after a long wait', () => {
  const {g,v,pl,own,settle}=make(['An','Bình'],[1,3]);
  pl(0).cash=80;own([1,3,11],'p0'); // bán hết được 130 -> đủ 200
  g.action('p0',{type:'roll'});settle();expect(v().step).toBe('debt');
  vi.advanceTimersByTime(60_000);
  expect(v().step).not.toBe('debt');expect(v().bankrupt).toEqual([]);expect(v().pot).toBe(200);
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
      expect(Math.hypot(last[0] - last[7], last[2] - last[9])).toBeGreaterThanOrEqual(1.1);
      for (const [idx, o] of [0, 7].entries()) {
        expect(Math.abs(last[o])).toBeLessThanOrEqual(TRAY_HX);
        expect(Math.abs(last[o + 2])).toBeLessThanOrEqual(TRAY_HZ);
        expect(last[o + 1]).toBeCloseTo(0.5, 1);
        const [qx, qy, qz, qw] = [last[o + 3], last[o + 4], last[o + 5], last[o + 6]];
        const [vx, vy, vz] = DICE_FACES.find((f) => f.v === r.dice[idx])!.n;
        const tx = 2 * (qy * vz - qz * vy), ty = 2 * (qz * vx - qx * vz), tz = 2 * (qx * vy - qy * vx);
        const upY = vy + qw * ty + (qz * tx - qx * tz);
        expect(upY).toBeGreaterThan(0.998);
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
      expect(TYPHU_MOVE_STEP_MS).toBeGreaterThanOrEqual(250);
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
