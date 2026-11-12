/**
 * Ví Ruby: số dư (trên bản ghi người dùng), sổ Ruby, yêu cầu nạp chờ quản trị duyệt.
 * - MemoryWalletStore: dùng chung bảng người dùng của MemoryStore (test / chưa có DB).
 * - MongoWalletStore: dùng chung kết nối của MongoStore.
 * Số dư là nguồn sự thật; sổ Ruby ghi ngay sau mỗi lần cộng/trừ (không dùng transaction để chạy được trên Mongo một máy).
 */
import { randomBytes } from 'node:crypto';
import { ObjectId, type Collection, type Db } from 'mongodb';
import { newTopupCode } from '../../shared/src/ruby';
import type { RubyLedgerRow, TopupRequest } from '../../shared/src/types';
import type { UserRecord } from './store';

export type RubyReason = 'topup' | 'admin_adjust';
type Status = TopupRequest['status'];

export interface WalletStore {
  ensureTopupCode(userId: string): Promise<string>;
  userIdByTopupCode(code: string): Promise<string | null>;
  createRequest(userId: string, username: string, code: string, amount: number): Promise<TopupRequest | 'too_many'>;
  listRequests(status: Status, limit: number): Promise<TopupRequest[]>;
  requestById(id: string): Promise<TopupRequest | null>;
  /** chỉ đổi khi yêu cầu đang chờ; null nếu đã có người xử lý (chống duyệt hai lần) */
  resolveRequest(id: string, status: 'approved' | 'rejected', by: string, ruby?: number, amount?: number): Promise<TopupRequest | null>;
  setRequestRuby(id: string, ruby: number): Promise<void>;
  /** quản trị cộng theo mã (người chơi quên bấm "đã chuyển"): ghi một yêu cầu đã duyệt để có lịch sử và doanh thu */
  addApproved(userId: string, username: string, code: string, amount: number, by: string, ruby: number, at?: Date): Promise<TopupRequest>;
  /** đặt mốc đã nhận khuyến mãi lần đầu; true nếu lần này là lần đầu */
  markFirstTopup(userId: string): Promise<boolean>;
  /** cộng/trừ Ruby nguyên tử; trả số dư mới, null nếu không có tài khoản hoặc không đủ Ruby */
  creditRuby(userId: string, delta: number, reason: RubyReason, ref?: string, by?: string): Promise<number | null>;
  balance(userId: string): Promise<number>;
  firstTopupDone(userId: string): Promise<boolean>;
  history(userId: string, limit: number): Promise<RubyLedgerRow[]>;
  revenue(now?: Date): Promise<{ today: number; month: number; total: number }>;
  pendingOf(userId: string): Promise<TopupRequest[]>;
}

export const MAX_PENDING = 3;
const VN_MS = 7 * 3600_000;

/** mốc đầu ngày / đầu tháng theo giờ Việt Nam (UTC+7) */
export function vnStarts(now: Date): { day: number; month: number } {
  const v = new Date(+now + VN_MS);
  const day = Date.UTC(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate()) - VN_MS;
  const month = Date.UTC(v.getUTCFullYear(), v.getUTCMonth(), 1) - VN_MS;
  return { day, month };
}

// ---------------- bộ nhớ ----------------

export class MemoryWalletStore implements WalletStore {
  private requests = new Map<string, TopupRequest>();
  private ledger: (RubyLedgerRow & { userId: string })[] = [];
  private order = 0;
  constructor(private readonly users: Map<string, UserRecord>) {}

  async ensureTopupCode(userId: string) {
    const u = this.users.get(userId);
    if (!u) throw new Error('no user');
    if (!u.topupCode) {
      let code = newTopupCode();
      while ([...this.users.values()].some((x) => x.topupCode === code)) code = newTopupCode();
      u.topupCode = code;
    }
    return u.topupCode;
  }
  async userIdByTopupCode(code: string) {
    for (const u of this.users.values()) if (u.topupCode === code) return u.id;
    return null;
  }
  async createRequest(userId: string, username: string, code: string, amount: number) {
    if ((await this.pendingOf(userId)).length >= MAX_PENDING) return 'too_many' as const;
    const r: TopupRequest = { id: randomBytes(12).toString('hex'), userId, username, code, amount, status: 'pending', createdAt: Date.now() + this.order++ / 1000 };
    this.requests.set(r.id, r);
    return { ...r };
  }
  private sorted(filter: (r: TopupRequest) => boolean) {
    return [...this.requests.values()].filter(filter).sort((a, b) => b.createdAt - a.createdAt).map((r) => ({ ...r }));
  }
  async listRequests(status: Status, limit: number) {
    return this.sorted((r) => r.status === status).slice(0, limit);
  }
  async requestById(id: string) {
    const r = this.requests.get(id);
    return r ? { ...r } : null;
  }
  async resolveRequest(id: string, status: 'approved' | 'rejected', by: string, ruby?: number, amount?: number) {
    const r = this.requests.get(id);
    if (!r || r.status !== 'pending') return null;
    r.status = status;
    r.handledAt = Date.now();
    r.handledBy = by;
    if (ruby !== undefined) r.ruby = ruby;
    if (amount !== undefined) r.amount = amount;
    return { ...r };
  }
  async setRequestRuby(id: string, ruby: number) {
    const r = this.requests.get(id);
    if (r) r.ruby = ruby;
  }
  async addApproved(userId: string, username: string, code: string, amount: number, by: string, ruby: number, at = new Date()) {
    const r: TopupRequest = {
      id: randomBytes(12).toString('hex'), userId, username, code, amount, status: 'approved',
      createdAt: +at, handledAt: +at, handledBy: by, ruby,
    };
    this.requests.set(r.id, r);
    return { ...r };
  }
  async markFirstTopup(userId: string) {
    const u = this.users.get(userId);
    if (!u || u.firstTopupAt) return false;
    u.firstTopupAt = new Date();
    return true;
  }
  async creditRuby(userId: string, delta: number, reason: RubyReason, ref?: string, by?: string) {
    const u = this.users.get(userId);
    if (!u) return null;
    const next = (u.ruby ?? 0) + delta;
    if (next < 0) return null;
    u.ruby = next;
    this.ledger.push({ userId, delta, balance: next, reason, ...(ref ? { ref } : {}), ...(by ? { by } : {}), at: Date.now() + this.order++ / 1000 });
    return next;
  }
  async balance(userId: string) {
    return this.users.get(userId)?.ruby ?? 0;
  }
  async firstTopupDone(userId: string) {
    return !!this.users.get(userId)?.firstTopupAt;
  }
  async history(userId: string, limit: number) {
    return this.ledger
      .filter((r) => r.userId === userId)
      .sort((a, b) => b.at - a.at)
      .slice(0, limit)
      .map(({ userId: _u, ...r }) => r);
  }
  async revenue(now = new Date()) {
    const { day, month } = vnStarts(now);
    const out = { today: 0, month: 0, total: 0 };
    for (const r of this.requests.values()) {
      if (r.status !== 'approved') continue;
      const at = r.handledAt ?? r.createdAt;
      out.total += r.amount;
      if (at >= month) out.month += r.amount;
      if (at >= day) out.today += r.amount;
    }
    return out;
  }
  async pendingOf(userId: string) {
    return this.sorted((r) => r.userId === userId && r.status === 'pending');
  }
}

// ---------------- MongoDB ----------------

interface WalletUserDoc {
  _id: ObjectId;
  username: string;
  ruby?: number;
  topupCode?: string;
  firstTopupAt?: Date;
}
interface RequestDoc {
  _id: ObjectId;
  userId: string;
  username: string;
  code: string;
  amount: number;
  status: Status;
  createdAt: Date;
  handledAt?: Date;
  handledBy?: string;
  ruby?: number;
}
interface LedgerDoc {
  userId: string;
  delta: number;
  balance: number;
  reason: RubyReason;
  ref?: string;
  by?: string;
  at: Date;
}

const fromReq = (d: RequestDoc): TopupRequest => ({
  id: d._id.toHexString(), userId: d.userId, username: d.username, code: d.code, amount: d.amount, status: d.status,
  createdAt: +d.createdAt,
  ...(d.handledAt ? { handledAt: +d.handledAt } : {}),
  ...(d.handledBy ? { handledBy: d.handledBy } : {}),
  ...(d.ruby !== undefined ? { ruby: d.ruby } : {}),
});
const oid = (id: string) => (ObjectId.isValid(id) ? new ObjectId(id) : null);

export class MongoWalletStore implements WalletStore {
  private readonly users: Collection<WalletUserDoc>;
  private readonly requests: Collection<RequestDoc>;
  private readonly ledger: Collection<LedgerDoc>;
  constructor(db: Db) {
    this.users = db.collection('users');
    this.requests = db.collection('topup_requests');
    this.ledger = db.collection('ruby_ledger');
  }

  async init(): Promise<void> {
    await Promise.all([
      this.users.createIndex({ topupCode: 1 }, { unique: true, sparse: true }),
      this.requests.createIndex({ status: 1, createdAt: -1 }),
      this.requests.createIndex({ userId: 1, status: 1 }),
      this.ledger.createIndex({ userId: 1, at: -1 }),
    ]);
  }

  async ensureTopupCode(userId: string) {
    const _id = oid(userId);
    if (!_id) throw new Error('no user');
    for (let i = 0; i < 6; i++) {
      const u = await this.users.findOne({ _id }, { projection: { topupCode: 1 } });
      if (!u) throw new Error('no user');
      if (u.topupCode) return u.topupCode;
      try {
        // chỉ đặt khi chưa có: hai máy mở ví cùng lúc vẫn ra một mã
        await this.users.updateOne({ _id, topupCode: { $exists: false } }, { $set: { topupCode: newTopupCode() } });
      } catch (e) {
        if ((e as { code?: number }).code !== 11000) throw e; // trùng mã người khác: thử mã khác
      }
    }
    throw new Error('cannot allocate topup code');
  }
  async userIdByTopupCode(code: string) {
    const u = await this.users.findOne({ topupCode: code }, { projection: { _id: 1 } });
    return u ? u._id.toHexString() : null;
  }
  async createRequest(userId: string, username: string, code: string, amount: number) {
    if ((await this.requests.countDocuments({ userId, status: 'pending' })) >= MAX_PENDING) return 'too_many' as const;
    const doc: RequestDoc = { _id: new ObjectId(), userId, username, code, amount, status: 'pending', createdAt: new Date() };
    await this.requests.insertOne(doc);
    return fromReq(doc);
  }
  async listRequests(status: Status, limit: number) {
    return (await this.requests.find({ status }).sort({ createdAt: -1 }).limit(limit).toArray()).map(fromReq);
  }
  async requestById(id: string) {
    const _id = oid(id);
    const d = _id ? await this.requests.findOne({ _id }) : null;
    return d ? fromReq(d) : null;
  }
  async resolveRequest(id: string, status: 'approved' | 'rejected', by: string, ruby?: number, amount?: number) {
    const _id = oid(id);
    if (!_id) return null;
    const d = await this.requests.findOneAndUpdate(
      { _id, status: 'pending' },
      { $set: { status, handledAt: new Date(), handledBy: by, ...(ruby !== undefined ? { ruby } : {}), ...(amount !== undefined ? { amount } : {}) } },
      { returnDocument: 'after' },
    );
    return d ? fromReq(d) : null;
  }
  async setRequestRuby(id: string, ruby: number) {
    const _id = oid(id);
    if (_id) await this.requests.updateOne({ _id }, { $set: { ruby } });
  }
  async addApproved(userId: string, username: string, code: string, amount: number, by: string, ruby: number, at = new Date()) {
    const doc: RequestDoc = { _id: new ObjectId(), userId, username, code, amount, status: 'approved', createdAt: at, handledAt: at, handledBy: by, ruby };
    await this.requests.insertOne(doc);
    return fromReq(doc);
  }
  async markFirstTopup(userId: string) {
    const _id = oid(userId);
    if (!_id) return false;
    return (await this.users.updateOne({ _id, firstTopupAt: { $exists: false } }, { $set: { firstTopupAt: new Date() } })).modifiedCount === 1;
  }
  async creditRuby(userId: string, delta: number, reason: RubyReason, ref?: string, by?: string) {
    const _id = oid(userId);
    if (!_id) return null;
    const d = await this.users.findOneAndUpdate(
      { _id, ...(delta < 0 ? { ruby: { $gte: -delta } } : {}) },
      { $inc: { ruby: delta } },
      { returnDocument: 'after', projection: { ruby: 1 } },
    );
    if (!d) return null;
    const balance = d.ruby ?? 0;
    await this.ledger.insertOne({ userId, delta, balance, reason, ...(ref ? { ref } : {}), ...(by ? { by } : {}), at: new Date() });
    return balance;
  }
  async balance(userId: string) {
    const _id = oid(userId);
    const d = _id ? await this.users.findOne({ _id }, { projection: { ruby: 1 } }) : null;
    return d?.ruby ?? 0;
  }
  async firstTopupDone(userId: string) {
    const _id = oid(userId);
    const d = _id ? await this.users.findOne({ _id }, { projection: { firstTopupAt: 1 } }) : null;
    return !!d?.firstTopupAt;
  }
  async history(userId: string, limit: number) {
    const rows = await this.ledger.find({ userId }).sort({ at: -1 }).limit(limit).toArray();
    return rows.map((r) => ({ delta: r.delta, balance: r.balance, reason: r.reason, ...(r.ref ? { ref: r.ref } : {}), at: +r.at }));
  }
  async revenue(now = new Date()) {
    const { day, month } = vnStarts(now);
    const sumIf = (since: number) => ({ $sum: { $cond: [{ $gte: [{ $ifNull: ['$handledAt', '$createdAt'] }, new Date(since)] }, '$amount', 0] } });
    const [r] = await this.requests
      .aggregate<{ today: number; month: number; total: number }>([
        { $match: { status: 'approved' } },
        { $group: { _id: null, today: sumIf(day), month: sumIf(month), total: { $sum: '$amount' } } },
      ])
      .toArray();
    return { today: r?.today ?? 0, month: r?.month ?? 0, total: r?.total ?? 0 };
  }
  async pendingOf(userId: string) {
    return (await this.requests.find({ userId, status: 'pending' }).sort({ createdAt: -1 }).toArray()).map(fromReq);
  }
}
