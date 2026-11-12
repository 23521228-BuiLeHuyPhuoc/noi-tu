import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { io as connect, type Socket } from 'socket.io-client';
import { createGameServer, type GameServer } from '../src/app';
import { MemoryStore } from '../src/store';
import {
  GAME_INFO, type ClientToServerEvents, type GameType, type LeaderRow, type RoomState, type RoomSummary, type ServerToClientEvents,
} from '../../shared/src/types';
import { setup, smallDict } from './helpers';

const GAME = Object.keys(GAME_INFO)[0] as GameType;

describe('Phòng công khai / riêng tư và mời ra', () => {
  it('mặc định công khai; chỉ chủ phòng đổi được, kể cả lúc đang chơi', () => {
    const { room, ids } = setup(['A', 'B']);
    expect(room.toPublic().isPublic).toBe(true);
    expect(room.setPublic(ids[1], false)).toEqual({ ok: false, error: 'not_host' });
    expect(room.setPublic(ids[0], 'x')).toEqual({ ok: false, error: 'bad_request' });
    expect(room.setPublic(ids[0], false)).toEqual({ ok: true });
    expect(room.toPublic().isPublic).toBe(false);
    room.start(ids[0]);
    expect(room.setPublic(ids[0], true)).toEqual({ ok: true });
    expect(room.toPublic().isPublic).toBe(true);
    room.dispose();
  });

  it('chủ phòng mời người ra; người đó không vào lại bằng id cũ được', () => {
    const { room, ids } = setup(['A', 'B', 'C']);
    expect(room.kick(ids[1], ids[2])).toEqual({ ok: false, error: 'not_host' });
    expect(room.kick(ids[0], ids[0])).toEqual({ ok: false, error: 'bad_request' });
    expect(room.kick(ids[0], 'nguoi-la-1234')).toEqual({ ok: false, error: 'bad_request' });
    expect(room.kick(ids[0], ids[1])).toEqual({ ok: true });
    expect(room.toPublic().players.map((p) => p.id)).toEqual([ids[0], ids[2]]);
    expect(room.addPlayer('B', ids[1])).toEqual({ ok: false, error: 'kicked' });
    room.dispose();
  });

  it('mời ra giữa ván: người đó rời ván, phòng vẫn còn', () => {
    const { room, ids } = setup(['A', 'B', 'C']);
    expect(room.start(ids[0]).ok).toBe(true);
    expect(room.kick(ids[0], ids[2])).toEqual({ ok: true });
    expect(room.has(ids[2])).toBe(false);
    expect(room.toPublic().players).toHaveLength(2);
    room.dispose();
  });

  it('thông tin gọn cho sảnh', () => {
    const { room } = setup(['An', 'Bình']);
    expect(room.summary()).toMatchObject({ code: 'ABC123', gameType: GAME, hostName: 'An', players: 2, maxPlayers: 6, names: ['An', 'Bình'], phase: 'lobby' });
    room.dispose();
  });
});

describe('Bảng xếp hạng', () => {
  it('xếp theo số lần thắng; bằng nhau thì ai chơi ít ván hơn đứng trên; chỉ tính người đã chơi', async () => {
    const st = new MemoryStore();
    const mk = async (n: string) => {
      const user = await st.createUser({ username: n, displayName: n.toUpperCase(), avatar: 0, passHash: 'x', salt: 'y' });
      if (typeof user === 'string') throw new Error(user);
      return user;
    };
    const a = await mk('an');
    const b = await mk('binh');
    const c = await mk('chi');
    await mk('dung'); // chưa chơi ván nào: không có trong bảng
    await st.recordGame([a.id, b.id, c.id], GAME, a.id);
    await st.recordGame([a.id, b.id], GAME, b.id);
    await st.recordGame([b.id], GAME, b.id);
    await st.recordGame([c.id], GAME, c.id);
    // AN 1/2, BINH 2/3, CHI 1/2 -> BINH; AN và CHI cùng 1 thắng 2 ván -> theo tên
    const rows = await st.leaderboard(GAME, 10);
    expect(rows.map((r) => [r.displayName, r.won, r.played])).toEqual([['BINH', 2, 3], ['AN', 1, 2], ['CHI', 1, 2]]);
    expect((await st.leaderboard(null, 10)).map((r) => r.displayName)).toEqual(['BINH', 'AN', 'CHI']);
    expect(await st.leaderboard(GAME, 1)).toHaveLength(1);
  });
});

type Client = Socket<ServerToClientEvents, ClientToServerEvents> & { state?: RoomState };

describe('Sảnh phòng, mời ra và bảng xếp hạng qua server', () => {
  let server: GameServer;
  let url: string;
  let store: MemoryStore;
  const clients: Client[] = [];

  beforeEach(async () => {
    store = new MemoryStore();
    server = createGameServer(smallDict(), { store, room: { disconnectGraceMs: 300 }, emptyRoomTtlMs: 300 });
    await new Promise<void>((r) => server.http.listen(0, r));
    url = `http://localhost:${(server.http.address() as AddressInfo).port}`;
  });
  afterEach(async () => {
    for (const c of clients.splice(0)) c.disconnect();
    await server.close();
  });

  const client = (): Promise<Client> => {
    const c = connect(url, { transports: ['websocket'], forceNew: true, reconnection: false }) as Client;
    c.on('room:state', (s) => (c.state = s));
    clients.push(c);
    return new Promise((resolve) => c.on('connect', () => resolve(c)));
  };
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const until = async (c: Client, pred: (s: RoomState) => boolean) => {
    for (let t = 0; t < 300; t++) {
      if (c.state && pred(c.state)) return c.state;
      await wait(10);
    }
    throw new Error('timeout');
  };
  const rooms = async () => ((await (await fetch(url + '/api/rooms')).json()) as { rooms: RoomSummary[] }).rooms;

  it('chỉ phòng công khai hiện trong sảnh; người bị mời ra nhận room:kicked và không vào lại được', async () => {
    const a = await client();
    const b = await client();
    const created = await a.emitWithAck('room:create', { name: 'Chủ' });
    if (!created.ok) throw new Error(created.error);
    const { code } = created;
    const j = await b.emitWithAck('room:join', { code, name: 'Khách', playerId: 'khach-0001-abcd' });
    if (!j.ok) throw new Error(j.error);
    await until(a, (s) => s.players.length === 2);
    expect(await rooms()).toEqual([expect.objectContaining({ code, hostName: 'Chủ', players: 2, names: ['Chủ', 'Khách'] })]);

    expect(await b.emitWithAck('room:visibility', { public: false })).toEqual({ ok: false, error: 'not_host' });
    expect(await a.emitWithAck('room:visibility', { public: false })).toEqual({ ok: true });
    await until(b, (s) => !s.isPublic);
    expect(await rooms()).toEqual([]);

    expect(await b.emitWithAck('room:kick', { playerId: created.playerId })).toEqual({ ok: false, error: 'not_host' });
    const kicked = new Promise((r) => b.once('room:kicked', r));
    expect(await a.emitWithAck('room:kick', { playerId: j.playerId })).toEqual({ ok: true });
    expect(await kicked).toEqual({ code });
    await until(a, (s) => s.players.length === 1);
    // máy bị mời ra không còn thao tác được trong phòng
    expect(await b.emitWithAck('game:start')).toEqual({ ok: false, error: 'not_in_room' });
    expect(await b.emitWithAck('room:join', { code, name: 'Khách', playerId: j.playerId })).toEqual({ ok: false, error: 'kicked' });
  });

  it('phòng không còn ai kết nối thì không hiện trong sảnh', async () => {
    const a = await client();
    await a.emitWithAck('room:create', { name: 'An' });
    expect(await rooms()).toHaveLength(1);
    a.disconnect();
    await wait(100);
    expect(await rooms()).toHaveLength(0);
  });

  it('bảng xếp hạng qua /api/leaderboard', async () => {
    const u = (await store.createUser({ username: 'an', displayName: 'An', avatar: 3, passHash: 'x', salt: 'y' }))!;
    if (typeof u === 'string') throw new Error(u);
    await store.recordGame([u.id], GAME, u.id);
    const get = async (q: string) => fetch(`${url}/api/leaderboard${q}`);
    const one = (await (await get(`?game=${GAME}`)).json()) as { rows: LeaderRow[] };
    expect(one.rows).toEqual([{ rank: 1, id: u.id, displayName: 'An', avatar: 3, won: 1, played: 1 }]);
    const all = (await (await get('')).json()) as { rows: LeaderRow[] };
    expect(all.rows).toHaveLength(1);
    expect((await get('?game=khong-co')).status).toBe(400);
  });
});
