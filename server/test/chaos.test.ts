import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { io as connect, type Socket } from 'socket.io-client';
import { createGameServer, type GameServer } from '../src/app';
import { MemoryStore } from '../src/store';
import { smallDict } from './helpers';
import { AVATAR_SIDES, POKE_SIDES, isHardPoke, pokeItem } from '../../shared/src/pokes';
import type { ClientToServerEvents, FunEvent, ServerToClientEvents } from '../../shared/src/types';

type Client = Socket<ServerToClientEvents, ClientToServerEvents> & { funs: FunEvent[]; pid: string; code: string };

let server: GameServer;
let url: string;
const clients: Client[] = [];
const env = { admins: process.env.ADMIN_USERNAMES, mem: process.env.ALLOW_MEMORY_ADMIN };

beforeEach(async () => {
  process.env.ADMIN_USERNAMES = 'boss';
  process.env.ALLOW_MEMORY_ADMIN = '1';
  server = createGameServer(smallDict(), {
    store: new MemoryStore(),
    mailer: null,
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
  c.funs = [];
  c.on('fun:event', (e) => c.funs.push(e));
  clients.push(c);
  return new Promise((resolve) => c.on('connect', () => resolve(c)));
}
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function account(username: string) {
  const c = await client();
  const r = await c.emitWithAck('auth:register', { username, email: `${username}@x.vn`, password: 'matkhau1', displayName: username });
  if (!r.ok) throw new Error(r.error);
  return c;
}
async function fund(boss: Client, delta: number) {
  const r = await boss.emitWithAck('admin:adjust', { username: 'boss', delta, reason: 'test' });
  if (!r.ok) throw new Error(r.error);
}
async function balance(c: Client) {
  const r = await c.emitWithAck('wallet:get');
  if (!r.ok) throw new Error(r.error);
  return r.ruby;
}
async function create(c: Client, name: string) {
  const r = await c.emitWithAck('room:create', { name });
  if (!r.ok) throw new Error(r.error);
  c.pid = r.playerId;
  c.code = r.code;
}
async function join(c: Client, code: string, name: string) {
  const r = await c.emitWithAck('room:join', { code, name });
  if (!r.ok) throw new Error(r.error);
  c.pid = r.playerId;
  c.code = code;
}
/** admin tạo phòng, thêm hai khách An và Bình */
async function roomOfThree() {
  const boss = await account('boss');
  const an = await client();
  const bi = await client();
  await create(boss, 'Boss');
  await join(an, boss.code, 'An');
  await join(bi, boss.code, 'Binh');
  return { boss, an, bi };
}
type ChaosEvent = FunEvent & { kind: 'poke'; to: string; poke: string };
const chaosOf = (c: Client) => c.funs.filter((e): e is ChaosEvent => !!e.chaos && e.kind === 'poke');

describe('Chọc loạn xạ (chỉ admin)', () => {
  it('người thường và khách bị từ chối, không ai nhận sự kiện', async () => {
    const an = await account('anvui');
    const guest = await client();
    await create(an, 'An');
    await join(guest, an.code, 'Khach');
    expect(await an.emitWithAck('fun:chaos')).toEqual({ ok: false, reason: 'forbidden' });
    expect(await guest.emitWithAck('fun:chaos')).toEqual({ ok: false, reason: 'forbidden' });
    await wait(50);
    expect(an.funs.length + guest.funs.length).toBe(0);
  });

  it('admin chọc cả phòng: trừ 20 một lần, mỗi người khác nhận đúng một món', async () => {
    const { boss, an, bi } = await roomOfThree();
    await fund(boss, 100);
    expect(await boss.emitWithAck('fun:chaos')).toMatchObject({ ok: true, hit: 2, cost: 20, balance: 80 });
    await wait(50);
    const seen = chaosOf(an);
    expect(seen.map((e) => e.to).sort()).toEqual([an.pid, bi.pid].sort());
    for (const e of seen) {
      expect(e).toMatchObject({ kind: 'poke', from: boss.pid, chaos: true });
      expect(pokeItem(e.poke)).toBeDefined();
      // món không dễ thương luôn kèm một hiệu ứng phụ
      if (!pokeItem(e.poke)!.nice) expect(POKE_SIDES).toContain(e.side);
    }
    expect(chaosOf(boss).length).toBe(2);
    expect(await balance(boss)).toBe(80);
  });

  it('phòng chỉ còn admin: empty, không trừ', async () => {
    const boss = await account('boss');
    await create(boss, 'Boss');
    await fund(boss, 100);
    expect(await boss.emitWithAck('fun:chaos')).toEqual({ ok: false, reason: 'empty' });
    // người khác đã mất kết nối cũng không tính
    const an = await client();
    await join(an, boss.code, 'An');
    an.disconnect();
    await wait(80);
    expect(await boss.emitWithAck('fun:chaos')).toEqual({ ok: false, reason: 'empty' });
    expect(await balance(boss)).toBe(100);
  });

  it('chưa vào phòng: empty', async () => {
    const boss = await account('boss');
    await fund(boss, 100);
    expect(await boss.emitWithAck('fun:chaos')).toEqual({ ok: false, reason: 'empty' });
  });

  it('thiếu Ruby: need_ruby, không ai bị chọc', async () => {
    const { boss, an } = await roomOfThree();
    await fund(boss, 10);
    expect(await boss.emitWithAck('fun:chaos')).toEqual({ ok: false, reason: 'need_ruby' });
    await wait(50);
    expect(chaosOf(an).length).toBe(0);
    expect(await balance(boss)).toBe(10);
  });

  it('người đã chạm giới hạn rung màn hình chỉ nhận món nhẹ, không được bù giờ', async () => {
    const { boss, an } = await roomOfThree();
    await fund(boss, 100);
    const room = server.manager.get(boss.code)!;
    for (let i = 0; i < 3; i++) room.disruptLimiter.take(an.pid);
    expect(await boss.emitWithAck('fun:chaos')).toMatchObject({ ok: true });
    await wait(50);
    const mine = chaosOf(an).find((e) => e.to === an.pid)!;
    expect(isHardPoke(pokeItem(mine.poke)!)).toBe(false);
    expect(mine.pausedMs).toBeUndefined();
    if (mine.side) expect(AVATAR_SIDES).toContain(mine.side);
  });

  it('bấm dồn 5 lần: 3 lần qua rồi busy, chỉ trừ cho lần qua', async () => {
    const { boss } = await roomOfThree();
    await fund(boss, 100);
    const rs = await Promise.all([1, 2, 3, 4, 5].map(() => boss.emitWithAck('fun:chaos')));
    expect(rs.filter((r) => r.ok).length).toBe(3);
    expect(rs.filter((r) => !r.ok && r.reason === 'busy').length).toBe(2);
    expect(await balance(boss)).toBe(40);
  });

  it('admin đang là người xem giữa ván vẫn chọc được', async () => {
    const an = await client();
    const bi = await client();
    await create(an, 'An');
    await join(bi, an.code, 'Binh');
    expect(await an.emitWithAck('game:start')).toEqual({ ok: true });
    const boss = await account('boss');
    await join(boss, an.code, 'Boss');
    expect(server.manager.get(an.code)!.isSpectator(boss.pid)).toBe(true);
    await fund(boss, 100);
    expect(await boss.emitWithAck('fun:chaos')).toMatchObject({ ok: true, hit: 2 });
  });
});
