import { describe, expect, it } from 'vitest';
import { MemoryStore, toPublic } from '../src/store';

async function setup() {
  const store = new MemoryStore();
  const mk = async (username: string) => {
    const u = await store.createUser({ username, email: `${username}@x.vn`, displayName: username, avatar: 0, passHash: 'h', salt: 's' });
    if (typeof u === 'string') throw new Error(u);
    return u.id;
  };
  return { store, wallet: store.wallet(), an: await mk('an'), binh: await mk('binh') };
}

describe('WalletStore (bộ nhớ)', () => {
  it('mã nạp cố định mỗi tài khoản, gọi song song vẫn một mã, mỗi người một mã', async () => {
    const { wallet, an, binh } = await setup();
    const [a1, a2] = await Promise.all([wallet.ensureTopupCode(an), wallet.ensureTopupCode(an)]);
    expect(a1).toBe(a2);
    expect(await wallet.ensureTopupCode(an)).toBe(a1);
    expect(a1).toMatch(/^XL[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/);
    expect(await wallet.ensureTopupCode(binh)).not.toBe(a1);
    expect(await wallet.userIdByTopupCode(a1)).toBe(an);
    expect(await wallet.userIdByTopupCode('XLZZZZZZ')).toBeNull();
  });

  it('tối đa 3 yêu cầu chờ duyệt; duyệt chỉ được một lần', async () => {
    const { wallet, an } = await setup();
    const code = await wallet.ensureTopupCode(an);
    const r1 = await wallet.createRequest(an, 'an', code, 50_000);
    await wallet.createRequest(an, 'an', code, 10_000);
    await wallet.createRequest(an, 'an', code, 20_000);
    expect(await wallet.createRequest(an, 'an', code, 10_000)).toBe('too_many');
    if (r1 === 'too_many') throw new Error();
    expect(r1).toMatchObject({ userId: an, username: 'an', code, amount: 50_000, status: 'pending' });
    expect((await wallet.pendingOf(an)).length).toBe(3);
    const done = await wallet.resolveRequest(r1.id, 'approved', 'boss', undefined, 45_000);
    expect(done).toMatchObject({ status: 'approved', handledBy: 'boss', amount: 45_000 });
    expect(await wallet.resolveRequest(r1.id, 'approved', 'boss')).toBeNull();
    await wallet.setRequestRuby(r1.id, 450);
    expect((await wallet.requestById(r1.id))?.ruby).toBe(450);
    expect((await wallet.listRequests('pending', 10)).length).toBe(2);
    // đã duyệt một cái thì được tạo thêm
    expect(await wallet.createRequest(an, 'an', code, 10_000)).not.toBe('too_many');
  });

  it('khuyến mãi lần đầu chỉ một lần; số dư không âm; sổ ghi đúng', async () => {
    const { store, wallet, an } = await setup();
    expect(await wallet.markFirstTopup(an)).toBe(true);
    expect(await wallet.markFirstTopup(an)).toBe(false);
    expect(await wallet.creditRuby(an, 550, 'topup', 'r1', 'boss')).toBe(550);
    expect(await wallet.creditRuby(an, -600, 'admin_adjust', undefined, 'boss')).toBeNull();
    expect(await wallet.balance(an)).toBe(550);
    expect(await wallet.creditRuby(an, -50, 'admin_adjust', undefined, 'boss')).toBe(500);
    const h = await wallet.history(an, 10);
    expect(h.map((r) => [r.delta, r.balance, r.reason])).toEqual([[-50, 500, 'admin_adjust'], [550, 550, 'topup']]);
    expect(toPublic((await store.userById(an))!).ruby).toBe(500);
    expect(await wallet.creditRuby('khong-co', 10, 'topup')).toBeNull();
  });

  it('doanh thu theo giờ Việt Nam: hôm nay, tháng này, tổng; bỏ yêu cầu bị từ chối', async () => {
    const { wallet, an } = await setup();
    const code = await wallet.ensureTopupCode(an);
    const now = new Date('2026-11-12T10:00:00+07:00');
    await wallet.addApproved(an, 'an', code, 50_000, 'boss', 550, { at: new Date('2026-11-12T00:30:00+07:00') });
    await wallet.addApproved(an, 'an', code, 20_000, 'boss', 200, { at: new Date('2026-11-01T08:00:00+07:00') });
    await wallet.addApproved(an, 'an', code, 10_000, 'boss', 100, { at: new Date('2026-10-31T23:00:00+07:00'), nonce: 'n-1' });
    expect(await wallet.addApproved(an, 'an', code, 10_000, 'boss', 100, { nonce: 'n-1' })).toBe('duplicate');
    const rej = await wallet.createRequest(an, 'an', code, 500_000);
    if (rej === 'too_many') throw new Error();
    await wallet.resolveRequest(rej.id, 'rejected', 'boss');
    expect(await wallet.revenue(now)).toEqual({ today: 50_000, month: 70_000, total: 80_000 });
  });
});
