import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VOTE_SECONDS } from '../../shared/src/types';
import { setup, startWordChain, submit, TURN, wc } from './helpers';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const VOTE = VOTE_SECONDS * 1000;

function three() {
  const s = setup(['A', 'B', 'C']);
  startWordChain(s.room, s.ids[0], 'con mèo');
  const order = wc(s.room).order;
  return { ...s, cur: order[0], others: order.slice(1) };
}

describe('Xin cả phòng duyệt từ chưa có trong từ điển', () => {
  it('đa số đồng ý: từ được nhận, thêm vào từ điển và chuyển lượt', () => {
    const { room, cur, others, learned, dict } = three();
    vi.advanceTimersByTime(10_000);
    expect(submit(room, cur, 'mèo hoang')).toEqual({ ok: false, reason: 'not_in_dictionary', word: 'mèo hoang' });
    expect(room.action(cur, { type: 'appeal', word: 'Mèo  Hoang' })).toEqual({ ok: true });
    let g = wc(room);
    expect(g.vote).toMatchObject({ word: 'mèo hoang', byId: cur, voters: others, yes: [], no: [] });
    expect(g.turnEndsAt).toBeNull();
    // đang bỏ phiếu thì không ai nộp từ / xin gợi ý được
    expect(submit(room, cur, 'mèo mướp')).toEqual({ ok: false, reason: 'bad_action' });
    expect(room.action(cur, { type: 'vote', yes: true })).toEqual({ ok: false, reason: 'not_voting' });
    expect(room.action(others[0], { type: 'vote', yes: true })).toEqual({ ok: true });
    expect(wc(room).vote?.yes).toEqual([others[0]]);
    expect(room.action(others[1], { type: 'vote', yes: true })).toEqual({ ok: true });
    g = wc(room);
    expect(g.vote).toBeNull();
    expect(g.currentWord).toBe('mèo hoang');
    expect(g.currentPlayerId).toBe(others[0]);
    expect(g.history.at(-2)).toMatchObject({ kind: 'vote', word: 'mèo hoang', approved: true });
    const curName = room.toPublic().players.find((p) => p.id === cur)!.name;
    expect(learned).toEqual([{ word: 'mèo hoang', by: curName }]);
    expect(dict.has('mèo hoang')).toBe(true);
  });

  it('bị bác: tiếp tục lượt với thời gian còn lại, mỗi lượt chỉ xin 1 lần', () => {
    const { room, cur, others, learned } = three();
    vi.advanceTimersByTime(10_000);
    room.action(cur, { type: 'appeal', word: 'mèo hoang' });
    vi.advanceTimersByTime(3_000);
    room.action(others[0], { type: 'vote', yes: false });
    room.action(others[1], { type: 'vote', yes: true }); // hòa phiếu -> bác
    const g = wc(room);
    expect(g.vote).toBeNull();
    expect(g.currentPlayerId).toBe(cur);
    expect(g.turnEndsAt! - Date.now()).toBe(TURN - 10_000);
    expect(g.history.at(-1)).toMatchObject({ kind: 'vote', approved: false });
    expect(learned).toEqual([]);
    expect(room.action(cur, { type: 'appeal', word: 'mèo hoang' })).toEqual({ ok: false, reason: 'cannot_appeal' });
  });

  it('hết giờ bỏ phiếu: người không bấm coi như phiếu trắng', () => {
    const { room, cur, others } = three();
    room.action(cur, { type: 'appeal', word: 'mèo hoang' });
    room.action(others[0], { type: 'vote', yes: true });
    vi.advanceTimersByTime(VOTE);
    expect(wc(room).currentWord).toBe('mèo hoang');
  });

  it('chỉ xin được với từ đúng luật mà từ điển chưa có', () => {
    const { room, cur } = three();
    expect(room.action(cur, { type: 'appeal', word: 'đồ đạc' })).toEqual({ ok: false, reason: 'cannot_appeal' });
    expect(room.action(cur, { type: 'appeal', word: 'mèo' })).toEqual({ ok: false, reason: 'cannot_appeal' });
    expect(room.action(cur, { type: 'appeal', word: 'mèo mướp' })).toEqual({ ok: false, reason: 'cannot_appeal' });
  });

  it('chơi một mình hoặc không còn ai online thì không xin được', () => {
    const { room, ids } = setup(['A']);
    startWordChain(room, ids[0], 'con mèo');
    expect(room.action(ids[0], { type: 'appeal', word: 'mèo hoang' })).toEqual({ ok: false, reason: 'no_voters' });
  });

  it('người bỏ phiếu cuối cùng thoát thì chốt phiếu luôn; người xin thoát thì lượt chuyển tiếp', () => {
    const a = three();
    a.room.action(a.cur, { type: 'appeal', word: 'mèo hoang' });
    a.room.action(a.others[0], { type: 'vote', yes: true });
    a.room.removePlayer(a.others[1]);
    expect(wc(a.room).currentWord).toBe('mèo hoang');

    const b = three();
    b.room.action(b.cur, { type: 'appeal', word: 'mèo hoang' });
    b.room.removePlayer(b.cur);
    const g = wc(b.room);
    expect(g.vote).toBeNull();
    expect(g.currentPlayerId).toBe(b.others[0]);
    expect(g.turnEndsAt! - Date.now()).toBe(TURN);
  });
});
