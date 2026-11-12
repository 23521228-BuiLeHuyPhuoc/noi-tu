import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { io as connect, type Socket } from 'socket.io-client';
import { createGameServer, type GameServer } from '../src/app';
import { MemoryStore } from '../src/store';
import { cleanFun, isDisruptive, isHardFx, pauseMsOf } from '../src/fun';
import { smallDict } from './helpers';
import {
  HARD_POKE_TEMPLATES, POKES, POKE_CATEGORIES, POKE_TEMPLATES, isHardPoke, pokeImageUrl, pokeItem,
} from '../../shared/src/pokes';
import type { ChatMsg, ClientToServerEvents, FunEvent, ServerToClientEvents } from '../../shared/src/types';

const FREE = POKES.find((p) => p.tier === 'free' && !p.nice && p.template === 'throw')!;
const NICE = POKES.find((p) => p.tier === 'free' && p.nice)!;
const RUBY = POKES.find((p) => p.tier === 'ruby' && p.template === 'explode')!;
const RUBY_SOFT = POKES.find((p) => p.tier === 'ruby' && !isHardPoke(p))!;
const RUBY_HARD = POKES.filter((p) => p.tier === 'ruby' && isHardPoke(p));

describe('poke catalog', () => {
  it('has hundreds of unique, valid items', () => {
    expect(POKES.length).toBeGreaterThanOrEqual(200);
    expect(new Set(POKES.map((p) => p.id)).size).toBe(POKES.length);
    expect(POKES.filter((p) => p.tier === 'free').length).toBeGreaterThanOrEqual(100);
    expect(POKES.filter((p) => p.tier === 'ruby').length).toBeGreaterThanOrEqual(80);
    const cats = new Set<string>(POKE_CATEGORIES.map((c) => c.id));
    for (const p of POKES) {
      expect(p.id).toMatch(/^[a-z0-9_]+$/);
      expect(p.name.length).toBeGreaterThan(2);
      expect(p.emoji.length).toBeGreaterThan(0);
      expect(POKE_TEMPLATES).toContain(p.template);
      expect(cats.has(p.category)).toBe(true);
      expect(['free', 'ruby']).toContain(p.tier);
      if (p.tier === 'ruby') expect(p.price).toBeGreaterThanOrEqual(5);
      else expect(p.price).toBeUndefined();
      expect(pokeImageUrl(p)).toMatch(/^https:\/\/cdn\.jsdelivr\.net\/gh\/microsoft\/fluentui-emoji@main\/assets\/[^/]+\/3D\/[a-z0-9_.!-]+_3d\.png$/);
    }
    for (const t of POKE_TEMPLATES) expect(POKES.filter((p) => p.template === t).length).toBeGreaterThanOrEqual(2);
    for (const c of POKE_CATEGORIES) expect(POKES.some((p) => p.category === c.id)).toBe(true);
  });

  it('uses the heavy screen-covering templates only for paid items', () => {
    for (const p of POKES.filter(isHardPoke)) expect(p.tier).toBe('ruby');
    expect(HARD_POKE_TEMPLATES).toEqual(['rain', 'stick', 'giant', 'swarm']);
  });

  it('validates the poke id and keeps the legacy "hối" working', () => {
    expect(cleanFun({ kind: 'poke', to: 'x' })).toEqual({ kind: 'poke', to: 'x' });
    expect(cleanFun({ kind: 'poke', to: 'x', poke: FREE.id, price: 0 })).toEqual({ kind: 'poke', to: 'x', poke: FREE.id });
    for (const poke of ['nope', '', 42, null, {}, ['poo']]) expect(cleanFun({ kind: 'poke', to: 'x', poke })).toBeNull();
    expect(cleanFun({ kind: 'poke', poke: FREE.id })).toBeNull();
    expect(pokeItem('__proto__')).toBeUndefined();
  });

  it('applies the disruption policy by template', () => {
    for (const p of RUBY_HARD) {
      const f = { kind: 'poke' as const, to: 'x', poke: p.id };
      expect(isHardFx(f)).toBe(true);
      expect(isDisruptive(f)).toBe(true);
      expect(pauseMsOf(f)).toBe(3000);
    }
    expect(isHardFx({ kind: 'poke', to: 'x', poke: FREE.id })).toBe(false);
    expect(isDisruptive({ kind: 'poke', to: 'x', poke: FREE.id })).toBe(true);
    expect(isDisruptive({ kind: 'poke', to: 'x', poke: NICE.id })).toBe(false);
    expect(isHardFx({ kind: 'poke', to: 'x' })).toBe(true); // "hối" cũ vẫn là chiêu chặn cứng
  });
});

describe('poke over the wire', () => {
  it('free items count against the free quota and go to the whole room with a shared seed', async () => {
    const an = await account('anvui');
    const bi = await account('binh');
    await pair(an, bi);
    const got = new Promise<FunEvent>((resolve) => bi.once('fun:event', resolve));
    expect(await an.emitWithAck('fun:send', { kind: 'poke', to: bi.pid, poke: FREE.id } as never)).toEqual({ ok: true });
    const e = await got;
    expect(e).toMatchObject({ kind: 'poke', poke: FREE.id, from: an.pid, to: bi.pid });
    expect(typeof e.variant).toBe('number');
    expect(an.funs[0].variant).toBe(e.variant);
    expect(await an.emitWithAck('fun:quota')).toEqual({ free: 30, left: 29 });
    expect(await balance(an)).toBe(0);
  });

  it('refuses an unknown poke id without charging or broadcasting', async () => {
    const an = await account('anvui');
    const bi = await account('binh');
    await pair(an, bi);
    expect(await an.emitWithAck('fun:send', { kind: 'poke', to: bi.pid, poke: 'khongco' } as never)).toEqual({ ok: false });
    expect(await an.emitWithAck('fun:quota')).toEqual({ free: 30, left: 30 });
    expect(bi.funs).toEqual([]);
  });

  it('refuses ruby items for guests and for accounts without enough Ruby', async () => {
    const an = await account('anvui');
    const bi = await account('binh');
    const guest = await client();
    const boss = await account('boss');
    await pair(an, bi);
    await guest.emitWithAck('room:join', { code: an.code, name: 'Guest' });
    const send = (c: Client) => c.emitWithAck('fun:send', { kind: 'poke', to: bi.pid, poke: RUBY.id } as never);
    expect(await send(guest)).toEqual({ ok: false, reason: 'need_account' });
    expect(await send(an)).toEqual({ ok: false, reason: 'need_ruby' });
    await fund(boss, 'anvui', RUBY.price! - 1);
    expect(await send(an)).toEqual({ ok: false, reason: 'need_ruby' });
    expect(await balance(an)).toBe(RUBY.price! - 1);
    expect(bi.funs).toEqual([]);
    expect(await an.emitWithAck('fun:quota')).toEqual({ free: 30, left: 30 });
  });

  it('charges the exact price once for ruby items, leaves the quota alone and never pays the receiver', async () => {
    const an = await account('anvui');
    const bi = await account('binh');
    const boss = await account('boss');
    await pair(an, bi);
    await fund(boss, 'anvui', 100);
    expect(await an.emitWithAck('fun:send', { kind: 'poke', to: bi.pid, poke: RUBY_SOFT.id } as never)).toEqual({ ok: true });
    expect(await balance(an)).toBe(100 - RUBY_SOFT.price!);
    expect(await balance(bi)).toBe(0);
    expect(await an.emitWithAck('fun:quota')).toEqual({ free: 30, left: 30 });
    const history = await an.emitWithAck('wallet:history');
    expect(history.ok && history.rows.filter((r) => r.reason === 'skill').map((r) => r.delta)).toEqual([-RUBY_SOFT.price!]);
    expect(bi.funs).toHaveLength(1);
  });

  it('limits screen-covering items to 3 per 15 seconds per target and does not charge the refused ones', async () => {
    const an = await account('anvui');
    const bi = await account('binh');
    const boss = await account('boss');
    await pair(an, bi);
    await fund(boss, 'anvui', 500);
    let spent = 0;
    for (const [i, p] of RUBY_HARD.slice(0, 4).entries()) {
      const r = await an.emitWithAck('fun:send', { kind: 'poke', to: bi.pid, poke: p.id } as never);
      if (i < 3) {
        expect(r).toEqual({ ok: true });
        spent += p.price!;
      } else expect(r).toMatchObject({ ok: false, reason: 'limited' });
    }
    expect(await balance(an)).toBe(500 - spent);
    expect(bi.funs).toHaveLength(3);
  });

  it('free items beyond the daily quota are refused when there is no Ruby', async () => {
    await server.close();
    await start(1);
    const an = await account('anvui');
    const bi = await account('binh');
    await pair(an, bi);
    expect(await an.emitWithAck('fun:send', { kind: 'poke', to: bi.pid, poke: FREE.id } as never)).toEqual({ ok: true });
    expect(await an.emitWithAck('fun:send', { kind: 'poke', to: bi.pid, poke: FREE.id } as never)).toEqual({ ok: false, reason: 'quota' });
  });

  it('keeps existing kinds working', async () => {
    const an = await account('anvui');
    const bi = await account('binh');
    await pair(an, bi);
    expect(await an.emitWithAck('fun:send', { kind: 'poke', to: bi.pid } as never)).toEqual({ ok: true });
    expect(await an.emitWithAck('fun:send', { kind: 'throw', to: bi.pid, item: 'tim' } as never)).toEqual({ ok: true });
  });
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
