import { readFileSync, writeFileSync } from 'node:fs';
const p = 'server/test/shop.test.ts';
let s = readFileSync(p, 'utf8');
const a = s.indexOf("describe('Lượt chọc miễn phí mỗi ngày'");
const b = s.indexOf("describe('Kỹ năng chọc trả phí'");
const block = `describe('Lượt chọc miễn phí mỗi ngày', () => {
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
    expect(await taunt(an)).toMatchObject({ ok: true, left: 2 });
    expect(await taunt(an)).toMatchObject({ ok: true, left: 1 });
    expect(await taunt(an)).toMatchObject({ ok: true, left: 0 });
    expect(await balance(an)).toBe(1);
    // lượt thứ (free + 1): trừ 1 Ruby
    expect(await taunt(an)).toMatchObject({ ok: true, left: 0 });
    expect(await balance(an)).toBe(0);
    // hết Ruby: bị chặn
    expect(await taunt(an)).toEqual({ ok: false, reason: 'quota' });
    expect(await an.emitWithAck('fun:send', { kind: 'emoji', emoji: '😂' })).toEqual({ ok: true });
    // qua ngày mới: được lượt lại
    clock += DAY;
    expect(await an.emitWithAck('fun:quota')).toEqual({ free: 3, left: 3 });
    expect(await taunt(an)).toMatchObject({ ok: true, left: 2 });
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

`;
s = s.slice(0, a) + block + s.slice(b);
s = s.replace("import { MemoryStore } from '../src/store';", "import { MemoryStore } from '../src/store';\nimport { FunQuota } from '../src/shop';");
s = s.replace(`beforeEach(async () => {
  process.env.ADMIN_USERNAMES = 'boss';
  process.env.ALLOW_MEMORY_ADMIN = '1';
  clock = Date.parse('2026-11-12T05:00:00Z'); // 12:00 giờ VN
  server = createGameServer(smallDict(), {
    store: new MemoryStore(),
    mailer: null,
    now: () => clock,
    room: { turnMs: 5000, disconnectGraceMs: 300 },
    emptyRoomTtlMs: 300,
  });
  await new Promise<void>((r) => server.http.listen(0, r));
  url = \`http://localhost:\${(server.http.address() as AddressInfo).port}\`;
});`, `async function start(freePokes?: number) {
  server = createGameServer(smallDict(), {
    store: new MemoryStore(),
    mailer: null,
    now: () => clock,
    freePokes,
    room: { turnMs: 5000, disconnectGraceMs: 300 },
    emptyRoomTtlMs: 300,
  });
  await new Promise<void>((r) => server.http.listen(0, r));
  url = \`http://localhost:\${(server.http.address() as AddressInfo).port}\`;
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
});`);
writeFileSync(p, s);
