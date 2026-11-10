import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TyPhuGame, TYPHU_CARDS } from '../src/games/typhu';
import type { EngineContext } from '../src/games/engine';
import type { GameResult, TyPhuView } from '../../shared/src/types';
import { TYPHU_BOARD, rentOf, typhuCellPos, stationRent, utilityRent } from '../../shared/src/typhu';
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
  expect([0,10,20,30].map(i => TYPHU_BOARD[i].kind)).toEqual(['start','jail','rest','gotojail']);
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
  const b=make(['An','Bình'],[2,3]);b.own([5,15,25],'p1');b.g.action('p0',{type:'roll'});b.settle();expect(b.v().cash.p0).toBe(1400);
  const c=make(['An','Bình'],[3,4]);c.pl(0).pos=5;c.own([12,28],'p1');c.g.action('p0',{type:'roll'});c.settle();expect(c.v().cash.p0).toBe(1430);
  expect(c.g.action('p0',{type:'build',cell:12}).ok).toBe(false);
 });
 it('draws community cards separately and preserves doubles', () => {
  const {g,v,settle}=make(['An','Bình'],[1,1,{card:0}]);g.action('p0',{type:'roll'});settle();
  expect(v().card?.text).toContain('hoàn thuế');expect(v().cash.p0).toBe(1600);expect(v().step).toBe('roll');
 });
 it('draws chance and publishes chained card movement', () => {
  const {g,v,pl,settle}=make(['An','Bình'],[1,2,{card:6}]);pl(0).pos=4;g.action('p0',{type:'roll'});
  vi.advanceTimersByTime(v().movement!.endsAt-Date.now());expect(v().movement?.kind).toBe('card');
  settle();expect(v().pos.p0).toBe(0);expect(v().cash.p0).toBe(1700);
 });
 it('passes start, charges tax and sends players to jail', () => {
  const a=make(['An','Bình'],[2,3]);a.pl(0).pos=36;a.g.action('p0',{type:'roll'});a.settle();expect(a.v().cash.p0).toBe(1700);
  const b=make(['An','Bình'],[1,3]);b.g.action('p0',{type:'roll'});b.settle();expect(b.v().cash.p0).toBe(1300);
  const c=make(['An','Bình'],[3,4]);c.pl(0).pos=23;c.g.action('p0',{type:'roll'});c.settle();expect(c.v().pos.p0).toBe(10);expect(c.v().jail.p0).toBe(0);
 });
 it('handles jail release, third doubles, liquidation, bankruptcy and asset ranking', () => {
  const a=make(['An','Bình']);a.pl(0).jail=0;expect(a.g.action('p0',{type:'payJail'}).ok).toBe(true);expect(a.v().cash.p0).toBe(1450);
  const b=make(['An','Bình'],[2,2]);(b.g as unknown as {players:{doubles:number}[]}).players[0].doubles=2;b.g.action('p0',{type:'roll'});expect(b.v().jail.p0).toBe(0);
  const c=make(['An','Bình'],[1,3]);c.pl(0).cash=1;c.own([5],'p0');c.g.action('p0',{type:'roll'});c.settle();expect(c.v().bankrupt).toEqual(['p0']);expect(c.finished[0].winnerId).toBe('p1');expect(c.v().owners[5]).toBeUndefined();
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
  const {g,v,settle}=make(['An','Bình','Chi'],[1,2]);g.action('p0',{type:'roll'});g.removePlayer('p0');
  expect(v().movement).toBeNull();expect(v().currentPlayerId).toBe('p1');
 });
});
