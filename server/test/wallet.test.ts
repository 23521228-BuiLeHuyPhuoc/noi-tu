import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { io as connect, type Socket } from 'socket.io-client';
import { createGameServer, type GameServer } from '../src/app';
import { MemoryStore } from '../src/store';
import { smallDict } from './helpers';
import type { ClientToServerEvents, ServerToClientEvents, TopupRequest } from '../../shared/src/types';

type Client = Socket<ServerToClientEvents, ClientToServerEvents> & { updates: { ruby: number; delta: number; reason: string }[]; rejected: number[] };

let server: GameServer;
let url: string;
const clients: Client[] = [];
const oldAdmins = process.env.ADMIN_USERNAMES;

beforeEach(async () => {
  process.env.ADMIN_USERNAMES = ' Boss , other ';
  server = createGameServer(smallDict(), { store: new MemoryStore(), mailer: null, room: { turnMs: 5000, disconnectGraceMs: 300 }, emptyRoomTtlMs: 300 });
  await new Promise<void>((r) => server.http.listen(0, r));
  url = `http://localhost:${(server.http.address() as AddressInfo).port}`;
});

afterEach(async () => {
  for (const c of clients.splice(0)) c.disconnect();
  await server.close();
  process.env.ADMIN_USERNAMES = oldAdmins;
});

function client(): Promise<Client> {
  const c = connect(url, { transports: ['websocket'], forceNew: true, reconnection: false }) as Client;
  c.updates = [];
  c.rejected = [];
  c.on('wallet:update', (p) => c.updates.push(p));
  c.on('wallet:rejected', (p) => c.rejected.push(p.amount));
  clients.push(c);
  return new Promise((resolve) => c.on('connect', () => resolve(c)));
}
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function account(username: string) {
  const c = await client();
  const r = await c.emitWithAck('auth:register', { username, email: `${username}@x.vn`, password: 'matkhau1', displayName: username });
  if (!r.ok) throw new Error(r.error);
  return { c, user: r.user };
}
async function request(c: Client, amount: number): Promise<TopupRequest> {
  const r = await c.emitWithAck('wallet:request', { amount });
  if (!r.ok) throw new Error(r.error);
  return r.request;
}

describe('Ví Ruby qua Socket.IO', () => {
  it('khách chưa đăng nhập: need_account; tài khoản có mã nạp XL, 0 Ruby', async () => {
    const g = await client();
    expect(await g.emitWithAck('wallet:get')).toEqual({ ok: false, error: 'need_account' });
    const { c } = await account('anvui');
    const w = await c.emitWithAck('wallet:get');
    expect(w).toMatchObject({ ok: true, ruby: 0, firstTopupDone: false, pending: [] });
    expect(w.ok && w.topupCode).toMatch(/^XL[0-9A-Z]{6}$/);
  });

  it('yêu cầu nạp chỉ nhận đúng giá gói, tối đa 3 yêu cầu chờ', async () => {
    const { c } = await account('anvui');
    expect(await c.emitWithAck('wallet:request', { amount: 12_345 })).toEqual({ ok: false, error: 'bad_request' });
    await request(c, 50_000);
    await request(c, 10_000);
    await request(c, 20_000);
    expect(await c.emitWithAck('wallet:request', { amount: 10_000 })).toEqual({ ok: false, error: 'too_many' });
    const w = await c.emitWithAck('wallet:get');
    expect(w.ok && w.pending.length).toBe(3);
  });

  it('người thường gọi lệnh quản trị: forbidden; quản trị có cờ admin', async () => {
    const { c, user } = await account('anvui');
    expect(user.admin).toBeUndefined();
    expect(await c.emitWithAck('admin:requests', { status: 'pending' })).toEqual({ ok: false, error: 'forbidden' });
    expect(await c.emitWithAck('admin:revenue')).toEqual({ ok: false, error: 'forbidden' });
    const boss = await account('boss');
    expect(boss.user.admin).toBe(true);
    const login = await (await client()).emitWithAck('auth:login', { username: 'boss', password: 'matkhau1' });
    expect(login.ok && login.user.admin).toBe(true);
  });

  it('duyệt gói 50k lần đầu: +1.100 Ruby, cả hai máy của người chơi nhận wallet:update; duyệt lại: already_handled', async () => {
    const { c: an } = await account('anvui');
    const an2 = await client();
    await an2.emitWithAck('auth:login', { username: 'anvui', password: 'matkhau1' });
    const { c: boss } = await account('boss');
    const req = await request(an, 50_000);
    const list = await boss.emitWithAck('admin:requests', { status: 'pending' });
    expect(list.ok && list.requests.map((r) => r.id)).toEqual([req.id]);
    const r = await boss.emitWithAck('admin:approve', { id: req.id });
    expect(r).toMatchObject({ ok: true, ruby: 1100, balance: 1100 });
    await wait(50);
    expect(an.updates).toEqual([{ ruby: 1100, delta: 1100, reason: 'topup' }]);
    expect(an2.updates).toEqual([{ ruby: 1100, delta: 1100, reason: 'topup' }]);
    expect(await boss.emitWithAck('admin:approve', { id: req.id })).toEqual({ ok: false, error: 'already_handled' });
    const w = await an.emitWithAck('wallet:get');
    expect(w).toMatchObject({ ok: true, ruby: 1100, firstTopupDone: true, pending: [] });
  });

  it('hai lần duyệt song song: chỉ một lần cộng', async () => {
    const { c: an } = await account('anvui');
    const { c: boss } = await account('boss');
    const req = await request(an, 10_000);
    const rs = await Promise.all([boss.emitWithAck('admin:approve', { id: req.id }), boss.emitWithAck('admin:approve', { id: req.id })]);
    expect(rs.filter((r) => r.ok).length).toBe(1);
    const w = await an.emitWithAck('wallet:get');
    expect(w.ok && w.ruby).toBe(200);
  });

  it('lần nạp thứ hai không nhân đôi; duyệt với số tiền thực nhận khác gói: theo tỉ lệ', async () => {
    const { c: an } = await account('anvui');
    const { c: boss } = await account('boss');
    await boss.emitWithAck('admin:approve', { id: (await request(an, 10_000)).id });
    const r = await boss.emitWithAck('admin:approve', { id: (await request(an, 50_000)).id, amount: 35_000 });
    expect(r).toMatchObject({ ok: true, ruby: 350, balance: 550 });
    expect(await boss.emitWithAck('admin:approve', { id: (await request(an, 10_000)).id, amount: 500 })).toEqual({ ok: false, error: 'bad_request' });
  });

  it('từ chối: người chơi nhận wallet:rejected, không cộng', async () => {
    const { c: an } = await account('anvui');
    const { c: boss } = await account('boss');
    const req = await request(an, 20_000);
    expect(await boss.emitWithAck('admin:reject', { id: req.id })).toMatchObject({ ok: true });
    await wait(50);
    expect(an.rejected).toEqual([20_000]);
    expect(an.updates).toEqual([]);
    expect(await boss.emitWithAck('admin:reject', { id: req.id })).toEqual({ ok: false, error: 'already_handled' });
    expect(await boss.emitWithAck('admin:approve', { id: 'khong-co' })).toEqual({ ok: false, error: 'not_found' });
  });

  it('cộng theo mã (viết thường, có khoảng trắng) đúng người; mã lạ: not_found', async () => {
    const { c: an } = await account('anvui');
    const { c: boss } = await account('boss');
    const w = await an.emitWithAck('wallet:get');
    if (!w.ok) throw new Error();
    const spaced = `ck ${w.topupCode.slice(0, 4).toLowerCase()} ${w.topupCode.slice(4)}`;
    const r = await boss.emitWithAck('admin:creditCode', { code: spaced, amount: 100_000 });
    expect(r).toMatchObject({ ok: true, ruby: 2300, balance: 2300 });
    await wait(50);
    expect(an.updates.at(-1)).toEqual({ ruby: 2300, delta: 2300, reason: 'topup' });
    expect(await boss.emitWithAck('admin:creditCode', { code: 'XLZZZZZZ', amount: 10_000 })).toEqual({ ok: false, error: 'not_found' });
  });

  it('cộng/trừ tay: bắt buộc lý do, không làm âm số dư', async () => {
    const { c: an } = await account('anvui');
    const { c: boss } = await account('boss');
    expect(await boss.emitWithAck('admin:adjust', { username: 'anvui', delta: 50, reason: '' })).toEqual({ ok: false, error: 'bad_request' });
    expect(await boss.emitWithAck('admin:adjust', { username: 'anvui', delta: 50, reason: 'tặng' })).toEqual({ ok: true, balance: 50 });
    expect(await boss.emitWithAck('admin:adjust', { username: 'anvui', delta: -60, reason: 'trừ' })).toEqual({ ok: false, error: 'insufficient' });
    expect(await boss.emitWithAck('admin:adjust', { username: 'ai-do', delta: 5, reason: 'x' })).toEqual({ ok: false, error: 'not_found' });
    const h = await an.emitWithAck('wallet:history');
    expect(h.ok && h.rows.map((r) => [r.delta, r.balance, r.reason])).toEqual([[50, 50, 'admin_adjust']]);
  });

  it('doanh thu cộng các khoản đã duyệt', async () => {
    const { c: an } = await account('anvui');
    const { c: boss } = await account('boss');
    await boss.emitWithAck('admin:approve', { id: (await request(an, 50_000)).id });
    await boss.emitWithAck('admin:reject', { id: (await request(an, 20_000)).id });
    const w = await an.emitWithAck('wallet:get');
    if (!w.ok) throw new Error();
    await boss.emitWithAck('admin:creditCode', { code: w.topupCode, amount: 10_000 });
    expect(await boss.emitWithAck('admin:revenue')).toEqual({ ok: true, today: 60_000, month: 60_000, total: 60_000 });
  });
});
