import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { io as connect, type Socket } from 'socket.io-client';
import { createGameServer, type GameServer } from '../src/app';
import { cleanEmail } from '../src/auth';
import { MemoryStore } from '../src/store';
import { smallDict } from './helpers';
import type { ClientToServerEvents, ServerToClientEvents } from '../../shared/src/types';

type Client = Socket<ServerToClientEvents, ClientToServerEvents> & { revoked: number };

let server: GameServer;
let url: string;
let sent: { to: string; subject: string }[];
const clients: Client[] = [];
const env = { admins: process.env.ADMIN_USERNAMES, mem: process.env.ALLOW_MEMORY_ADMIN };

beforeEach(async () => {
  process.env.ADMIN_USERNAMES = 'boss';
  process.env.ALLOW_MEMORY_ADMIN = '1';
  sent = [];
  server = createGameServer(smallDict(), {
    store: new MemoryStore(),
    mailer: { send: async (to, subject) => void sent.push({ to, subject }) },
    room: { turnMs: 5000, disconnectGraceMs: 300 },
    emptyRoomTtlMs: 300,
  });
  await new Promise<void>((r) => server.http.listen(0, r));
  url = `http://localhost:${(server.http.address() as AddressInfo).port}`;
});

afterEach(async () => {
  for (const c of clients.splice(0)) c.disconnect();
  await server.close();
  process.env.ADMIN_USERNAMES = env.admins;
  process.env.ALLOW_MEMORY_ADMIN = env.mem;
});

function client(): Promise<Client> {
  const c = connect(url, { transports: ['websocket'], forceNew: true, reconnection: false }) as Client;
  c.revoked = 0;
  c.on('auth:revoked', () => c.revoked++);
  clients.push(c);
  return new Promise((resolve) => c.on('connect', () => resolve(c)));
}
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function account(username: string, email = `${username}@x.vn`) {
  const c = await client();
  const r = await c.emitWithAck('auth:register', { username, email, password: 'matkhau1', displayName: username });
  if (!r.ok) throw new Error(r.error);
  return c;
}
async function login(username: string, password = 'matkhau1') {
  const c = await client();
  const r = await c.emitWithAck('auth:login', { username, password });
  if (!r.ok) throw new Error(r.error);
  return c;
}
async function resetVia(c: Client, who: string, password: string) {
  expect(await c.emitWithAck('auth:forgot', { who })).toEqual({ ok: true });
  await wait(30);
  const code = /(\d{6})/.exec(sent.at(-1)!.subject)![1];
  return c.emitWithAck('auth:reset', { who, code, password });
}

describe('Sửa sau review: phiên cũ bị thu hồi khi đặt lại / đổi mật khẩu', () => {
  it('đặt lại mật khẩu: socket cũ (kể cả quản trị) mất quyền ví và quản trị ngay, nhận auth:revoked', async () => {
    const old = await account('boss');
    expect((await old.emitWithAck('wallet:get')).ok).toBe(true);
    const other = await client();
    expect((await resetVia(other, 'boss', 'matkhaumoi1')).ok).toBe(true);
    await wait(50);
    expect(old.revoked).toBe(1);
    expect(await old.emitWithAck('wallet:get')).toEqual({ ok: false, error: 'need_account' });
    expect(await old.emitWithAck('admin:adjust', { username: 'boss', delta: 999, reason: 'x' })).toEqual({ ok: false, error: 'need_account' });
    // máy vừa đặt lại vẫn dùng được
    expect((await other.emitWithAck('wallet:get')).ok).toBe(true);
  });

  it('đổi mật khẩu: các máy khác bị thu hồi, máy đang đổi giữ nguyên', async () => {
    const a = await account('anvui');
    const b = await login('anvui');
    expect((await a.emitWithAck('auth:changePassword', { oldPassword: 'matkhau1', password: 'matkhau2' })).ok).toBe(true);
    await wait(50);
    expect(b.revoked).toBe(1);
    expect(a.revoked).toBe(0);
    expect(await b.emitWithAck('wallet:get')).toEqual({ ok: false, error: 'need_account' });
    expect((await a.emitWithAck('wallet:get')).ok).toBe(true);
  });
});

describe('Sửa sau review: cộng theo mã không cộng trùng khi bấm lại', () => {
  it('cùng một lần gửi (nonce) chỉ cộng một lần', async () => {
    const an = await account('anvui');
    const boss = await account('boss');
    const w = await an.emitWithAck('wallet:get');
    if (!w.ok) throw new Error();
    const first = await boss.emitWithAck('admin:creditCode', { code: w.topupCode, amount: 10_000, nonce: 'n-123456' });
    expect(first).toMatchObject({ ok: true, ruby: 200 });
    expect(await boss.emitWithAck('admin:creditCode', { code: w.topupCode, amount: 10_000, nonce: 'n-123456' })).toEqual({ ok: false, error: 'already_handled' });
    const again = await an.emitWithAck('wallet:get');
    expect(again.ok && again.ruby).toBe(200);
    expect(await boss.emitWithAck('admin:revenue')).toMatchObject({ ok: true, total: 10_000 });
    // thiếu nonce: từ chối (app luôn gửi nonce)
    expect(await boss.emitWithAck('admin:creditCode', { code: w.topupCode, amount: 10_000 } as never)).toEqual({ ok: false, error: 'bad_request' });
  });
});

describe('Sửa sau review: không cho quản trị khi server chạy bộ nhớ tạm', () => {
  it('thiếu ALLOW_MEMORY_ADMIN thì lệnh quản trị bị từ chối trên MemoryStore', async () => {
    delete process.env.ALLOW_MEMORY_ADMIN;
    const boss = await account('boss');
    expect(await boss.emitWithAck('admin:revenue')).toEqual({ ok: false, error: 'forbidden' });
    process.env.ALLOW_MEMORY_ADMIN = '1';
    expect((await boss.emitWithAck('admin:revenue')).ok).toBe(true);
  });
});

describe('Sửa sau review: đổi email cần mật khẩu', () => {
  it('đã có email thì phải nhập đúng mật khẩu; đổi email xong mã đặt lại cũ hết hiệu lực', async () => {
    const a = await account('anvui');
    expect(await a.emitWithAck('auth:setEmail', { email: 'moi@x.vn' } as never)).toEqual({ ok: false, error: 'wrong_credentials' });
    expect(await a.emitWithAck('auth:setEmail', { email: 'moi@x.vn', password: 'sai-mat-khau' })).toEqual({ ok: false, error: 'wrong_credentials' });
    // xin mã đặt lại bằng email cũ rồi đổi email
    const other = await client();
    expect(await other.emitWithAck('auth:forgot', { who: 'anvui' })).toEqual({ ok: true });
    await wait(30);
    const code = /(\d{6})/.exec(sent.at(-1)!.subject)![1];
    const r = await a.emitWithAck('auth:setEmail', { email: 'moi@x.vn', password: 'matkhau1' });
    expect(r.ok && r.user.email).toBe('moi@x.vn');
    expect(await other.emitWithAck('auth:reset', { who: 'anvui', code, password: 'matkhau9' })).toEqual({ ok: false, error: 'code_expired' });
  });
});

describe('Sửa sau review: email không được chứa dấu phẩy / nhiều địa chỉ', () => {
  it('cleanEmail chỉ nhận một địa chỉ hợp lệ', () => {
    expect(cleanEmail('An@X.vn ')).toBe('an@x.vn');
    expect(cleanEmail('an@x.vn,zz.zz')).toBeNull();
    expect(cleanEmail('an@x.vn;b@y.vn')).toBeNull();
    expect(cleanEmail('"a b"@x.vn')).toBeNull();
    expect(cleanEmail('a.b+tag@sub.x.vn')).toBe('a.b+tag@sub.x.vn');
  });

  it('không đăng ký né trùng email bằng dấu phẩy', async () => {
    await account('anvui', 'an@x.vn');
    const c = await client();
    expect(await c.emitWithAck('auth:register', { username: 'khac', email: 'an@x.vn,zz.zz', password: 'matkhau1', displayName: 'k' })).toEqual({ ok: false, error: 'invalid_email' });
  });
});
