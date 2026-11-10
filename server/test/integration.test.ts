import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { io as connect, type Socket } from 'socket.io-client';
import { createGameServer, type GameServer } from '../src/app';
import { smallDict } from './helpers';
import type {
  BauCuaView, ClientToServerEvents, FunEvent, LudoView, RoomState, ServerToClientEvents, WordChainView,
} from '../../shared/src/types';

type Client = Socket<ServerToClientEvents, ClientToServerEvents> & { state?: RoomState; fun: FunEvent[] };

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
  throw new Error('Hết thời gian chờ trạng thái: ' + JSON.stringify(c.state));
}

async function roomOf(n: number, gameType?: 'wordchain' | 'ludo' | 'baucua') {
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

describe('Server qua Socket.IO', () => {
  it('Nối từ: chơi trọn một ván tới khi có người thắng, rồi chơi lại', async () => {
    const { cs, ids, code } = await roomOf(3);
    expect(code).toMatch(/^[A-Z2-9]{6}$/);
    expect(await cs[1].emitWithAck('game:start')).toEqual({ ok: false, error: 'not_host' });
    expect(await cs[0].emitWithAck('game:start')).toEqual({ ok: true });
    const s0 = await until(cs[2], (s) => s.phase === 'playing');
    const g0 = s0.game as WordChainView;
    const cur = cs[ids.indexOf(g0.currentPlayerId!)];
    const last = g0.currentWord.split(' ')[1];
    const ans = smallDict().nextOptions(last, new Set([g0.currentWord]))[0];
    expect(await cur.emitWithAck('game:action', { type: 'submit', word: 'sai bét' })).toEqual({ ok: false, reason: 'chain' });
    expect(await cur.emitWithAck('game:action', { type: 'submit', word: ans })).toEqual({ ok: true });
    await until(cs[0], (s) => (s.game as WordChainView).currentWord === ans);
    const end = await until(cs[0], (s) => s.phase === 'finished', 5000);
    expect(end.result?.winnerId).toBeTruthy();
    expect(end.result?.ranking).toHaveLength(3);
    expect(await cs[0].emitWithAck('game:restart')).toEqual({ ok: true });
    await until(cs[1], (s) => s.phase === 'lobby' && s.game === null);
  });

  it('chủ phòng đổi sang Cờ cá ngựa, đổi số ngựa, bắt đầu và đổ xúc xắc', async () => {
    const { cs, ids } = await roomOf(2);
    expect(await cs[1].emitWithAck('room:config', { gameType: 'ludo' })).toEqual({ ok: false, error: 'not_host' });
    expect(await cs[0].emitWithAck('room:config', { gameType: 'ludo', settings: { ludoPieces: 2 } })).toEqual({ ok: true });
    await until(cs[1], (s) => s.gameType === 'ludo' && s.settings.ludoPieces === 2);
    await cs[0].emitWithAck('game:start');
    const s = await until(cs[1], (st) => st.phase === 'playing');
    const g = s.game as LudoView;
    expect(g.pieces).toEqual([[-1, -1], [-1, -1]]);
    const cur = cs[ids.indexOf(g.currentPlayerId!)];
    expect(await cur.emitWithAck('game:action', { type: 'roll' })).toEqual({ ok: true });
    await until(cs[0], (st) => (st.game as LudoView).rollId === 1);
  });

  it('tạo phòng Bầu cua, đặt cược, máy tự lắc rồi mở bát', async () => {
    const { cs } = await roomOf(2, 'baucua');
    expect(cs[0].state!.gameType).toBe('baucua');
    await cs[0].emitWithAck('game:start');
    await until(cs[1], (s) => s.phase === 'playing');
    expect(await cs[1].emitWithAck('game:action', { type: 'bet', symbol: 'cua', amount: 100 })).toEqual({ ok: true });
    await until(cs[0], (s) => (s.game as BauCuaView).bets[cs[1].state!.players[1].id]?.cua === 100);
    await until(cs[1], (s) => (s.game as BauCuaView).step === 'rolling', 5000);
    const r = await until(cs[1], (s) => (s.game as BauCuaView).step === 'result', 6000);
    expect((r.game as BauCuaView).dice).toHaveLength(3);
  });

  it('chọc mất dạy: phát cho cả phòng, không tự chọc, gián/mực chỉ 1 lần mỗi 8 giây mỗi người', async () => {
    const { cs, ids } = await roomOf(3);
    expect(await cs[0].emitWithAck('fun:send', { kind: 'doodle', to: ids[1], doodle: 'ria' })).toEqual({ ok: true });
    expect(await cs[0].emitWithAck('fun:send', { kind: 'nick', to: ids[1], nick: 'game' })).toEqual({ ok: true });
    expect(await cs[0].emitWithAck('fun:send', { kind: 'roach', to: ids[1] })).toEqual({ ok: true });
    // chiêu phủ màn hình thứ hai lên cùng một người (kể cả từ người khác) bị chặn
    expect(await cs[0].emitWithAck('fun:send', { kind: 'ink', to: ids[1] })).toEqual({ ok: false });
    expect(await cs[2].emitWithAck('fun:send', { kind: 'roach', to: ids[1] })).toEqual({ ok: false });
    // người khác vẫn bị được
    expect(await cs[1].emitWithAck('fun:send', { kind: 'ink', to: ids[2] })).toEqual({ ok: true });
    // sai dữ liệu, tự chọc, ngoài phòng
    expect(await cs[0].emitWithAck('fun:send', { kind: 'nick', to: ids[1], nick: 'Tên lạ' as never })).toEqual({ ok: false });
    expect(await cs[0].emitWithAck('fun:send', { kind: 'honk', to: ids[0] })).toEqual({ ok: false });
    expect(await cs[0].emitWithAck('fun:send', { kind: 'cry', to: 'nguoi-la' })).toEqual({ ok: false });
    await wait(50);
    const seen = cs[2].fun.map((f) => f.kind);
    expect(seen).toEqual(['doodle', 'nick', 'roach', 'ink']);
    const roach = cs[2].fun.find((f) => f.kind === 'roach')!;
    expect([2, 3]).toContain(roach.count);
    // bucket riêng cho chọc mất dạy: tối đa 4 lần liền
    const ok: boolean[] = [];
    for (let i = 0; i < 6; i++) ok.push((await cs[2].emitWithAck('fun:send', { kind: 'charm' })).ok);
    expect(ok.filter(Boolean).length).toBeLessThanOrEqual(4);
    expect(ok.filter((x) => !x).length).toBeGreaterThan(0);
  });

  it('ném dép, khịa, hối: phát cho cả phòng; chặn ném chính mình, người ngoài phòng và spam', async () => {
    const { cs, ids } = await roomOf(2);
    expect(await cs[0].emitWithAck('fun:send', { kind: 'throw', to: ids[1], item: 'dep' })).toEqual({ ok: true });
    expect(await cs[1].emitWithAck('fun:send', { kind: 'taunt', taunt: 'ga' })).toEqual({ ok: true });
    expect(await cs[0].emitWithAck('fun:send', { kind: 'poke', to: ids[1] })).toEqual({ ok: true });
    await wait(50);
    expect(cs[1].fun.map((f) => f.kind)).toEqual(['throw', 'taunt', 'poke']);
    expect(cs[1].fun[0]).toMatchObject({ from: ids[0], to: ids[1], item: 'dep' });
    expect(await cs[0].emitWithAck('fun:send', { kind: 'throw', to: ids[0], item: 'dep' })).toEqual({ ok: false });
    expect(await cs[0].emitWithAck('fun:send', { kind: 'throw', to: 'nguoi-la', item: 'dep' })).toEqual({ ok: false });
    expect(await cs[0].emitWithAck('fun:send', { kind: 'throw', to: ids[1], item: 'bom' as never })).toEqual({ ok: false });
    const results = [];
    for (let i = 0; i < 10; i++) results.push((await cs[1].emitWithAck('fun:send', { kind: 'taunt', taunt: 'gg' })).ok);
    expect(results.filter((x) => !x).length).toBeGreaterThan(0);
  });

  it('báo lỗi khi mã phòng sai, tên rỗng', async () => {
    const a = await client();
    expect(await a.emitWithAck('room:join', { code: 'ZZZZZZ', name: 'An' })).toEqual({ ok: false, error: 'room_not_found' });
    expect(await a.emitWithAck('room:create', { name: '   ' })).toEqual({ ok: false, error: 'invalid_name' });
    expect(server.manager.size).toBe(0);
  });

  it('rớt mạng rồi vào lại bằng playerId cũ giữa ván', async () => {
    const { cs, ids, code } = await roomOf(2);
    await cs[0].emitWithAck('game:start');
    await until(cs[0], (s) => s.phase === 'playing');
    cs[1].disconnect();
    await until(cs[0], (s) => s.players.find((p) => p.id === ids[1])?.connected === false);
    const b2 = await client();
    expect(await b2.emitWithAck('room:join', { code, name: 'P1', playerId: ids[1] })).toEqual({ ok: true, code, playerId: ids[1] });
    const s = await until(b2, (st) => st.phase === 'playing');
    expect(s.players.find((p) => p.id === ids[1])!.connected).toBe(true);
  });

  it('kết nối cũ ngắt sau khi đã vào lại không làm người chơi bị đánh dấu mất kết nối', async () => {
    const a = await client();
    const created = await a.emitWithAck('room:create', { name: 'An' });
    if (!created.ok) throw new Error();
    const a2 = await client();
    await a2.emitWithAck('room:join', { code: created.code, name: 'An', playerId: created.playerId });
    a.disconnect();
    await wait(100);
    const s = await until(a2, (st) => st.players.length === 1);
    expect(s.players[0].connected).toBe(true);
  });

  it('chủ phòng thoát -> chuyển quyền; mọi người thoát -> phòng bị xóa', async () => {
    const { cs, ids } = await roomOf(2);
    await cs[0].emitWithAck('room:leave');
    const s = await until(cs[1], (st) => st.players.length === 1);
    expect(s.hostId).toBe(ids[1]);
    await cs[1].emitWithAck('room:leave');
    expect(server.manager.size).toBe(0);
  });

  it('phòng không còn ai kết nối thì tự xóa sau một lúc', async () => {
    const a = await client();
    await a.emitWithAck('room:create', { name: 'An' });
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
