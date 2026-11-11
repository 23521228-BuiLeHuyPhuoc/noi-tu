import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { io as connect, type Socket } from 'socket.io-client';
import { createGameServer, type GameServer } from '../src/app';
import { smallDict } from './helpers';
import type { ClientToServerEvents, FunEvent, RoomState, ServerToClientEvents, WordChainView } from '../../shared/src/types';

type Client = Socket<ServerToClientEvents, ClientToServerEvents> & { state?: RoomState; fun: FunEvent[] };

let server: GameServer;
let url: string;
const clients: Client[] = [];

beforeEach(async () => {
  // không có Cloudinary: ảnh khách giữ tạm trong bộ nhớ server
  server = createGameServer(smallDict(), { room: { turnMs: 20_000, disconnectGraceMs: 300 }, emptyRoomTtlMs: 300, avatarUploader: undefined });
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
  c.on('room:state', (s) => (c.state = s));
  c.on('fun:event', (e) => c.fun.push(e));
  clients.push(c);
  return new Promise((resolve) => c.on('connect', () => resolve(c)));
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until(c: Client, pred: (s: RoomState) => boolean, timeout = 3000): Promise<RoomState> {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (c.state && pred(c.state)) return c.state;
    await wait(10);
  }
  throw new Error('timeout: ' + JSON.stringify(c.state));
}

async function roomOf(n: number, gameType?: 'wordchain' | 'wordchain_en') {
  const cs = await Promise.all(Array.from({ length: n }, () => client()));
  const created = await cs[0].emitWithAck('room:create', { name: 'P0', gameType });
  if (!created.ok) throw new Error(created.error);
  const ids = [created.playerId];
  for (let i = 1; i < n; i++) {
    const j = await cs[i].emitWithAck('room:join', { code: created.code, name: `P${i}` });
    if (!j.ok) throw new Error(j.error);
    ids.push(j.playerId);
  }
  await until(cs[0], (s) => s.players.length === n);
  return { cs, ids, code: created.code };
}

// PNG giả: đủ chữ ký 8 byte + phần thân (server chỉ kiểm tra chữ ký và kích thước)
const PNG = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.alloc(200, 7)]).toString('base64');

describe('Giới hạn chiêu rung/lắc màn hình: 3 lần mỗi 15 giây', () => {
  it('mỗi người chỉ bị rung/sụp nguồn 3 lần; lần 4 bị chặn kèm thời gian chờ, người khác vẫn chọc được người khác', async () => {
    const { cs, ids } = await roomOf(3);
    expect(await cs[0].emitWithAck('fun:send', { kind: 'quake', to: ids[1] })).toEqual({ ok: true });
    expect(await cs[2].emitWithAck('fun:send', { kind: 'spin', to: ids[1] })).toEqual({ ok: true });
    expect(await cs[2].emitWithAck('fun:send', { kind: 'poke', to: ids[1] })).toEqual({ ok: true });
    const blocked = await cs[0].emitWithAck('fun:send', { kind: 'blackout', to: ids[1] });
    expect(blocked).toMatchObject({ ok: false, reason: 'limited' });
    expect(blocked.retryMs).toBeGreaterThan(10_000);
    expect(blocked.retryMs).toBeLessThanOrEqual(15_000);
    // người gửi cũng chỉ được 3 chiêu phá mỗi 15 giây: cs[2] đã dùng 2, còn 1
    expect(await cs[2].emitWithAck('fun:send', { kind: 'quake', to: ids[0] })).toEqual({ ok: true });
    expect(await cs[2].emitWithAck('fun:send', { kind: 'quake', to: ids[0] })).toMatchObject({ ok: false, reason: 'limited' });
  });

  it('đánh/ném quá giới hạn vẫn bay tới avatar nhưng không rung màn hình (soft)', async () => {
    const { cs, ids } = await roomOf(2);
    for (let i = 0; i < 3; i++) expect(await cs[0].emitWithAck('fun:send', { kind: 'hit', to: ids[1], move: 'tat' })).toEqual({ ok: true });
    expect(await cs[0].emitWithAck('fun:send', { kind: 'throw', to: ids[1], item: 'dep' })).toEqual({ ok: true });
    await wait(50);
    const evs = cs[1].fun.filter((f) => f.kind === 'hit' || f.kind === 'throw');
    expect(evs.map((e) => !!e.soft)).toEqual([false, false, false, true]);
  });
});

describe('Bù giờ cho người đang tới lượt khi bị chọc', () => {
  it('sụp nguồn người đang tới lượt: đồng hồ lượt lùi thêm 4,5 giây, sự kiện báo số giây được bù', async () => {
    const { cs, ids } = await roomOf(2, 'wordchain');
    await cs[0].emitWithAck('game:start');
    const s = await until(cs[0], (st) => st.phase === 'playing');
    const g = s.game as WordChainView;
    const cur = g.currentPlayerId!;
    const other = ids.find((i) => i !== cur)!;
    const before = g.turnEndsAt!;
    expect(await cs[ids.indexOf(other)].emitWithAck('fun:send', { kind: 'blackout', to: cur })).toEqual({ ok: true });
    const after = await until(cs[0], (st) => (st.game as WordChainView).turnEndsAt! > before);
    expect((after.game as WordChainView).turnEndsAt! - before).toBe(4500);
    await wait(30);
    expect(cs[0].fun.at(-1)).toMatchObject({ kind: 'blackout', to: cur, pausedMs: 4500 });
    // chọc người không tới lượt thì không bù
    expect(await cs[ids.indexOf(cur)].emitWithAck('fun:send', { kind: 'quake', to: other })).toEqual({ ok: true });
    await wait(30);
    expect(cs[0].fun.at(-1)?.pausedMs).toBeUndefined();
  });
});

describe('Đổi tên, mặt đại diện, ảnh ở bất cứ đâu (khách)', () => {
  it('đổi tên và mặt đại diện ngay giữa ván', async () => {
    const { cs, ids } = await roomOf(2, 'wordchain');
    await cs[0].emitWithAck('game:start');
    await until(cs[0], (st) => st.phase === 'playing');
    expect(await cs[1].emitWithAck('player:profile', { name: 'Nguyễn Thị Phương Thảo', avatar: 3 })).toEqual({ ok: true });
    const st = await until(cs[0], (s) => s.players.some((p) => p.name === 'Nguyễn Thị Phương Thảo'));
    expect(st.players.find((p) => p.id === ids[1])?.avatar).toBe(3);
    expect(await cs[1].emitWithAck('player:profile', { name: '' })).toEqual({ ok: false, error: 'invalid_name' });
    expect(await cs[1].emitWithAck('player:profile', { avatar: 999 })).toEqual({ ok: false, error: 'bad_request' });
  });

  it('khách tải ảnh lên giữa ván, server phục vụ ảnh và nhận lại ảnh đó khi vào phòng khác; ảnh lạ bị bỏ qua', async () => {
    const { cs, ids } = await roomOf(2);
    const r = await cs[1].emitWithAck('player:photo', { data: `data:image/png;base64,${PNG}` });
    expect(r.ok).toBe(true);
    const avatarUrl = r.ok ? r.avatarUrl! : '';
    expect(avatarUrl).toMatch(/\/api\/img\/guest-/);
    await until(cs[0], (s) => s.players.find((p) => p.id === ids[1])?.avatarUrl === avatarUrl);
    const img = await fetch(avatarUrl);
    expect(img.status).toBe(200);
    expect(img.headers.get('content-type')).toBe('image/png');

    // ảnh không hợp lệ
    expect(await cs[1].emitWithAck('player:photo', { data: Buffer.from('hello world, not an image at all, sorry!'.repeat(3)).toString('base64') }))
      .toEqual({ ok: false, error: 'invalid_image' });

    // vào phòng mới mang theo ảnh cũ (do server cấp) -> được nhận; ảnh ngoài -> bỏ qua
    const c = await client();
    const created = await c.emitWithAck('room:create', { name: 'Khách', avatarUrl, avatar: 2 });
    expect(created.ok).toBe(true);
    const st = await until(c, (s) => s.players.length === 1);
    expect(st.players[0].avatarUrl).toBe(avatarUrl);
    expect(st.players[0].avatar).toBe(2);
    const d = await client();
    const created2 = await d.emitWithAck('room:create', { name: 'Lạ', avatarUrl: 'https://evil.example/x.png' });
    expect(created2.ok).toBe(true);
    const st2 = await until(d, (s) => s.players.length === 1);
    expect(st2.players[0].avatarUrl).toBeUndefined();

    // bỏ ảnh
    expect(await cs[1].emitWithAck('player:photo', { remove: true })).toEqual({ ok: true });
    await until(cs[0], (s) => s.players.find((p) => p.id === ids[1])?.avatarUrl === undefined);
  });
});
