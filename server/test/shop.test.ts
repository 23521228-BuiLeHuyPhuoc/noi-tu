import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { io as connect, type Socket } from 'socket.io-client';
import { createGameServer, type GameServer } from '../src/app';
import { MemoryStore } from '../src/store';
import { FunQuota } from '../src/shop';
import { smallDict } from './helpers';
import { CHECKIN_REWARDS, checkinPlan, vnDay } from '../../shared/src/shop';
import type { ChatMsg, ClientToServerEvents, FunEvent, ServerToClientEvents } from '../../shared/src/types';

type Client = Socket<ServerToClientEvents, ClientToServerEvents> & { funs: FunEvent[]; chats: ChatMsg[]; pid: string; code: string };

let server: GameServer;
let url: string;
let clock: number;
const clients: Client[] = [];
const env = { admins: process.env.ADMIN_USERNAMES, mem: process.env.ALLOW_MEMORY_ADMIN };
const DAY = 86_400_000;

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
/** khởi động lại server với số lượt miễn phí khác */
async function restart(freePokes: number) {
  for (const c of clients.splice(0)) c.disconnect();
  await server.close();
  await start(freePokes);
}
/** chọc "khịa" (không giới hạn riêng): thử lại khi bị giới hạn tần suất chung (busy) */
async function taunt(c: Client) {
  for (let i = 0; i < 6; i++) {
    const r = await c.emitWithAck('fun:send', { kind: 'taunt', taunt: 'gg' });
    if (r.reason !== 'busy') return r;
    await wait(1300);
  }
  throw new Error('busy');
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
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
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

describe('Cửa hàng: mua và trang bị', () => {
  it('mua đủ Ruby thì trừ tiền và vào kho; thiếu Ruby bị từ chối; mua lại không trừ', async () => {
    const an = await account('anvui');
    const boss = await account('boss');
    expect(await an.emitWithAck('shop:buy', { itemId: 'frame_gold' })).toEqual({ ok: false, error: 'insufficient' });
    await fund(boss, 'anvui', 150);
    const r = await an.emitWithAck('shop:buy', { itemId: 'frame_gold' });
    expect(r).toMatchObject({ ok: true, balance: 50, owned: ['frame_gold'] });
    expect(await an.emitWithAck('shop:buy', { itemId: 'frame_gold' })).toEqual({ ok: false, error: 'already_owned' });
    expect(await balance(an)).toBe(50);
    // kỹ năng / quà không mua để sở hữu; món không có trong danh mục
    expect(await an.emitWithAck('shop:buy', { itemId: 'lightning' })).toEqual({ ok: false, error: 'bad_request' });
    expect(await an.emitWithAck('shop:buy', { itemId: 'khong-co' })).toEqual({ ok: false, error: 'bad_request' });
    const info = await an.emitWithAck('shop:get');
    expect(info).toMatchObject({ ok: true, ruby: 50, owned: ['frame_gold'], equipped: {}, giftPoints: 0 });
  });

  it('khách không mua được; số dư mới được báo qua wallet:update', async () => {
    const guest = await client();
    expect(await guest.emitWithAck('shop:buy', { itemId: 'frame_gold' })).toEqual({ ok: false, error: 'need_account' });
    expect(await guest.emitWithAck('checkin:claim')).toEqual({ ok: false, error: 'need_account' });
    const an = await account('anvui');
    const boss = await account('boss');
    await fund(boss, 'anvui', 200);
    const updates: number[] = [];
    an.on('wallet:update', (p) => updates.push(p.ruby));
    await an.emitWithAck('shop:buy', { itemId: 'name_rainbow' });
    await wait(30);
    expect(updates).toEqual([50]);
  });

  it('trang bị: chưa sở hữu bị từ chối; sai ô bị từ chối; gỡ được; phòng thấy trang trí', async () => {
    const an = await account('anvui');
    const bi = await account('binh');
    const boss = await account('boss');
    await fund(boss, 'anvui', 500);
    await pair(an, bi);
    expect(await an.emitWithAck('shop:equip', { slot: 'frame', itemId: 'frame_gold' })).toEqual({ ok: false, error: 'not_owned' });
    await an.emitWithAck('shop:buy', { itemId: 'frame_gold' });
    await an.emitWithAck('shop:buy', { itemId: 'name_sparkle' });
    expect(await an.emitWithAck('shop:equip', { slot: 'nameFx', itemId: 'frame_gold' })).toEqual({ ok: false, error: 'bad_request' });
    expect(await an.emitWithAck('shop:equip', { slot: 'xxx' as never, itemId: null })).toEqual({ ok: false, error: 'bad_request' });
    const states: Array<Record<string, unknown>> = [];
    bi.on('room:state', (s) => states.push(Object.fromEntries(s.players.map((p) => [p.id, p.cosmetics]))));
    expect(await an.emitWithAck('shop:equip', { slot: 'frame', itemId: 'frame_gold' })).toEqual({ ok: true, equipped: { frame: 'frame_gold' } });
    expect(await an.emitWithAck('shop:equip', { slot: 'nameFx', itemId: 'name_sparkle' })).toMatchObject({ ok: true });
    await wait(50);
    expect(states.at(-1)![an.pid]).toEqual({ frame: 'frame_gold', nameFx: 'name_sparkle' });
    expect(await an.emitWithAck('shop:equip', { slot: 'frame', itemId: null })).toEqual({ ok: true, equipped: { nameFx: 'name_sparkle' } });
    await wait(50);
    expect(states.at(-1)![an.pid]).toEqual({ nameFx: 'name_sparkle' });
  });

  it('hiệu ứng vào phòng: người đã trang bị vào phòng thì cả phòng nhận fun:event entrance', async () => {
    const an = await account('anvui');
    const bi = await account('binh');
    const boss = await account('boss');
    await fund(boss, 'binh', 300);
    await bi.emitWithAck('shop:buy', { itemId: 'enter_star' });
    await bi.emitWithAck('shop:equip', { slot: 'entrance', itemId: 'enter_star' });
    const created = await an.emitWithAck('room:create', { name: 'An' });
    if (!created.ok) throw new Error();
    await bi.emitWithAck('room:join', { code: created.code, name: 'Binh' });
    await wait(50);
    expect(an.funs.find((e) => e.kind === 'entrance')).toMatchObject({ kind: 'entrance', fx: 'enter_star' });
  });
});

describe('Lượt chọc miễn phí mỗi ngày', () => {
  it('FunQuota: mặc định 30 lượt, lượt 31 bị từ chối, qua ngày VN thì làm mới', () => {
    let t = Date.parse('2026-11-12T05:00:00Z');
    const q = new FunQuota(() => t);
    expect(q.free).toBe(30);
    for (let i = 0; i < 30; i++) expect(q.consume('x')).toBe(true);
    expect(q.consume('x')).toBe(false);
    expect(q.left('x')).toBe(0);
    expect(q.left('y')).toBe(30);
    t = Date.parse('2026-11-12T16:59:00Z'); // vẫn ngày 12 giờ VN
    expect(q.left('x')).toBe(0);
    t = Date.parse('2026-11-12T17:00:00Z'); // 0h ngày 13 giờ VN
    expect(q.left('x')).toBe(30);
  });

  it('tài khoản: hết lượt miễn phí thì mỗi lần trừ 1 Ruby, hết Ruby bị chặn (quota); emoji không tính', async () => {
    await restart(3);
    const an = await account('anvui');
    const bi = await account('binh');
    const boss = await account('boss');
    await pair(an, bi);
    expect(await an.emitWithAck('fun:quota')).toEqual({ free: 3, left: 3 });
    await fund(boss, 'anvui', 1);
    expect(await taunt(an)).toEqual({ ok: true });
    expect(await an.emitWithAck('fun:quota')).toEqual({ free: 3, left: 2 });
    expect(await taunt(an)).toEqual({ ok: true });
    expect(await taunt(an)).toEqual({ ok: true });
    expect(await an.emitWithAck('fun:quota')).toEqual({ free: 3, left: 0 });
    expect(await balance(an)).toBe(1);
    // lượt thứ (free + 1): trừ 1 Ruby
    expect(await taunt(an)).toEqual({ ok: true });
    expect(await balance(an)).toBe(0);
    // hết Ruby: bị chặn
    expect(await taunt(an)).toEqual({ ok: false, reason: 'quota' });
    expect(await an.emitWithAck('fun:send', { kind: 'emoji', emoji: '😂' })).toEqual({ ok: true });
    // qua ngày mới: được lượt lại
    clock += DAY;
    expect(await an.emitWithAck('fun:quota')).toEqual({ free: 3, left: 3 });
    expect(await taunt(an)).toEqual({ ok: true });
    expect(await an.emitWithAck('fun:quota')).toEqual({ free: 3, left: 2 });
  });

  it('khách: hết lượt miễn phí thì bị chặn, không có Ruby để trả', async () => {
    await restart(2);
    const g1 = await client();
    const g2 = await client();
    await pair(g1, g2);
    expect((await taunt(g1)).ok).toBe(true);
    expect((await taunt(g1)).ok).toBe(true);
    expect(await taunt(g1)).toEqual({ ok: false, reason: 'quota' });
    expect(await g1.emitWithAck('fun:quota')).toEqual({ free: 2, left: 0 });
    // lượt của người kia tính riêng
    expect((await taunt(g2)).ok).toBe(true);
  });
});

describe('Kỹ năng chọc trả phí', () => {
  it('trừ Ruby trước khi phát; thiếu Ruby: need_ruby; khách: need_account; không tính lượt miễn phí', async () => {
    const an = await account('anvui');
    const bi = await account('binh');
    const boss = await account('boss');
    const guest = await client();
    await pair(an, bi);
    await guest.emitWithAck('room:join', { code: an.code, name: 'Khach' });
    const gp = (await guest.emitWithAck('fun:send', { kind: 'lightning', to: bi.pid }));
    expect(gp).toEqual({ ok: false, reason: 'need_account' });
    expect(await an.emitWithAck('fun:send', { kind: 'lightning', to: bi.pid })).toEqual({ ok: false, reason: 'need_ruby' });
    expect(bi.funs.length).toBe(0);
    await fund(boss, 'anvui', 25);
    expect(await an.emitWithAck('fun:send', { kind: 'lightning', to: bi.pid })).toEqual({ ok: true });
    expect(await balance(an)).toBe(15);
    await wait(30);
    expect(bi.funs.find((e) => e.kind === 'lightning')).toMatchObject({ kind: 'lightning', to: bi.pid, from: an.pid });
    expect(await an.emitWithAck('fun:send', { kind: 'kiss', to: bi.pid })).toEqual({ ok: true });
    expect(await balance(an)).toBe(10);
    expect(await an.emitWithAck('fun:quota')).toEqual({ free: 30, left: 30 });
    // chọc chính mình / người lạ: từ chối, không trừ
    expect(await an.emitWithAck('fun:send', { kind: 'rocket', to: an.pid })).toEqual({ ok: false });
    expect(await balance(an)).toBe(10);
    const hist = await an.emitWithAck('wallet:history');
    expect(hist.ok && hist.rows.filter((r) => r.reason === 'skill').map((r) => r.delta)).toEqual([-5, -10]);
  });

  it('chiêu phá màn hình theo giới hạn 3 lần / 15 giây và bù giờ; bị chặn thì không mất Ruby', async () => {
    const an = await account('anvui');
    const bi = await account('binh');
    const boss = await account('boss');
    await pair(an, bi);
    await fund(boss, 'anvui', 100);
    let ok = 0;
    for (const kind of ['lightning', 'freeze', 'cake', 'water'] as const) {
      const r = await an.emitWithAck('fun:send', { kind, to: bi.pid });
      if (r.ok) ok++;
      else expect(r).toMatchObject({ ok: false, reason: 'limited' });
    }
    expect(ok).toBe(3);
    expect(await balance(an)).toBe(100 - 10 - 10 - 15);
  });
});

describe('Điểm danh hằng ngày', () => {
  it('nhận 5 Ruby ngày 1; nhận lần hai cùng ngày: already_claimed', async () => {
    const an = await account('anvui');
    expect(await an.emitWithAck('checkin:status')).toMatchObject({ ok: true, canClaim: true, streak: 0, nextDay: 1, nextReward: 5 });
    expect(await an.emitWithAck('checkin:claim')).toMatchObject({ ok: true, reward: 5, balance: 5, streak: 1, day: 1 });
    expect(await an.emitWithAck('checkin:claim')).toEqual({ ok: false, error: 'already_claimed' });
    expect(await an.emitWithAck('checkin:status')).toMatchObject({ canClaim: false, streak: 1, nextDay: 2, nextReward: 5 });
    expect(await balance(an)).toBe(5);
  });

  it('chuỗi liên tiếp 7 ngày: 5,5,10,10,15,15,50 rồi quay lại ngày 1', async () => {
    const an = await account('anvui');
    const got: number[] = [];
    let total = 0;
    for (let d = 0; d < 8; d++) {
      const r = await an.emitWithAck('checkin:claim');
      if (!r.ok) throw new Error(r.error);
      got.push(r.reward);
      total += r.reward;
      expect(r.balance).toBe(total);
      clock += DAY;
    }
    expect(got).toEqual([...CHECKIN_REWARDS, 5]);
    expect(CHECKIN_REWARDS[6]).toBe(50);
  });

  it('bỏ lỡ một ngày (giờ VN) thì về ngày 1; mốc đổi ngày theo giờ Việt Nam', async () => {
    const an = await account('anvui');
    await an.emitWithAck('checkin:claim'); // 12:00 ngày 12
    clock += DAY;
    expect(await an.emitWithAck('checkin:claim')).toMatchObject({ ok: true, reward: 5, streak: 2 });
    clock += 2 * DAY; // bỏ ngày 14
    expect(await an.emitWithAck('checkin:status')).toMatchObject({ canClaim: true, streak: 0, nextDay: 1 });
    expect(await an.emitWithAck('checkin:claim')).toMatchObject({ ok: true, reward: 5, streak: 1, day: 1 });
    // 16:59 UTC cùng ngày VN, 17:00 UTC sang ngày mới
    clock = Date.parse('2026-11-15T16:59:00Z');
    expect(vnDay(clock)).toBe('2026-11-15');
    expect(await an.emitWithAck('checkin:claim')).toEqual({ ok: false, error: 'already_claimed' });
    clock = Date.parse('2026-11-15T17:00:00Z');
    expect(await an.emitWithAck('checkin:claim')).toMatchObject({ ok: true, streak: 2, reward: 5 });
  });

  it('hai máy bấm cùng lúc chỉ một lần được thưởng', async () => {
    const a1 = await account('anvui');
    const a2 = await client();
    await a2.emitWithAck('auth:login', { username: 'anvui', password: 'matkhau1' });
    const rs = await Promise.all([a1.emitWithAck('checkin:claim'), a2.emitWithAck('checkin:claim')]);
    expect(rs.filter((r) => r.ok).length).toBe(1);
    expect(await balance(a1)).toBe(5);
  });

  it('checkinPlan thuần: chuỗi, đứt chuỗi, ngày 7', () => {
    expect(checkinPlan(undefined, '2026-11-12')).toMatchObject({ canClaim: true, streak: 0, nextDay: 1, nextReward: 5 });
    expect(checkinPlan({ lastDay: '2026-11-11', streak: 6 }, '2026-11-12')).toMatchObject({ canClaim: true, streak: 6, nextDay: 7, nextReward: 50, newStreak: 7 });
    expect(checkinPlan({ lastDay: '2026-11-10', streak: 6 }, '2026-11-12')).toMatchObject({ streak: 0, nextDay: 1 });
    expect(checkinPlan({ lastDay: '2026-11-12', streak: 7 }, '2026-11-12')).toMatchObject({ canClaim: false, nextDay: 1 });
    expect(checkinPlan({ lastDay: '2026-10-31', streak: 3 }, '2026-11-01')).toMatchObject({ canClaim: true, newStreak: 4 });
  });
});

describe('Quà tặng trong phòng', () => {
  it('người tặng trả Ruby, người nhận được điểm quà (không nhận Ruby), cả phòng thấy sự kiện', async () => {
    const an = await account('anvui');
    const bi = await account('binh');
    const boss = await account('boss');
    await pair(an, bi);
    await fund(boss, 'anvui', 250);
    expect(await an.emitWithAck('fun:send', { kind: 'gift', to: bi.pid, gift: 'gift_car' })).toEqual({ ok: true });
    expect(await balance(an)).toBe(50);
    expect(await balance(bi)).toBe(0);
    await wait(50);
    expect(bi.funs.find((e) => e.kind === 'gift')).toMatchObject({ kind: 'gift', gift: 'gift_car', from: an.pid, to: bi.pid });
    expect(an.funs.some((e) => e.kind === 'gift')).toBe(true);
    expect(await bi.emitWithAck('shop:get')).toMatchObject({ ok: true, giftPoints: 200 });
    expect(await an.emitWithAck('shop:get')).toMatchObject({ ok: true, giftPoints: 0 });
    // thiếu Ruby: need_ruby, không phát, không cộng điểm
    const before = bi.funs.length;
    expect(await an.emitWithAck('fun:send', { kind: 'gift', to: bi.pid, gift: 'gift_castle' })).toEqual({ ok: false, reason: 'need_ruby' });
    await wait(30);
    expect(bi.funs.length).toBe(before);
    expect(await bi.emitWithAck('shop:get')).toMatchObject({ giftPoints: 200 });
    // quà không có trong danh mục
    expect(await an.emitWithAck('fun:send', { kind: 'gift', to: bi.pid, gift: 'gift_xxx' as never })).toEqual({ ok: false });
  });

  it('khách không tặng được; tặng cho khách thì không có điểm quà nhưng vẫn trừ tiền', async () => {
    const an = await account('anvui');
    const boss = await account('boss');
    const g = await client();
    await pair(an, g);
    await fund(boss, 'anvui', 40);
    expect(await g.emitWithAck('fun:send', { kind: 'gift', to: an.pid, gift: 'gift_rose' })).toEqual({ ok: false, reason: 'need_account' });
    expect(await an.emitWithAck('fun:send', { kind: 'gift', to: g.pid, gift: 'gift_rose' })).toEqual({ ok: true });
    expect(await balance(an)).toBe(30);
  });
});

describe('Sticker bộ Chữ Lầy', () => {
  it('chưa mua bộ thì không gửi được; mua rồi gửi được; sticker miễn phí vẫn gửi được', async () => {
    const an = await account('anvui');
    const bi = await account('binh');
    const boss = await account('boss');
    await pair(an, bi);
    await fund(boss, 'anvui', 120);
    expect(await an.emitWithAck('chat:send', { kind: 'sticker', stickerId: 'chu-01' })).toEqual({ ok: false });
    expect(await an.emitWithAck('chat:send', { kind: 'sticker', stickerId: 'quynh-01' })).toEqual({ ok: true });
    expect(await an.emitWithAck('shop:buy', { itemId: 'pack_chu_lay' })).toMatchObject({ ok: true, balance: 20 });
    expect(await an.emitWithAck('chat:send', { kind: 'sticker', stickerId: 'chu-12' })).toEqual({ ok: true });
    // người chưa mua và khách vẫn bị chặn
    expect(await bi.emitWithAck('chat:send', { kind: 'sticker', stickerId: 'chu-12' })).toEqual({ ok: false });
    const g = await client();
    await g.emitWithAck('room:join', { code: an.code, name: 'Khach' });
    expect(await g.emitWithAck('chat:send', { kind: 'sticker', stickerId: 'chu-03' })).toEqual({ ok: false });
    await wait(30);
    expect(bi.chats.filter((m) => m.kind === 'sticker').map((m) => m.stickerId)).toEqual(['quynh-01', 'chu-12']);
  });
});
