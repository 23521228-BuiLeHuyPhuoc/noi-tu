import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { io as connect, type Socket } from 'socket.io-client';
import { createGameServer, type GameServer } from '../src/app';
import { MemoryStore } from '../src/store';
import { cleanFun, isHardDisrupt, pauseMsOf, WindowLimiter } from '../src/fun';
import { smallDict, setup, startWordChain, wc } from './helpers';
import { shopItem, skillPrice } from '../../shared/src/shop';
import type { ChatMsg, ClientToServerEvents, FunEvent, ServerToClientEvents } from '../../shared/src/types';

const skills = [
  ['duck', 8, 3500], ['ufo', 15, 3500], ['disco', 10, 4000], ['money', 8, 3000],
] as const;

describe.each(skills)('%s paid skill', (kind, price, pause) => {
  it('validates its target and uses the shared price and disruption policy', () => {
    expect(cleanFun({ kind, to: 'target', variant: 999, price: 0 })).toEqual({ kind, to: 'target' });
    for (const to of [undefined, null, 42, {}, []]) expect(cleanFun({ kind, to })).toBeNull();
    expect(shopItem(kind)).toMatchObject({ kind: 'skill', price });
    expect(skillPrice(kind)).toBe(price);
    expect(isHardDisrupt(kind)).toBe(true);
    expect(pauseMsOf({ kind, to: 'target' })).toBe(pause);
    const { room, ids } = setup(['An', 'Binh']);
    startWordChain(room, ids[0], 'con mèo');
    const before = wc(room);
    expect(room.disrupt(before.currentPlayerId!, pauseMsOf({ kind, to: before.currentPlayerId! }))).toBe(pause);
    expect(wc(room).turnEndsAt).toBe(before.turnEndsAt! + pause);
  });

  it('rejects guests, insufficient funds and invalid receivers without broadcasting or charging', async () => {
    const an = await account('anvui');
    const bi = await account('binh');
    const guest = await client();
    const boss = await account('boss');
    await pair(an, bi);
    await guest.emitWithAck('room:join', { code: an.code, name: 'Guest' });
    expect(await guest.emitWithAck('fun:send', { kind, to: bi.pid } as never)).toEqual({ ok: false, reason: 'need_account' });
    expect(await an.emitWithAck('fun:send', { kind, to: bi.pid } as never)).toEqual({ ok: false, reason: 'need_ruby' });
    await fund(boss, 'anvui', 50);
    for (const to of [an.pid, 'missing', '', null, 42]) {
      expect(await an.emitWithAck('fun:send', { kind, to } as never)).toEqual({ ok: false });
    }
    expect(await balance(an)).toBe(50);
    expect(an.funs).toEqual([]);
    expect(bi.funs).toEqual([]);
  });

  it('debits exactly once before broadcasting and never rewards the recipient', async () => {
    const an = await account('anvui');
    const bi = await account('binh');
    const boss = await account('boss');
    await pair(an, bi);
    await fund(boss, 'anvui', 50);
    const event = new Promise<FunEvent>((resolve) => bi.once('fun:event', resolve));
    expect(await an.emitWithAck('fun:send', { kind, to: bi.pid, price: 0, variant: 999 } as never)).toEqual({ ok: true });
    expect(await event).toMatchObject({ kind, from: an.pid, to: bi.pid });
    expect(await balance(an)).toBe(50 - price);
    expect(await balance(bi)).toBe(0);
    expect(await bi.emitWithAck('shop:get')).toMatchObject({ giftPoints: 0 });
    expect(await an.emitWithAck('fun:quota')).toEqual({ free: 30, left: 30 });
    const history = await an.emitWithAck('wallet:history');
    expect(history.ok && history.rows.filter((r) => r.reason === 'skill').map((r) => r.delta)).toEqual([-price]);
  });
});

it('reopens the shared disruption window at exactly fifteen seconds', () => {
  const limiter = new WindowLimiter();
  for (let i = 0; i < 3; i++) expect(limiter.take('target', 1000)).toBe(true);
  expect(limiter.take('target', 15999)).toBe(false);
  expect(limiter.take('target', 16000)).toBe(true);
});

it('shares the three-per-15-second disruption budget across new and existing skills', async () => {
  const an = await account('anvui');
  const bi = await account('binh');
  const boss = await account('boss');
  await pair(an, bi);
  await fund(boss, 'anvui', 100);
  for (const kind of ['duck', 'ufo', 'lightning']) {
    expect(await an.emitWithAck('fun:send', { kind, to: bi.pid } as never)).toEqual({ ok: true });
  }
  for (const kind of ['disco', 'money']) {
    expect(await an.emitWithAck('fun:send', { kind, to: bi.pid } as never)).toMatchObject({ ok: false, reason: 'limited' });
  }
  expect(await balance(an)).toBe(67);
  expect(bi.funs).toHaveLength(3);
});

type Client = Socket<ServerToClientEvents, ClientToServerEvents> & { funs: FunEvent[]; chats: ChatMsg[]; pid: string; code: string };

let server: GameServer;
let url: string;
let clock: number;
const clients: Client[] = [];
const env = { admins: process.env.ADMIN_USERNAMES, mem: process.env.ALLOW_MEMORY_ADMIN };

async function start(freePokes?: number) {
  server = createGameServer(smallDict(), {
    store: new MemoryStore(),
    mailer: null,
    now: () => clock,
    freePokes,
    room: { turnMs: 5000, disconnectGraceMs: 300 },
    emptyRoomTtlMs: 300,
  });
  await new Promise<void>((r) => server.http.listen(0, r));
  url = `http://localhost:${(server.http.address() as AddressInfo).port}`;
}

beforeEach(async () => {
  process.env.ADMIN_USERNAMES = 'boss';
  process.env.ALLOW_MEMORY_ADMIN = '1';
  clock = Date.parse('2026-11-12T05:00:00Z'); // 12:00 giờ VN
  await start();
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
  c.chats = [];
  c.on('fun:event', (e) => c.funs.push(e));
  c.on('chat:msg', (m) => c.chats.push(m));
  clients.push(c);
  return new Promise((resolve) => c.on('connect', () => resolve(c)));
}
async function account(username: string) {
  const c = await client();
  const r = await c.emitWithAck('auth:register', { username, email: `${username}@x.vn`, password: 'matkhau1', displayName: username });
  if (!r.ok) throw new Error(r.error);
  return c;
}
async function fund(boss: Client, username: string, delta: number) {
  const r = await boss.emitWithAck('admin:adjust', { username, delta, reason: 'test' });
  if (!r.ok) throw new Error(r.error);
}
async function balance(c: Client) {
  const r = await c.emitWithAck('wallet:get');
  if (!r.ok) throw new Error(r.error);
  return r.ruby;
}
/** hai người cùng phòng: a tạo, b vào */
async function pair(a: Client, b: Client, nameA = 'An', nameB = 'Binh') {
  const created = await a.emitWithAck('room:create', { name: nameA });
  if (!created.ok) throw new Error(created.error);
  const joined = await b.emitWithAck('room:join', { code: created.code, name: nameB });
  if (!joined.ok) throw new Error(joined.error);
  a.pid = created.playerId;
  b.pid = joined.playerId;
  a.code = b.code = created.code;
}


