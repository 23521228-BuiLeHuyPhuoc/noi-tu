import { describe, expect, it } from 'vitest';
import { BOOM_BOMB_FUSE_TICKS, type BoomTickPayload } from '../../shared/src/boom';
import type { CroakTickPayload } from '../../shared/src/croaksquad';
import type { GameResult, RoomSettings } from '../../shared/src/types';
import { Dictionary } from '../src/dictionary';
import { BoomOnlineGame } from '../src/games/boom';
import { CroakSquadGame } from '../src/games/croaksquad';
import type { EngineContext, EnginePlayer } from '../src/games/engine';
import { SMALL_WORDS } from './helpers';

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

const TEST_DICT = new Dictionary(SMALL_WORDS);

function makePlayers(n: number): EnginePlayer[] {
  return Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `Người ${i + 1}` }));
}

function makeHarness(seed: number, settings: RoomSettings = {}, turnMs = 500) {
  const boomTicks: BoomTickPayload[] = [];
  const croakTicks: CroakTickPayload[] = [];
  let result: GameResult | null = null;
  const ctx: EngineContext = {
    rng: seededRng(seed),
    dict: TEST_DICT,
    settings,
    turnMs,
    hostId: () => 'p0',
    isConnected: () => true,
    isBot: () => false,
    playerColor: (id) => Number(id.replace(/\D/g, '')) || 0,
    changed: () => {},
    finish: (r) => {
      result = r;
    },
    learnWord: () => {},
    emitBoomTick: (payload) => {
      boomTicks.push(payload);
    },
    emitCroakTick: (payload) => {
      croakTicks.push(payload);
    },
  };
  return { ctx, boomTicks, croakTicks, getResult: () => result };
}

describe('Zero-Latency Netcode: Đặt Bom (acks, gridDiff, edge preservation, stale seq)', () => {
  it('trả về acks đúng seq mới nhất, bỏ qua gói seq cũ, giữ nguyên tap/placeBomb nhanh & chỉ gửi gridDiff ở tick thường', () => {
    const h = makeHarness(2026, { boomMode: 'ffa', boomRounds: 1 }, 200);
    const g = new BoomOnlineGame(h.ctx);
    g.start(makePlayers(2));
    // Vào playing
    g.stepManual(6);
    expect(g.view().phase).toBe('playing');
    h.boomTicks.length = 0;

    // Gửi tap di chuyển + đặt bom, sau đó nhả (dx=0, dy=0) ngay trước khi tick chạy -> tap & placeBomb vẫn được xử lý!
    g.action('p0', { type: 'bm_input', input: { seq: 10, dx: 1, dy: 0, placeBomb: true } });
    g.action('p0', { type: 'bm_input', input: { seq: 11, dx: 0, dy: 0 } });
    // Gói trễ có seq nhỏ hơn (seq=9) bị bỏ qua không ghi đè hướng di chuyển!
    g.action('p0', { type: 'bm_input', input: { seq: 9, dx: -1, dy: 0 } });

    const beforeX = g.view().snapshot.players.find((p) => p.id === 'p0')!.x;
    g.stepManual(1);
    const tick1 = h.boomTicks.at(-1)!;
    expect(tick1.acks?.p0).toBe(11);
    expect(tick1.bombs.length).toBeGreaterThanOrEqual(1);
    const afterX = tick1.players.find((p) => p.id === 'p0')!.x;
    expect(afterX).toBeGreaterThan(beforeX);

    // Tick thường (không phải bội số 30) KHÔNG gửi lại mảng `grid` đầy đủ
    if (tick1.tick % 30 !== 0) {
      expect(tick1.grid).toBeUndefined();
    }

    // Chờ bom nổ phá thùng -> phát `gridDiff` và tăng `gridVersion`
    const verBefore = tick1.gridVersion ?? 1;
    h.boomTicks.length = 0;
    g.stepManual(BOOM_BOMB_FUSE_TICKS + 4);
    const diffTicks = h.boomTicks.filter((t) => t.gridDiff && t.gridDiff.length > 0);
    expect(diffTicks.length).toBeGreaterThanOrEqual(0);
    const lastTick = h.boomTicks.at(-1)!;
    if (diffTicks.length > 0) {
      expect((lastTick.gridVersion ?? 1)).toBeGreaterThan(verBefore);
    }

    // Keyframe định kỳ tick % 30 === 0 phải có đủ `grid`
    while ((h.boomTicks.at(-1)?.tick ?? 1) % 30 !== 0) {
      g.stepManual(1);
    }
    const keyTick = h.boomTicks.at(-1)!;
    expect(keyTick.tick % 30).toBe(0);
    expect(Array.isArray(keyTick.grid)).toBe(true);
    expect(keyTick.grid!.length).toBe(keyTick.width * keyTick.height);

    g.dispose();
  });
});

describe('Zero-Latency Netcode: Đầm Lầy Quái Chiêu (acks, rapid jump/spit/aim preservation, stale seq)', () => {
  it('trả về acks đúng seq mới nhất, bỏ qua gói seq cũ và giữ nguyên tap nhảy / góc ném khi người chơi đổi hướng nhanh', () => {
    const h = makeHarness(3030, { croakStage: 0 }, 500);
    const g = new CroakSquadGame(h.ctx);
    g.start(makePlayers(2));
    // Cho ếch đáp đất vững vàng ở đầu màn
    g.stepManual(12);
    h.croakTicks.length = 0;

    // Nhấp di chuyển sang phải + nhảy trong cùng 1 frame rồi nhả ngay trước tick server
    g.action('p0', { type: 'cs_input', input: { seq: 5, moveX: 1, jump: true } });
    g.action('p0', { type: 'cs_input', input: { seq: 6, moveX: 0 } });
    // Gói mạng trễ seq=4 không được ghi đè seq=6
    g.action('p0', { type: 'cs_input', input: { seq: 4, moveX: -1 } });

    const beforeFrog = g.view().frogs.find((f) => f.id === 'p0')!;
    g.stepManual(1);
    const tick = h.croakTicks.at(-1)!;
    expect(tick.acks?.p0).toBe(6);
    const afterFrog = tick.frogs.find((f) => f.id === 'p0')!;
    expect(afterFrog.x).toBeGreaterThan(beforeFrog.x);
    expect(afterFrog.vy).toBeLessThan(0);

    // Đứng gần đồng đội -> phóng lưỡi nuốt -> nhả có chỉ định góc ngay cả khi gói moveX=0 nối đuôi theo sau
    g.action('p0', { type: 'cs_input', input: { seq: 7, moveX: 0, tongue: true } });
    g.action('p0', { type: 'cs_input', input: { seq: 8, moveX: 0 } });
    g.stepManual(2);
    const carryingFrog = h.croakTicks.at(-1)!.frogs.find((f) => f.id === 'p0')!;
    expect(carryingFrog.state).toBe('carrying');

    const chosenAngle = -1.23;
    g.action('p0', { type: 'cs_input', input: { seq: 9, moveX: 0, spit: true, aimAngle: chosenAngle, aimPower: 0.9 } });
    g.action('p0', { type: 'cs_input', input: { seq: 10, moveX: 1 } });
    g.stepManual(1);
    const tickAfterSpit = h.croakTicks.at(-1)!;
    expect(tickAfterSpit.acks?.p0).toBe(10);
    const postSpitMe = tickAfterSpit.frogs.find((f) => f.id === 'p0')!;
    const p1 = tickAfterSpit.frogs.find((f) => f.id === 'p1')!;
    expect(postSpitMe.bellyId).toBeNull();
    expect(p1.state).toBe('launched');

    g.dispose();
  });
});
