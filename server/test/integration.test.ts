import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { io as connect, type Socket } from 'socket.io-client';
import { createGameServer, type GameServer } from '../src/app';
import { smallDict } from './helpers';
import type { ClientToServerEvents, RoomState, ServerToClientEvents } from '../../shared/src/types';

type Client = Socket<ServerToClientEvents, ClientToServerEvents> & { state?: RoomState };

const TURN_MS = 600;
let server: GameServer;
let url: string;
const clients: Client[] = [];

beforeEach(async () => {
  server = createGameServer(smallDict(), {
    room: { turnMs: TURN_MS, disconnectGraceMs: 300 },
    emptyRoomTtlMs: 300,
  });
  await new Promise<void>((r) => server.http.listen(0, r));
  url = `http://localhost:${(server.http.address() as AddressInfo).port}`;
});

afterEach(async () => {
  for (const c of clients.splice(0)) c.disconnect();
  await server.close();
});

function client(): Promise<Client> {
  const c = connect(url, { transports: ['websocket'], forceNew: true, reconnection: false }) as Client;
  c.on('room:state', (s) => (c.state = s));
  clients.push(c);
  return new Promise((resolve) => c.on('connect', () => resolve(c)));
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Chờ tới khi trạng thái mới nhất của client thỏa điều kiện */
async function until(c: Client, pred: (s: RoomState) => boolean, timeout = 3000): Promise<RoomState> {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (c.state && pred(c.state)) return c.state;
    await wait(10);
  }
  throw new Error('Hết thời gian chờ trạng thái: ' + JSON.stringify(c.state));
}

const emit = {
  create: (c: Client, name: string, playerId?: string) => c.emitWithAck('room:create', { name, playerId }),
  join: (c: Client, code: string, name: string, playerId?: string) => c.emitWithAck('room:join', { code, name, playerId }),
  start: (c: Client) => c.emitWithAck('game:start'),
  submit: (c: Client, word: string) => c.emitWithAck('word:submit', { word }),
  restart: (c: Client) => c.emitWithAck('game:restart'),
  leave: (c: Client) => c.emitWithAck('room:leave'),
};

/** Tìm một từ hợp lệ để nối (dùng kho từ nhỏ của test) */
function answerFor(state: RoomState): string | null {
  const last = state.currentWord!.split(' ')[1];
  const used = new Set(state.history.flatMap((h) => ('word' in h ? [h.word] : [])));
  return smallDict()['byFirst' as never]?.get?.(last)?.find((w: string) => !used.has(w)) ?? null;
}

describe('Server + 3 người chơi qua Socket.IO', () => {
  it('chơi trọn một ván: tạo phòng, vào phòng, nối từ, bị loại, có người thắng, chơi lại', async () => {
    const [a, b, c] = await Promise.all([client(), client(), client()]);

    const created = await emit.create(a, 'An');
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const code = created.code;
    expect(code).toMatch(/^[A-Z2-9]{6}$/);

    expect((await emit.join(b, code.toLowerCase(), 'Bình')).ok).toBe(true);
    expect((await emit.join(c, code, 'Chi')).ok).toBe(true);
    await until(a, (s) => s.players.length === 3);

    // người không phải chủ phòng không bắt đầu được
    expect(await emit.start(b)).toEqual({ ok: false, error: 'not_host' });
    expect(await emit.start(a)).toEqual({ ok: true });
    const s0 = await until(c, (s) => s.phase === 'playing');
    expect(s0.currentWord).toBeTruthy();
    expect(s0.nextCount).toBeGreaterThan(0);

    // người đang tới lượt nối một từ đúng
    const byId = new Map([[created.playerId, a]]);
    for (const cl of [b, c]) byId.set(cl.state!.players.find((p) => p.name === (cl === b ? 'Bình' : 'Chi'))!.id, cl);
    const first = byId.get(s0.currentPlayerId!)!;
    const ans = answerFor(s0)!;
    expect(await emit.submit(first, 'sai bét')).toEqual({ ok: false, reason: 'chain' });
    expect(await emit.submit(first, ans)).toEqual({ ok: true });
    const s1 = await until(a, (s) => s.currentWord === ans);
    expect(s1.currentPlayerId).not.toBe(s0.currentPlayerId);

    // không ai trả lời -> lần lượt bị loại -> còn 1 người thắng
    const end = await until(a, (s) => s.phase === 'finished', 5000);
    expect(end.winnerId).toBeTruthy();
    expect(end.players.filter((p) => p.eliminated)).toHaveLength(2);

    expect(await emit.restart(a)).toEqual({ ok: true });
    await until(b, (s) => s.phase === 'lobby' && s.players.length === 3);
  });

  it('báo lỗi khi mã phòng sai, tên rỗng', async () => {
    const a = await client();
    expect(await emit.join(a, 'ZZZZZZ', 'An')).toEqual({ ok: false, error: 'room_not_found' });
    expect(await emit.create(a, '   ')).toEqual({ ok: false, error: 'invalid_name' });
    expect(server.manager.size).toBe(0);
  });

  it('rớt mạng rồi vào lại bằng playerId cũ giữa ván', async () => {
    const [a, b] = await Promise.all([client(), client()]);
    const created = await emit.create(a, 'An');
    if (!created.ok) throw new Error();
    const joined = await emit.join(b, created.code, 'Bình');
    if (!joined.ok) throw new Error();
    await emit.start(a);
    await until(a, (s) => s.phase === 'playing');

    b.disconnect();
    await until(a, (s) => s.players.find((p) => p.id === joined.playerId)?.connected === false);

    const b2 = await client();
    const again = await emit.join(b2, created.code, 'Bình', joined.playerId);
    expect(again).toEqual({ ok: true, code: created.code, playerId: joined.playerId });
    const s = await until(b2, (st) => st.phase === 'playing');
    expect(s.players).toHaveLength(2);
    expect(s.players.find((p) => p.id === joined.playerId)!.connected).toBe(true);
  });

  it('kết nối cũ ngắt sau khi đã vào lại không làm người chơi bị đánh dấu mất kết nối', async () => {
    const a = await client();
    const created = await emit.create(a, 'An');
    if (!created.ok) throw new Error();
    const a2 = await client();
    await emit.join(a2, created.code, 'An', created.playerId);
    a.disconnect();
    await wait(100);
    const s = await until(a2, (st) => st.players.length === 1);
    expect(s.players[0].connected).toBe(true);
  });

  it('chủ phòng thoát -> chuyển quyền; mọi người thoát -> phòng bị xóa', async () => {
    const [a, b] = await Promise.all([client(), client()]);
    const created = await emit.create(a, 'An');
    if (!created.ok) throw new Error();
    const joined = await emit.join(b, created.code, 'Bình');
    if (!joined.ok) throw new Error();
    await emit.leave(a);
    const s = await until(b, (st) => st.players.length === 1);
    expect(s.hostId).toBe(joined.playerId);
    await emit.leave(b);
    expect(server.manager.size).toBe(0);
  });

  it('phòng không còn ai kết nối thì tự xóa sau một lúc', async () => {
    const a = await client();
    await emit.create(a, 'An');
    expect(server.manager.size).toBe(1);
    a.disconnect();
    await wait(800);
    expect(server.manager.size).toBe(0);
  });

  it('health endpoint trả về số từ', async () => {
    const res = await fetch(url + '/health');
    expect(await res.json()).toMatchObject({ ok: true, words: smallDict().size });
  });
});
