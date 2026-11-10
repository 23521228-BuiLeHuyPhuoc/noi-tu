/**
 * Lưu trữ tài khoản, phiên đăng nhập, thống kê và từ do cộng đồng duyệt.
 * - MongoStore: dùng khi có biến môi trường DATABASE (chuỗi kết nối MongoDB).
 * - MemoryStore: dùng khi chạy test / chưa cấu hình DB (mất dữ liệu khi khởi động lại).
 */
import { randomBytes, createHash } from 'node:crypto';
import { MongoClient, ObjectId, type Collection, type Db } from 'mongodb';
import type { GameStat, GameType, PublicUser } from '../../shared/src/types';

export interface UserRecord {
  id: string;
  username: string;
  displayName: string;
  avatar: number;
  avatarUrl?: string;
  avatarPublicId?: string;
  passHash: string;
  salt: string;
  stats: Partial<Record<GameType, GameStat>>;
}

export interface Store {
  readonly kind: 'mongo' | 'memory';
  createUser(u: Omit<UserRecord, 'id' | 'stats'>): Promise<UserRecord | null>;
  userByName(username: string): Promise<UserRecord | null>;
  userById(id: string): Promise<UserRecord | null>;
  updateUser(id: string, patch: { displayName?: string; avatar?: number; avatarUrl?: string | null; avatarPublicId?: string | null }): Promise<UserRecord | null>;
  createSession(userId: string): Promise<string>;
  userBySession(token: string): Promise<UserRecord | null>;
  deleteSession(token: string): Promise<void>;
  /** cộng ván đã chơi / đã thắng cho các tài khoản */
  recordGame(userIds: string[], game: GameType, winnerId: string | null): Promise<void>;
  /** lưu từ được cả phòng duyệt; trả về false nếu đã có */
  addWord(word: string, by: string): Promise<boolean>;
  listWords(): Promise<string[]>;
  close(): Promise<void>;
}

export function toPublic(u: UserRecord): PublicUser {
  return { id: u.id, username: u.username, displayName: u.displayName, avatar: u.avatar, ...(u.avatarUrl ? { avatarUrl: u.avatarUrl } : {}), stats: u.stats ?? {} };
}

const hashToken = (t: string) => createHash('sha256').update(t).digest('hex');
const newToken = () => randomBytes(32).toString('hex');

// ---------------- bộ nhớ ----------------

export class MemoryStore implements Store {
  readonly kind = 'memory' as const;
  private users = new Map<string, UserRecord>();
  private sessions = new Map<string, string>();
  private words = new Set<string>();
  private seq = 0;

  async createUser(u: Omit<UserRecord, 'id' | 'stats'>) {
    if (await this.userByName(u.username)) return null;
    const rec: UserRecord = { ...u, id: (++this.seq).toString(16).padStart(24, '0'), stats: {} };
    this.users.set(rec.id, rec);
    return { ...rec };
  }
  async userByName(username: string) {
    for (const u of this.users.values()) if (u.username === username) return { ...u };
    return null;
  }
  async userById(id: string) {
    const u = this.users.get(id);
    return u ? { ...u, stats: { ...u.stats } } : null;
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
  async recordGame(userIds: string[], game: GameType, winnerId: string | null) {
    for (const id of userIds) {
      const u = this.users.get(id);
      if (!u) continue;
      const s = (u.stats[game] ??= { played: 0, won: 0 });
      s.played++;
      if (id === winnerId) s.won++;
    }
  }
  async addWord(word: string) {
    if (this.words.has(word)) return false;
    this.words.add(word);
    return true;
  }
  async listWords() {
    return [...this.words];
  }
  async close() {}
}

// ---------------- MongoDB ----------------

interface UserDoc {
  _id: ObjectId;
  username: string;
  displayName: string;
  avatar: number;
  avatarUrl?: string;
  avatarPublicId?: string;
  passHash: string;
  salt: string;
  stats?: Partial<Record<GameType, GameStat>>;
  createdAt: Date;
}

const fromDoc = (d: UserDoc): UserRecord => ({
  id: d._id.toHexString(),
  username: d.username,
  displayName: d.displayName,
  avatar: d.avatar,
  avatarUrl: d.avatarUrl,
  avatarPublicId: d.avatarPublicId,
  passHash: d.passHash,
  salt: d.salt,
  stats: d.stats ?? {},
});

export class MongoStore implements Store {
  readonly kind = 'mongo' as const;
  private constructor(
    private readonly client: MongoClient,
    private readonly users: Collection<UserDoc>,
    private readonly sessions: Collection<{ token: string; userId: ObjectId; createdAt: Date }>,
    private readonly words: Collection<{ word: string; by: string; createdAt: Date }>,
  ) {}

  static async connect(uri: string, dbName = 'xomlay'): Promise<MongoStore> {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10_000, appName: 'xom-lay' });
    await client.connect();
    const db: Db = client.db(dbName);
    const store = new MongoStore(client, db.collection('users'), db.collection('sessions'), db.collection('words'));
    await Promise.all([
      store.users.createIndex({ username: 1 }, { unique: true }),
      store.sessions.createIndex({ token: 1 }, { unique: true }),
      // phiên đăng nhập tự hết hạn sau 180 ngày
      store.sessions.createIndex({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 3600 }),
      store.words.createIndex({ word: 1 }, { unique: true }),
    ]);
    return store;
  }

  async createUser(u: Omit<UserRecord, 'id' | 'stats'>) {
    try {
      const doc: UserDoc = { _id: new ObjectId(), ...u, stats: {}, createdAt: new Date() };
      await this.users.insertOne(doc);
      return fromDoc(doc);
    } catch (e) {
      if ((e as { code?: number }).code === 11000) return null; // trùng tên đăng nhập
      throw e;
    }
  }
  async userByName(username: string) {
    const d = await this.users.findOne({ username });
    return d ? fromDoc(d) : null;
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
    const s = await this.sessions.findOne({ token: hashToken(token) });
    return s ? this.userById(s.userId.toHexString()) : null;
  }
  async deleteSession(token: string) {
    await this.sessions.deleteOne({ token: hashToken(token) });
  }
  async recordGame(userIds: string[], game: GameType, winnerId: string | null) {
    const ids = userIds.filter((id) => ObjectId.isValid(id));
    if (ids.length === 0) return;
    await this.users.bulkWrite(
      ids.map((id) => ({
        updateOne: {
          filter: { _id: new ObjectId(id) },
          update: { $inc: { [`stats.${game}.played`]: 1, [`stats.${game}.won`]: id === winnerId ? 1 : 0 } },
        },
      })),
    );
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
  async close() {
    await this.client.close();
  }
}
