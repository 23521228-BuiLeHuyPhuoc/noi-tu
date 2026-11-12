/**
 * Cửa hàng Ruby, điểm danh hằng ngày, lượt chọc miễn phí.
 * Ruby chỉ trừ/cộng qua WalletStore.creditRuby (nguyên tử, không âm, có sổ). Server kiểm tra mọi quyền và số dư.
 */
import type { Socket } from 'socket.io';
import {
  CHECKIN_REWARDS, COSMETIC_SLOTS, FREE_POKES_PER_DAY, checkinPlan, isOwnable, shopItem, vnDay,
  type Equipped, type PlayerCosmetics,
} from '../../shared/src/shop';
import type { ClientToServerEvents, ServerToClientEvents } from '../../shared/src/types';
import { RateLimiter } from './fun';
import type { UserRecord } from './store';
import type { WalletContext } from './wallet';
import type { RubyReason } from './walletStore';

type Sock = Socket<ClientToServerEvents, ServerToClientEvents>;

export interface ShopContext extends WalletContext {
  /** đồng hồ (ms), test thay được */
  now: () => number;
  quota: FunQuota;
}

/** Lượt chọc miễn phí mỗi ngày (giờ VN) của từng người; đếm trong bộ nhớ, mất khi khởi động lại là chấp nhận được. */
export class FunQuota {
  private used = new Map<string, number>();
  private day = '';
  constructor(private readonly now: () => number = Date.now, readonly free = FREE_POKES_PER_DAY) {}

  private roll() {
    const d = vnDay(this.now());
    if (d !== this.day) {
      this.day = d;
      this.used.clear();
    }
  }
  left(key: string): number {
    this.roll();
    return Math.max(0, this.free - (this.used.get(key) ?? 0));
  }
  /** dùng một lượt miễn phí; false nếu đã hết */
  consume(key: string): boolean {
    if (this.left(key) <= 0) return false;
    this.used.set(key, (this.used.get(key) ?? 0) + 1);
    return true;
  }
}

/** trừ Ruby của một tài khoản rồi báo số dư mới tới mọi máy của họ; null nếu không đủ Ruby */
export async function chargeRuby(ctx: WalletContext, userId: string, amount: number, reason: RubyReason, ref: string): Promise<number | null> {
  const balance = await ctx.wallet.creditRuby(userId, -amount, reason, ref);
  if (balance !== null) ctx.events.update(userId, { ruby: balance, delta: -amount, reason });
  return balance;
}

/** phần trang trí hiện cho người khác trong phòng */
export function cosmeticsOf(eq: Equipped | undefined): PlayerCosmetics | undefined {
  if (!eq) return undefined;
  const out: PlayerCosmetics = {};
  if (eq.frame) out.frame = eq.frame;
  if (eq.nameFx) out.nameFx = eq.nameFx;
  if (eq.aura) out.aura = eq.aura;
  return Object.keys(out).length ? out : undefined;
}

/** Gắn lệnh cửa hàng + điểm danh cho một socket. `onEquipped`: báo để cập nhật hồ sơ trong phòng. */
export function attachShopHandlers(socket: Sock, ctx: ShopContext, getUser: () => UserRecord | null, onEquipped: (u: UserRecord) => void): void {
  const { wallet, store, events } = ctx;
  const limiter = new RateLimiter(12, 600);
  type Fail = { ok: false; error: 'need_account' | 'bad_request' | 'not_found' | 'insufficient' | 'already_owned' | 'not_owned' | 'already_claimed' | 'rate_limited' };
  type Reply = (r: Fail | ({ ok: true } & Record<string, unknown>)) => void;

  const handle = (ack: unknown, run: (u: UserRecord, reply: Reply) => Promise<void>) => {
    if (typeof ack !== 'function') return;
    const reply = ack as Reply;
    const u = getUser();
    if (!u) return reply({ ok: false, error: 'need_account' });
    if (!limiter.take()) return reply({ ok: false, error: 'rate_limited' });
    run(u, reply).catch((e) => {
      console.error('shop error', e);
      reply({ ok: false, error: 'bad_request' });
    });
  };
  const fresh = async (u: UserRecord) => (await store.userById(u.id)) ?? u;

  socket.on('shop:get', (ack) => handle(ack, async (u, reply) => {
    const [f, ruby] = await Promise.all([fresh(u), wallet.balance(u.id)]);
    reply({ ok: true, ruby, owned: f.owned ?? [], equipped: f.equipped ?? {}, giftPoints: f.giftPoints ?? 0 });
  }));

  socket.on('shop:buy', (p, ack) => handle(ack, async (u, reply) => {
    const item = shopItem(p?.itemId);
    if (!item || !isOwnable(item.kind)) return reply({ ok: false, error: 'bad_request' });
    if ((await fresh(u)).owned?.includes(item.id)) return reply({ ok: false, error: 'already_owned' });
    const balance = await wallet.creditRuby(u.id, -item.price, 'shop', item.id);
    if (balance === null) return reply({ ok: false, error: 'insufficient' });
    if (!(await store.addOwned(u.id, item.id))) {
      // hai lần mua song song: lần sau không được thêm vào kho -> hoàn Ruby
      const back = (await wallet.creditRuby(u.id, item.price, 'shop', `refund:${item.id}`)) ?? balance;
      events.update(u.id, { ruby: back, delta: 0, reason: 'shop' });
      return reply({ ok: false, error: 'already_owned' });
    }
    events.update(u.id, { ruby: balance, delta: -item.price, reason: 'shop' });
    reply({ ok: true, balance, owned: (await fresh(u)).owned ?? [] });
  }));

  socket.on('shop:equip', (p, ack) => handle(ack, async (u, reply) => {
    const slot = COSMETIC_SLOTS.find((s) => s === p?.slot);
    if (!slot) return reply({ ok: false, error: 'bad_request' });
    const id = p.itemId;
    if (id !== null) {
      const item = shopItem(id);
      if (!item || item.kind !== slot) return reply({ ok: false, error: 'bad_request' });
      if (!(await fresh(u)).owned?.includes(item.id)) return reply({ ok: false, error: 'not_owned' });
    }
    await store.setEquipped(u.id, slot, id);
    const f = await fresh(u);
    onEquipped(f);
    reply({ ok: true, equipped: f.equipped ?? {} });
  }));

  socket.on('checkin:status', (ack) => handle(ack, async (u, reply) => {
    const plan = checkinPlan((await fresh(u)).checkin, vnDay(ctx.now()));
    reply({ ok: true, canClaim: plan.canClaim, streak: plan.streak, nextDay: plan.nextDay, nextReward: plan.nextReward, rewards: CHECKIN_REWARDS });
  }));

  socket.on('checkin:claim', (ack) => handle(ack, async (u, reply) => {
    const today = vnDay(ctx.now());
    const plan = checkinPlan((await fresh(u)).checkin, today);
    if (!plan.canClaim) return reply({ ok: false, error: 'already_claimed' });
    // giành ngày hôm nay nguyên tử (hai máy bấm cùng lúc chỉ một lần được)
    if (!(await store.claimCheckin(u.id, today, plan.newStreak))) return reply({ ok: false, error: 'already_claimed' });
    const balance = (await wallet.creditRuby(u.id, plan.nextReward, 'checkin', today)) ?? (await wallet.balance(u.id));
    events.update(u.id, { ruby: balance, delta: plan.nextReward, reason: 'checkin' });
    reply({ ok: true, reward: plan.nextReward, balance, streak: plan.newStreak, day: plan.nextDay });
  }));
}
