import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setup, startWordChain, submit, TURN, wc } from './helpers';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('Nối từ', () => {
  it('nối đúng thì chuyển lượt và đặt lại đồng hồ', () => {
    const { room, ids } = setup(['A', 'B']);
    startWordChain(room, ids[0], 'con mèo');
    let g = wc(room);
    const first = g.currentPlayerId!;
    expect(g.currentWord).toBe('con mèo');
    expect(g.nextCount).toBe(2);
    vi.advanceTimersByTime(10_000);
    expect(submit(room, first, 'Mèo  Mướp')).toEqual({ ok: true });
    g = wc(room);
    expect(g.currentWord).toBe('mèo mướp');
    expect(g.currentPlayerId).not.toBe(first);
    expect(g.turnEndsAt! - Date.now()).toBe(TURN);
    expect(g.words[first]).toBe(1);
    expect(g.totalWords).toBe(1);
  });

  it('báo đúng lý do khi từ không hợp lệ, đồng hồ vẫn chạy', () => {
    const { room, ids } = setup(['A', 'B']);
    startWordChain(room, ids[0], 'con mèo');
    const cur = wc(room).currentPlayerId!;
    const other = ids.find((i) => i !== cur)!;
    const endsAt = wc(room).turnEndsAt;
    expect(submit(room, other, 'mèo mướp')).toEqual({ ok: false, reason: 'not_your_turn' });
    expect(submit(room, cur, 'mèo')).toEqual({ ok: false, reason: 'format' });
    expect(submit(room, cur, 'mèo mướp đắng')).toEqual({ ok: false, reason: 'format' });
    expect(submit(room, cur, 'đồ đạc')).toEqual({ ok: false, reason: 'chain' });
    expect(submit(room, cur, 'mèo hoang')).toEqual({ ok: false, reason: 'not_in_dictionary' });
    expect(wc(room).turnEndsAt).toBe(endsAt);
    expect(wc(room).currentPlayerId).toBe(cur);
  });

  it('không được dùng lại từ đã dùng', () => {
    const { room, ids } = setup(['A', 'B']);
    startWordChain(room, ids[0], 'đắng cay');
    submit(room, wc(room).currentPlayerId!, 'cay đắng');
    expect(submit(room, wc(room).currentPlayerId!, 'đắng cay')).toEqual({ ok: false, reason: 'used' });
  });

  it('hết giờ thì bị loại, người kế tiếp nối tiếp từ đang dở', () => {
    const { room, ids } = setup(['A', 'B', 'C']);
    startWordChain(room, ids[0], 'con mèo');
    const order = wc(room).order;
    vi.advanceTimersByTime(TURN);
    const g = wc(room);
    expect(g.eliminated).toEqual([order[0]]);
    expect(g.currentPlayerId).toBe(order[1]);
    expect(g.currentWord).toBe('con mèo');
    expect(g.history.at(-1)).toMatchObject({ kind: 'eliminated', playerId: order[0], reason: 'timeout' });
  });

  it('gửi từ đúng nhưng sau hạn chót thì tính là hết giờ', () => {
    const { room, ids } = setup(['A', 'B', 'C']);
    startWordChain(room, ids[0], 'con mèo');
    const cur = wc(room).currentPlayerId!;
    vi.setSystemTime(Date.now() + TURN + 1);
    expect(submit(room, cur, 'mèo mướp')).toEqual({ ok: false, reason: 'timeout' });
    expect(wc(room).eliminated).toContain(cur);
  });

  it('ngõ cụt: vẫn chờ đủ giờ, sau đó người kế tiếp nhận từ mới', () => {
    const { room, ids } = setup(['A', 'B', 'C']);
    startWordChain(room, ids[0], 'con mèo');
    const order = wc(room).order;
    submit(room, order[0], 'mèo cụt');
    submit(room, order[1], 'cụt lủn');
    expect(wc(room).nextCount).toBe(0);
    vi.advanceTimersByTime(TURN - 1);
    expect(wc(room).eliminated).toEqual([]);
    vi.advanceTimersByTime(1);
    const g = wc(room);
    expect(g.eliminated).toEqual([order[2]]);
    expect(g.currentPlayerId).toBe(order[0]);
    expect(g.currentWord).not.toBe('cụt lủn');
    expect(g.history.at(-1)).toEqual({ kind: 'newWord', word: g.currentWord, definition: { text: 'Chưa có giải nghĩa', source: null } });
  });

  it('quyền cứu trợ: chỉ người đang tới lượt, mỗi người 1 lần, trả về từ nối được', () => {
    const { room, ids } = setup(['A', 'B']);
    startWordChain(room, ids[0], 'con mèo');
    const cur = wc(room).currentPlayerId!;
    const other = ids.find((i) => i !== cur)!;
    expect(room.action(other, { type: 'hint' })).toEqual({ ok: false, reason: 'not_your_turn' });
    const r = room.action(cur, { type: 'hint' });
    expect(r.ok && ['mèo mướp', 'mèo cụt'].includes(r.hint!)).toBe(true);
    expect(room.action(cur, { type: 'hint' })).toEqual({ ok: false, reason: 'hint_used' });
    expect(wc(room).hintUsed).toEqual([cur]);
    expect(wc(room).history.at(-1)).toMatchObject({ kind: 'hint', playerId: cur });
  });

  it('chơi một mình: nối liên tục tới khi hết giờ, không có người thắng', () => {
    const { room, ids } = setup(['Solo']);
    startWordChain(room, ids[0], 'con mèo');
    expect(submit(room, ids[0], 'mèo mướp')).toEqual({ ok: true });
    expect(submit(room, ids[0], 'mướp đắng')).toEqual({ ok: true });
    vi.advanceTimersByTime(TURN);
    const s = room.toPublic();
    expect(s.phase).toBe('finished');
    expect(s.result?.winnerId).toBeNull();
    expect(s.result?.headline).toContain('2 từ');
  });

  it('rớt mạng giữa ván: giữ chỗ, bị loại nếu không kịp, vào lại vẫn được', () => {
    const { room, ids } = setup(['A', 'B', 'C']);
    startWordChain(room, ids[0], 'con mèo');
    const order = wc(room).order;
    room.setConnected(order[0], false);
    vi.advanceTimersByTime(TURN);
    expect(wc(room).eliminated).toEqual([order[0]]);
    expect(room.addPlayer('A', order[0])).toEqual({ ok: true, playerId: order[0] });
  });

  it('người đang tới lượt thoát hẳn thì chuyển lượt ngay, tên vẫn còn trong lịch sử', () => {
    const { room, ids } = setup(['A', 'B', 'C']);
    startWordChain(room, ids[0], 'con mèo');
    const order = wc(room).order;
    const name = room.toPublic().players.find((p) => p.id === order[0])!.name;
    vi.advanceTimersByTime(5_000);
    room.removePlayer(order[0]);
    const g = wc(room);
    expect(g.currentPlayerId).toBe(order[1]);
    expect(g.turnEndsAt! - Date.now()).toBe(TURN);
    expect(g.history.at(-1)).toEqual({ kind: 'eliminated', playerId: order[0], name, reason: 'left' });
  });

  it('thoát khi chỉ còn 2 người thì người còn lại thắng', () => {
    const { room, ids } = setup(['A', 'B']);
    startWordChain(room, ids[0], 'con mèo');
    room.removePlayer(ids[1]);
    expect(room.toPublic().phase).toBe('finished');
    expect(room.toPublic().result?.winnerId).toBe(ids[0]);
  });

  it('kết thúc thì không còn đồng hồ chạy', () => {
    const { room, ids, onChange } = setup(['A', 'B']);
    startWordChain(room, ids[0], 'con mèo');
    vi.advanceTimersByTime(TURN);
    onChange.mockClear();
    vi.advanceTimersByTime(TURN * 5);
    expect(onChange).not.toHaveBeenCalled();
  });
});
