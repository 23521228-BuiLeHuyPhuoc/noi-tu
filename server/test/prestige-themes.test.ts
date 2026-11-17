import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { io as connect, type Socket } from 'socket.io-client';
import { createGameServer, type GameServer } from '../src/app';
import { MemoryStore } from '../src/store';
import { smallDict } from './helpers';
import { prestigePoints, vipOf } from '../../shared/src/shop';
import { AVATAR_PRESETS, AVATAR_PRESET_NAMES } from '../../shared/src/avatars';
import { ROOM_THEMES } from '../../shared/src/themes';
import type { ClientToServerEvents, FunEvent, RoomState, ServerToClientEvents } from '../../shared/src/types';

type Client = Socket<ServerToClientEvents, ClientToServerEvents> & { funs: FunEvent[]; states: RoomState[]; pid: string };

let server: GameServer;
let url: string;
const clients: Client[] = [];
const env = { admins: process.env.ADMIN_USERNAMES, mem: process.env.ALLOW_MEMORY_ADMIN };

async function account(username: string): Promise<Client> {
  const s = connect(url, { transports: ['websocket'] }) as Client;
  s.funs = [];
  s.states = [];
  s.on('fun:event', (e) => s.funs.push(e));
  s.on('room:state', (st) => s.states.push(st));
  clients.push(s);
  await new Promise<void>((r) => s.on('connect', r));
  const res = await s.emitWithAck('auth:register', {
    username, email: `${username}@example.com`, password: 'matkhau123', displayName: username, avatar: 0,
  });
  if (!res.ok) throw new Error(res.error);
  return s;
}

async function fund(boss: Client, username: string, delta: number) {
  const r = await boss.emitWithAck('admin:adjust', { username, delta, reason: 'vip-test' });
  if (!r.ok) throw new Error(r.error);
}

beforeEach(async () => {
  process.env.ADMIN_USERNAMES = 'boss';
  process.env.ALLOW_MEMORY_ADMIN = '1';
  server = createGameServer(smallDict(), { store: new MemoryStore(), mailer: null });
  await new Promise<void>((r) => server.http.listen(0, r));
  url = `http://localhost:${(server.http.address() as AddressInfo).port}`;
});

afterEach(async () => {
  for (const c of clients.splice(0)) c.disconnect();
  await server.close();
  process.env.ADMIN_USERNAMES = env.admins;
  process.env.ALLOW_MEMORY_ADMIN = env.mem;
});

describe('Phase 2 — Cấp VIP Đại Gia, 8 ô trang bị, Map phòng & Kỹ năng/Quà mới', () => {
  it('hàm tính cấp bậc VIP và kho 36 mẫu avatar, 15 map nhất quán', () => {
    expect(AVATAR_PRESETS).toHaveLength(36);
    expect(AVATAR_PRESET_NAMES).toHaveLength(36);
    expect(ROOM_THEMES).toHaveLength(15);
    expect(vipOf(0).tier).toBe(0);
    expect(vipOf(200).tier).toBe(1);
    expect(vipOf(1500).tier).toBe(3);
    expect(vipOf(15000).tier).toBe(6);
    expect(prestigePoints(4000, ['frame_gold'])).toBe(4000);
    expect(prestigePoints(undefined, ['frame_supreme_god', 'map_cung_ngan_ha'])).toBe(9000);
  });

  it('mua và trang bị đủ 8 ô trang bị VIP (thú cưng, danh hiệu, bong bóng chat, map) và nâng cấp vipTier trong phòng', async () => {
    const boss = await account('boss');
    const vip = await account('daigia');
    const peer = await account('khach1');
    await fund(boss, 'daigia', 25000);

    const cr = await vip.emitWithAck('room:create', { name: 'DaiGia' });
    if (!cr.ok) throw new Error(cr.error);
    vip.pid = cr.playerId;
    const jr = await peer.emitWithAck('room:join', { code: cr.code, name: 'Peer' });
    if (!jr.ok) throw new Error(jr.error);
    peer.pid = jr.playerId;

    const toBuy = [
      'frame_supreme_god', // 6000
      'name_divine_glitch', // 2500
      'aura_cosmic_orbit', // 3200
      'enter_galaxy_portal', // 4500
      'pet_baby_dragon', // 1200
      'title_chi_ton', // 5000
      'bubble_galaxy', // 2800
      'map_cung_ngan_ha', // 3000 -> total > 15000 => VIP 6 (wait 6000+2500+3200+4500+1200+5000+2800+3000 = 28200, give 30000!)
    ];
    await fund(boss, 'daigia', 5000);
    for (const itemId of toBuy) {
      const b = await vip.emitWithAck('shop:buy', { itemId });
      expect(b.ok).toBe(true);
    }

    expect(await vip.emitWithAck('shop:equip', { slot: 'frame', itemId: 'frame_supreme_god' })).toMatchObject({ ok: true });
    expect(await vip.emitWithAck('shop:equip', { slot: 'nameFx', itemId: 'name_divine_glitch' })).toMatchObject({ ok: true });
    expect(await vip.emitWithAck('shop:equip', { slot: 'aura', itemId: 'aura_cosmic_orbit' })).toMatchObject({ ok: true });
    expect(await vip.emitWithAck('shop:equip', { slot: 'entrance', itemId: 'enter_galaxy_portal' })).toMatchObject({ ok: true });
    expect(await vip.emitWithAck('shop:equip', { slot: 'pet', itemId: 'pet_baby_dragon' })).toMatchObject({ ok: true });
    expect(await vip.emitWithAck('shop:equip', { slot: 'title', itemId: 'title_chi_ton' })).toMatchObject({ ok: true });
    expect(await vip.emitWithAck('shop:equip', { slot: 'chatBubble', itemId: 'bubble_galaxy' })).toMatchObject({ ok: true });
    expect(await vip.emitWithAck('shop:equip', { slot: 'roomTheme', itemId: 'map_cung_ngan_ha' })).toMatchObject({ ok: true });

    await new Promise((r) => setTimeout(r, 60));
    const latest = peer.states.at(-1)!;
    const vipInRoom = latest.players.find((p) => p.id === vip.pid)!;
    expect(vipInRoom.vipTier).toBe(6);
    expect(vipInRoom.cosmetics).toEqual({
      frame: 'frame_supreme_god',
      nameFx: 'name_divine_glitch',
      aura: 'aura_cosmic_orbit',
      pet: 'pet_baby_dragon',
      title: 'title_chi_ton',
      chatBubble: 'bubble_galaxy',
    });

    // Kiểm tra quyền đổi Map phòng: chủ phòng sở hữu map_cung_ngan_ha thì đổi được; người chưa mua map trả phí bị từ chối
    expect(await vip.emitWithAck('room:config', { settings: { roomTheme: 'map_cung_ngan_ha' } })).toEqual({ ok: true });
    await new Promise((r) => setTimeout(r, 50));
    expect(peer.states.at(-1)?.settings.roomTheme).toBe('map_cung_ngan_ha');
    // Chuyển host hoặc test từ peer không sở hữu map: tạo phòng khác do peer làm chủ
    const cr2 = await peer.emitWithAck('room:create', { name: 'Peer2' });
    if (!cr2.ok) throw new Error();
    expect(await peer.emitWithAck('room:config', { settings: { roomTheme: 'dem_trang_soi' } })).toEqual({ ok: true }); // free ok
    expect(await peer.emitWithAck('room:config', { settings: { roomTheme: 'map_cung_ngan_ha' } })).toEqual({ ok: false, error: 'bad_request' });
  });

  it('gửi kỹ năng VIP mới & siêu quà 5000💎 cộng điểm quà và điểm uy tín rubySpent', async () => {
    const boss = await account('boss');
    const rich = await account('rich');
    const receiver = await account('nhanqua');
    await fund(boss, 'rich', 6000);

    const cr = await rich.emitWithAck('room:create', { name: 'Rich' });
    if (!cr.ok) throw new Error();
    const jr = await receiver.emitWithAck('room:join', { code: cr.code, name: 'NhanQua' });
    if (!jr.ok) throw new Error();

    expect(await rich.emitWithAck('fun:send', { kind: 'meteor', to: jr.playerId })).toEqual({ ok: true });
    expect(await rich.emitWithAck('fun:send', { kind: 'gift', to: jr.playerId, gift: 'gift_galaxy_palace' })).toEqual({ ok: true });

    await new Promise((r) => setTimeout(r, 60));
    expect(receiver.funs.some((e) => e.kind === 'meteor')).toBe(true);
    expect(receiver.funs.some((e) => e.kind === 'gift' && e.gift === 'gift_galaxy_palace')).toBe(true);

    const infoRich = await rich.emitWithAck('shop:get');
    expect(infoRich.ok).toBe(true);
    if (infoRich.ok) {
      expect(infoRich.ruby).toBe(6000 - 35 - 5000);
      expect(infoRich.rubySpent).toBe(5035);
      expect(infoRich.vipTier).toBe(4);
    }
    const infoRec = await receiver.emitWithAck('shop:get');
    expect(infoRec.ok).toBe(true);
    if (infoRec.ok) expect(infoRec.giftPoints).toBe(5000);
  });
});
