import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { io as connect, type Socket } from 'socket.io-client';
import { createGameServer, type GameServer } from '../src/app';
import { MemoryStore } from '../src/store';
import { hashPassword, verifyPassword } from '../src/auth';
import { smallDict, startWordChain } from './helpers';
import type { AuthAck, ChatMsg, ClientToServerEvents, FunEvent, RoomState, ServerToClientEvents } from '../../shared/src/types';
import { Room } from '../src/room';

type Client = Socket<ServerToClientEvents, ClientToServerEvents> & { state?: RoomState; fun: FunEvent[]; chat: ChatMsg[] };

let server: GameServer;
let store: MemoryStore;
let url: string;
const clients: Client[] = [];

beforeEach(async () => {
  store = new MemoryStore();
  server = createGameServer(smallDict(), { store, room: { turnMs: 400, disconnectGraceMs: 300 }, emptyRoomTtlMs: 300 });
  await new Promise<void>((r) => server.http.listen(0, r));
  url = `http://localhost:${(server.http.address() as AddressInfo).port}`;
});

afterEach(async () => {
  for (const c of clients.splice(0)) c.disconnect();
  await server.close();
});

function client(): Promise<Client> {
  const c = connect(url, { transports: ['websocket'], forceNew: true, reconnection: false }) as Client;
  c.fun = [];
  c.chat = [];
  c.on('room:state', (s) => (c.state = s));
  c.on('fun:event', (e) => c.fun.push(e));
  c.on('chat:msg', (m) => c.chat.push(m));
  c.on('chat:history', (ms) => (c.chat = [...ms]));
  clients.push(c);
  return new Promise((resolve) => c.on('connect', () => resolve(c)));
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const okUser = (r: AuthAck) => {
  if (!r.ok) throw new Error(r.error);
  return r;
};

describe('Mật khẩu', () => {
  it('băm bằng scrypt có muối, kiểm tra đúng/sai', async () => {
    const h = await hashPassword('bimat123');
    expect(h.passHash).not.toContain('bimat123');
    expect(await verifyPassword('bimat123', h)).toBe(true);
    expect(await verifyPassword('bimat124', h)).toBe(false);
    expect((await hashPassword('bimat123')).passHash).not.toBe(h.passHash);
  });
});

describe('Tài khoản qua Socket.IO', () => {
  it('register requires valid email, rejects taken email case-insensitively and logs in by email', async () => {
    const a = await client();
    const base = { username: 'email_user', password: 'secret123', displayName: 'Email' };
    expect(await a.emitWithAck('auth:register', base as never)).toEqual({ ok: false, error: 'invalid_email' });
    expect(await a.emitWithAck('auth:register', { ...base, email: 'bad' })).toEqual({ ok: false, error: 'invalid_email' });
    const registered = okUser(await a.emitWithAck('auth:register', { ...base, email: ' TEST@example.com ' }));
    const b = await client();
    expect(await b.emitWithAck('auth:register', { ...base, username: 'email_other', email: 'Test@Example.com' })).toEqual({ ok: false, error: 'email_taken' });
    expect(okUser(await b.emitWithAck('auth:login', { username: ' TEST@EXAMPLE.COM ', password: base.password })).user.id).toBe(registered.user.id);
  });

  it('đăng ký, đăng nhập lại, dùng lại phiên, đổi hồ sơ, đăng xuất', async () => {
    const a = await client();
    expect(await a.emitWithAck('auth:register', { username: 'ab', email: 'ab@example.com', password: '123456', displayName: 'An' })).toEqual({
      ok: false,
      error: 'invalid_username',
    });
    expect(await a.emitWithAck('auth:register', { username: 'an_an', email: 'an_an@example.com', password: '123', displayName: 'An' })).toEqual({
      ok: false,
      error: 'invalid_password',
    });
    const reg = okUser(await a.emitWithAck('auth:register', { username: 'An_An', email: 'an_an@example.com', password: 'matkhau', displayName: 'An Béo', avatar: 3 }));
    expect(reg.user).toMatchObject({ username: 'an_an', displayName: 'An Béo', avatar: 3, stats: {} });
    expect(reg.token).toMatch(/^[0-9a-f]{64}$/);

    const b = await client();
    expect(await b.emitWithAck('auth:register', { username: 'an_an', email: 'an_an@example.com', password: 'khac123', displayName: 'X' })).toEqual({
      ok: false,
      error: 'username_taken',
    });
    expect(await b.emitWithAck('auth:login', { username: 'an_an', password: 'sai1234' })).toEqual({ ok: false, error: 'wrong_credentials' });
    const login = okUser(await b.emitWithAck('auth:login', { username: 'AN_AN', password: 'matkhau' }));
    expect(login.user.id).toBe(reg.user.id);

    const c = await client();
    const resumed = okUser(await c.emitWithAck('auth:resume', { token: reg.token }));
    expect(resumed.user.displayName).toBe('An Béo');
    const upd = okUser(await c.emitWithAck('auth:update', { displayName: '  An Gầy ', avatar: 7 }));
    expect(upd.user).toMatchObject({ displayName: 'An Gầy', avatar: 7 });

    expect(await c.emitWithAck('auth:logout')).toEqual({ ok: true });
    expect(await c.emitWithAck('auth:resume', { token: reg.token })).toEqual({ ok: false, error: 'session_expired' });
    // phiên của máy khác vẫn còn
    expect((await b.emitWithAck('auth:resume', { token: login.token })).ok).toBe(true);
  });

  it('vào phòng bằng tài khoản: id cố định, tên + ảnh theo tài khoản; khách không mạo danh được', async () => {
    const a = await client();
    const reg = okUser(await a.emitWithAck('auth:register', { username: 'binh', email: 'binh@example.com', password: 'matkhau', displayName: 'Bình', avatar: 5 }));
    const created = await a.emitWithAck('room:create', { name: 'tên gì cũng được' });
    if (!created.ok) throw new Error(created.error);
    expect(created.playerId).toBe('u-' + reg.user.id);
    expect(a.state!.players[0]).toMatchObject({ name: 'Bình', avatar: 5, account: true });

    const g = await client();
    const j = await g.emitWithAck('room:join', { code: created.code, name: 'Khách', playerId: 'u-' + reg.user.id });
    if (!j.ok) throw new Error(j.error);
    expect(j.playerId).not.toBe('u-' + reg.user.id);
    await wait(30);
    expect(a.state!.players.map((p) => p.name)).toEqual(['Bình', 'Khách']);
    expect(a.state!.players[1].account).toBeUndefined();
  });

  it('kết thúc ván thì cộng thành tích cho người có tài khoản', async () => {
    const a = await client();
    const reg = okUser(await a.emitWithAck('auth:register', { username: 'chi', email: 'chi@example.com', password: 'matkhau', displayName: 'Chi' }));
    const b = await client();
    const created = await a.emitWithAck('room:create', { name: 'x' });
    if (!created.ok) throw new Error(created.error);
    await b.emitWithAck('room:join', { code: created.code, name: 'Khách' });
    await a.emitWithAck('game:start');
    const t0 = Date.now();
    while (a.state?.phase !== 'finished' && Date.now() - t0 < 4000) await wait(20);
    await wait(50);
    const u = await store.userById(reg.user.id);
    expect(u!.stats.wordchain?.played).toBe(1);
    expect(u!.stats.wordchain?.won).toBe(a.state!.result!.winnerId === created.playerId ? 1 : 0);
  });

  it('trò chuyện: phát cho cả phòng, người vào sau nhận lịch sử, chặn tin rỗng và spam', async () => {
    const a = await client();
    const b = await client();
    const created = await a.emitWithAck('room:create', { name: 'An' });
    if (!created.ok) throw new Error(created.error);
    expect(await a.emitWithAck('chat:send', { text: '  xin   chào\n cả nhà ' })).toEqual({ ok: true });
    expect(await a.emitWithAck('chat:send', { text: '   ' })).toEqual({ ok: false });
    await b.emitWithAck('room:join', { code: created.code, name: 'Bình' });
    await wait(30);
    expect(b.chat.map((m) => m.text)).toEqual(['xin chào cả nhà']);
    expect(await b.emitWithAck('chat:send', { text: 'a'.repeat(500) })).toEqual({ ok: true });
    await wait(30);
    expect(a.chat.at(-1)!.text).toHaveLength(200);
    expect(a.chat.at(-1)).toMatchObject({ from: b.state!.players[1].id, name: 'Bình' });
    const res = [];
    for (let i = 0; i < 10; i++) res.push((await b.emitWithAck('chat:send', { text: 'spam' })).ok);
    expect(res.filter((x) => !x).length).toBeGreaterThan(0);
  });

  it('thả emoji và đánh nhau: server tính sát thương, máu ảo, K.O. thì hồi đầy', async () => {
    const a = await client();
    const b = await client();
    const created = await a.emitWithAck('room:create', { name: 'An' });
    if (!created.ok) throw new Error(created.error);
    const j = await b.emitWithAck('room:join', { code: created.code, name: 'Bình' });
    if (!j.ok) throw new Error(j.error);
    expect(await a.emitWithAck('fun:send', { kind: 'emoji', emoji: '😂' })).toEqual({ ok: true });
    expect(await a.emitWithAck('fun:send', { kind: 'emoji', emoji: '🍕' as never })).toEqual({ ok: false });
    expect(await a.emitWithAck('fun:send', { kind: 'hit', to: created.playerId, move: 'dam' })).toEqual({ ok: false });
    expect(await a.emitWithAck('fun:send', { kind: 'hit', to: j.playerId, move: 'chuong' })).toEqual({ ok: true });
    await wait(30);
    const hit = b.fun.find((f) => f.kind === 'hit')!;
    expect(hit).toMatchObject({ from: created.playerId, to: j.playerId, move: 'chuong' });
    expect(hit.damage).toBeGreaterThanOrEqual(18);
    expect(hit.hp).toBe(100 - hit.damage!);
  });
});

describe('Máu ảo trong phòng', () => {
  it('đánh tới khi K.O.', () => {
    const room = new Room('X', smallDict(), { rng: () => 0.5 });
    room.addPlayer('A');
    let last = { damage: 0, hp: 100, ko: false };
    let n = 0;
    while (!last.ko && n++ < 50) last = room.hp.hit('B', 'da');
    expect(last.ko).toBe(true);
    expect(last.hp).toBe(0);
    expect(room.hp.get('B')).toBe(100);
  });
});

describe('Từ điển học từ mới', () => {
  it('Dictionary.add thêm từ hợp lệ, bỏ qua từ đã có / sai định dạng / bị cấm', async () => {
    const { Dictionary } = await import('../src/dictionary');
    const d = new Dictionary(['con mèo'], new Set(['từ cấm']));
    expect(d.add('Mèo Hoang')).toBe('mèo hoang');
    expect(d.has('mèo hoang')).toBe(true);
    expect(d.countNext('mèo', new Set())).toBe(1);
    expect(d.add('mèo hoang')).toBeNull();
    expect(d.add('mèo')).toBeNull();
    expect(d.add('từ cấm')).toBeNull();
  });

  it('từ được duyệt trong phòng được lưu vào kho', async () => {
    const room = server.manager.create();
    const a = room.addPlayer('A');
    const b = room.addPlayer('B');
    if (!a.ok || !b.ok) throw new Error();
    startWordChain(room, a.playerId, 'con mèo');
    const g = room.toPublic().game as { order: string[] };
    const [cur, other] = g.order;
    expect(room.action(cur, { type: 'appeal', word: 'mèo hoang' })).toEqual({ ok: true });
    expect(room.action(other, { type: 'vote', yes: true })).toEqual({ ok: true });
    await wait(10);
    expect(await store.listWords()).toEqual(['mèo hoang']);
  });
});
