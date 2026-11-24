import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  GIAN_DIEP_DECK,
  GIAN_DIEP_WORDS,
  gianDiepPairKey,
  type GianDiepView,
} from '../../shared/src/giandiep';
import { Dictionary } from '../src/dictionary';
import { FreshDeck } from '../src/freshDeck';
import type { EngineContext } from '../src/games/engine';
import { GianDiepGame } from '../src/games/giandiep';
import { Room } from '../src/room';
import { MemoryStore } from '../src/store';
import { SMALL_WORDS } from './helpers';

function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const KEYS = ['a', 'b', 'c', 'd', 'e'];

describe('Bốc thăm không lặp (FreshDeck)', () => {
  it('ra hết cả bộ mới lặp lại, vòng mới không ra lại ngay khóa vừa ra', () => {
    const deck = new FreshDeck();
    const rng = seeded(7);
    const first = KEYS.map(() => KEYS[deck.draw('p', KEYS, rng)]);
    expect(new Set(first).size).toBe(KEYS.length);
    expect(deck.remaining('p', KEYS)).toBe(0);
    for (let round = 0; round < 20; round++) {
      const last = first[first.length - 1];
      const next = KEYS[deck.draw('p', KEYS, rng)];
      expect(next).not.toBe(last);
      // bốc tiếp cho hết vòng rồi kiểm tra lại
      const rest = KEYS.slice(1).map(() => KEYS[deck.draw('p', KEYS, rng)]);
      expect(new Set([next, ...rest]).size).toBe(KEYS.length);
      first.splice(0, first.length, next, ...rest);
    }
  });

  it('mỗi bộ (pool) nhớ riêng; bộ rỗng trả về -1; bộ 1 khóa vẫn bốc được mãi', () => {
    const deck = new FreshDeck();
    expect(deck.draw('x', [])).toBe(-1);
    deck.draw('x', KEYS);
    expect(deck.remaining('x', KEYS)).toBe(KEYS.length - 1);
    expect(deck.remaining('y', KEYS)).toBe(KEYS.length);
    for (let i = 0; i < 3; i++) expect(deck.draw('one', ['solo'])).toBe(0);
  });

  it('ghi xuống kho lưu trữ: khởi động lại (deck mới cùng kho) vẫn không lặp, hết bộ thì xóa để xoay vòng', async () => {
    const store = new MemoryStore();
    const deck1 = new FreshDeck(store);
    const used = [0, 1, 2].map(() => KEYS[deck1.draw('p', KEYS)]);
    await deck1.flush();
    expect((await store.listUsedKeys('p')).sort()).toEqual([...used].sort());

    // "khởi động lại server": bộ mới nạp lại từ kho
    const deck2 = new FreshDeck(store);
    await deck2.load('p');
    expect(deck2.remaining('p', KEYS)).toBe(2);
    const more = [0, 1].map(() => KEYS[deck2.draw('p', KEYS)]);
    expect(new Set([...used, ...more]).size).toBe(KEYS.length);

    // hết bộ: lần bốc kế tiếp mở vòng mới, kho chỉ còn đúng khóa vừa bốc
    const fresh = KEYS[deck2.draw('p', KEYS)];
    await deck2.flush();
    expect(await store.listUsedKeys('p')).toEqual([fresh]);
    await store.clearUsedKeys('p');
    expect(await store.listUsedKeys('p')).toEqual([]);
  });

  it('lỗi ghi kho không làm hỏng việc bốc thăm', async () => {
    const errors: unknown[] = [];
    const broken = {
      listUsedKeys: async () => [],
      addUsedKey: async () => { throw new Error('mất kết nối'); },
      clearUsedKeys: async () => {},
    };
    const deck = new FreshDeck(broken, (e) => errors.push(e));
    const got = KEYS.map(() => KEYS[deck.draw('p', KEYS)]);
    await deck.flush();
    expect(new Set(got).size).toBe(KEYS.length);
    expect(errors.length).toBe(KEYS.length);
  });
});

describe('Ai Là Gián Điệp không lặp cặp từ đã chơi', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function ctxWith(drawFresh: EngineContext['drawFresh']): EngineContext {
    return {
      rng: seeded(11),
      dict: new Dictionary(SMALL_WORDS),
      settings: { giandiepMrWhite: false, giandiepSpies: 1 },
      turnMs: 1500,
      hostId: () => 'p0',
      isConnected: () => true,
      isBot: () => false,
      changed: () => {},
      finish: () => {},
      learnWord: () => {},
      drawFresh,
    };
  }

  const players = Array.from({ length: 4 }, (_, i) => ({ id: `p${i}`, name: `Người ${i}` }));

  it('game bốc cặp từ qua bộ bốc thăm của server và dùng đúng cặp được chọn', () => {
    vi.useFakeTimers();
    const pick = GIAN_DIEP_WORDS.findIndex((p) => p.wordA === 'Trà sữa');
    expect(pick).toBeGreaterThanOrEqual(0);
    const calls: { pool: string; size: number }[] = [];
    const g = new GianDiepGame(ctxWith((pool, keys) => {
      calls.push({ pool, size: keys.length });
      return pick;
    }));
    g.start(players);
    expect(calls).toEqual([{ pool: GIAN_DIEP_DECK, size: GIAN_DIEP_WORDS.length }]);
    const words = new Set(players.map((p) => g.view(p.id).myWord));
    expect(words).toEqual(new Set(['Trà sữa', 'Trà đào']));
    g.dispose();
  });

  it('nhiều ván liên tiếp dùng chung bộ bốc thăm thì không ván nào trùng cặp từ', () => {
    vi.useFakeTimers();
    const deck = new FreshDeck();
    const seen = new Set<string>();
    for (let i = 0; i < 60; i++) {
      const g = new GianDiepGame(ctxWith((pool, keys) => deck.draw(pool, keys, seeded(100 + i))));
      g.start(players);
      const pairWords = [...new Set(players.map((p) => g.view(p.id).myWord))].sort().join('|');
      expect(seen.has(pairWords)).toBe(false);
      seen.add(pairWords);
      g.dispose();
    }
    expect(deck.remaining(GIAN_DIEP_DECK, GIAN_DIEP_WORDS.map(gianDiepPairKey))).toBe(GIAN_DIEP_WORDS.length - 60);
  });

  it('phòng chơi chuyển bộ bốc thăm của server vào game', () => {
    vi.useFakeTimers();
    const pick = GIAN_DIEP_WORDS.findIndex((p) => p.wordA === 'Bánh xèo');
    const drawFresh = vi.fn(() => pick);
    const room = new Room('SPYD', new Dictionary(SMALL_WORDS), { turnMs: 200, drawFresh });
    const host = room.addPlayer('Chủ Phòng');
    if (!host.ok) throw new Error('không vào được phòng');
    expect(room.configure(host.playerId, 'giandiep', { giandiepMrWhite: false, giandiepSpies: 1 })).toEqual({ ok: true });
    for (let i = 0; i < 3; i++) expect(room.addBot(host.playerId).ok).toBe(true);
    expect(room.start(host.playerId)).toEqual({ ok: true });
    expect(drawFresh).toHaveBeenCalledTimes(1);
    const view = room.toPublic(host.playerId).game as GianDiepView;
    expect(['Bánh xèo', 'Bánh khọt']).toContain(view.myWord);
    room.dispose();
  });
});
