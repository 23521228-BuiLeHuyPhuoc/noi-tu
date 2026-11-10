import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setup, startWordChain, TURN, wc } from './helpers';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('Room — phòng chờ', () => {
  it('người đầu tiên là chủ phòng, trùng tên được đánh số, avatar và màu nhân vật không trùng', () => {
    const { room, ids } = setup(['Phước', 'phước', 'An', 'B', 'C', 'D']);
    const s = room.toPublic();
    expect(s.hostId).toBe(ids[0]);
    expect(s.players.map((p) => p.name).slice(0, 3)).toEqual(['Phước', 'phước 2', 'An']);
    expect(new Set(s.players.map((p) => p.avatar)).size).toBe(6);
    expect(new Set(s.players.map((p) => p.character?.color)).size).toBe(6);
  });

  it('tùy chỉnh hình tượng nhân vật (tóc tai, độ tuổi, giới tính) và chặn trùng màu trong phòng', () => {
    const { room, ids } = setup(['A', 'B']);
    const colorB = room.toPublic().players[1].character!.color;
    expect(room.customize(ids[0], { gender: 'nu', age: 'trung', hair: 'xoan' })).toEqual({ ok: true });
    expect(room.toPublic().players[0].character).toMatchObject({ gender: 'nu', age: 'trung', hair: 'xoan' });
    // không được chọn màu đang thuộc về người chơi B
    expect(room.customize(ids[0], { color: colorB })).toEqual({ ok: false, error: 'color_taken' });
    // chọn màu trống thì thành công
    expect(room.customize(ids[0], { color: 7 })).toEqual({ ok: true });
    expect(room.toPublic().players[0].character?.color).toBe(7);
  });

  it('cho phép tên dài tới 24 ký tự', () => {
    const { room } = setup([]);
    expect(room.addPlayer('Nguyễn Thị Phương Thảo').ok).toBe(true);
    expect(room.addPlayer('x'.repeat(25))).toEqual({ ok: false, error: 'invalid_name' });
  });

  it('từ chối tên rỗng, phòng đầy; vào khi đang chơi thì ở chế độ xem (spectator) và không được thao tác', () => {
    const { room, ids } = setup(['A', 'B', 'C', 'D', 'E', 'F']);
    expect(room.addPlayer('   ')).toEqual({ ok: false, error: 'invalid_name' });
    expect(room.addPlayer('G')).toEqual({ ok: false, error: 'room_full' });
    room.removePlayer(ids[5]);
    room.start(ids[0]);
    const joined = room.addPlayer('G');
    expect(joined.ok).toBe(true);
    if (joined.ok) {
      const gPlayer = room.toPublic().players.find((p) => p.id === joined.playerId);
      expect(gPlayer?.spectator).toBe(true);
      expect(room.action(joined.playerId, { type: 'submit', word: 'mèo mướp' })).toEqual({ ok: false, reason: 'spectating' });
    }
  });

  it('chỉ chủ phòng được đổi game, cài đặt và bắt đầu', () => {
    const { room, ids } = setup(['A', 'B']);
    expect(room.configure(ids[1], 'ludo')).toEqual({ ok: false, error: 'not_host' });
    expect(room.configure(ids[0], 'ludo', { ludoPieces: 2 })).toEqual({ ok: true });
    expect(room.toPublic().gameType).toBe('ludo');
    expect(room.toPublic().settings.ludoPieces).toBe(2);
    expect(room.configure(ids[0], 'baucua', { baucuaRounds: 20 })).toEqual({ ok: true });
    expect(room.toPublic().settings.baucuaRounds).toBe(20);
    expect(room.configure(ids[0], 'ludo')).toEqual({ ok: true });
    expect(room.configure(ids[0], 'xyz')).toEqual({ ok: false, error: 'bad_request' });
    expect(room.configure(ids[0], undefined, { ludoPieces: 3 as never })).toEqual({ ok: false, error: 'bad_request' });
    expect(room.configure(ids[0], undefined, { baucuaRounds: 7 as never })).toEqual({ ok: false, error: 'bad_request' });
    expect(room.start(ids[1])).toEqual({ ok: false, error: 'not_host' });
    expect(room.start(ids[0]).ok).toBe(true);
  });

  it('kiểm tra số người theo từng game', () => {
    const { room, ids } = setup(['A']);
    room.configure(ids[0], 'ludo');
    expect(room.start(ids[0])).toEqual({ ok: false, error: 'too_few_players' });
    for (const n of ['B', 'C', 'D', 'E']) room.addPlayer(n);
    expect(room.start(ids[0])).toEqual({ ok: false, error: 'too_many_players' });
    room.configure(ids[0], 'baucua');
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
    expect(room.addPlayer('A khác', ids[0])).toEqual({ ok: true, playerId: ids[0] });
    expect(room.toPublic().players).toHaveLength(1);
    expect(room.toPublic().players[0].connected).toBe(true);
  });

  it('kết thúc ván: có bảng xếp hạng; chơi lại hoặc đổi game thì về phòng chờ', () => {
    const { room, ids } = setup(['A', 'B']);
    startWordChain(room, ids[0], 'con mèo');
    vi.advanceTimersByTime(TURN);
    let s = room.toPublic();
    expect(s.phase).toBe('finished');
    expect(s.result?.ranking).toHaveLength(2);
    expect(s.result?.winnerId).toBe(wc(room).order[1]);
    expect(room.restart(ids[1])).toEqual({ ok: false, error: 'not_host' });
    expect(room.configure(ids[0], 'baucua')).toEqual({ ok: true });
    s = room.toPublic();
    expect(s.phase).toBe('lobby');
    expect(s.game).toBeNull();
    expect(s.result).toBeNull();
  });

  it('hành động sai định dạng bị từ chối', () => {
    const { room, ids } = setup(['A']);
    expect(room.action(ids[0], { type: 'submit', word: 'x' })).toEqual({ ok: false, reason: 'not_playing' });
    room.start(ids[0]);
    expect(room.action(ids[0], null)).toEqual({ ok: false, reason: 'bad_action' });
    expect(room.action(ids[0], { type: 'roll' })).toEqual({ ok: false, reason: 'bad_action' });
  });
});
