import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Dictionary } from '../src/dictionary';
import { setup, smallDict, startWordChain, submit, wc, bc } from './helpers';
import type { TyPhuView } from '../../shared/src/types';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

/** người chơi thật "An" + một máy (thêm sau nên với rng = 0 máy đi trước) */
function withBot(gameType: 'wordchain' | 'wordchain_en' | 'baucua' | 'typhu', dict = smallDict()) {
  const s = setup(['An'], { dict });
  const host = s.ids[0];
  expect(s.room.configure(host, gameType)).toEqual({ ok: true });
  const r = s.room.addBot(host);
  if (!r.ok) throw new Error(r.error);
  return { ...s, host, bot: r.playerId };
}

describe('Phòng: thêm / bỏ máy', () => {
  it('chỉ chủ phòng, ở phòng chờ; máy có cờ bot, tên riêng, không tính là người đang kết nối', () => {
    const s = setup(['An', 'Bình']);
    const [host, other] = s.ids;
    expect(s.room.addBot(other)).toEqual({ ok: false, error: 'not_host' });
    const r = s.room.addBot(host);
    if (!r.ok) throw new Error();
    const pub = s.room.toPublic().players.find((p) => p.id === r.playerId)!;
    expect(pub).toMatchObject({ bot: true, connected: true });
    expect(pub.name).toMatch(/^Máy /);
    expect(s.room.connectedCount).toBe(2);
    expect(s.room.removeBot(other, r.playerId)).toEqual({ ok: false, error: 'not_host' });
    expect(s.room.removeBot(host, host)).toEqual({ ok: false, error: 'bad_request' });
    expect(s.room.removeBot(host, r.playerId)).toEqual({ ok: true });
    expect(s.room.toPublic().players.length).toBe(2);
  });

  it('chủ phòng rời đi thì trao cho người thật, không trao cho máy', () => {
    const s = setup(['An']);
    s.room.addBot(s.ids[0]);
    const b = s.room.addPlayer('Bình');
    if (!b.ok) throw new Error();
    s.room.removePlayer(s.ids[0]);
    expect(s.room.toPublic().hostId).toBe(b.playerId);
  });

  it('không thêm máy khi đang chơi', () => {
    const { room, host } = withBot('baucua');
    expect(room.start(host)).toEqual({ ok: true });
    expect(room.addBot(host)).toEqual({ ok: false, error: 'room_playing' });
    room.dispose();
  });
});

describe('Máy chơi Nối từ: dồn đối thủ vào ngõ cụt', () => {
  it('máy chọn từ để lại ít đường nối nhất (ở đây là ngõ cụt)', () => {
    const d = smallDict();
    // sau "xa" cần từ bắt đầu bằng a: ab (→ b có 2 từ), ac (→ c có 1 từ), ad (→ d không có từ nào: ngõ cụt)
    d.en = new Dictionary(['xa', 'ab', 'ac', 'ad', 'ba', 'bc', 'cz'], new Set(), {}, 'en');
    const { room, host, bot } = withBot('wordchain_en', d);
    startWordChain(room, host, 'xa');
    expect(wc(room).currentPlayerId).toBe(bot);
    vi.advanceTimersByTime(3300);
    const g = wc(room);
    expect(g.currentWord).toBe('ad');
    expect(g.history.at(-1)).toMatchObject({ kind: 'word', playerId: bot, word: 'ad' });
    expect(g.currentPlayerId).toBe(host);
    room.dispose();
  });

  it('máy trả lời sau khi người chơi nối, và không bỏ phiếu duyệt từ (không có người duyệt)', () => {
    const { room, host, bot } = withBot('wordchain');
    startWordChain(room, host, 'con mèo');
    vi.advanceTimersByTime(3300); // máy đi trước
    expect(wc(room).currentPlayerId).toBe(host);
    const word = wc(room).currentWord;
    expect(wc(room).history.at(-1)).toMatchObject({ kind: 'word', playerId: bot });
    expect(word.split(' ')[0]).toBe('mèo');
    // người chơi xin duyệt từ lạ: máy không tính là người bỏ phiếu
    expect(submit(room, host, `${word.split(' ')[1]} xyzw`)).toMatchObject({ ok: false });
    room.dispose();
  });
});

describe('Máy chơi Bầu cua', () => {
  it('đặt cược trong lúc đặt cửa, không vượt số xu', () => {
    const { room, host, bot } = withBot('baucua');
    expect(room.start(host)).toEqual({ ok: true });
    vi.advanceTimersByTime(2500);
    const bets = bc(room).bets[bot];
    const total = Object.values(bets ?? {}).reduce((a, b) => a + (b ?? 0), 0);
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThanOrEqual(bc(room).balances[bot]);
    room.dispose();
  });
});

describe('Máy chơi Cờ tỷ phú', () => {
  it('tự đổ xúc xắc, đi, quyết định rồi chuyển lượt cho người chơi', () => {
    const { room, host, bot } = withBot('typhu');
    expect(room.start(host)).toEqual({ ok: true });
    const tp = () => room.toPublic().game as TyPhuView;
    expect(tp().currentPlayerId).toBe(bot);
    let passed = false;
    for (let t = 0; t < 120 && !passed; t++) {
      vi.advanceTimersByTime(1000);
      passed = tp().currentPlayerId === host || room.toPublic().phase !== 'playing';
    }
    expect(passed).toBe(true);
    expect(tp().pos[bot]).not.toBe(0);
    room.dispose();
  });
});
