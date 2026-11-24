/**
 * Lưu trữ tài khoản, phiên đăng nhập, thống kê và từ do cộng đồng duyệt.
 * - MongoStore: dùng khi có biến môi trường DATABASE (chuỗi kết nối MongoDB).
 * - MemoryStore: dùng khi chạy test / chưa cấu hình DB (mất dữ liệu khi khởi động lại).
 */
import { randomBytes, createHash } from 'node:crypto';
import { MongoClient, ObjectId, type Collection, type Db } from 'mongodb';
import { MemoryWalletStore } from './walletStore';
import { isAdmin } from './admin';
import { prestigePoints, vipOf, type CosmeticSlot, type Equipped } from '../../shared/src/shop';
import { GAME_INFO, type GameStat, type GameType, type LeaderRow, type PublicUser } from '../../shared/src/types';

const GAME_TYPES = Object.keys(GAME_INFO) as GameType[];
export type LeaderEntry = Omit<LeaderRow, 'rank'>;
/** nhiều lần thắng hơn đứng trên; bằng nhau thì ai chơi ít ván hơn (tỉ lệ thắng cao hơn) đứng trên */
const byRank = (a: LeaderEntry, b: LeaderEntry) => b.won - a.won || a.played - b.played || a.displayName.localeCompare(b.displayName, 'vi');

export interface UserRecord {
  id: string;
  username: string;
  email?: string;
  displayName: string;
  avatar: number;
  avatarUrl?: string;
  avatarPublicId?: string;
  passHash: string;
  salt: string;
  stats: Partial<Record<GameType, GameStat>>;
  /** số dư Ruby (thiếu = 0) — chỉ ví (walletStore.ts) được đổi */
  ruby?: number;
  /** mã nạp cố định XL…… nằm trong nội dung chuyển khoản */
  topupCode?: string;
  /** đã nhận khuyến mãi nạp lần đầu */
  firstTopupAt?: Date;
  /** món đã mua (trang trí, bộ sticker) */
  owned?: string[];
  /** món đang trang bị theo ô */
  equipped?: Equipped;
  /** điểm danh: ngày nhận gần nhất (YYYY-MM-DD giờ VN) và số ngày liên tiếp */
  checkin?: { lastDay: string; streak: number };
  /** điểm quà đã nhận */
  giftPoints?: number;
  /** tổng Ruby đã tiêu (tính cấp VIP) */
  rubySpent?: number;
}

export interface ResetRecord {
  generation: string;
  userId: string;
  codeHash: string;
  expiresAt: Date;
  attempts: number;
  sentAt: Date[];
}

export interface Store {
  readonly kind: 'mongo' | 'memory';
  createUser(u: Omit<UserRecord, 'id' | 'stats'>): Promise<UserRecord | 'username_taken' | 'email_taken'>;
  userByEmail(email: string): Promise<UserRecord | null>;
  setEmail(userId: string, email: string): Promise<'ok' | 'taken'>;
  setPassword(userId: string, passHash: string, salt: string): Promise<void>;
  deleteSessionsExcept(userId: string, keepToken?: string): Promise<void>;
  reserveResetSend(userId: string, now: Date): Promise<Date[] | null>;
  saveReset(r: ResetRecord): Promise<void>;
  getReset(userId: string): Promise<ResetRecord | null>;
  bumpResetAttempts(userId: string, generation: string, now: Date): Promise<number>;
  consumeReset(userId: string, generation: string, now: Date): Promise<boolean>;
  deleteReset(userId: string, generation?: string): Promise<boolean>;
  userByName(username: string): Promise<UserRecord | null>;
  userById(id: string): Promise<UserRecord | null>;
  updateUser(id: string, patch: { displayName?: string; avatar?: number; avatarUrl?: string | null; avatarPublicId?: string | null }): Promise<UserRecord | null>;
  createSession(userId: string): Promise<string>;
  userBySession(token: string): Promise<UserRecord | null>;
  deleteSession(token: string): Promise<void>;
  /** thêm món vào kho; false nếu đã có (nguyên tử) */
  addOwned(userId: string, itemId: string): Promise<boolean>;
  /** trang bị / gỡ một ô (itemId null = gỡ) */
  setEquipped(userId: string, slot: CosmeticSlot, itemId: string | null): Promise<void>;
  /** nhận điểm danh hôm nay; false nếu ngày đó đã nhận (nguyên tử, có điều kiện lastDay khác today) */
  claimCheckin(userId: string, today: string, streak: number): Promise<boolean>;
  addGiftPoints(userId: string, points: number): Promise<void>;
  /** cộng dồn Ruby đã tiêu để nâng cấp VIP */
  addRubySpent(userId: string, amount: number): Promise<void>;
  /** cộng ván đã chơi / đã thắng cho các tài khoản (hỗ trợ 1 người hoặc cả phe thắng) */
  recordGame(userIds: string[], game: GameType, winnerId: string | string[] | null): Promise<void>;
  /** bảng xếp hạng số lần thắng của một game (null = cộng mọi game), chỉ người đã chơi ít nhất 1 ván */
  leaderboard(game: GameType | null, limit: number): Promise<LeaderEntry[]>;
  /** lưu từ được cả phòng duyệt; trả về false nếu đã có */
  addWord(word: string, by: string): Promise<boolean>;
  listWords(): Promise<string[]>;
  /** khóa đã dùng của một bộ bốc thăm (vd cặp từ Gián điệp đã chơi) để không lặp lại — xem FreshDeck */
  listUsedKeys(pool: string): Promise<string[]>;
  addUsedKey(pool: string, key: string): Promise<void>;
  clearUsedKeys(pool: string): Promise<void>;
  close(): Promise<void>;
}

export function toPublic(u: UserRecord): PublicUser {
  const vipTier = vipOf(prestigePoints(u.rubySpent, u.owned)).tier;
  return {
    id: u.id, username: u.username, ...(u.email ? { email: u.email } : {}), displayName: u.displayName, avatar: u.avatar,
    ...(u.avatarUrl ? { avatarUrl: u.avatarUrl } : {}), stats: u.stats ?? {}, ruby: u.ruby ?? 0,
    owned: [...(u.owned ?? [])], equipped: { ...(u.equipped ?? {}) }, giftPoints: u.giftPoints ?? 0,
    ...(u.rubySpent ? { rubySpent: u.rubySpent } : {}),
    ...(vipTier > 0 ? { vipTier } : {}),
    // mọi đường trả hồ sơ (đăng nhập, sửa hồ sơ, tải ảnh) đều mang cờ quản trị
    ...(isAdmin(u.username) ? { admin: true as const } : {}),
  };
}

const hashToken = (t: string) => createHash('sha256').update(t).digest('hex');
const newToken = () => randomBytes(32).toString('hex');

// ---------------- bộ nhớ ----------------

export class MemoryStore implements Store {
  readonly kind = 'memory' as const;
  private users = new Map<string, UserRecord>();
  private sessions = new Map<string, string>();
  private words = new Set<string>();
  private usedKeys = new Map<string, Set<string>>();
  private resets = new Map<string, ResetRecord>();
  private resetSends = new Map<string, Date[]>();
  private walletStore?: MemoryWalletStore;
  /** ví Ruby dùng chung bảng người dùng trong bộ nhớ */
  wallet(): MemoryWalletStore {
    return (this.walletStore ??= new MemoryWalletStore(this.users));
  }
  private seq = 0;

  async createUser(u: Omit<UserRecord, 'id' | 'stats'>) {
    // Keep uniqueness checks and insertion synchronous, like Mongo's unique indexes.
    for (const existing of this.users.values()) {
      if (existing.username === u.username) return 'username_taken' as const;
    }
    if (u.email) for (const existing of this.users.values()) {
      if (existing.email === u.email) return 'email_taken' as const;
    }
    const rec: UserRecord = { ...u, id: (++this.seq).toString(16).padStart(24, '0'), stats: {} };
    this.users.set(rec.id, rec);
    return { ...rec };
  }
  async userByName(username: string) {
    for (const u of this.users.values()) if (u.username === username) return { ...u };
    return null;
  }
  async userByEmail(email: string) {
    for (const u of this.users.values()) if (u.email === email) return { ...u };
    return null;
  }
  async setEmail(userId: string, email: string): Promise<'ok' | 'taken'> {
    for (const u of this.users.values()) if (u.id !== userId && u.email === email) return 'taken';
    const user = this.users.get(userId);
    if (user) user.email = email;
    return 'ok';
  }
  async setPassword(userId: string, passHash: string, salt: string) {
    const user = this.users.get(userId);
    if (user) Object.assign(user, { passHash, salt });
  }
  async deleteSessionsExcept(userId: string, keepToken?: string) {
    const keepHash = keepToken === undefined ? undefined : hashToken(keepToken);
    for (const [token, id] of this.sessions) if (id === userId && token !== keepHash) this.sessions.delete(token);
  }
  async reserveResetSend(userId: string, now: Date) {
    const history = (this.resetSends.get(userId) ?? []).filter(d => +d > +now - 3600000);
    if (history.length >= 5 || history.some(d => +d > +now - 60000)) return null;
    history.push(new Date(now));
    this.resetSends.set(userId, history);
    return history.map(d => new Date(d));
  }
  async saveReset(r: ResetRecord) {
    this.resets.set(r.userId, structuredClone(r));
  }
  async getReset(userId: string) {
    const r = this.resets.get(userId);
    return r ? structuredClone(r) : null;
  }
  async bumpResetAttempts(userId: string, generation: string, now: Date) {
    const r = this.resets.get(userId);
    return r && r.generation === generation && +r.expiresAt > +now && r.attempts < 5 ? ++r.attempts : 0;
  }
  async consumeReset(userId: string, generation: string, now: Date) {
    const r = this.resets.get(userId);
    if (!r || r.generation !== generation || +r.expiresAt <= +now || r.attempts >= 5) return false;
    return this.resets.delete(userId);
  }
  async deleteReset(userId: string, generation?: string) {
    if (generation !== undefined && this.resets.get(userId)?.generation !== generation) return false;
    return this.resets.delete(userId);
  }
  async userById(id: string) {
    const u = this.users.get(id);
    return u ? { ...u, stats: { ...u.stats }, ...(u.owned ? { owned: [...u.owned] } : {}), ...(u.equipped ? { equipped: { ...u.equipped } } : {}), ...(u.checkin ? { checkin: { ...u.checkin } } : {}) } : null;
  }
  async updateUser(id: string, patch: { displayName?: string; avatar?: number; avatarUrl?: string | null; avatarPublicId?: string | null }) {
    const u = this.users.get(id);
    if (!u) return null;
    if (patch.displayName !== undefined) u.displayName = patch.displayName;
    if (patch.avatar !== undefined) u.avatar = patch.avatar;
    if (patch.avatarUrl === null) delete u.avatarUrl;
    else if (patch.avatarUrl !== undefined) u.avatarUrl = patch.avatarUrl;
    if (patch.avatarPublicId === null) delete u.avatarPublicId;
    else if (patch.avatarPublicId !== undefined) u.avatarPublicId = patch.avatarPublicId;
    return { ...u };
  }
  async createSession(userId: string) {
    const t = newToken();
    this.sessions.set(hashToken(t), userId);
    return t;
  }
  async userBySession(token: string) {
    const id = this.sessions.get(hashToken(token));
    return id ? this.userById(id) : null;
  }
  async deleteSession(token: string) {
    this.sessions.delete(hashToken(token));
  }
  async addOwned(userId: string, itemId: string) {
    const u = this.users.get(userId);
    if (!u) return false;
    const owned = (u.owned ??= []);
    if (owned.includes(itemId)) return false;
    owned.push(itemId);
    return true;
  }
  async setEquipped(userId: string, slot: CosmeticSlot, itemId: string | null) {
    const u = this.users.get(userId);
    if (!u) return;
    const eq = (u.equipped ??= {});
    if (itemId === null) delete eq[slot];
    else eq[slot] = itemId;
  }
  async claimCheckin(userId: string, today: string, streak: number) {
    const u = this.users.get(userId);
    if (!u || u.checkin?.lastDay === today) return false;
    u.checkin = { lastDay: today, streak };
    return true;
  }
  async addGiftPoints(userId: string, points: number) {
    const u = this.users.get(userId);
    if (u) u.giftPoints = (u.giftPoints ?? 0) + points;
  }
  async addRubySpent(userId: string, amount: number) {
    const u = this.users.get(userId);
    if (u && amount > 0) u.rubySpent = (u.rubySpent ?? 0) + amount;
  }
  async recordGame(userIds: string[], game: GameType, winnerId: string | string[] | null) {
    const winSet = new Set(Array.isArray(winnerId) ? winnerId : winnerId ? [winnerId] : []);
    for (const id of userIds) {
      const u = this.users.get(id);
      if (!u) continue;
      const s = (u.stats[game] ??= { played: 0, won: 0 });
      s.played++;
      if (winSet.has(id)) s.won++;
    }
  }
  async leaderboard(game: GameType | null, limit: number) {
    const games = game ? [game] : GAME_TYPES;
    return [...this.users.values()]
      .map((u): LeaderEntry => ({
        id: u.id,
        displayName: u.displayName,
        avatar: u.avatar,
        ...(u.avatarUrl ? { avatarUrl: u.avatarUrl } : {}),
        won: games.reduce((s, g) => s + (u.stats[g]?.won ?? 0), 0),
        played: games.reduce((s, g) => s + (u.stats[g]?.played ?? 0), 0),
      }))
      .filter((r) => r.played > 0)
      .sort(byRank)
      .slice(0, limit);
  }
  async addWord(word: string) {
    if (this.words.has(word)) return false;
    this.words.add(word);
    return true;
  }
  async listWords() {
    return [...this.words];
  }
  async listUsedKeys(pool: string) {
    return [...(this.usedKeys.get(pool) ?? [])];
  }
  async addUsedKey(pool: string, key: string) {
    let set = this.usedKeys.get(pool);
    if (!set) {
      set = new Set();
      this.usedKeys.set(pool, set);
    }
    set.add(key);
  }
  async clearUsedKeys(pool: string) {
    this.usedKeys.delete(pool);
  }
  async close() {}
}

// ---------------- MongoDB ----------------

interface UserDoc {
  _id: ObjectId;
  username: string;
  email?: string;
  displayName: string;
  avatar: number;
  avatarUrl?: string;
  avatarPublicId?: string;
  passHash: string;
  salt: string;
  stats?: Partial<Record<GameType, GameStat>>;
  createdAt: Date;
  ruby?: number;
  topupCode?: string;
  firstTopupAt?: Date;
  owned?: string[];
  equipped?: Equipped;
  checkin?: { lastDay: string; streak: number };
  giftPoints?: number;
  rubySpent?: number;
}

const fromDoc = (d: UserDoc): UserRecord => ({
  id: d._id.toHexString(),
  username: d.username,
  email: d.email,
  displayName: d.displayName,
  avatar: d.avatar,
  avatarUrl: d.avatarUrl,
  avatarPublicId: d.avatarPublicId,
  passHash: d.passHash,
  salt: d.salt,
  stats: d.stats ?? {},
  ruby: d.ruby ?? 0,
  topupCode: d.topupCode,
  firstTopupAt: d.firstTopupAt,
  owned: d.owned ?? [],
  equipped: d.equipped ?? {},
  checkin: d.checkin,
  giftPoints: d.giftPoints ?? 0,
  rubySpent: d.rubySpent ?? 0,
});

export class MongoStore implements Store {
  readonly kind = 'mongo' as const;
  private constructor(
    private readonly client: MongoClient,
    private readonly users: Collection<UserDoc>,
    private readonly sessions: Collection<{ token: string; userId: ObjectId; createdAt: Date }>,
    private readonly words: Collection<{ word: string; by: string; createdAt: Date }>,
    private readonly resets: Collection<ResetRecord>,
    private readonly resetSends: Collection<{ userId: string; sentAt: Date[] }>,
    private readonly db: Db,
    private readonly usedKeys: Collection<{ pool: string; key: string; at: Date }>,
  ) {}

  /** cơ sở dữ liệu đang dùng (để ví Ruby dùng chung kết nối) */
  get database(): Db {
    return this.db;
  }

  static async connect(uri: string, dbName = 'xomlay'): Promise<MongoStore> {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10_000, appName: 'xom-lay' });
    await client.connect();
    const db: Db = client.db(dbName);
    const store = new MongoStore(client, db.collection('users'), db.collection('sessions'), db.collection('words'), db.collection('password_resets'), db.collection('password_reset_sends'), db, db.collection('used_keys'));
    await Promise.all([
      store.users.createIndex({ username: 1 }, { unique: true }),
      store.users.createIndex({ email: 1 }, { unique: true, sparse: true }),
      store.resetSends.createIndex({ userId: 1 }, { unique: true }),
      store.resets.createIndex({ userId: 1 }, { unique: true }),
      store.resets.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      store.sessions.createIndex({ token: 1 }, { unique: true }),
      // phiên đăng nhập tự hết hạn sau 180 ngày
      store.sessions.createIndex({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 3600 }),
      store.words.createIndex({ word: 1 }, { unique: true }),
      store.usedKeys.createIndex({ pool: 1, key: 1 }, { unique: true }),
    ]);
    return store;
  }

  async createUser(u: Omit<UserRecord, 'id' | 'stats'>) {
    try {
      const doc: UserDoc = { _id: new ObjectId(), ...u, stats: {}, createdAt: new Date() };
      if (doc.email === undefined) delete doc.email;
      await this.users.insertOne(doc);
      return fromDoc(doc);
    } catch (e) {
      const duplicate = e as { code?: number; keyPattern?: Record<string, number> };
      if (duplicate.code === 11000) return duplicate.keyPattern?.email ? 'email_taken' as const : 'username_taken' as const;
      throw e;
    }
  }
  async userByName(username: string) {
    const d = await this.users.findOne({ username });
    return d ? fromDoc(d) : null;
  }
  async userByEmail(email: string) {
    const d = await this.users.findOne({ email });
    return d ? fromDoc(d) : null;
  }
  async setEmail(userId: string, email: string): Promise<'ok' | 'taken'> {
    if (!ObjectId.isValid(userId)) return 'ok';
    try {
      await this.users.updateOne({ _id: new ObjectId(userId) }, { $set: { email } });
      return 'ok';
    } catch (e) {
      if ((e as { code?: number }).code === 11000) return 'taken';
      throw e;
    }
  }
  async setPassword(userId: string, passHash: string, salt: string) {
    if (!ObjectId.isValid(userId)) return;
    await this.users.updateOne({ _id: new ObjectId(userId) }, { $set: { passHash, salt } });
  }
  async deleteSessionsExcept(userId: string, keepToken?: string) {
    if (!ObjectId.isValid(userId)) return;
    await this.sessions.deleteMany({ userId: new ObjectId(userId), ...(keepToken === undefined ? {} : { token: { $ne: hashToken(keepToken) } }) });
  }
  async reserveResetSend(userId: string, now: Date): Promise<Date[] | null> {
    // Khởi tạo riêng: Mongo không cho dùng $expr trong điều kiện upsert.
    try {
      await this.resetSends.updateOne({ userId }, { $setOnInsert: { userId, sentAt: [] } }, { upsert: true });
    } catch (e) {
      if ((e as { code?: number }).code !== 11000) throw e;
    }
    const recent = { $filter: { input: { $ifNull: ['$sentAt', []] }, as: 'date', cond: { $gt: ['$$date', new Date(+now - 3600000)] } } };
    const result = await this.resetSends.findOneAndUpdate(
      { userId, $expr: { $and: [
        { $lt: [{ $size: recent }, 5] },
        { $eq: [{ $size: { $filter: { input: recent, as: 'date', cond: { $gt: ['$$date', new Date(+now - 60000)] } } } }, 0] },
      ] } },
      [{ $set: { sentAt: { $concatArrays: [recent, [now]] } } }],
      { returnDocument: 'after' },
    );
    return result?.sentAt ?? null;
  }
  async saveReset(r: ResetRecord) {
    await this.resets.replaceOne({ userId: r.userId }, r, { upsert: true });
  }
  async getReset(userId: string): Promise<ResetRecord | null> {
    const r = await this.resets.findOne({ userId }, { projection: { _id: 0 } });
    return r;
  }
  async bumpResetAttempts(userId: string, generation: string, now: Date) {
    const r = await this.resets.findOneAndUpdate(
      { userId, generation, expiresAt: { $gt: now }, attempts: { $lt: 5 } },
      { $inc: { attempts: 1 } }, { returnDocument: 'after' },
    );
    return r?.attempts ?? 0;
  }
  async consumeReset(userId: string, generation: string, now: Date) {
    return (await this.resets.deleteOne({ userId, generation, expiresAt: { $gt: now }, attempts: { $lt: 5 } })).deletedCount === 1;
  }
  async deleteReset(userId: string, generation?: string) {
    return (await this.resets.deleteOne({ userId, ...(generation === undefined ? {} : { generation }) })).deletedCount === 1;
  }
  async userById(id: string) {
    if (!ObjectId.isValid(id)) return null;
    const d = await this.users.findOne({ _id: new ObjectId(id) });
    return d ? fromDoc(d) : null;
  }
  async updateUser(id: string, patch: { displayName?: string; avatar?: number; avatarUrl?: string | null; avatarPublicId?: string | null }) {
    if (!ObjectId.isValid(id)) return null;
    const setPatch: { displayName?: string; avatar?: number; avatarUrl?: string; avatarPublicId?: string } = {};
    const unsetPatch: { avatarUrl?: ''; avatarPublicId?: '' } = {};
    if (patch.displayName !== undefined) setPatch.displayName = patch.displayName;
    if (patch.avatar !== undefined) setPatch.avatar = patch.avatar;
    if (patch.avatarUrl === null) unsetPatch.avatarUrl = '';
    else if (patch.avatarUrl !== undefined) setPatch.avatarUrl = patch.avatarUrl;
    if (patch.avatarPublicId === null) unsetPatch.avatarPublicId = '';
    else if (patch.avatarPublicId !== undefined) setPatch.avatarPublicId = patch.avatarPublicId;
    const d = await this.users.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: setPatch, $unset: unsetPatch },
      { returnDocument: 'after' },
    );
    return d ? fromDoc(d) : null;
  }
  async createSession(userId: string) {
    const t = newToken();
    await this.sessions.insertOne({ token: hashToken(t), userId: new ObjectId(userId), createdAt: new Date() });
    return t;
  }
  async userBySession(token: string) {
    // gộp tra phiên + lấy hồ sơ trong 1 vòng mạng MongoDB duy nhất thay vì 2 truy vấn tuần tự
    const docs = await this.sessions
      .aggregate<UserDoc>([
        { $match: { token: hashToken(token) } },
        { $limit: 1 },
        { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'u' } },
        { $unwind: '$u' },
        { $replaceRoot: { newRoot: '$u' } },
      ])
      .toArray();
    return docs[0] ? fromDoc(docs[0]) : null;
  }
  async deleteSession(token: string) {
    await this.sessions.deleteOne({ token: hashToken(token) });
  }
  async addOwned(userId: string, itemId: string) {
    if (!ObjectId.isValid(userId)) return false;
    // $ne trên mảng: chỉ thêm khi chưa có (hai lần mua song song chỉ một lần thắng)
    return (await this.users.updateOne({ _id: new ObjectId(userId), owned: { $ne: itemId } }, { $addToSet: { owned: itemId } })).modifiedCount === 1;
  }
  async setEquipped(userId: string, slot: CosmeticSlot, itemId: string | null) {
    if (!ObjectId.isValid(userId)) return;
    await this.users.updateOne({ _id: new ObjectId(userId) }, itemId === null ? { $unset: { [`equipped.${slot}`]: '' } } : { $set: { [`equipped.${slot}`]: itemId } });
  }
  async claimCheckin(userId: string, today: string, streak: number) {
    if (!ObjectId.isValid(userId)) return false;
    return (await this.users.updateOne({ _id: new ObjectId(userId), 'checkin.lastDay': { $ne: today } }, { $set: { checkin: { lastDay: today, streak } } })).modifiedCount === 1;
  }
  async addGiftPoints(userId: string, points: number) {
    if (ObjectId.isValid(userId)) await this.users.updateOne({ _id: new ObjectId(userId) }, { $inc: { giftPoints: points } });
  }
  async addRubySpent(userId: string, amount: number) {
    if (ObjectId.isValid(userId) && amount > 0) await this.users.updateOne({ _id: new ObjectId(userId) }, { $inc: { rubySpent: amount } });
  }
  async recordGame(userIds: string[], game: GameType, winnerId: string | string[] | null) {
    const ids = userIds.filter((id) => ObjectId.isValid(id));
    if (ids.length === 0) return;
    const winSet = new Set(Array.isArray(winnerId) ? winnerId : winnerId ? [winnerId] : []);
    await this.users.bulkWrite(
      ids.map((id) => ({
        updateOne: {
          filter: { _id: new ObjectId(id) },
          update: { $inc: { [`stats.${game}.played`]: 1, [`stats.${game}.won`]: winSet.has(id) ? 1 : 0 } },
        },
      })),
    );
  }
  async leaderboard(game: GameType | null, limit: number) {
    const games = game ? [game] : GAME_TYPES;
    const sum = (f: 'won' | 'played') => ({ $add: games.map((g) => ({ $ifNull: [`$stats.${g}.${f}`, 0] })) });
    const docs = await this.users
      .aggregate<{ _id: ObjectId; displayName: string; avatar: number; avatarUrl?: string; won: number; played: number }>([
        { $project: { displayName: 1, avatar: 1, avatarUrl: 1, won: sum('won'), played: sum('played') } },
        { $match: { played: { $gt: 0 } } },
        { $sort: { won: -1, played: 1, displayName: 1 } },
        { $limit: limit },
      ])
      .toArray();
    return docs.map((d): LeaderEntry => ({
      id: d._id.toHexString(),
      displayName: d.displayName,
      avatar: d.avatar,
      ...(d.avatarUrl ? { avatarUrl: d.avatarUrl } : {}),
      won: d.won,
      played: d.played,
    })).sort(byRank);
  }
  async addWord(word: string, by: string) {
    try {
      await this.words.insertOne({ word, by, createdAt: new Date() });
      return true;
    } catch (e) {
      if ((e as { code?: number }).code === 11000) return false;
      throw e;
    }
  }
  async listWords() {
    return (await this.words.find({}, { projection: { word: 1 } }).toArray()).map((w) => w.word);
  }
  async listUsedKeys(pool: string) {
    return (await this.usedKeys.find({ pool }, { projection: { key: 1 } }).toArray()).map((d) => d.key);
  }
  async addUsedKey(pool: string, key: string) {
    await this.usedKeys.updateOne({ pool, key }, { $setOnInsert: { pool, key, at: new Date() } }, { upsert: true });
  }
  async clearUsedKeys(pool: string) {
    await this.usedKeys.deleteMany({ pool });
  }
  async close() {
    await this.client.close();
  }
}
