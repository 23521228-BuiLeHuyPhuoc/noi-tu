import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Room } from '../src/room';
import { smallDict, zeroRng } from './helpers';
import { Dictionary } from '../src/dictionary';

const TURN = 30_000;

function setup(names: string[], dict = smallDict()) {
  const onChange = vi.fn();
  const room = new Room('ABC123', dict, { turnMs: TURN, disconnectGraceMs: 30_000, rng: zeroRng, onChange });
  const ids = names.map((n) => {
    const r = room.addPlayer(n);
    if (!r.ok) throw new Error(r.error);
    return r.playerId;
  });
  return { room, ids, onChange };
}

/** Bắt đầu ván với từ mở đầu cố định */
function startWith(room: Room, hostId: string, word: string) {
  const dict = (room as any).dict as Dictionary;
  vi.spyOn(dict, 'randomStart').mockReturnValueOnce(word);
  const r = room.start(hostId);
  expect(r.ok).toBe(true);
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('Room — phòng chờ', () => {
  it('người đầu tiên là chủ phòng, trùng tên được đánh số', () => {
    const { room, ids } = setup(['Phước', 'phước', 'An']);
    const s = room.toPublic();
    expect(s.hostId).toBe(ids[0]);
    expect(s.players.map((p) => p.name)).toEqual(['Phước', 'phước 2', 'An']);
  });

  it('từ chối tên rỗng, phòng đầy, vào khi đang chơi', () => {
    const { room, ids } = setup(['A', 'B', 'C', 'D', 'E', 'F']);
    expect(room.addPlayer('   ')).toEqual({ ok: false, error: 'invalid_name' });
    expect(room.addPlayer('G')).toEqual({ ok: false, error: 'room_full' });
    room.removePlayer(ids[5]);
    room.start(ids[0]);
    expect(room.addPlayer('G')).toEqual({ ok: false, error: 'room_playing' });
  });

  it('chỉ chủ phòng được bắt đầu', () => {
    const { room, ids } = setup(['A', 'B']);
    expect(room.start(ids[1])).toEqual({ ok: false, error: 'not_host' });
    expect(room.start(ids[0]).ok).toBe(true);
  });

  it('chủ phòng thoát thì chuyển quyền cho người kế tiếp', () => {
    const { room, ids } = setup(['A', 'B', 'C']);
    room.removePlayer(ids[0]);
    expect(room.toPublic().hostId).toBe(ids[1]);
  });

  it('mất kết nối ở phòng chờ quá 30s thì bị xóa, quay lại kịp thì giữ chỗ', () => {
    const { room, ids } = setup(['A', 'B', 'C']);
    room.setConnected(ids[1], false);
    room.setConnected(ids[2], false);
    vi.advanceTimersByTime(20_000);
    room.setConnected(ids[2], true);
    vi.advanceTimersByTime(15_000);
    expect(room.toPublic().players.map((p) => p.id)).toEqual([ids[0], ids[2]]);
  });

  it('vào lại bằng playerId cũ không tạo người mới', () => {
    const { room, ids } = setup(['A']);
    room.setConnected(ids[0], false);
    const r = room.addPlayer('A khác', ids[0]);
    expect(r).toEqual({ ok: true, playerId: ids[0] });
    expect(room.toPublic().players).toHaveLength(1);
    expect(room.toPublic().players[0].connected).toBe(true);
  });
});

describe('Room — ván chơi', () => {
  it('nối đúng thì chuyển lượt và đặt lại đồng hồ', () => {
    const { room, ids } = setup(['A', 'B']);
    startWith(room, ids[0], 'con mèo');
    let s = room.toPublic();
    const first = s.currentPlayerId!;
    expect(s.currentWord).toBe('con mèo');
    expect(s.nextCount).toBe(2); // mèo mướp, mèo cụt

    vi.advanceTimersByTime(10_000);
    expect(room.submit(first, 'Mèo  Mướp')).toEqual({ ok: true });
    s = room.toPublic();
    expect(s.currentWord).toBe('mèo mướp');
    expect(s.currentPlayerId).not.toBe(first);
    expect(s.turnEndsAt! - s.serverNow).toBe(TURN);
    expect(s.players.find((p) => p.id === first)!.words).toBe(1);
    expect(s.totalWords).toBe(1);
  });

  it('báo đúng lý do khi từ không hợp lệ, đồng hồ vẫn chạy', () => {
    const { room, ids } = setup(['A', 'B']);
    startWith(room, ids[0], 'con mèo');
    const cur = room.toPublic().currentPlayerId!;
    const other = ids.find((i) => i !== cur)!;
    const endsAt = room.toPublic().turnEndsAt;

    expect(room.submit(other, 'mèo mướp')).toEqual({ ok: false, reason: 'not_your_turn' });
    expect(room.submit(cur, 'mèo')).toEqual({ ok: false, reason: 'format' });
    expect(room.submit(cur, 'mèo mướp đắng')).toEqual({ ok: false, reason: 'format' });
    expect(room.submit(cur, 'đồ đạc')).toEqual({ ok: false, reason: 'chain' });
    expect(room.submit(cur, 'mèo hoang')).toEqual({ ok: false, reason: 'not_in_dictionary' });
    expect(room.submit(cur, 'con mèo')).toEqual({ ok: false, reason: 'chain' });
    expect(room.toPublic().turnEndsAt).toBe(endsAt);
    expect(room.toPublic().currentPlayerId).toBe(cur);
  });

  it('không được dùng lại từ đã dùng', () => {
    const { room, ids } = setup(['A', 'B']);
    startWith(room, ids[0], 'đắng cay');
    const p1 = room.toPublic().currentPlayerId!;
    room.submit(p1, 'cay đắng');
    const p2 = room.toPublic().currentPlayerId!;
    expect(room.submit(p2, 'đắng cay')).toEqual({ ok: false, reason: 'used' });
  });

  it('hết 30s thì bị loại, người kế tiếp nối tiếp từ đang dở', () => {
    const { room, ids } = setup(['A', 'B', 'C']);
    startWith(room, ids[0], 'con mèo');
    const s0 = room.toPublic();
    const order = s0.players.map((p) => p.id);
    vi.advanceTimersByTime(TURN);
    const s = room.toPublic();
    expect(s.players.find((p) => p.id === order[0])!.eliminated).toBe(true);
    expect(s.currentPlayerId).toBe(order[1]);
    expect(s.currentWord).toBe('con mèo');
    expect(s.history.at(-1)).toEqual({ kind: 'eliminated', playerId: order[0], reason: 'timeout' });
  });

  it('gửi từ đúng nhưng sau hạn chót thì tính là hết giờ', () => {
    const { room, ids } = setup(['A', 'B', 'C']);
    startWith(room, ids[0], 'con mèo');
    const cur = room.toPublic().currentPlayerId!;
    // giả lập: đồng hồ đã qua hạn nhưng setTimeout chưa kịp chạy
    vi.setSystemTime(Date.now() + TURN + 1);
    expect(room.submit(cur, 'mèo mướp')).toEqual({ ok: false, reason: 'timeout' });
    expect(room.toPublic().players.find((p) => p.id === cur)!.eliminated).toBe(true);
  });

  it('ngõ cụt: vẫn chờ đủ 30s, sau đó người kế tiếp nhận từ mới', () => {
    const { room, ids } = setup(['A', 'B', 'C']);
    startWith(room, ids[0], 'con mèo');
    const order = room.toPublic().players.map((p) => p.id);
    room.submit(order[0], 'mèo cụt');
    room.submit(order[1], 'cụt lủn');
    let s = room.toPublic();
    expect(s.nextCount).toBe(0);
    expect(s.currentPlayerId).toBe(order[2]);

    vi.advanceTimersByTime(TURN - 1);
    expect(room.toPublic().players.find((p) => p.id === order[2])!.eliminated).toBe(false);
    vi.advanceTimersByTime(1);
    s = room.toPublic();
    expect(s.players.find((p) => p.id === order[2])!.eliminated).toBe(true);
    expect(s.currentPlayerId).toBe(order[0]);
    expect(s.currentWord).not.toBe('cụt lủn');
    expect(s.history.at(-1)).toEqual({ kind: 'newWord', word: s.currentWord });
    expect(s.nextCount).toBeGreaterThan(0);
  });

  it('còn 1 người thì người đó thắng', () => {
    const { room, ids } = setup(['A', 'B']);
    startWith(room, ids[0], 'con mèo');
    const order = room.toPublic().players.map((p) => p.id);
    vi.advanceTimersByTime(TURN);
    const s = room.toPublic();
    expect(s.phase).toBe('finished');
    expect(s.winnerId).toBe(order[1]);
    expect(s.currentPlayerId).toBeNull();
    expect(s.turnEndsAt).toBeNull();
    // không còn đồng hồ nào chạy
    vi.advanceTimersByTime(TURN * 3);
    expect(room.toPublic().phase).toBe('finished');
  });

  it('chơi một mình: nối liên tục tới khi hết giờ, không có người thắng', () => {
    const { room, ids } = setup(['Solo']);
    startWith(room, ids[0], 'con mèo');
    expect(room.submit(ids[0], 'mèo mướp')).toEqual({ ok: true });
    expect(room.toPublic().currentPlayerId).toBe(ids[0]);
    expect(room.submit(ids[0], 'mướp đắng')).toEqual({ ok: true });
    vi.advanceTimersByTime(TURN);
    const s = room.toPublic();
    expect(s.phase).toBe('finished');
    expect(s.winnerId).toBeNull();
    expect(s.totalWords).toBe(2);
  });

  it('rớt mạng giữa ván: giữ chỗ, đồng hồ vẫn chạy và bị loại nếu không kịp', () => {
    const { room, ids } = setup(['A', 'B', 'C']);
    startWith(room, ids[0], 'con mèo');
    const order = room.toPublic().players.map((p) => p.id);
    room.setConnected(order[0], false);
    vi.advanceTimersByTime(29_000);
    expect(room.toPublic().players).toHaveLength(3);
    vi.advanceTimersByTime(1_000);
    expect(room.toPublic().players.find((p) => p.id === order[0])!.eliminated).toBe(true);
    // quay lại sau đó vẫn ở trong phòng (đã bị loại)
    expect(room.addPlayer('A', order[0])).toEqual({ ok: true, playerId: order[0] });
  });

  it('người đang tới lượt thoát hẳn thì chuyển lượt ngay', () => {
    const { room, ids } = setup(['A', 'B', 'C']);
    startWith(room, ids[0], 'con mèo');
    const order = room.toPublic().players.map((p) => p.id);
    vi.advanceTimersByTime(5_000);
    room.removePlayer(order[0]);
    const s = room.toPublic();
    expect(s.currentPlayerId).toBe(order[1]);
    expect(s.turnEndsAt! - s.serverNow).toBe(TURN);
    expect(s.history.at(-1)).toEqual({ kind: 'eliminated', playerId: order[0], reason: 'left' });
  });

  it('thoát hẳn khi chỉ còn 2 người thì người còn lại thắng', () => {
    const { room, ids } = setup(['A', 'B']);
    startWith(room, ids[0], 'con mèo');
    room.removePlayer(ids[1]);
    const s = room.toPublic();
    expect(s.phase).toBe('finished');
    expect(s.winnerId).toBe(ids[0]);
  });

  it('chơi lại: về phòng chờ, giữ người chơi, xóa dữ liệu ván cũ', () => {
    const { room, ids } = setup(['A', 'B']);
    startWith(room, ids[0], 'con mèo');
    vi.advanceTimersByTime(TURN);
    expect(room.restart(ids[1])).toEqual({ ok: false, error: 'not_host' });
    expect(room.restart(ids[0])).toEqual({ ok: true });
    const s = room.toPublic();
    expect(s.phase).toBe('lobby');
    expect(s.players.every((p) => !p.eliminated && p.words === 0)).toBe(true);
    expect(s.history).toEqual([]);
    expect(room.start(ids[0]).ok).toBe(true);
  });

  it('mỗi thay đổi đều gọi onChange để server phát trạng thái', () => {
    const { room, ids, onChange } = setup(['A', 'B']);
    onChange.mockClear();
    startWith(room, ids[0], 'con mèo');
    expect(onChange).toHaveBeenCalled();
    onChange.mockClear();
    vi.advanceTimersByTime(TURN);
    expect(onChange).toHaveBeenCalled();
  });
});
