/**
 * Lệnh ví Ruby và quản trị qua Socket.IO.
 * Server chỉ cộng Ruby khi quản trị duyệt (hoặc cộng theo mã / cộng-trừ tay) — người chơi bấm "Tôi đã chuyển khoản"
 * chỉ tạo một yêu cầu chờ duyệt. Quyền quản trị kiểm tra ở đây cho từng lệnh.
 */
import { EventEmitter } from 'node:events';
import type { Socket } from 'socket.io';
import { RUBY_PACKS, normalizeTopupCode, rubyForAmount } from '../../shared/src/ruby';
import type { ClientToServerEvents, ServerToClientEvents, TopupRequest, WalletError, WalletUpdate } from '../../shared/src/types';
import { isAdmin } from './admin';
import { cleanUsername } from './auth';
import { RateLimiter } from './fun';
import type { Store, UserRecord } from './store';
import type { WalletStore } from './walletStore';

type Sock = Socket<ClientToServerEvents, ServerToClientEvents>;

/** phát số dư mới / yêu cầu bị từ chối tới mọi socket đang đăng nhập tài khoản đó */
export class WalletEvents extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(0);
  }
  update(userId: string, p: WalletUpdate): void {
    this.emit('update', userId, p);
  }
  rejected(userId: string, amount: number): void {
    this.emit('rejected', userId, amount);
  }
}

export interface WalletContext {
  wallet: WalletStore;
  store: Store;
  events: WalletEvents;
}

const MAX_AMOUNT = 100_000_000;
const okAmount = (a: unknown): a is number => Number.isSafeInteger(a) && (a as number) >= 1000 && (a as number) <= MAX_AMOUNT;
const STATUSES: TopupRequest['status'][] = ['pending', 'approved', 'rejected'];

/** Gắn lệnh ví cho một socket; trả về hàm gỡ (gọi khi ngắt kết nối). */
export function attachWalletHandlers(socket: Sock, ctx: WalletContext, getUser: () => UserRecord | null): () => void {
  const { wallet, store, events } = ctx;
  const limiter = new RateLimiter(6, 2000);
  type Reply = (r: { ok: false; error: WalletError } | ({ ok: true } & Record<string, unknown>)) => void;

  /** chạy lệnh của người đã đăng nhập (admin: chỉ quản trị), bắt lỗi bất ngờ */
  const handle = (ack: unknown, admin: boolean, run: (u: UserRecord, reply: Reply) => Promise<void>) => {
    if (typeof ack !== 'function') return;
    const reply = ack as Reply;
    const u = getUser();
    if (!u) return reply({ ok: false, error: 'need_account' });
    if (admin && !isAdmin(u.username)) return reply({ ok: false, error: 'forbidden' });
    // server lỡ chạy bộ nhớ tạm (mất kết nối MongoDB): ai đăng ký trước tên quản trị sẽ thành quản trị -> chặn
    if (admin && store.kind === 'memory' && process.env.ALLOW_MEMORY_ADMIN !== '1') return reply({ ok: false, error: 'forbidden' });
    if (!limiter.take()) return reply({ ok: false, error: 'rate_limited' });
    run(u, reply).catch((e) => {
      console.error('wallet error', e);
      reply({ ok: false, error: 'bad_request' });
    });
  };

  /** cộng Ruby cho một khoản tiền đã nhận: khuyến mãi lần đầu được giành nguyên tử */
  const creditTopup = async (userId: string, amount: number, ref: string, by: string) => {
    const first = await wallet.markFirstTopup(userId);
    const ruby = rubyForAmount(amount, first);
    const balance = (await wallet.creditRuby(userId, ruby, 'topup', ref, by)) ?? (await wallet.balance(userId));
    events.update(userId, { ruby: balance, delta: ruby, reason: 'topup' });
    return { ruby, balance };
  };

  socket.on('wallet:get', (ack) => handle(ack, false, async (u, reply) => {
    const topupCode = await wallet.ensureTopupCode(u.id);
    const [ruby, firstTopupDone, pending] = await Promise.all([wallet.balance(u.id), wallet.firstTopupDone(u.id), wallet.pendingOf(u.id)]);
    reply({ ok: true, ruby, topupCode, firstTopupDone, pending });
  }));

  socket.on('wallet:request', (p, ack) => handle(ack, false, async (u, reply) => {
    const amount = p?.amount;
    if (!RUBY_PACKS.some((x) => x.amount === amount)) return reply({ ok: false, error: 'bad_request' });
    const code = await wallet.ensureTopupCode(u.id);
    const r = await wallet.createRequest(u.id, u.username, code, amount);
    reply(r === 'too_many' ? { ok: false, error: 'too_many' } : { ok: true, request: r });
  }));

  socket.on('wallet:history', (ack) => handle(ack, false, async (u, reply) => {
    reply({ ok: true, rows: await wallet.history(u.id, 30) });
  }));

  socket.on('admin:requests', (p, ack) => handle(ack, true, async (_u, reply) => {
    if (!STATUSES.includes(p?.status)) return reply({ ok: false, error: 'bad_request' });
    reply({ ok: true, requests: await wallet.listRequests(p.status, 50) });
  }));

  socket.on('admin:approve', (p, ack) => handle(ack, true, async (admin, reply) => {
    const req = typeof p?.id === 'string' ? await wallet.requestById(p.id) : null;
    if (!req) return reply({ ok: false, error: 'not_found' });
    if (req.status !== 'pending') return reply({ ok: false, error: 'already_handled' });
    const amount = p.amount ?? req.amount;
    if (!okAmount(amount)) return reply({ ok: false, error: 'bad_request' });
    if (!(await store.userById(req.userId))) return reply({ ok: false, error: 'not_found' });
    // giành quyền xử lý trước rồi mới tính khuyến mãi: hai lần duyệt song song chỉ một lần đi tiếp
    const claimed = await wallet.resolveRequest(req.id, 'approved', admin.username, undefined, amount);
    if (!claimed) return reply({ ok: false, error: 'already_handled' });
    const { ruby, balance } = await creditTopup(req.userId, amount, req.id, admin.username);
    await wallet.setRequestRuby(req.id, ruby);
    reply({ ok: true, request: { ...claimed, ruby }, ruby, balance });
  }));

  socket.on('admin:reject', (p, ack) => handle(ack, true, async (admin, reply) => {
    const id = typeof p?.id === 'string' ? p.id : '';
    const r = await wallet.resolveRequest(id, 'rejected', admin.username);
    if (!r) return reply({ ok: false, error: (await wallet.requestById(id)) ? 'already_handled' : 'not_found' });
    events.rejected(r.userId, r.amount);
    reply({ ok: true, request: r });
  }));

  socket.on('admin:creditCode', (p, ack) => handle(ack, true, async (admin, reply) => {
    const code = normalizeTopupCode(typeof p?.code === 'string' ? p.code : '');
    const userId = code ? await wallet.userIdByTopupCode(code) : null;
    const user = userId ? await store.userById(userId) : null;
    if (!code || !user) return reply({ ok: false, error: 'not_found' });
    if (!okAmount(p.amount) || typeof p.nonce !== 'string' || !/^[\w-]{6,64}$/.test(p.nonce)) return reply({ ok: false, error: 'bad_request' });
    // ghi khoản đã nhận trước (nonce chống bấm lại cộng trùng), rồi mới giành khuyến mãi lần đầu và cộng Ruby
    const request = await wallet.addApproved(user.id, user.username, code, p.amount, admin.username, 0, { nonce: p.nonce });
    if (request === 'duplicate') return reply({ ok: false, error: 'already_handled' });
    const { ruby, balance } = await creditTopup(user.id, p.amount, request.id, admin.username);
    await wallet.setRequestRuby(request.id, ruby);
    reply({ ok: true, request: { ...request, ruby }, ruby, balance });
  }));

  socket.on('admin:adjust', (p, ack) => handle(ack, true, async (admin, reply) => {
    const reason = typeof p?.reason === 'string' ? p.reason.trim() : '';
    const delta = p?.delta;
    if (!reason || reason.length > 100 || !Number.isSafeInteger(delta) || delta === 0 || Math.abs(delta) > 1_000_000) {
      return reply({ ok: false, error: 'bad_request' });
    }
    const name = cleanUsername(p.username);
    const user = name ? await store.userByName(name) : null;
    if (!user) return reply({ ok: false, error: 'not_found' });
    const balance = await wallet.creditRuby(user.id, delta, 'admin_adjust', reason, admin.username);
    if (balance === null) return reply({ ok: false, error: 'insufficient' });
    events.update(user.id, { ruby: balance, delta, reason: 'admin_adjust' });
    reply({ ok: true, balance });
  }));

  socket.on('admin:revenue', (ack) => handle(ack, true, async (_u, reply) => {
    reply({ ok: true, ...(await wallet.revenue()) });
  }));

  const onUpdate = (userId: string, p: WalletUpdate) => {
    if (getUser()?.id === userId) socket.emit('wallet:update', p);
  };
  const onRejected = (userId: string, amount: number) => {
    if (getUser()?.id === userId) socket.emit('wallet:rejected', { amount });
  };
  events.on('update', onUpdate);
  events.on('rejected', onRejected);
  return () => {
    events.off('update', onUpdate);
    events.off('rejected', onRejected);
  };
}
