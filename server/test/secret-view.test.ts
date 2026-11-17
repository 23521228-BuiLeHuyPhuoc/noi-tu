import { describe, expect, it } from 'vitest';
import { io as clientIo } from 'socket.io-client';
import type { AddressInfo } from 'node:net';
import { MAX_PLAYERS, PLAYER_COLORS, type RoomState } from '../../shared/src/types';
import { Dictionary } from '../src/dictionary';
import { createGameServer } from '../src/app';
import { MemoryStore } from '../src/store';
import { Room } from '../src/room';
import { SMALL_WORDS } from './helpers';

describe('Phase 1 — 12 người, thắng theo phe (winnerIds) & cách ly perPlayerView', () => {
  it('cho phép đủ 12 người (và 12 bot) trong cùng phòng với 12 màu không trùng', () => {
    const dict = new Dictionary(SMALL_WORDS);
    const room = new Room('ROOM12', dict);
    const host = room.addPlayer('Chủ Phòng');
    expect(host.ok).toBe(true);
    if (!host.ok) return;
    for (let i = 1; i < MAX_PLAYERS; i++) {
      expect(room.addBot(host.playerId).ok).toBe(true);
    }
    const pub = room.toPublic();
    expect(pub.players).toHaveLength(12);
    expect(pub.maxPlayers).toBe(12);
    expect(new Set(pub.players.map((p) => p.character?.color)).size).toBe(12);
    expect(PLAYER_COLORS).toHaveLength(12);
    expect(room.addBot(host.playerId)).toEqual({ ok: false, error: 'room_full' });
  });

  it('MemoryStore.recordGame hỗ trợ cộng thắng cho nhiều người cùng phe', async () => {
    const store = new MemoryStore();
    const u1 = await store.createUser({ username: 'a1', displayName: 'A1', avatar: 0, passHash: 'x', salt: 's' });
    const u2 = await store.createUser({ username: 'a2', displayName: 'A2', avatar: 1, passHash: 'x', salt: 's' });
    const u3 = await store.createUser({ username: 'a3', displayName: 'A3', avatar: 2, passHash: 'x', salt: 's' });
    if (typeof u1 === 'string' || typeof u2 === 'string' || typeof u3 === 'string') throw new Error('user');

    await store.recordGame([u1.id, u2.id, u3.id], 'baucua', [u1.id, u2.id]);
    expect((await store.userById(u1.id))?.stats.baucua).toEqual({ played: 1, won: 1 });
    expect((await store.userById(u2.id))?.stats.baucua).toEqual({ played: 1, won: 1 });
    expect((await store.userById(u3.id))?.stats.baucua).toEqual({ played: 1, won: 0 });
  });

  it('broadcastRoom gửi state riêng theo viewerId khi engine bật perPlayerView', async () => {
    const dict = new Dictionary(SMALL_WORDS);
    const srv = createGameServer(dict);
    await new Promise<void>((resolve) => srv.http.listen(0, resolve));
    const port = (srv.http.address() as AddressInfo).port;
    const url = `http://localhost:${port}`;

    const c1 = clientIo(url, { transports: ['websocket'] });
    const c2 = clientIo(url, { transports: ['websocket'] });
    await Promise.all([
      new Promise<void>((r) => c1.on('connect', r)),
      new Promise<void>((r) => c2.on('connect', r)),
    ]);

    const states1: RoomState[] = [];
    const states2: RoomState[] = [];
    c1.on('room:state', (s) => states1.push(s));
    c2.on('room:state', (s) => states2.push(s));

    const cr = await new Promise<{ ok: boolean; code?: string; playerId?: string }>((r) =>
      c1.emit('room:create', { name: 'P1', gameType: 'baucua' }, r),
    );
    expect(cr.ok).toBe(true);
    const jr = await new Promise<{ ok: boolean; playerId?: string }>((r) =>
      c2.emit('room:join', { code: cr.code!, name: 'P2' }, r),
    );
    expect(jr.ok).toBe(true);

    const room = srv.manager.get(cr.code!)!;
    // Giả lập engine có perPlayerView = true để kiểm tra socket isolation
    (room as unknown as { phase: string }).phase = 'playing';
    (room as unknown as { engine: unknown }).engine = {
      perPlayerView: true,
      start: () => {},
      action: () => ({ ok: true }),
      removePlayer: () => {},
      view: (viewerId?: string) => ({
        type: 'baucua',
        round: 1,
        maxRounds: 10,
        step: 'betting',
        stepEndsAt: Date.now() + 10_000,
        dice: null,
        balances: {},
        bets: {},
        lastDeltas: null,
        debts: {},
        recent: [],
        names: { secretOwner: viewerId ?? 'none' },
      }),
      dispose: () => {},
    };

    (room as unknown as { changed: () => void }).changed();
    await new Promise((r) => setTimeout(r, 80));

    const last1 = states1.at(-1)?.game as { names?: Record<string, string> } | undefined;
    const last2 = states2.at(-1)?.game as { names?: Record<string, string> } | undefined;
    expect(last1?.names?.secretOwner).toBe(cr.playerId);
    expect(last2?.names?.secretOwner).toBe(jr.playerId);

    c1.close();
    c2.close();
    await srv.close();
  });
});
